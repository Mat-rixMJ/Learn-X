const { Pool } = require('pg');
require('dotenv').config({ path: './backend/.env' });

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'learnx',
  password: process.env.DB_PASSWORD || 'postgres',
  port: process.env.DB_PORT || 5432,
});

// Sample data arrays
const subjects = [
  'Mathematics', 'Physics', 'Chemistry', 'Biology', 'Computer Science',
  'English Literature', 'History', 'Geography', 'Economics', 'Psychology',
  'Sociology', 'Philosophy', 'Art', 'Music', 'Physical Education',
  'Business Studies', 'Accounting', 'Statistics', 'Environmental Science', 'Political Science'
];

const firstNames = [
  'James', 'Mary', 'John', 'Patricia', 'Robert', 'Jennifer', 'Michael', 'Linda',
  'William', 'Elizabeth', 'David', 'Barbara', 'Richard', 'Susan', 'Joseph', 'Jessica',
  'Thomas', 'Sarah', 'Christopher', 'Karen', 'Charles', 'Nancy', 'Daniel', 'Lisa',
  'Matthew', 'Betty', 'Anthony', 'Helen', 'Mark', 'Sandra', 'Donald', 'Donna',
  'Steven', 'Carol', 'Paul', 'Ruth', 'Andrew', 'Sharon', 'Kenneth', 'Michelle',
  'Joshua', 'Laura', 'Kevin', 'Sarah', 'Brian', 'Kimberly', 'George', 'Deborah',
  'Edward', 'Dorothy', 'Ronald', 'Amy', 'Timothy', 'Angela', 'Jason', 'Ashley'
];

const lastNames = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
  'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas',
  'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson', 'White',
  'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson', 'Walker', 'Young',
  'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores',
  'Green', 'Adams', 'Nelson', 'Baker', 'Hall', 'Rivera', 'Campbell', 'Mitchell',
  'Carter', 'Roberts', 'Gomez', 'Phillips', 'Evans', 'Turner', 'Diaz', 'Parker'
];

const classDescriptions = [
  'An engaging introduction to fundamental concepts',
  'Advanced topics and practical applications',
  'Interactive learning with hands-on experience',
  'Comprehensive coverage of essential principles',
  'Modern approaches to traditional subjects',
  'Critical thinking and analytical skills development',
  'Real-world applications and case studies',
  'Collaborative learning environment',
  'Research-based curriculum design',
  'Innovative teaching methodologies'
];

const universities = [
  'Harvard University', 'MIT', 'Stanford University', 'Oxford University', 
  'Cambridge University', 'Yale University', 'Princeton University', 'Columbia University',
  'University of Chicago', 'Cornell University', 'University of Pennsylvania', 'Dartmouth College'
];

const degrees = [
  'Ph.D. in Mathematics', 'Ph.D. in Physics', 'Ph.D. in Chemistry', 'Ph.D. in Biology',
  'Ph.D. in Computer Science', 'Ph.D. in English Literature', 'Ph.D. in History',
  'Master of Science', 'Master of Arts', 'Bachelor of Science', 'Bachelor of Arts'
];

