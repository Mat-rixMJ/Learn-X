const { Pool } = require('pg');
require('dotenv').config({ path: './backend/.env' });

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'learnx',
  password: process.env.DB_PASSWORD || 'postgres',
  port: process.env.DB_PORT || 5432,
});

// Time slot configuration
const TIME_SLOTS = [
  { id: 1, start: '08:00', end: '08:45', period: 1 },
  { id: 2, start: '08:45', end: '09:30', period: 2 },
  { id: 3, start: '09:30', end: '10:15', period: 3 },
  { id: 4, start: '10:15', end: '10:30', period: 'BREAK', isBreak: true },
  { id: 5, start: '10:30', end: '11:15', period: 4 },
  { id: 6, start: '11:15', end: '12:00', period: 5 },
  { id: 7, start: '12:00', end: '12:45', period: 6 },
  { id: 8, start: '12:45', end: '13:30', period: 'LUNCH', isBreak: true },
  { id: 9, start: '13:30', end: '14:15', period: 7 },
  { id: 10, start: '14:15', end: '15:00', period: 8 },
  { id: 11, start: '15:00', end: '15:45', period: 9 },
  { id: 12, start: '15:45', end: '16:00', period: 'BREAK', isBreak: true },
  { id: 13, start: '16:00', end: '16:45', period: 10 }
];

// Days of the week (1 = Monday, 5 = Friday)
const WORKING_DAYS = [1, 2, 3, 4, 5];

// Teacher workload limits
const MAX_PERIODS_PER_DAY = 6;
const MAX_CONSECUTIVE_PERIODS = 3;
const MIN_BREAK_BETWEEN_CLASSES = 1; // periods
const PREFERRED_CLASSES_PER_TEACHER = 3; // per day

class SchedulingAlgorithm {
  constructor() {
    this.teachers = [];
    this.classes = [];
    this.schedule = new Map(); // Map<date, Map<timeSlot, assignment>>
    this.teacherAvailability = new Map();
    this.teacherWorkload = new Map();
    this.classRequirements = new Map();
    this.substitutes = new Map();
  }

  // Load all necessary data from database
  async loadData(client) {
    console.log('📊 Loading teachers, classes, and availability data...');
    
    // Load teachers with their subjects and current status
    const teachersResult = await client.query(`
      SELECT u.id, u.full_name, u.email, 
             CASE 
               WHEN u.full_name LIKE '%Mathematics%' THEN 'Mathematics'
               WHEN u.full_name LIKE '%Physics%' THEN 'Physics'
               WHEN u.full_name LIKE '%Chemistry%' THEN 'Chemistry'
               WHEN u.full_name LIKE '%Biology%' THEN 'Biology'
               WHEN u.full_name LIKE '%Computer Science%' THEN 'Computer Science'
               WHEN u.full_name LIKE '%English%' THEN 'English'
               WHEN u.full_name LIKE '%History%' THEN 'History'
               WHEN u.full_name LIKE '%Geography%' THEN 'Geography'
               WHEN u.full_name LIKE '%Economics%' THEN 'Economics'
               WHEN u.full_name LIKE '%Psychology%' THEN 'Psychology'
               WHEN u.full_name LIKE '%Art%' THEN 'Art'
               WHEN u.full_name LIKE '%Music%' THEN 'Music'
               WHEN u.full_name LIKE '%Physical Education%' THEN 'Physical Education'
               WHEN u.full_name LIKE '%Business%' THEN 'Business'
               WHEN u.full_name LIKE '%Statistics%' THEN 'Statistics'
               ELSE 'General'
             END as subject_specialization
      FROM users u
      WHERE u.role = 'teacher'
      ORDER BY u.full_name
    `);
    
    this.teachers = teachersResult.rows;
    
    // Load classes with enrollment counts
    const classesResult = await client.query(`
      SELECT c.id, c.name, c.subject, c.teacher_id, c.max_students,
             COUNT(ce.student_id) as enrolled_count,
             u.full_name as assigned_teacher
      FROM classes c
      JOIN users u ON c.teacher_id = u.id
      LEFT JOIN class_enrollments ce ON c.id = ce.class_id AND ce.is_active = true
      GROUP BY c.id, c.name, c.subject, c.teacher_id, c.max_students, u.full_name
      HAVING COUNT(ce.student_id) > 0
      ORDER BY c.subject, c.name
    `);
    
    this.classes = classesResult.rows;
    
    // Initialize teacher availability (assume all available initially)
    this.teachers.forEach(teacher => {
      this.teacherAvailability.set(teacher.id, {
        isAvailable: true,
        onVacation: false,
        vacationDates: [],
        unavailableSlots: new Set(),
        maxPeriodsPerDay: MAX_PERIODS_PER_DAY,
        preferredSubjects: [teacher.subject_specialization]
      });
    });
    
    // Simulate some teachers on vacation (2-3 teachers)
    this.simulateVacations();
    
    // Build substitute teacher mapping
    this.buildSubstituteMapping();
    
    console.log(`✅ Loaded ${this.teachers.length} teachers and ${this.classes.length} classes`);
  }

