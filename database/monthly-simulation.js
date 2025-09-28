require('dotenv').config({ path: '../backend/.env' });
const { Pool } = require('pg');
const NotificationService = require('../backend/services/notificationService');

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

class MonthlySimulation {
  constructor() {
    this.notificationService = new NotificationService();
    this.startDate = new Date('2025-09-29'); // Today
    this.endDate = new Date('2025-10-29'); // 1 month
    this.weekdays = [1, 2, 3, 4, 5]; // Monday to Friday
    this.teacherAbsences = new Map();
    this.classSchedules = new Map();
  }

  // Generate realistic teacher absences and breaks
  async generateTeacherAbsences() {
    try {
      console.log('🏖️  Generating realistic teacher absences...');
      
      // Get all teachers
      const teachers = await pool.query('SELECT id, full_name FROM users WHERE role = $1', ['teacher']);
      
      const absenceTypes = [
        { type: 'sick_leave', probability: 0.15, duration: [1, 3] },
        { type: 'personal_leave', probability: 0.08, duration: [1, 2] },
        { type: 'professional_development', probability: 0.05, duration: [1, 1] },
        { type: 'family_emergency', probability: 0.03, duration: [1, 2] },
        { type: 'medical_appointment', probability: 0.12, duration: [0.5, 0.5] }, // Half day
        { type: 'vacation', probability: 0.1, duration: [2, 5] }
      ];

      for (const teacher of teachers.rows) {
        const teacherAbsences = [];
        
        // Generate random absences for this teacher
        for (const absenceType of absenceTypes) {
          if (Math.random() < absenceType.probability) {
            const startDay = Math.floor(Math.random() * 30) + 1;
            const duration = Math.random() * (absenceType.duration[1] - absenceType.duration[0]) + absenceType.duration[0];
            
            const absenceStart = new Date(this.startDate);
            absenceStart.setDate(absenceStart.getDate() + startDay);
            
            // Ensure it's a weekday
            while (!this.weekdays.includes(absenceStart.getDay())) {
              absenceStart.setDate(absenceStart.getDate() + 1);
            }
            
            const absenceEnd = new Date(absenceStart);
            absenceEnd.setDate(absenceEnd.getDate() + Math.floor(duration));
            
            teacherAbsences.push({
              teacher_id: teacher.id,
              teacher_name: teacher.full_name,
              start_date: absenceStart.toISOString().split('T')[0],
              end_date: absenceEnd.toISOString().split('T')[0],
              type: absenceType.type,
              is_half_day: duration < 1
            });
          }
        }
        
        if (teacherAbsences.length > 0) {
          this.teacherAbsences.set(teacher.id, teacherAbsences);
          console.log(`   📅 ${teacher.full_name}: ${teacherAbsences.length} absence(s)`);
        }
      }

      // Store absences in database
      for (const [teacherId, absences] of this.teacherAbsences) {
        for (const absence of absences) {
          await pool.query(`
            INSERT INTO teacher_availability (
              teacher_id, date, is_available, reason, max_periods
            ) VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (teacher_id, date) DO UPDATE SET
              is_available = EXCLUDED.is_available,
              reason = EXCLUDED.reason,
              max_periods = EXCLUDED.max_periods
          `, [
            teacherId,
            absence.start_date,
            false,
            `${absence.type}: ${absence.is_half_day ? 'Half day' : 'Full day'}`,
            absence.is_half_day ? 3 : 0
          ]);
        }
      }

      console.log(`✅ Generated absences for ${this.teacherAbsences.size} teachers`);
      
    } catch (error) {
      console.error('Error generating teacher absences:', error);
    }
  }

