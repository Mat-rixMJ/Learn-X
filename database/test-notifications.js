require('dotenv').config({ path: '../backend/.env' });
const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

async function testNotificationsQuick() {
  try {
    console.log('🔔 TESTING NOTIFICATION SYSTEM');
    console.log('===============================\n');

    // First, create some test schedules for today with classes starting soon
    const today = new Date().toISOString().split('T')[0];
    const now = new Date();
    const in45Minutes = new Date(now.getTime() + 45 * 60 * 1000);
    const in30Minutes = new Date(now.getTime() + 30 * 60 * 1000);
    
    console.log(`📅 Today: ${today}`);
    console.log(`🕐 Current time: ${now.toTimeString()}`);
    console.log(`⏰ Notification time (45 min): ${in45Minutes.toTimeString()}`);
    console.log('');

    // Get existing time slots
    const timeSlots = await pool.query('SELECT * FROM time_slots WHERE is_break = false ORDER BY id LIMIT 3');
    
    // Update a few time slots to start in 45 minutes for testing
    for (let i = 0; i < Math.min(2, timeSlots.rows.length); i++) {
      const slot = timeSlots.rows[i];
      const testStartTime = new Date(in45Minutes);
      const testEndTime = new Date(testStartTime.getTime() + 45 * 60 * 1000);
      
      await pool.query(`
        UPDATE time_slots 
        SET start_time = $1, end_time = $2 
        WHERE id = $3
      `, [
        testStartTime.toTimeString().split(' ')[0],
        testEndTime.toTimeString().split(' ')[0],
        slot.id
      ]);
      
      console.log(`⏰ Updated time slot ${slot.id} to start at ${testStartTime.toTimeString()}`);
    }

    // Create some test schedules for today
    const classes = await pool.query(`
      SELECT c.*, u.full_name as teacher_name 
      FROM classes c 
      JOIN users u ON c.teacher_id = u.id 
      LIMIT 3
    `);

    console.log(`\n📚 Creating test schedules for today...`);
    
    for (let i = 0; i < Math.min(2, classes.rows.length); i++) {
      const classInfo = classes.rows[i];
      const timeSlot = timeSlots.rows[i];
      
      // Clear existing schedule for this class today
      await pool.query(`
        DELETE FROM daily_schedules 
        WHERE class_id = $1 AND schedule_date = $2
      `, [classInfo.id, today]);
      
      // Create new schedule
      await pool.query(`
        INSERT INTO daily_schedules (
          class_id, teacher_id, schedule_date, time_slot_id,
          subject, is_substitute, original_teacher_id
        ) VALUES ($1, $2, $3, $4, $5, false, null)
      `, [
        classInfo.id,
        classInfo.teacher_id,
        today,
        timeSlot.id,
        classInfo.subject
      ]);
      
      console.log(`   ✅ ${classInfo.name} with ${classInfo.teacher_name}`);
    }

    // Test immediate notifications
    console.log(`\n📢 Sending test notifications...`);
    
    const students = await pool.query(`
      SELECT u.id, u.full_name 
      FROM users u 
      WHERE u.role = 'student' 
      LIMIT 5
    `);

    const NotificationService = require('../backend/services/notificationService');
    const notificationService = new NotificationService();

    // Send immediate test notifications
    for (const student of students.rows) {
      await notificationService.sendImmediateNotification(
        student.id,
        '🔔 Test Notification',
        `Hello ${student.full_name}! This is a test notification from Learn-X system. Your classes are scheduled and notifications are working perfectly.`,
        'test',
        { 
          test: true, 
          timestamp: new Date().toISOString(),
          student_name: student.full_name
        }
      );
      
      console.log(`   📤 Sent to ${student.full_name}`);
    }

    // Test class notifications for scheduled classes
    const todaySchedule = await pool.query(`
      SELECT 
        ds.*,
        c.name as class_name,
        c.subject,
        u.full_name as teacher_name,
        ts.start_time,
        ts.end_time,
        ts.description as time_slot_description
      FROM daily_schedules ds
      JOIN classes c ON ds.class_id = c.id
      JOIN users u ON ds.teacher_id = u.id
      JOIN time_slots ts ON ds.time_slot_id = ts.id
      WHERE ds.schedule_date = $1
    `, [today]);

    console.log(`\n📚 Testing class notifications for ${todaySchedule.rows.length} scheduled classes...`);
    
    for (const classInfo of todaySchedule.rows) {
      try {
        await notificationService.sendClassNotifications(classInfo);
        console.log(`   ✅ Notifications sent for ${classInfo.class_name}`);
      } catch (error) {
        console.log(`   ❌ Failed for ${classInfo.class_name}: ${error.message}`);
      }
    }

    // Show notification statistics
    const notificationStats = await pool.query(`
      SELECT 
        COUNT(*) as total_notifications,
        COUNT(CASE WHEN is_read = false THEN 1 END) as unread_notifications,
        COUNT(CASE WHEN type = 'class_reminder' THEN 1 END) as class_reminders,
        COUNT(CASE WHEN type = 'test' THEN 1 END) as test_notifications,
        COUNT(CASE WHEN created_at >= NOW() - INTERVAL '1 hour' THEN 1 END) as recent_notifications
      FROM notifications
    `);

    const stats = notificationStats.rows[0];
    
    console.log(`\n📊 NOTIFICATION STATISTICS:`);
    console.log(`   📢 Total notifications: ${stats.total_notifications}`);
    console.log(`   📮 Unread notifications: ${stats.unread_notifications}`);
    console.log(`   ⏰ Class reminders: ${stats.class_reminders}`);
    console.log(`   🧪 Test notifications: ${stats.test_notifications}`);
    console.log(`   🆕 Recent (1 hour): ${stats.recent_notifications}`);

    // Show today's schedule
    console.log(`\n📅 TODAY'S SCHEDULE:`);
    if (todaySchedule.rows.length > 0) {
      console.table(todaySchedule.rows.map(s => ({
        Class: s.class_name,
        Subject: s.subject,
        Teacher: s.teacher_name,
        Time: `${s.start_time} - ${s.end_time}`,
        'Time Slot': s.time_slot_description
      })));
    } else {
      console.log('   📭 No classes scheduled for today');
    }

    console.log(`\n✅ NOTIFICATION TEST COMPLETED!`);
    console.log(`📱 Check your frontend dashboard to see the notifications`);
    console.log(`⏰ The notification service will automatically send reminders 45 minutes before classes`);
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await pool.end();
  }
}

// Run the test
testNotificationsQuick();