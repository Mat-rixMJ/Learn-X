require('dotenv').config({ path: '../backend/.env' });
const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

async function populateTeacherSubjects() {
  try {
    console.log('👨‍🏫 Populating teacher subjects...');

    // Get all teachers
    const teachers = await pool.query('SELECT * FROM users WHERE role = \'teacher\'');
    
    const subjects = [
      'Mathematics', 'English', 'Science', 'History', 'Geography', 
      'Physics', 'Chemistry', 'Biology', 'Computer Science', 'Art', 
      'Music', 'Physical Education', 'Economics', 'Business', 
      'Psychology', 'Statistics'
    ];

    // Clear existing data
    await pool.query('DELETE FROM teacher_subjects');
    
    for (const teacher of teachers.rows) {
      // Each teacher gets 1-3 subjects they can teach
      const numSubjects = Math.floor(Math.random() * 3) + 1;
      const teacherSubjects = [...subjects].sort(() => 0.5 - Math.random()).slice(0, numSubjects);
      
      for (const subject of teacherSubjects) {
        await pool.query(`
          INSERT INTO teacher_subjects (teacher_id, subject, proficiency_level) 
          VALUES ($1, $2, $3)
        `, [teacher.id, subject, 'expert']);
      }
      
      console.log(`✅ ${teacher.full_name}: ${teacherSubjects.join(', ')}`);
    }

    console.log(`🎉 Populated subjects for ${teachers.rows.length} teachers`);

  } catch (error) {
    console.error('❌ Error populating teacher subjects:', error);
  } finally {
    await pool.end();
  }
}

populateTeacherSubjects();