  // Generate realistic daily schedules for 1 month
  async generateMonthlySchedules() {
    try {
      console.log('📅 Generating monthly class schedules...');
      
      const { runSchedulingSystem } = require('./scheduling-algorithm');
      
      // Clear existing schedules for the simulation period
      await pool.query(`
        DELETE FROM daily_schedules 
        WHERE schedule_date BETWEEN $1 AND $2
      `, [this.startDate.toISOString().split('T')[0], this.endDate.toISOString().split('T')[0]]);

      let totalScheduled = 0;
      let totalSubstitutions = 0;
      
      // Generate schedules for each weekday
      const currentDate = new Date(this.startDate);
      while (currentDate <= this.endDate) {
        if (this.weekdays.includes(currentDate.getDay())) {
          console.log(`   📆 Scheduling for ${currentDate.toDateString()}`);
          
          try {
            // Use the scheduling algorithm with teacher availability
            const schedules = await runSchedulingSystem(currentDate.toISOString().split('T')[0]);
            
            if (schedules && schedules.length > 0) {
              totalScheduled += schedules.length;
              const substitutions = schedules.filter(s => s.is_substitute).length;
              totalSubstitutions += substitutions;
              
              console.log(`      ✅ ${schedules.length} classes scheduled (${substitutions} substitutions)`);
            }
          } catch (error) {
            console.error(`      ❌ Error scheduling for ${currentDate.toDateString()}:`, error.message);
          }
        }
        
        currentDate.setDate(currentDate.getDate() + 1);
      }

      console.log(`✅ Monthly schedules generated:`);
      console.log(`   📚 Total classes scheduled: ${totalScheduled}`);
      console.log(`   🔄 Total substitutions: ${totalSubstitutions}`);
      
    } catch (error) {
      console.error('Error generating monthly schedules:', error);
    }
  }

  // Simulate realistic attendance patterns
  async generateAttendanceData() {
    try {
      console.log('👥 Generating realistic attendance data...');
      
      const attendancePatterns = {
        excellent: { probability: 0.25, attendanceRate: 0.95 },
        good: { probability: 0.35, attendanceRate: 0.85 },
        average: { probability: 0.25, attendanceRate: 0.75 },
        poor: { probability: 0.15, attendanceRate: 0.60 }
      };

      // Get all scheduled classes
      const scheduledClasses = await pool.query(`
        SELECT ds.*, c.name as class_name, ce.student_id
        FROM daily_schedules ds
        JOIN classes c ON ds.class_id = c.id
        JOIN class_enrollments ce ON c.id = ce.class_id AND ce.is_active = true
        WHERE ds.schedule_date BETWEEN $1 AND $2
        ORDER BY ds.schedule_date, ds.time_slot_id
      `, [this.startDate.toISOString().split('T')[0], this.endDate.toISOString().split('T')[0]]);

      let totalAttendanceRecords = 0;
      
      for (const classSession of scheduledClasses.rows) {
        // Determine student's attendance pattern
        const patternKeys = Object.keys(attendancePatterns);
        let selectedPattern = 'average';
        let randomValue = Math.random();
        
        for (const pattern of patternKeys) {
          if (randomValue < attendancePatterns[pattern].probability) {
            selectedPattern = pattern;
            break;
          }
          randomValue -= attendancePatterns[pattern].probability;
        }

        const isPresent = Math.random() < attendancePatterns[selectedPattern].attendanceRate;
        
        // Add some realistic absence reasons
        let absenceReason = null;
        if (!isPresent) {
          const reasons = ['illness', 'family_emergency', 'transportation', 'personal', null];
          absenceReason = reasons[Math.floor(Math.random() * reasons.length)];
        }

        await pool.query(`
          INSERT INTO attendance (
            student_id, class_id, schedule_date, time_slot_id,
            is_present, absence_reason, marked_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT (student_id, class_id, schedule_date, time_slot_id)
          DO UPDATE SET
            is_present = EXCLUDED.is_present,
            absence_reason = EXCLUDED.absence_reason,
            marked_at = EXCLUDED.marked_at
        `, [
          classSession.student_id,
          classSession.class_id,
          classSession.schedule_date,
          classSession.time_slot_id,
          isPresent,
          absenceReason,
          new Date()
        ]);

        totalAttendanceRecords++;
      }

      console.log(`✅ Generated ${totalAttendanceRecords} attendance records`);
      
    } catch (error) {
      console.error('Error generating attendance data:', error);
    }
  }

