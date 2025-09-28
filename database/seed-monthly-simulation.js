const { Pool } = require('pg');
require('dotenv').config({ path: './backend/.env' });

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'learnx',
  password: process.env.DB_PASSWORD || 'postgres',
  port: process.env.DB_PORT || 5432,
});

// Assignment types and their typical point values
const assignmentTypes = [
  { type: 'homework', points: [10, 15, 20, 25], frequency: 0.4 },
  { type: 'quiz', points: [25, 30, 35, 40], frequency: 0.25 },
  { type: 'project', points: [50, 75, 100, 150], frequency: 0.2 },
  { type: 'exam', points: [75, 100, 125, 150], frequency: 0.1 },
  { type: 'discussion', points: [5, 10, 15], frequency: 0.05 }
];

// Performance patterns for different student types
const studentTypes = [
  { name: 'excellent', weight: 0.15, gradeRange: [85, 100], attendanceRate: 0.95, submissionRate: 0.98 },
  { name: 'good', weight: 0.25, gradeRange: [75, 90], attendanceRate: 0.88, submissionRate: 0.92 },
  { name: 'average', weight: 0.35, gradeRange: [65, 80], attendanceRate: 0.82, submissionRate: 0.85 },
  { name: 'struggling', weight: 0.20, gradeRange: [50, 70], attendanceRate: 0.75, submissionRate: 0.75 },
  { name: 'poor', weight: 0.05, gradeRange: [30, 55], attendanceRate: 0.60, submissionRate: 0.60 }
];