// Utility functions
function getRandomElement(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function getRandomNumber(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateEmail(firstName, lastName) {
  return `${firstName.toLowerCase()}.${lastName.toLowerCase()}@learnx.edu`;
}

function generateStudentId(year, index) {
  return `STU${year}${String(index).padStart(4, '0')}`;
}

function generateTeacherId(index) {
  return `TCH${String(index).padStart(3, '0')}`;
}

async function createComprehensiveData() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log('🚀 Starting comprehensive data seeding...');
    
    // Step 1: Create 50 Teachers
    console.log('👨‍🏫 Creating 50 teachers...');
    const teacherIds = [];
    
    for (let i = 1; i <= 50; i++) {
      const firstName = getRandomElement(firstNames);
      const lastName = getRandomElement(lastNames);
      const email = generateEmail(firstName, lastName);
      const teacherId = generateTeacherId(i);
      const university = getRandomElement(universities);
      const degree = getRandomElement(degrees);
      const experience = getRandomNumber(2, 25);
      
      // Create user account
      const userResult = await client.query(`
        INSERT INTO users (username, email, password_hash, full_name, role, created_at)
        VALUES ($1, $2, $3, $4, 'teacher', NOW())
        RETURNING id
      `, [
        `teacher${i}`,
        email,
        '$2b$10$rF8qZ9xF0.LqF.vB3yVyJ.WtP0HvQ8nDpJ5wJyKr1sYZYJ9l7xGCe', // hashed 'password123'
        `${firstName} ${lastName}`
      ]);
      
      const userId = userResult.rows[0].id;
      teacherIds.push(userId);
      
      // Create teacher profile
      await client.query(`
        INSERT INTO teacher_profiles (
          user_id, teacher_id, subject_specialization, education_background,
          years_of_experience, bio, phone, office_hours
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [
        userId,
        teacherId,
        getRandomElement(subjects),
        `${degree} from ${university}`,
        experience,
        `Experienced educator with ${experience} years of teaching excellence. Passionate about student success and innovative teaching methods.`,
        `+1-555-${String(getRandomNumber(1000, 9999))}`,
        'Monday-Friday 2:00 PM - 4:00 PM'
      ]);
      
      console.log(`Created teacher: ${firstName} ${lastName} (${teacherId})`);
    }
    
    // Step 2: Create Classes (3-5 classes per teacher)
    console.log('📚 Creating classes...');
    const classIds = [];
    let totalClasses = 0;
    
    for (const teacherId of teacherIds) {
      const numberOfClasses = getRandomNumber(3, 5);
      
      for (let j = 0; j < numberOfClasses; j++) {
        const subject = getRandomElement(subjects);
        const level = getRandomElement(['Beginner', 'Intermediate', 'Advanced']);
        const className = `${subject} ${level}`;
        const description = getRandomElement(classDescriptions);
        const maxStudents = getRandomNumber(30, 50);
        const duration = getRandomNumber(45, 90);
        
        // Generate unique sharable link
        const sharableLink = Math.random().toString(36).substring(2, 15);
        
        const classResult = await client.query(`
          INSERT INTO classes (
            name, description, subject, teacher_id, max_participants,
            duration_minutes, sharable_link, is_active, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, true, NOW())
          RETURNING id
        `, [
          className,
          description,
          subject,
          teacherId,
          maxStudents,
          duration,
          sharableLink
        ]);
        
        classIds.push({
          id: classResult.rows[0].id,
          teacherId: teacherId,
          maxStudents: maxStudents,
          subject: subject
        });
        totalClasses++;
      }
    }
    
    console.log(`Created ${totalClasses} classes`);
    
    // Step 3: Create Students (1000-1500 students)
    console.log('👨‍🎓 Creating students...');
    const studentIds = [];
    const numberOfStudents = getRandomNumber(1000, 1500);
    
    for (let i = 1; i <= numberOfStudents; i++) {
      const firstName = getRandomElement(firstNames);
      const lastName = getRandomElement(lastNames);
      const email = generateEmail(firstName, lastName);
      const studentId = generateStudentId(2024, i);
      const academicYear = getRandomElement(['2024-2025', '2023-2024', '2022-2023']);
      
      // Create user account
      const userResult = await client.query(`
        INSERT INTO users (username, email, password_hash, full_name, role, created_at)
        VALUES ($1, $2, $3, $4, 'student', NOW())
        RETURNING id
      `, [
        `student${i}`,
        email,
        '$2b$10$rF8qZ9xF0.LqF.vB3yVyJ.WtP0HvQ8nDpJ5wJyKr1sYZYJ9l7xGCe', // hashed 'password123'
        `${firstName} ${lastName}`
      ]);
      
      const userId = userResult.rows[0].id;
      studentIds.push(userId);
      
      // Create student profile
      await client.query(`
        INSERT INTO student_profiles (
          user_id, student_id, full_name, email, phone,
          academic_year, enrollment_date, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_DATE, NOW())
      `, [
        userId,
        studentId,
        `${firstName} ${lastName}`,
        email,
        `+1-555-${String(getRandomNumber(1000, 9999))}`,
        academicYear
      ]);
      
      if (i % 100 === 0) {
        console.log(`Created ${i} students...`);
      }
    }
    
    console.log(`Created ${numberOfStudents} students`);
    
    // Step 4: Enroll Students in Classes
    console.log('📝 Enrolling students in classes...');
    let totalEnrollments = 0;
    
    for (const classInfo of classIds) {
      const enrollmentCount = getRandomNumber(20, classInfo.maxStudents);
      const shuffledStudents = [...studentIds].sort(() => 0.5 - Math.random());
      const selectedStudents = shuffledStudents.slice(0, enrollmentCount);
      
      for (const studentId of selectedStudents) {
        try {
          await client.query(`
            INSERT INTO class_enrollments (class_id, student_id, enrolled_at, is_active)
            VALUES ($1, $2, NOW(), true)
          `, [classInfo.id, studentId]);
          
          // Create course progress for some students
          if (Math.random() > 0.3) { // 70% chance
            const progressPercentage = getRandomNumber(10, 95);
            const totalLessons = getRandomNumber(10, 20);
            const completedLessons = Math.floor(totalLessons * (progressPercentage / 100));
            const performanceScore = getRandomNumber(60, 100);
            const timeSpent = getRandomNumber(300, 1200); // 5-20 hours in minutes
            
            await client.query(`
              INSERT INTO course_progress (
                user_id, class_id, total_lessons, completed_lessons,
                progress_percentage, performance_score, time_spent,
                last_accessed, created_at, updated_at
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW() - INTERVAL '${getRandomNumber(1, 30)} days', NOW(), NOW())
            `, [
              studentId, classInfo.id, totalLessons, completedLessons,
              progressPercentage, performanceScore, timeSpent
            ]);
          }
          
          totalEnrollments++;
        } catch (error) {
          // Skip duplicate enrollments
          if (!error.message.includes('duplicate key')) {
            throw error;
          }
        }
      }
    }
    
    console.log(`Created ${totalEnrollments} enrollments`);
    
    // Step 5: Create Assignments
    console.log('📋 Creating assignments...');
    let totalAssignments = 0;
    
    for (const classInfo of classIds) {
      const numberOfAssignments = getRandomNumber(3, 8);
      
      for (let i = 0; i < numberOfAssignments; i++) {
        const assignmentTypes = ['Essay', 'Quiz', 'Project', 'Homework', 'Lab Report'];
        const assignmentType = getRandomElement(assignmentTypes);
        const title = `${classInfo.subject} ${assignmentType} ${i + 1}`;
        const description = `Complete this ${assignmentType.toLowerCase()} assignment for ${classInfo.subject}`;
        const totalMarks = getRandomNumber(50, 100);
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + getRandomNumber(7, 30));
        
        const assignmentResult = await client.query(`
          INSERT INTO assignments (
            class_id, title, description, assignment_type, total_marks,
            due_date, is_published, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, true, NOW())
          RETURNING id
        `, [
          classInfo.id, title, description, assignmentType,
          totalMarks, dueDate
        ]);
        
        const assignmentId = assignmentResult.rows[0].id;
        
        // Create submissions for some students
        const enrolledStudents = await client.query(`
          SELECT student_id FROM class_enrollments WHERE class_id = $1
        `, [classInfo.id]);
        
        for (const student of enrolledStudents.rows) {
          if (Math.random() > 0.4) { // 60% submission rate
            const score = getRandomNumber(40, totalMarks);
            const submissionText = `Submission for ${title} by student`;
            const submissionDate = new Date(dueDate);
            submissionDate.setDate(submissionDate.getDate() - getRandomNumber(1, 7));
            
            await client.query(`
              INSERT INTO assignment_submissions (
                assignment_id, user_id, submission_text, marks_obtained,
                status, submitted_at, created_at
              ) VALUES ($1, $2, $3, $4, 'submitted', $5, $5)
            `, [
              assignmentId, student.student_id, submissionText,
              score, submissionDate
            ]);
          }
        }
        
        totalAssignments++;
      }
    }
    
    console.log(`Created ${totalAssignments} assignments`);
    
    // Step 6: Create Attendance Records
    console.log('📅 Creating attendance records...');
    let totalAttendance = 0;
    
    for (const classInfo of classIds) {
      const enrolledStudents = await client.query(`
        SELECT student_id FROM class_enrollments WHERE class_id = $1
      `, [classInfo.id]);
      
      // Create attendance for last 30 days
      for (let day = 30; day >= 0; day--) {
        const attendanceDate = new Date();
        attendanceDate.setDate(attendanceDate.getDate() - day);
        
        // Skip weekends
        if (attendanceDate.getDay() === 0 || attendanceDate.getDay() === 6) continue;
        
        for (const student of enrolledStudents.rows) {
          const attendanceRate = Math.random();
          let status = 'absent';
          
          if (attendanceRate > 0.2) status = 'present'; // 80% attendance rate
          else if (attendanceRate > 0.1) status = 'late'; // 10% late rate
          
          if (status !== 'absent') {
            await client.query(`
              INSERT INTO attendance (
                user_id, class_id, attendance_date, status, marked_at
              ) VALUES ($1, $2, $3, $4, $5)
              ON CONFLICT (user_id, class_id, attendance_date) DO NOTHING
            `, [
              student.student_id, classInfo.id, attendanceDate,
              status, attendanceDate
            ]);
            totalAttendance++;
          }
        }
      }
    }
    
    console.log(`Created ${totalAttendance} attendance records`);
    
    // Step 7: Create Analytics Data
    console.log('📊 Creating analytics data...');
    
    for (const studentId of studentIds.slice(0, 500)) { // Create analytics for first 500 students
      const overallAverage = getRandomNumber(65, 95);
      const completedCourses = getRandomNumber(1, 5);
      const totalStudyHours = getRandomNumber(50, 300);
      const activeCourses = getRandomNumber(2, 6);
      const currentStreak = getRandomNumber(0, 30);
      const longestStreak = getRandomNumber(currentStreak, 60);
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
        studentId, overallAverage, completedCourses, totalStudyHours,
        activeCourses, currentStreak, longestStreak, weekStudyDays
      ]);
    }
    
    // Step 8: Create Class Schedules
    console.log('🕐 Creating class schedules...');
    
    for (const classInfo of classIds) {
      const dayOfWeek = getRandomNumber(1, 5); // Monday to Friday
      const startHour = getRandomNumber(8, 16); // 8 AM to 4 PM
      const startTime = `${String(startHour).padStart(2, '0')}:${getRandomElement(['00', '15', '30', '45'])}`;
      const endHour = startHour + Math.floor(classInfo.duration / 60) + (classInfo.duration % 60 > 30 ? 1 : 0);
      const endTime = `${String(endHour).padStart(2, '0')}:${getRandomElement(['00', '15', '30', '45'])}`;
      const roomNumber = `Room ${getRandomNumber(101, 350)}`;
      
      await client.query(`
        INSERT INTO class_schedules (
          class_id, day_of_week, start_time, end_time, room_number, is_active
        ) VALUES ($1, $2, $3, $4, $5, true)
      `, [classInfo.id, dayOfWeek, startTime, endTime, roomNumber]);
    }
    
    console.log('✅ Class schedules created');
    
    await client.query('COMMIT');
    
    console.log(`
🎉 Comprehensive data seeding completed successfully!

📊 Summary:
- 👨‍🏫 Teachers: 50
- 👨‍🎓 Students: ${numberOfStudents}
- 📚 Classes: ${totalClasses}
- 📝 Enrollments: ${totalEnrollments}
- 📋 Assignments: ${totalAssignments}
- 📅 Attendance Records: ${totalAttendance}
- 📊 Analytics Records: 500
- 🕐 Class Schedules: ${totalClasses}

🔐 Login Credentials:
- Teachers: teacher1 to teacher50 / password: password123
- Students: student1 to student${numberOfStudents} / password: password123

💡 The system now has realistic data with:
- Teachers specializing in different subjects
- Classes with appropriate enrollment numbers
- Student progress tracking
- Assignment submissions and grades
- Attendance patterns
- Analytics data for performance tracking
    `);
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error creating comprehensive data:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Execute the script
if (require.main === module) {
  createComprehensiveData()
    .then(() => {
      console.log('🏁 Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Script failed:', error);
      process.exit(1);
    });
}

module.exports = { createComprehensiveData };