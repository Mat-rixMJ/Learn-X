require('dotenv').config({ path: '../backend/.env' });
const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

async function simulateMonthlySchedule() {
  try {
    console.log('📅 SIMULATING 1-MONTH REALISTIC SCHEDULE');
    console.log('=====================================\n');

    const startDate = new Date('2025-09-29'); // Start from today
    const daysToSimulate = 30; // 1 month
    
    // Get all teachers and classes
    const teachers = await pool.query(`
      SELECT u.*, STRING_AGG(ts.subject, ', ') as subjects
      FROM users u
      LEFT JOIN teacher_subjects ts ON u.id = ts.teacher_id
      WHERE u.role = 'teacher'
      GROUP BY u.id, u.full_name, u.username, u.email, u.role, u.created_at
      ORDER BY u.full_name
    `);
    
    const classes = await pool.query(`
      SELECT * FROM classes ORDER BY subject, name
    `);

    const timeSlots = await pool.query(`
      SELECT * FROM time_slots WHERE is_break = false ORDER BY id
    `);

    console.log(`👨‍🏫 Found ${teachers.rows.length} teachers`);
    console.log(`📚 Found ${classes.rows.length} classes`);
    console.log(`⏰ Found ${timeSlots.rows.length} time slots\n`);

    // Simulation statistics
    let stats = {
      totalScheduledClasses: 0,
      teacherAbsences: 0,
      substitutionsMade: 0,
      emergencyChanges: 0,
      successfulNotifications: 0,
      failedSchedules: 0,
      holidaysSkipped: 0
    };

    // Clear existing schedules for the simulation period
    await pool.query(`
      DELETE FROM daily_schedules 
      WHERE schedule_date BETWEEN $1 AND $2
    `, [startDate.toISOString().split('T')[0], 
        new Date(startDate.getTime() + daysToSimulate * 24 * 60 * 60 * 1000).toISOString().split('T')[0]]);
    
    console.log('🧹 Cleared existing schedules for simulation period\n');

    // Simulate each day
    for (let day = 0; day < daysToSimulate; day++) {
      const currentDate = new Date(startDate.getTime() + day * 24 * 60 * 60 * 1000);
      const dateStr = currentDate.toISOString().split('T')[0];
      const dayName = currentDate.toLocaleDateString('en-US', { weekday: 'long' });
      
      // Skip weekends
      if (currentDate.getDay() === 0 || currentDate.getDay() === 6) {
        console.log(`⏭️  Skipping ${dayName} ${dateStr} (Weekend)`);
        continue;
      }

      // Random holidays (5% chance)
      if (Math.random() < 0.05) {
        console.log(`🏖️  Holiday declared for ${dayName} ${dateStr}`);
        stats.holidaysSkipped++;
        continue;
      }

      console.log(`\n📅 === ${dayName} ${dateStr} ===`);

      // Simulate teacher availability (realistic absence rates)
      const teacherAvailability = new Map();
      const absentTeachers = [];
      
      teachers.rows.forEach(teacher => {
        // 8% chance of absence (realistic for schools)
        const isAbsent = Math.random() < 0.08;
        teacherAvailability.set(teacher.id, !isAbsent);
        
        if (isAbsent) {
          const reasons = ['sick leave', 'personal emergency', 'family matter', 'medical appointment', 'training session'];
          const reason = reasons[Math.floor(Math.random() * reasons.length)];
          console.log(`🤒 ${teacher.full_name} is absent (${reason})`);
          absentTeachers.push({ ...teacher, reason });
          stats.teacherAbsences++;
        }
      });

      // Schedule classes for the day
      const dailySchedule = [];
      const teacherWorkload = new Map(); // Track periods per teacher
      const usedTimeSlots = new Set();

      // Initialize teacher workload tracking
      teachers.rows.forEach(teacher => {
        teacherWorkload.set(teacher.id, 0);
      });

      // Try to schedule each class
      for (const classInfo of classes.rows) {
        // Find available teachers for this subject
        const availableTeachers = teachers.rows.filter(teacher => {
          const isAvailable = teacherAvailability.get(teacher.id);
          const hasCapacity = teacherWorkload.get(teacher.id) < 6; // Max 6 periods per day
          const canTeachSubject = teacher.subjects && teacher.subjects.includes(classInfo.subject);
          
          return isAvailable && hasCapacity && canTeachSubject;
        });

        if (availableTeachers.length === 0) {
          // Try to find a substitute teacher
          const substitutes = teachers.rows.filter(teacher => {
            const isAvailable = teacherAvailability.get(teacher.id);
            const hasCapacity = teacherWorkload.get(teacher.id) < 4; // Substitutes max 4 periods
            return isAvailable && hasCapacity;
          });

          if (substitutes.length > 0) {
            const substitute = substitutes[Math.floor(Math.random() * substitutes.length)];
            const availableSlot = timeSlots.rows.find(slot => !usedTimeSlots.has(`${slot.id}-${substitute.id}`));
            
            if (availableSlot) {
              dailySchedule.push({
                class_id: classInfo.id,
                teacher_id: substitute.id,
                time_slot_id: availableSlot.id,
                is_substitute: true,
                original_teacher_id: null,
                subject: classInfo.subject,
                status: 'scheduled'
              });
              
              teacherWorkload.set(substitute.id, teacherWorkload.get(substitute.id) + 1);
              usedTimeSlots.add(`${availableSlot.id}-${substitute.id}`);
              stats.substitutionsMade++;
              console.log(`🔄 ${classInfo.name} assigned to substitute ${substitute.full_name}`);
            } else {
              console.log(`❌ No substitute available for ${classInfo.name}`);
              stats.failedSchedules++;
            }
          } else {
            console.log(`❌ No teachers available for ${classInfo.name}`);
            stats.failedSchedules++;
          }
          continue;
        }

        // Select best available teacher (prefer those with lighter workload)
        const selectedTeacher = availableTeachers.reduce((best, current) => {
          const bestLoad = teacherWorkload.get(best.id);
          const currentLoad = teacherWorkload.get(current.id);
          return currentLoad < bestLoad ? current : best;
        });

        // Find available time slot
        const availableSlot = timeSlots.rows.find(slot => 
          !usedTimeSlots.has(`${slot.id}-${selectedTeacher.id}`)
        );

        if (availableSlot) {
          dailySchedule.push({
            class_id: classInfo.id,
            teacher_id: selectedTeacher.id,
            time_slot_id: availableSlot.id,
            is_substitute: false,
            original_teacher_id: null,
            subject: classInfo.subject,
            status: 'scheduled'
          });
          
          teacherWorkload.set(selectedTeacher.id, teacherWorkload.get(selectedTeacher.id) + 1);
          usedTimeSlots.add(`${availableSlot.id}-${selectedTeacher.id}`);
          stats.totalScheduledClasses++;
        } else {
          console.log(`⏰ No time slot available for ${classInfo.name} with ${selectedTeacher.full_name}`);
          stats.failedSchedules++;
        }
      }

      // Save daily schedule to database
      for (const scheduleItem of dailySchedule) {
        try {
          await pool.query(`
            INSERT INTO daily_schedules (
              schedule_date, time_slot_id, class_id, teacher_id, 
              is_substitute, original_teacher_id, subject, status
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          `, [
            dateStr,
            scheduleItem.time_slot_id,
            scheduleItem.class_id,
            scheduleItem.teacher_id,
            scheduleItem.is_substitute,
            scheduleItem.original_teacher_id,
            scheduleItem.subject,
            scheduleItem.status
          ]);
        } catch (error) {
          console.error(`❌ Error saving schedule item:`, error.message);
          stats.failedSchedules++;
        }
      }

      // Simulate random emergency changes (2% chance)
      if (Math.random() < 0.02 && dailySchedule.length > 0) {
        const emergencyTypes = ['teacher emergency', 'room unavailable', 'equipment failure', 'student assembly'];
        const emergencyType = emergencyTypes[Math.floor(Math.random() * emergencyTypes.length)];
        console.log(`🚨 Emergency change: ${emergencyType}`);
        stats.emergencyChanges++;
      }

      console.log(`📊 Scheduled ${dailySchedule.length} classes`);
      console.log(`👥 Teacher workload: ${Array.from(teacherWorkload.entries())
        .filter(([_, load]) => load > 0)
        .map(([teacherId, load]) => {
          const teacher = teachers.rows.find(t => t.id === teacherId);
          return `${teacher.full_name}: ${load}`;
        }).join(', ')}`);
    }

    // Generate summary report
    console.log('\n📊 === MONTHLY SIMULATION SUMMARY ===');
    console.log(`📅 Simulation Period: ${startDate.toDateString()} - ${new Date(startDate.getTime() + daysToSimulate * 24 * 60 * 60 * 1000).toDateString()}`);
    console.log(`📚 Total Classes Scheduled: ${stats.totalScheduledClasses}`);
    console.log(`🤒 Teacher Absences: ${stats.teacherAbsences}`);
    console.log(`🔄 Substitutions Made: ${stats.substitutionsMade}`);
    console.log(`🚨 Emergency Changes: ${stats.emergencyChanges}`);
    console.log(`❌ Failed Schedules: ${stats.failedSchedules}`);
    console.log(`🏖️  Holidays Skipped: ${stats.holidaysSkipped}`);
    
    // Calculate efficiency
    const totalAttempts = stats.totalScheduledClasses + stats.failedSchedules;
    const efficiency = totalAttempts > 0 ? ((stats.totalScheduledClasses / totalAttempts) * 100).toFixed(1) : 0;
    console.log(`📈 Scheduling Efficiency: ${efficiency}%`);

    // Teacher utilization report
    console.log('\n👨‍🏫 === TEACHER UTILIZATION REPORT ===');
    const utilizationReport = await pool.query(`
      SELECT 
        u.full_name,
        COUNT(*) as total_classes,
        COUNT(CASE WHEN ds.is_substitute THEN 1 END) as substitute_classes,
        ROUND(AVG(
          CASE 
            WHEN EXTRACT(DOW FROM ds.schedule_date) BETWEEN 1 AND 5 THEN 1 
            ELSE 0 
          END
        ), 2) as avg_daily_load
      FROM daily_schedules ds
      JOIN users u ON ds.teacher_id = u.id
      WHERE ds.schedule_date BETWEEN $1 AND $2
      GROUP BY u.id, u.full_name
      ORDER BY total_classes DESC
      LIMIT 10
    `, [startDate.toISOString().split('T')[0], 
        new Date(startDate.getTime() + daysToSimulate * 24 * 60 * 60 * 1000).toISOString().split('T')[0]]);

    console.table(utilizationReport.rows);

    // Subject distribution report
    console.log('\n📚 === SUBJECT DISTRIBUTION REPORT ===');
    const subjectReport = await pool.query(`
      SELECT 
        subject,
        COUNT(*) as total_classes,
        COUNT(DISTINCT teacher_id) as teachers_involved,
        COUNT(CASE WHEN is_substitute THEN 1 END) as substitute_classes
      FROM daily_schedules
      WHERE schedule_date BETWEEN $1 AND $2
      GROUP BY subject
      ORDER BY total_classes DESC
    `, [startDate.toISOString().split('T')[0], 
        new Date(startDate.getTime() + daysToSimulate * 24 * 60 * 60 * 1000).toISOString().split('T')[0]]);

    console.table(subjectReport.rows);

    console.log('\n🎉 MONTHLY SIMULATION COMPLETED!');
    console.log('📱 The notification system will automatically send reminders 45 minutes before each class');
    console.log('🔔 Students will receive notifications on their dashboards');
    console.log('📧 In a real system, email/SMS notifications would also be sent');

  } catch (error) {
    console.error('❌ Simulation error:', error);
  } finally {
    await pool.end();
  }
}

simulateMonthlySchedule();