function getRandomElement(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function getRandomNumber(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomFloat(min, max) {
  return Math.random() * (max - min) + min;
}

// Generate realistic grade based on student type and assignment difficulty
function generateGrade(studentType, assignmentType, totalPoints) {
  const [minGrade, maxGrade] = studentType.gradeRange;
  let baseGrade = getRandomFloat(minGrade, maxGrade);
  
  // Adjust based on assignment type
  if (assignmentType === 'homework') baseGrade += 5; // Homework usually easier
  if (assignmentType === 'exam') baseGrade -= 3; // Exams usually harder
  if (assignmentType === 'project') baseGrade += 2; // Projects allow more preparation
  
  // Add some randomness
  baseGrade += getRandomFloat(-5, 5);
  
  // Ensure grade is within bounds
  baseGrade = Math.max(0, Math.min(100, baseGrade));
  
  return Math.round((baseGrade / 100) * totalPoints);
}

// Assign student type based on weighted distribution
function assignStudentType() {
  const rand = Math.random();
  let cumulative = 0;
  
  for (const type of studentTypes) {
    cumulative += type.weight;
    if (rand <= cumulative) {
      return type;
    }
  }
  return studentTypes[studentTypes.length - 1]; // fallback
}

async function createMonthlySimulation() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log('📅 Creating 1 Month Educational Data Simulation...');
    console.log('================================================\n');
    
    // Get all classes and their enrollments
    const classesResult = await client.query(`
      SELECT c.id, c.name, c.subject, c.teacher_id, u.full_name as teacher_name,
             COUNT(ce.student_id) as student_count
      FROM classes c
      JOIN users u ON c.teacher_id = u.id
      LEFT JOIN class_enrollments ce ON c.id = ce.class_id
      GROUP BY c.id, c.name, c.subject, c.teacher_id, u.full_name
      HAVING COUNT(ce.student_id) > 0
      ORDER BY c.name
    `);
    
    console.log(`📚 Found ${classesResult.rows.length} classes with students`);
    
    // Clear existing simulation data (keep structure but clear recent data)
    console.log('🧹 Clearing existing simulation data...');
    await client.query("DELETE FROM attendance WHERE attendance_date >= CURRENT_DATE - INTERVAL '35 days'");
    await client.query("DELETE FROM assignment_submissions WHERE submitted_at >= CURRENT_DATE - INTERVAL '35 days'");
    await client.query("DELETE FROM assignments WHERE due_date >= CURRENT_DATE - INTERVAL '35 days'");
    await client.query("DELETE FROM course_progress");
    await client.query("DELETE FROM student_progress");
    console.log('✅ Cleared existing data\n');
    
    let totalAssignments = 0;
    let totalSubmissions = 0;
    let totalAttendanceRecords = 0;
    
    // For each class, create monthly data
    for (const classInfo of classesResult.rows) {
      console.log(`📖 Processing: ${classInfo.name} (${classInfo.student_count} students)`);
      
      // Get enrolled students for this class
      const studentsResult = await client.query(`
        SELECT ce.student_id, u.full_name
        FROM class_enrollments ce
        JOIN users u ON ce.student_id = u.id
        WHERE ce.class_id = $1 AND ce.is_active = true
      `, [classInfo.id]);
      
      const students = studentsResult.rows;
      
      // Assign student types (performance patterns)
      const studentPerformance = new Map();
      students.forEach(student => {
        studentPerformance.set(student.student_id, assignStudentType());
      });
      
      // Generate 4-8 assignments per class over the month
      const numAssignments = getRandomNumber(4, 8);
      const assignments = [];
      
      for (let i = 0; i < numAssignments; i++) {
        // Choose assignment type based on frequency
        const rand = Math.random();
        let cumulative = 0;
        let selectedType = assignmentTypes[0];
        
        for (const assignType of assignmentTypes) {
          cumulative += assignType.frequency;
          if (rand <= cumulative) {
            selectedType = assignType;
            break;
          }
        }
        
        const points = getRandomElement(selectedType.points);
        const daysAgo = getRandomNumber(1, 30);
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() - daysAgo + getRandomNumber(3, 10));
        
        const assignmentResult = await client.query(`
          INSERT INTO assignments (
            class_id, teacher_id, title, description, instructions, 
            due_date, points_possible, assignment_type, is_published, 
            allow_late_submission, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, true, $9)
          RETURNING id
        `, [
          classInfo.id,
          classInfo.teacher_id,
          `${classInfo.subject} ${selectedType.type.charAt(0).toUpperCase() + selectedType.type.slice(1)} ${i + 1}`,
          `${selectedType.type.charAt(0).toUpperCase() + selectedType.type.slice(1)} assignment for ${classInfo.subject}`,
          `Complete this ${selectedType.type} assignment following the guidelines discussed in class.`,
          dueDate,
          points,
          selectedType.type,
          new Date(Date.now() - (daysAgo * 24 * 60 * 60 * 1000))
        ]);
        
        assignments.push({
          id: assignmentResult.rows[0].id,
          type: selectedType.type,
          points: points,
          dueDate: dueDate
        });
        totalAssignments++;
      }
      
      // Generate submissions for each assignment
      for (const assignment of assignments) {
        for (const student of students) {
          const studentType = studentPerformance.get(student.student_id);
          
          // Determine if student submits based on their submission rate
          if (Math.random() <= studentType.submissionRate) {
            const grade = generateGrade(studentType, assignment.type, assignment.points);
            const isLate = Math.random() < 0.15; // 15% chance of late submission
            
            let submissionDate = new Date(assignment.dueDate);
            if (isLate) {
              submissionDate.setDate(submissionDate.getDate() + getRandomNumber(1, 5));
            } else {
              submissionDate.setDate(submissionDate.getDate() - getRandomNumber(0, 3));
            }
            
            const submissionText = `Student submission for ${assignment.type}. This ${assignment.type} demonstrates understanding of the key concepts covered in class.`;
            
            await client.query(`
              INSERT INTO assignment_submissions (
                assignment_id, student_id, submission_text, submitted_at, is_late
              ) VALUES ($1, $2, $3, $4, $5)
            `, [
              assignment.id,
              student.student_id,
              submissionText,
              submissionDate,
              isLate
            ]);
            
            // Also create grade record
            const percentage = (grade / assignment.points) * 100;
            let letterGrade = 'F';
            if (percentage >= 90) letterGrade = 'A';
            else if (percentage >= 80) letterGrade = 'B';
            else if (percentage >= 70) letterGrade = 'C';
            else if (percentage >= 60) letterGrade = 'D';
            
            await client.query(`
              INSERT INTO grades (
                assignment_id, student_id, points_earned, max_points,
                percentage, letter_grade, graded_at, is_late
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            `, [
              assignment.id,
              student.student_id,
              grade,
              assignment.points,
              percentage,
              letterGrade,
              submissionDate,
              isLate
            ]);
            
            totalSubmissions++;
          }
        }
      }
      
      // Generate attendance for past 30 days (excluding weekends)
      for (let day = 30; day >= 0; day--) {
        const attendanceDate = new Date();
        attendanceDate.setDate(attendanceDate.getDate() - day);
        
        // Skip weekends
        if (attendanceDate.getDay() === 0 || attendanceDate.getDay() === 6) continue;
        
        // Skip some days randomly (not every class meets every day)
        if (Math.random() < 0.3) continue; // 30% chance to skip a day
        
        for (const student of students) {
          const studentType = studentPerformance.get(student.student_id);
          const rand = Math.random();
          
          let status = 'absent';
          if (rand <= studentType.attendanceRate) {
            status = 'present';
          } else if (rand <= studentType.attendanceRate + 0.05) {
            status = 'late';
          }
          
          if (status !== 'absent') {
            await client.query(`
              INSERT INTO attendance (
                user_id, class_id, attendance_date, status, marked_at
              ) VALUES ($1, $2, $3, $4, $5)
              ON CONFLICT (user_id, class_id, attendance_date) DO NOTHING
            `, [
              student.student_id,
              classInfo.id,
              attendanceDate,
              status,
              attendanceDate
            ]);
            totalAttendanceRecords++;
          }
        }
      }
      
      // Generate course progress for each student
      for (const student of students) {
        const studentType = studentPerformance.get(student.student_id);
        
        // Calculate realistic progress metrics
        const totalLessons = getRandomNumber(15, 25);
        const progressPercentage = getRandomFloat(
          studentType.gradeRange[0] - 10,
          studentType.gradeRange[1] + 5
        );
        const completedLessons = Math.floor(totalLessons * (progressPercentage / 100));
        const performanceScore = getRandomFloat(
          studentType.gradeRange[0],
          studentType.gradeRange[1]
        );
        const timeSpent = getRandomNumber(300, 1800); // 5-30 hours
        
        await client.query(`
          INSERT INTO course_progress (
            user_id, class_id, total_lessons, completed_lessons,
            progress_percentage, performance_score, time_spent,
            last_accessed, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
        `, [
          student.student_id,
          classInfo.id,
          totalLessons,
          completedLessons,
          Math.round(progressPercentage),
          Math.round(performanceScore),
          timeSpent,
          new Date(Date.now() - getRandomNumber(1, 7) * 24 * 60 * 60 * 1000)
        ]);
      }
    }
    
    // Generate overall student progress and analytics
    console.log('\n📊 Generating student analytics...');
    const allStudents = await client.query(`
      SELECT id FROM users WHERE role = 'student'
    `);
    
    for (const student of allStudents.rows) {
      // Calculate overall metrics from actual data
      const gradesResult = await client.query(`
        SELECT AVG(percentage) as avg_grade, COUNT(*) as assignment_count
        FROM grades 
        WHERE student_id = $1
      `, [student.id]);
      
      const enrollmentsResult = await client.query(`
        SELECT COUNT(*) as active_courses
        FROM class_enrollments 
        WHERE student_id = $1 AND is_active = true
      `, [student.id]);
      
      const progressResult = await client.query(`
        SELECT AVG(progress_percentage) as avg_progress, SUM(time_spent) as total_time
        FROM course_progress
        WHERE user_id = $1
      `, [student.id]);
      
      const grades = gradesResult.rows[0];
      const enrollments = enrollmentsResult.rows[0];
      const progress = progressResult.rows[0];
      
      const overallAverage = grades.avg_grade || 0;
      const activeCourses = parseInt(enrollments.active_courses) || 0;
      const totalStudyHours = Math.floor((progress.total_time || 0) / 60);
      const currentStreak = getRandomNumber(0, 15);
      const longestStreak = Math.max(currentStreak, getRandomNumber(5, 30));
      const completedCourses = getRandomNumber(0, 3);
      const weekStudyDays = getRandomNumber(3, 7);
      
      await client.query(`
        INSERT INTO student_analytics (
          user_id, overall_average, completed_courses, total_study_hours,
          active_courses, current_streak, longest_streak, week_study_days,
          last_updated
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
        ON CONFLICT (user_id) DO UPDATE SET
          overall_average = EXCLUDED.overall_average,
          completed_courses = EXCLUDED.completed_courses,
          total_study_hours = EXCLUDED.total_study_hours,
          active_courses = EXCLUDED.active_courses,
          current_streak = EXCLUDED.current_streak,
          longest_streak = EXCLUDED.longest_streak,
          week_study_days = EXCLUDED.week_study_days,
          last_updated = NOW()
      `, [
        student.id,
        Math.round(overallAverage),
        completedCourses,
        totalStudyHours,
        activeCourses,
        currentStreak,
        longestStreak,
        weekStudyDays
      ]);
    }
    
    await client.query('COMMIT');
    
    console.log('\n🎉 1-Month Educational Simulation Completed Successfully!');
    console.log('========================================================\n');
    
    console.log('📊 Generated Data Summary:');
    console.log(`   📋 Assignments: ${totalAssignments}`);
    console.log(`   📝 Submissions: ${totalSubmissions}`);
    console.log(`   📅 Attendance Records: ${totalAttendanceRecords}`);
    console.log(`   👥 Student Analytics: ${allStudents.rows.length}`);
    console.log(`   📈 Course Progress Records: ${classesResult.rows.length * 30} (avg)`);
    
    console.log('\n📈 Data Includes:');
    console.log('   • Realistic student performance patterns (excellent, good, average, struggling, poor)');
    console.log('   • Various assignment types (homework, quizzes, projects, exams, discussions)');
    console.log('   • 30 days of attendance tracking (excluding weekends)');
    console.log('   • Grade distributions matching student performance levels');
    console.log('   • Course progress with time tracking');
    console.log('   • Late submissions and absence patterns');
    console.log('   • Comprehensive student analytics');
    
    console.log('\n🚀 Ready to Test:');
    console.log('   • Student dashboard progress tracking');
    console.log('   • Teacher gradebook and assignment management');
    console.log('   • Analytics and performance reports');
    console.log('   • Attendance monitoring');
    console.log('   • Assignment submission workflows');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error creating simulation:', error.message);
    throw error;
  } finally {
    client.release();
  }
}

if (require.main === module) {
  createMonthlySimulation()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Script failed:', error.message);
      process.exit(1);
    });
}

module.exports = { createMonthlySimulation };