  // Generate assignments and grades for the month
  async generateAssignmentsAndGrades() {
    try {
      console.log('📝 Generating assignments and grades...');
      
      const assignmentTypes = [
        { type: 'homework', frequency: 0.8, points: 10 },
        { type: 'quiz', frequency: 0.3, points: 25 },
        { type: 'test', frequency: 0.15, points: 100 },
        { type: 'project', frequency: 0.1, points: 50 },
        { type: 'presentation', frequency: 0.05, points: 30 }
      ];

      // Get all classes
      const classes = await pool.query(`
        SELECT c.*, u.full_name as teacher_name
        FROM classes c
        JOIN users u ON c.teacher_id = u.id
      `);

      let totalAssignments = 0;
      let totalSubmissions = 0;

      for (const classInfo of classes.rows) {
        // Generate assignments for this class
        for (const assignmentType of assignmentTypes) {
          if (Math.random() < assignmentType.frequency) {
            const assignmentDate = new Date(this.startDate);
            assignmentDate.setDate(assignmentDate.getDate() + Math.floor(Math.random() * 30));
            
            const dueDate = new Date(assignmentDate);
            dueDate.setDate(dueDate.getDate() + Math.floor(Math.random() * 7) + 1);

            const assignment = await pool.query(`
              INSERT INTO assignments (
                class_id, title, description, assignment_type,
                total_points, due_date, created_at
              ) VALUES ($1, $2, $3, $4, $5, $6, $7)
              RETURNING id
            `, [
              classInfo.id,
              `${classInfo.subject} ${assignmentType.type.charAt(0).toUpperCase() + assignmentType.type.slice(1)}`,
              `${assignmentType.type.charAt(0).toUpperCase() + assignmentType.type.slice(1)} assignment for ${classInfo.name}`,
              assignmentType.type,
              assignmentType.points,
              dueDate,
              assignmentDate
            ]);

            totalAssignments++;

            // Generate submissions for enrolled students
            const students = await pool.query(`
              SELECT student_id FROM class_enrollments 
              WHERE class_id = $1 AND is_active = true
            `, [classInfo.id]);

            for (const student of students.rows) {
              // Simulate realistic submission patterns
              const submissionProbability = assignmentType.type === 'homework' ? 0.85 : 
                                           assignmentType.type === 'quiz' ? 0.90 :
                                           assignmentType.type === 'test' ? 0.95 : 0.80;

              if (Math.random() < submissionProbability) {
                const isLate = Math.random() < 0.15;
                const submissionDate = isLate ? 
                  new Date(dueDate.getTime() + Math.random() * 3 * 24 * 60 * 60 * 1000) : 
                  new Date(dueDate.getTime() - Math.random() * 2 * 24 * 60 * 60 * 1000);

                // Generate realistic grades
                const performanceLevel = Math.random();
                let scorePercentage;
                if (performanceLevel < 0.15) scorePercentage = 0.4 + Math.random() * 0.2; // Poor (40-60%)
                else if (performanceLevel < 0.35) scorePercentage = 0.6 + Math.random() * 0.15; // Below Average (60-75%)
                else if (performanceLevel < 0.65) scorePercentage = 0.75 + Math.random() * 0.15; // Average (75-90%)
                else if (performanceLevel < 0.85) scorePercentage = 0.85 + Math.random() * 0.12; // Good (85-97%)
                else scorePercentage = 0.95 + Math.random() * 0.05; // Excellent (95-100%)

                const pointsEarned = Math.round(assignmentType.points * scorePercentage);

                await pool.query(`
                  INSERT INTO assignment_submissions (
                    assignment_id, student_id, submitted_at,
                    points_earned, is_late, graded_at
                  ) VALUES ($1, $2, $3, $4, $5, $6)
                `, [
                  assignment.rows[0].id,
                  student.student_id,
                  submissionDate,
                  pointsEarned,
                  isLate,
                  new Date(submissionDate.getTime() + Math.random() * 2 * 24 * 60 * 60 * 1000)
                ]);

                totalSubmissions++;
              }
            }
          }
        }
      }

      console.log(`✅ Generated ${totalAssignments} assignments with ${totalSubmissions} submissions`);
      
    } catch (error) {
      console.error('Error generating assignments and grades:', error);
    }
  }

