require('dotenv').config({ path: '../backend/.env' });
const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

async function testDualNotifications() {
  try {
    console.log('🔔 TESTING DUAL NOTIFICATION SYSTEM');
    console.log('===================================\n');

    const now = new Date();
    const today = now.toISOString().split('T')[0];
    
    console.log(`📅 Today: ${today}`);
    console.log(`🕐 Current time: ${now.toLocaleTimeString()}\n`);

    // Create test time slots for both 45 minutes and 5 minutes from now
    const earlyNotificationTime = new Date(now.getTime() + 45 * 60 * 1000);
    const finalNotificationTime = new Date(now.getTime() + 5 * 60 * 1000);
    
    console.log(`⏰ 45-minute reminder time: ${earlyNotificationTime.toLocaleTimeString()}`);
    console.log(`⏰ 5-minute reminder time: ${finalNotificationTime.toLocaleTimeString()}\n`);

    // Update time slots to match our test times
    await pool.query(`
      UPDATE time_slots 
      SET start_time = $1, end_time = $2
      WHERE id = 1
    `, [
      earlyNotificationTime.toTimeString().split(' ')[0],
      new Date(earlyNotificationTime.getTime() + 45 * 60 * 1000).toTimeString().split(' ')[0]
    ]);

    await pool.query(`
      UPDATE time_slots 
      SET start_time = $1, end_time = $2
      WHERE id = 2
    `, [
      finalNotificationTime.toTimeString().split(' ')[0],
      new Date(finalNotificationTime.getTime() + 45 * 60 * 1000).toTimeString().split(' ')[0]
    ]);

    console.log('⏰ Updated time slots for testing\n');

    // Get sample classes and teachers
    const classes = await pool.query(`
      SELECT * FROM classes 
      WHERE subject IN ('Mathematics', 'Physics') 
      LIMIT 2
    `);

    const teachers = await pool.query(`
      SELECT * FROM users 
      WHERE role = 'teacher' 
      LIMIT 2
    `);

    if (classes.rows.length < 2 || teachers.rows.length < 2) {
      console.log('❌ Insufficient test data. Need at least 2 classes and 2 teachers.');
      return;
    }

    // Clear existing schedules for today
    await pool.query(`
      DELETE FROM daily_schedules WHERE schedule_date = $1
    `, [today]);

    // Create test schedules
    const schedules = [
      {
        class: classes.rows[0],
        teacher: teachers.rows[0],
        time_slot_id: 1,
        notification_type: '45-minute early reminder'
      },
      {
        class: classes.rows[1],
        teacher: teachers.rows[1],
        time_slot_id: 2,
        notification_type: '5-minute final reminder'
      }
    ];

    console.log('📚 Creating test schedules...');
    for (const schedule of schedules) {
      await pool.query(`
        INSERT INTO daily_schedules (
          schedule_date, time_slot_id, class_id, teacher_id, subject, status
        ) VALUES ($1, $2, $3, $4, $5, $6)
      `, [today, schedule.time_slot_id, schedule.class.id, schedule.teacher.id, schedule.class.subject, 'scheduled']);
      
      console.log(`   ✅ ${schedule.class.name} with ${schedule.teacher.full_name} (${schedule.notification_type})`);
    }

    // Import and test notification service
    const NotificationService = require('../backend/services/notificationService');
    const notificationService = new NotificationService();

    console.log('\n📢 Testing notification service...');
    
    // Wait a moment for the service to initialize
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Manually trigger both notification types
    console.log('\n🔔 Triggering 45-minute notifications...');
    await notificationService.checkClassesAtInterval(45, 'early_reminder');

    console.log('\n🔔 Triggering 5-minute notifications...');
    await notificationService.checkClassesAtInterval(5, 'final_reminder');

    // Get notification statistics
    const notificationStats = await pool.query(`
      SELECT 
        type,
        COUNT(*) as count,
        COUNT(CASE WHEN is_read = false THEN 1 END) as unread_count
      FROM notifications
      WHERE created_at > NOW() - INTERVAL '1 hour'
      GROUP BY type
      ORDER BY count DESC
    `);

    console.log('\n📊 NOTIFICATION STATISTICS:');
    console.table(notificationStats.rows);

    // Get recent notifications for review
    const recentNotifications = await pool.query(`
      SELECT 
        n.title,
        n.message,
        n.type,
        u.full_name as student_name,
        n.created_at
      FROM notifications n
      JOIN users u ON n.user_id = u.id
      WHERE n.created_at > NOW() - INTERVAL '10 minutes'
      ORDER BY n.created_at DESC
      LIMIT 10
    `);

    console.log('\n📱 RECENT NOTIFICATIONS:');
    recentNotifications.rows.forEach((notif, index) => {
      const timeAgo = Math.floor((new Date() - new Date(notif.created_at)) / 1000);
      console.log(`${index + 1}. [${notif.type}] ${notif.title}`);
      console.log(`   To: ${notif.student_name} (${timeAgo}s ago)`);
      console.log(`   Message: ${notif.message.substring(0, 80)}...`);
      console.log('');
    });

    console.log('✅ DUAL NOTIFICATION TEST COMPLETED!');
    console.log('🔔 Students will now receive notifications at both:');
    console.log('   📚 45 minutes before class (Early reminder)');
    console.log('   🚨 5 minutes before class (Final urgent reminder)');
    console.log('📱 Check the frontend dashboard to see the notifications');

  } catch (error) {
    console.error('❌ Test error:', error);
  } finally {
    await pool.end();
  }
}

testDualNotifications();