  // Simulate vacation schedules for some teachers
  simulateVacations() {
    const teachersOnVacation = Math.min(3, Math.floor(this.teachers.length * 0.05)); // 5% of teachers
    const vacationTeachers = [...this.teachers].sort(() => 0.5 - Math.random()).slice(0, teachersOnVacation);
    
    vacationTeachers.forEach(teacher => {
      const availability = this.teacherAvailability.get(teacher.id);
      availability.onVacation = true;
      availability.isAvailable = false;
      
      // Generate random vacation dates (3-7 days)
      const vacationDays = Math.floor(Math.random() * 5) + 3;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() + Math.floor(Math.random() * 10));
      
      for (let i = 0; i < vacationDays; i++) {
        const vacationDate = new Date(startDate);
        vacationDate.setDate(vacationDate.getDate() + i);
        availability.vacationDates.push(vacationDate.toISOString().split('T')[0]);
      }
      
      console.log(`🏖️  ${teacher.full_name} is on vacation for ${vacationDays} days`);
    });
  }

  // Build substitute teacher mapping based on subject expertise
  buildSubstituteMapping() {
    const subjectTeachers = new Map();
    
    // Group teachers by subject
    this.teachers.forEach(teacher => {
      const availability = this.teacherAvailability.get(teacher.id);
      if (availability.isAvailable) {
        const subject = availability.preferredSubjects[0];
        if (!subjectTeachers.has(subject)) {
          subjectTeachers.set(subject, []);
        }
        subjectTeachers.get(subject).push(teacher);
      }
    });
    
    // For each subject, create substitute pools
    subjectTeachers.forEach((teachers, subject) => {
      teachers.forEach(teacher => {
        if (!this.substitutes.has(teacher.id)) {
          this.substitutes.set(teacher.id, []);
        }
        
        // Add other teachers of same subject as potential substitutes
        const otherTeachers = teachers.filter(t => t.id !== teacher.id);
        this.substitutes.get(teacher.id).push(...otherTeachers);
        
        // Add teachers of related subjects as secondary substitutes
        const relatedSubjects = this.getRelatedSubjects(subject);
        relatedSubjects.forEach(relatedSubject => {
          const relatedTeachers = subjectTeachers.get(relatedSubject) || [];
          this.substitutes.get(teacher.id).push(...relatedTeachers);
        });
      });
    });
  }

  // Get related subjects for substitute teaching
  getRelatedSubjects(subject) {
    const subjectGroups = {
      'Mathematics': ['Physics', 'Statistics', 'Computer Science'],
      'Physics': ['Mathematics', 'Chemistry'],
      'Chemistry': ['Physics', 'Biology'],
      'Biology': ['Chemistry', 'Psychology'],
      'English': ['History', 'Geography'],
      'History': ['English', 'Geography', 'Economics'],
      'Geography': ['History', 'Economics'],
      'Art': ['Music'],
      'Music': ['Art'],
      'Business': ['Economics', 'Mathematics'],
      'Economics': ['Business', 'Mathematics', 'Statistics'],
      'Psychology': ['Biology', 'English'],
      'Computer Science': ['Mathematics', 'Physics'],
      'Statistics': ['Mathematics', 'Economics'],
      'Physical Education': []
    };
    
    return subjectGroups[subject] || [];
  }

  // Check if teacher is available for a specific date and time slot
  isTeacherAvailable(teacherId, date, timeSlotId) {
    const availability = this.teacherAvailability.get(teacherId);
    if (!availability || !availability.isAvailable) return false;
    
    // Check vacation dates
    const dateStr = date.toISOString().split('T')[0];
    if (availability.vacationDates.includes(dateStr)) return false;
    
    // Check if already scheduled at this time
    const daySchedule = this.schedule.get(dateStr);
    if (daySchedule && daySchedule.has(timeSlotId)) {
      const assignment = daySchedule.get(timeSlotId);
      if (assignment.teacherId === teacherId) return false;
    }
    
    // Check daily workload limit
    const dailyWorkload = this.getDailyWorkload(teacherId, date);
    if (dailyWorkload >= availability.maxPeriodsPerDay) return false;
    
    // Check consecutive periods limit
    if (this.hasConsecutivePeriods(teacherId, date, timeSlotId)) return false;
    
    return true;
  }

  // Get current daily workload for a teacher
  getDailyWorkload(teacherId, date) {
    const dateStr = date.toISOString().split('T')[0];
    const daySchedule = this.schedule.get(dateStr);
    if (!daySchedule) return 0;
    
    let workload = 0;
    daySchedule.forEach(assignment => {
      if (assignment.teacherId === teacherId && !assignment.isBreak) {
        workload++;
      }
    });
    
    return workload;
  }

  // Check if assigning this slot would create too many consecutive periods
  hasConsecutivePeriods(teacherId, date, timeSlotId) {
    const dateStr = date.toISOString().split('T')[0];
    const daySchedule = this.schedule.get(dateStr);
    if (!daySchedule) return false;
    
    // Check periods before and after
    let consecutiveCount = 1;
    
    // Check backwards
    for (let i = timeSlotId - 1; i >= 1; i--) {
      const timeSlot = TIME_SLOTS.find(slot => slot.id === i);
      if (timeSlot && timeSlot.isBreak) break;
      
      const assignment = daySchedule.get(i);
      if (assignment && assignment.teacherId === teacherId) {
        consecutiveCount++;
      } else {
        break;
      }
    }
    
    // Check forwards
    for (let i = timeSlotId + 1; i <= TIME_SLOTS.length; i++) {
      const timeSlot = TIME_SLOTS.find(slot => slot.id === i);
      if (timeSlot && timeSlot.isBreak) break;
      
      const assignment = daySchedule.get(i);
      if (assignment && assignment.teacherId === teacherId) {
        consecutiveCount++;
      } else {
        break;
      }
    }
    
    return consecutiveCount > MAX_CONSECUTIVE_PERIODS;
  }

  // Find best teacher for a class at specific time
  findBestTeacher(classInfo, date, timeSlotId) {
    // Primary choice: original assigned teacher
    if (this.isTeacherAvailable(classInfo.teacher_id, date, timeSlotId)) {
      return {
        teacherId: classInfo.teacher_id,
        isSubstitute: false,
        priority: 1
      };
    }
    
    // Secondary choice: substitute teachers
    const substitutes = this.substitutes.get(classInfo.teacher_id) || [];
    
    // Sort substitutes by priority (same subject first, then related subjects)
    const sortedSubstitutes = substitutes.sort((a, b) => {
      const aAvailability = this.teacherAvailability.get(a.id);
      const bAvailability = this.teacherAvailability.get(b.id);
      
      const aSubject = aAvailability.preferredSubjects[0];
      const bSubject = bAvailability.preferredSubjects[0];
      
      // Same subject gets higher priority
      if (aSubject === classInfo.subject && bSubject !== classInfo.subject) return -1;
      if (bSubject === classInfo.subject && aSubject !== classInfo.subject) return 1;
      
      // Lower current workload gets higher priority
      const aWorkload = this.getDailyWorkload(a.id, date);
      const bWorkload = this.getDailyWorkload(b.id, date);
      
      return aWorkload - bWorkload;
    });
    
    // Find first available substitute
    for (const substitute of sortedSubstitutes) {
      if (this.isTeacherAvailable(substitute.id, date, timeSlotId)) {
        return {
          teacherId: substitute.id,
          isSubstitute: true,
          originalTeacher: classInfo.teacher_id,
          priority: 2
        };
      }
    }
    
    return null; // No teacher available
  }

  // Generate schedule for a specific date
  generateDaySchedule(date) {
    const dateStr = date.toISOString().split('T')[0];
    console.log(`📅 Generating schedule for ${dateStr}`);
    
    // Initialize day schedule
    const daySchedule = new Map();
    this.schedule.set(dateStr, daySchedule);
    
    // Add break periods
    TIME_SLOTS.forEach(slot => {
      if (slot.isBreak) {
        daySchedule.set(slot.id, {
          timeSlotId: slot.id,
          period: slot.period,
          startTime: slot.start,
          endTime: slot.end,
          isBreak: true
        });
      }
    });
    
    // Distribute classes across available time slots
    const availableSlots = TIME_SLOTS.filter(slot => !slot.isBreak);
    const classesToSchedule = [...this.classes];
    
    // Shuffle classes to ensure fair distribution
    for (let i = classesToSchedule.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [classesToSchedule[i], classesToSchedule[j]] = [classesToSchedule[j], classesToSchedule[i]];
    }
    
    let scheduledClasses = 0;
    let unscheduledClasses = [];
    
    // Try to schedule each class
    for (const classInfo of classesToSchedule) {
      let scheduled = false;
      
      // Try each available time slot
      for (const slot of availableSlots) {
        if (daySchedule.has(slot.id)) continue; // Slot already taken
        
        const teacherAssignment = this.findBestTeacher(classInfo, date, slot.id);
        
        if (teacherAssignment) {
          // Assign class to time slot
          daySchedule.set(slot.id, {
            timeSlotId: slot.id,
            period: slot.period,
            startTime: slot.start,
            endTime: slot.end,
            classId: classInfo.id,
            className: classInfo.name,
            subject: classInfo.subject,
            teacherId: teacherAssignment.teacherId,
            isSubstitute: teacherAssignment.isSubstitute,
            originalTeacher: teacherAssignment.originalTeacher,
            enrolledCount: classInfo.enrolled_count,
            isBreak: false
          });
          
          scheduled = true;
          scheduledClasses++;
          break;
        }
      }
      
      if (!scheduled) {
        unscheduledClasses.push(classInfo);
      }
    }
    
    console.log(`✅ Scheduled ${scheduledClasses} classes, ${unscheduledClasses.length} unscheduled`);
    
    if (unscheduledClasses.length > 0) {
      console.log('⚠️  Unscheduled classes:');
      unscheduledClasses.forEach(cls => {
        console.log(`   - ${cls.name} (${cls.subject})`);
      });
    }
    
    return daySchedule;
  }

  // Generate schedules for multiple days
  generateWeekSchedule(startDate, days = 5) {
    console.log(`📅 Generating ${days}-day schedule starting from ${startDate.toISOString().split('T')[0]}`);
    
    const schedules = [];
    
    for (let i = 0; i < days; i++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(currentDate.getDate() + i);
      
      // Skip weekends
      if (currentDate.getDay() === 0 || currentDate.getDay() === 6) {
        continue;
      }
      
      const daySchedule = this.generateDaySchedule(currentDate);
      schedules.push({
        date: currentDate.toISOString().split('T')[0],
        dayName: currentDate.toLocaleDateString('en-US', { weekday: 'long' }),
        schedule: daySchedule
      });
    }
    
    return schedules;
  }

  // Get schedule statistics
  getScheduleStats() {
    const stats = {
      totalDays: this.schedule.size,
      totalClassesScheduled: 0,
      totalSubstitutions: 0,
      teacherWorkload: new Map(),
      subjectDistribution: new Map(),
      unscheduledClasses: 0
    };
    
    this.schedule.forEach((daySchedule, date) => {
      daySchedule.forEach((assignment, slotId) => {
        if (!assignment.isBreak) {
          stats.totalClassesScheduled++;
          
          if (assignment.isSubstitute) {
            stats.totalSubstitutions++;
          }
          
          // Track teacher workload
          if (!stats.teacherWorkload.has(assignment.teacherId)) {
            stats.teacherWorkload.set(assignment.teacherId, 0);
          }
          stats.teacherWorkload.set(assignment.teacherId, 
            stats.teacherWorkload.get(assignment.teacherId) + 1);
          
          // Track subject distribution
          if (!stats.subjectDistribution.has(assignment.subject)) {
            stats.subjectDistribution.set(assignment.subject, 0);
          }
          stats.subjectDistribution.set(assignment.subject,
            stats.subjectDistribution.get(assignment.subject) + 1);
        }
      });
    });
    
    return stats;
  }
}

