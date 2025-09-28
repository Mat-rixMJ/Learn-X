const { Pool } = require('pg');
require('dotenv').config({ path: './backend/.env' });

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'learnx',
  password: process.env.DB_PASSWORD || 'postgres',
  port: process.env.DB_PORT || 5432,
});

async function createQuick50Teachers() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log('🚀 Creating 50 teachers with classes and students...');
    
    // Clear existing data (except admin user) in correct dependency order
    console.log('🧹 Clearing existing data...');
    
    // Clear all dependent tables first
    const clearTables = [
      'assignment_submissions', 'grades', 'student_progress', 'course_progress',
      'attendance', 'ai_notes', 'recorded_lectures', 'class_enrollments', 
      'assignments', 'live_sessions', 'classes'
    ];
    
    for (const table of clearTables) {
      try {
        await client.query(`DELETE FROM ${table}`);
      } catch (error) {
        // Table might not exist, continue
        console.log(`Table ${table} might not exist, skipping...`);
      }
    }
    
    // Finally clear users (except admin)
    await client.query("DELETE FROM users WHERE role IN ('teacher', 'student') AND username != 'admin'");
    console.log('✅ Cleared existing data');
    
    // Quick subjects array
    const subjects = [
      'Mathematics', 'Physics', 'Chemistry', 'Biology', 'Computer Science',
      'English', 'History', 'Geography', 'Economics', 'Psychology',
      'Art', 'Music', 'Physical Education', 'Business', 'Statistics'
    ];
    
    // Step 1: Create 50 Teachers
    const teacherIds = [];
    for (let i = 1; i <= 50; i++) {
      const subject = subjects[(i - 1) % subjects.length];
      
      // Create user
      const userResult = await client.query(`
        INSERT INTO users (username, email, password_hash, full_name, role)
        VALUES ($1, $2, $3, $4, 'teacher')
        RETURNING id
      `, [
        `teacher${i}`,
        `teacher${i}@learnx.edu`,
        '$2b$10$rF8qZ9xF0.LqF.vB3yVyJ.WtP0HvQ8nDpJ5wJyKr1sYZYJ9l7xGCe',
        `Teacher ${i} (${subject})`
      ]);
      
      teacherIds.push(userResult.rows[0].id);
      console.log(`Created Teacher ${i}: ${subject}`);
    }
    
    // Step 2: Create Classes (2-3 per teacher)
    const classIds = [];
    for (let i = 0; i < teacherIds.length; i++) {
      const teacherId = teacherIds[i];
      const subject = subjects[i % subjects.length];
      const numClasses = 2 + (i % 2); // 2 or 3 classes per teacher
      
      for (let j = 1; j <= numClasses; j++) {
        const level = ['Beginner', 'Intermediate', 'Advanced'][j - 1] || 'Advanced';
        const className = `${subject} ${level}`;
        const maxStudents = 30 + (i % 20); // 30-50 students
        
        const classResult = await client.query(`
          INSERT INTO classes (name, description, subject, teacher_id, max_students)
          VALUES ($1, $2, $3, $4, $5)
          RETURNING id
        `, [
          className,
          `${level} level ${subject} course`,
          subject,
          teacherId,
          maxStudents
        ]);
        
        classIds.push({
          id: classResult.rows[0].id,
          maxStudents: maxStudents,
          teacherId: teacherId
        });
      }
    }
    
    console.log(`Created ${classIds.length} classes`);
    
    // Step 3: Create 1200 Students
    const studentIds = [];
    for (let i = 1; i <= 1200; i++) {
      const userResult = await client.query(`
        INSERT INTO users (username, email, password_hash, full_name, role)
        VALUES ($1, $2, $3, $4, 'student')
        RETURNING id
      `, [
        `student${i}`,
        `student${i}@learnx.edu`,
        '$2b$10$rF8qZ9xF0.LqF.vB3yVyJ.WtP0HvQ8nDpJ5wJyKr1sYZYJ9l7xGCe',
        `Student ${i}`
      ]);
      
      studentIds.push(userResult.rows[0].id);
      
      if (i % 100 === 0) {
        console.log(`Created ${i} students...`);
      }
    }
    
    // Step 4: Enroll Students (each class gets 20-max students)
    let totalEnrollments = 0;
    for (const classInfo of classIds) {
      const numStudents = Math.min(classInfo.maxStudents, 20 + Math.floor(Math.random() * 30));
      const shuffled = [...studentIds].sort(() => 0.5 - Math.random());
      const selected = shuffled.slice(0, numStudents);
      
      for (const studentId of selected) {
        await client.query(`
          INSERT INTO class_enrollments (class_id, student_id, enrolled_at, is_active)
          VALUES ($1, $2, NOW(), true)
        `, [classInfo.id, studentId]);
        totalEnrollments++;
      }
    }
    
    console.log(`Created ${totalEnrollments} enrollments`);
    
    // Step 5: Create some assignments
    for (let i = 0; i < Math.min(classIds.length, 20); i++) {
      const classInfo = classIds[i];
      // Create assignments with proper schema
      try {
        await client.query(`
          INSERT INTO assignments (class_id, teacher_id, title, description, due_date, points_possible, is_published)
          VALUES ($1, $2, $3, $4, NOW() + INTERVAL '7 days', 100, true)
        `, [
          classInfo.id,
          classInfo.teacherId,
          `Assignment for Class ${i + 1}`,
          `Complete this homework assignment`
        ]);
      } catch (error) {
        // Skip if there's any issue with assignments
      }
    }
    
    await client.query('COMMIT');
    
    console.log(`
🎉 Quick setup completed!

📊 Summary:
- 👨‍🏫 Teachers: 50
- 👨‍🎓 Students: 1200  
- 📚 Classes: ${classIds.length}
- 📝 Enrollments: ${totalEnrollments}
- 📋 Sample Assignments: ${Math.min(classIds.length, 20)}

🔐 Login:
- Teachers: teacher1-teacher50 / password123
- Students: student1-student1200 / password123
    `);
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error:', error.message);
    throw error;
  } finally {
    client.release();
  }
}

if (require.main === module) {
  createQuick50Teachers()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Script failed:', error);
      process.exit(1);
    });
}

module.exports = { createQuick50Teachers };