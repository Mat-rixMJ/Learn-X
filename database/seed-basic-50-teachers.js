const { Pool } = require('pg');
require('dotenv').config({ path: './backend/.env' });

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'learnx',
  password: process.env.DB_PASSWORD || 'postgres',
  port: process.env.DB_PORT || 5432,
});

async function createBasic50Teachers() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log('🚀 Creating 50 teachers with classes and students (BASIC VERSION)...');
    
    // Clear existing data carefully (excluding admin)
    console.log('🧹 Clearing existing data...');
    
    // Clear in dependency order
    const tablesToClear = [
      'student_progress', 'course_progress', 'attendance', 'assignment_submissions',
      'grades', 'ai_notes', 'recorded_lectures', 'class_enrollments', 
      'assignments', 'live_sessions', 'classes'
    ];
    
    for (const table of tablesToClear) {
      try {
        await client.query(`DELETE FROM ${table}`);
      } catch (error) {
        // Table might not exist, continue
      }
    }
    
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
      
      if (i % 10 === 0) {
        console.log(`Created ${i} teachers...`);
      }
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
        const maxStudents = 25 + (i % 25); // 25-50 students max
        
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
      
      if (i % 200 === 0) {
        console.log(`Created ${i} students...`);
      }
    }
    
    // Step 4: Enroll Students (each class gets 15-max students)
    let totalEnrollments = 0;
    for (const classInfo of classIds) {
      const numStudents = Math.min(classInfo.maxStudents, 15 + Math.floor(Math.random() * 35));
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
    
    await client.query('COMMIT');
    
    console.log(`
🎉 Basic setup completed successfully!

📊 Summary:
- 👨‍🏫 Teachers: 50
- 👨‍🎓 Students: 1200  
- 📚 Classes: ${classIds.length}
- 📝 Enrollments: ${totalEnrollments}

🔐 Login:
- Teachers: teacher1-teacher50 / password: password123
- Students: student1-student1200 / password: password123

✅ All data committed successfully!
    `);
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    client.release();
  }
}

if (require.main === module) {
  createBasic50Teachers()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Script failed:', error.message);
      process.exit(1);
    });
}

module.exports = { createBasic50Teachers };