// Main function to run the scheduling algorithm
async function runSchedulingSystem() {
  const client = await pool.connect();
  
  try {
    console.log('🤖 INTELLIGENT TEACHER SCHEDULING ALGORITHM');
    console.log('==========================================\n');
    
    const scheduler = new SchedulingAlgorithm();
    
    // Load data from database
    await scheduler.loadData(client);
    
    // Generate schedule for next 5 working days
    const startDate = new Date();
    startDate.setDate(startDate.getDate() + 1); // Start from tomorrow
    
    const weekSchedules = scheduler.generateWeekSchedule(startDate, 7);
    
    // Get statistics
    const stats = scheduler.getScheduleStats();
    
    console.log('\n📊 SCHEDULING STATISTICS:');
    console.log(`   📅 Days scheduled: ${stats.totalDays}`);
    console.log(`   📚 Classes scheduled: ${stats.totalClassesScheduled}`);
    console.log(`   🔄 Substitutions needed: ${stats.totalSubstitutions}`);
    console.log(`   ⚠️  Unscheduled classes: ${stats.unscheduledClasses}`);
    
    console.log('\n👨‍🏫 TEACHER WORKLOAD DISTRIBUTION:');
    const sortedWorkload = [...stats.teacherWorkload.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
    
    for (const [teacherId, workload] of sortedWorkload) {
      const teacher = scheduler.teachers.find(t => t.id === teacherId);
      console.log(`   ${teacher.full_name}: ${workload} classes`);
    }
    
    console.log('\n📚 SUBJECT DISTRIBUTION:');
    stats.subjectDistribution.forEach((count, subject) => {
      console.log(`   ${subject}: ${count} classes`);
    });
    
    // Store schedules in database
    await storeSchedulesInDatabase(client, weekSchedules, scheduler);
    
    console.log('\n✅ Scheduling completed successfully!');
    console.log('🚀 Schedule data saved to database');
    
    return weekSchedules;
    
  } catch (error) {
    console.error('❌ Error in scheduling system:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Store generated schedules in database
async function storeSchedulesInDatabase(client, schedules, scheduler) {
  await client.query('BEGIN');
  
  try {
    // Clear existing schedules for the dates we're generating
    const dateList = schedules.map(s => `'${s.date}'`).join(', ');
    await client.query(`DELETE FROM daily_schedules WHERE schedule_date IN (${dateList})`);
    
    console.log('💾 Storing schedules in database...');
    
    for (const dayData of schedules) {
      for (const [slotId, assignment] of dayData.schedule) {
        if (!assignment.isBreak) {
          await client.query(`
            INSERT INTO daily_schedules (
              schedule_date, time_slot_id, period_number, start_time, end_time,
              class_id, teacher_id, is_substitute, original_teacher_id,
              subject, room_number, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
          `, [
            dayData.date,
            assignment.timeSlotId,
            assignment.period,
            assignment.startTime,
            assignment.endTime,
            assignment.classId,
            assignment.teacherId,
            assignment.isSubstitute || false,
            assignment.originalTeacher || null,
            assignment.subject,
            `Room ${assignment.period}${Math.floor(Math.random() * 100) + 1}`
          ]);
        }
      }
    }
    
    await client.query('COMMIT');
    console.log('✅ Schedules stored successfully');
    
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }
}

// Export the main function
if (require.main === module) {
  runSchedulingSystem()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Script failed:', error);
      process.exit(1);
    });
}

module.exports = { runSchedulingSystem, SchedulingAlgorithm };