  // Test notification system with various scenarios
  async testNotificationSystem() {
    try {
      console.log('📢 Testing notification system...');
      
      // Send test notifications to different users
      const students = await pool.query(`
        SELECT id, full_name FROM users WHERE role = 'student' LIMIT 5
      `);

      const teachers = await pool.query(`
        SELECT id, full_name FROM users WHERE role = 'teacher' LIMIT 3
      `);

      // Test immediate notifications
      for (const student of students.rows) {
        await this.notificationService.sendImmediateNotification(
          student.id,
          '🎉 Welcome to the New Semester!',
          'Your classes have been scheduled. Check your dashboard for upcoming sessions.',
          'welcome',
          { test: true, semester: 'Fall 2025' }
        );
      }

      // Test class reminder notifications (simulate classes starting soon)
      const upcomingClasses = await pool.query(`
        SELECT 
          ds.*,
          c.name as class_name,
          c.subject,
          u.full_name as teacher_name,
          ts.start_time,
          ts.description as time_slot_description
        FROM daily_schedules ds
        JOIN classes c ON ds.class_id = c.id
        JOIN users u ON ds.teacher_id = u.id
        JOIN time_slots ts ON ds.time_slot_id = ts.id
        WHERE ds.schedule_date = CURRENT_DATE
        LIMIT 3
      `);

      for (const classInfo of upcomingClasses.rows) {
        await this.notificationService.sendClassNotifications(classInfo);
      }

      // Test assignment notifications
      for (const teacher of teachers.rows) {
        await this.notificationService.sendImmediateNotification(
          teacher.id,
          '📝 New Assignment Created',
          'Your assignment has been successfully created and distributed to students.',
          'assignment_created',
          { test: true, assignment_type: 'homework' }
        );
      }

      console.log('✅ Test notifications sent successfully');
      
    } catch (error) {
      console.error('Error testing notification system:', error);
    }
  }

  // Generate realistic class disruptions and events
  async generateClassDisruptions() {
    try {
      console.log('⚠️  Generating realistic class disruptions...');
      
      const disruptionTypes = [
        { type: 'fire_drill', probability: 0.02, duration: 30 },
        { type: 'assembly', probability: 0.05, duration: 60 },
        { type: 'technical_issues', probability: 0.08, duration: 15 },
        { type: 'weather_delay', probability: 0.03, duration: 120 },
        { type: 'guest_speaker', probability: 0.04, duration: 45 }
      ];

      let totalDisruptions = 0;

      const currentDate = new Date(this.startDate);
      while (currentDate <= this.endDate) {
        if (this.weekdays.includes(currentDate.getDay())) {
          for (const disruption of disruptionTypes) {
            if (Math.random() < disruption.probability) {
              // Log the disruption
              await pool.query(`
                INSERT INTO schedule_conflicts (
                  schedule_date, conflict_type, description,
                  resolution_status, created_at
                ) VALUES ($1, $2, $3, $4, $5)
              `, [
                currentDate.toISOString().split('T')[0],
                disruption.type,
                `${disruption.type.replace('_', ' ').toUpperCase()}: ${disruption.duration} minute disruption`,
                'resolved',
                new Date()
              ]);

              totalDisruptions++;
              console.log(`   ⚠️  ${currentDate.toDateString()}: ${disruption.type} (${disruption.duration} min)`);
            }
          }
        }
        currentDate.setDate(currentDate.getDate() + 1);
      }

      console.log(`✅ Generated ${totalDisruptions} class disruptions`);
      
    } catch (error) {
      console.error('Error generating class disruptions:', error);
    }
  }

  // Generate comprehensive simulation report
  async generateSimulationReport() {
    try {
      console.log('📊 Generating simulation report...');
      
      // Get statistics
      const stats = await pool.query(`
        SELECT 
          (SELECT COUNT(*) FROM daily_schedules WHERE schedule_date BETWEEN $1 AND $2) as total_classes,
          (SELECT COUNT(*) FROM daily_schedules WHERE schedule_date BETWEEN $1 AND $2 AND is_substitute = true) as substitutions,
          (SELECT COUNT(*) FROM teacher_availability WHERE date BETWEEN $1 AND $2 AND is_available = false) as teacher_absences,
          (SELECT COUNT(*) FROM assignments WHERE created_at BETWEEN $1 AND $2) as total_assignments,
          (SELECT COUNT(*) FROM assignment_submissions WHERE submitted_at BETWEEN $1 AND $2) as total_submissions,
          (SELECT COUNT(*) FROM attendance WHERE schedule_date BETWEEN $1 AND $2) as attendance_records,
          (SELECT COUNT(*) FROM attendance WHERE schedule_date BETWEEN $1 AND $2 AND is_present = true) as present_records,
          (SELECT COUNT(*) FROM notifications WHERE created_at BETWEEN $1 AND $2) as notifications_sent,
          (SELECT COUNT(*) FROM schedule_conflicts WHERE schedule_date BETWEEN $1 AND $2) as disruptions
      `, [this.startDate, this.endDate]);

      const result = stats.rows[0];
      const attendanceRate = result.attendance_records > 0 ? 
        (parseInt(result.present_records) / parseInt(result.attendance_records) * 100).toFixed(1) : 0;

      console.log('\n🎯 MONTHLY SIMULATION REPORT');
      console.log('=====================================');
      console.log(`📅 Simulation Period: ${this.startDate.toDateString()} - ${this.endDate.toDateString()}`);
      console.log(`📚 Total Classes Scheduled: ${result.total_classes}`);
      console.log(`🔄 Substitutions Required: ${result.substitutions} (${(result.substitutions/result.total_classes*100).toFixed(1)}%)`);
      console.log(`🏖️  Teacher Absences: ${result.teacher_absences}`);
      console.log(`📝 Assignments Created: ${result.total_assignments}`);
      console.log(`✍️  Assignment Submissions: ${result.total_submissions}`);
      console.log(`👥 Attendance Records: ${result.attendance_records}`);
      console.log(`✅ Attendance Rate: ${attendanceRate}%`);
      console.log(`📢 Notifications Sent: ${result.notifications_sent}`);
      console.log(`⚠️  Class Disruptions: ${result.disruptions}`);
      console.log('=====================================\n');

      return result;
      
    } catch (error) {
      console.error('Error generating simulation report:', error);
    }
  }

  // Run complete simulation
  async runSimulation() {
    try {
      console.log('🚀 STARTING MONTHLY SIMULATION');
      console.log('==============================\n');
      
      await this.generateTeacherAbsences();
      await this.generateMonthlySchedules();
      await this.generateAttendanceData();
      await this.generateAssignmentsAndGrades();
      await this.generateClassDisruptions();
      await this.testNotificationSystem();
      
      const report = await this.generateSimulationReport();
      
      console.log('✅ SIMULATION COMPLETED SUCCESSFULLY!');
      console.log('=====================================');
      
      return report;
      
    } catch (error) {
      console.error('❌ Simulation failed:', error);
    } finally {
      await pool.end();
    }
  }
}

// Run simulation
if (require.main === module) {
  const simulation = new MonthlySimulation();
  simulation.runSimulation().then(() => {
    console.log('🎉 Simulation finished!');
    process.exit(0);
  }).catch(error => {
    console.error('💥 Simulation error:', error);
    process.exit(1);
  });
}

module.exports = MonthlySimulation;