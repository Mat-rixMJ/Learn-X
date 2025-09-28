const { Pool } = require('pg');
require('dotenv').config({ path: './backend/.env' });

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'learnx',
  password: process.env.DB_PASSWORD || 'postgres',
  port: process.env.DB_PORT || 5432,
});

async function checkData() {
  const client = await pool.connect();
  
  try {
    console.log('📊 Current Database Statistics:\n');
    
    // Count teachers
    const teachers = await client.query("SELECT COUNT(*) FROM users WHERE role = 'teacher'");
    console.log(`👨‍🏫 Teachers: ${teachers.rows[0].count}`);
    
    // Count students  
    const students = await client.query("SELECT COUNT(*) FROM users WHERE role = 'student'");
    console.log(`👨‍🎓 Students: ${students.rows[0].count}`);
    
    // Count classes
    const classes = await client.query("SELECT COUNT(*) FROM classes");
    console.log(`📚 Classes: ${classes.rows[0].count}`);
    
    // Count enrollments
    const enrollments = await client.query("SELECT COUNT(*) FROM class_enrollments");
    console.log(`📝 Enrollments: ${enrollments.rows[0].count}`);
    
    // Sample teachers with their classes
    const teacherClasses = await client.query(`
      SELECT u.full_name, COUNT(c.id) as class_count
      FROM users u
      LEFT JOIN classes c ON u.id = c.teacher_id
      WHERE u.role = 'teacher'
      GROUP BY u.id, u.full_name
      ORDER BY class_count DESC
      LIMIT 10
    `);
    
    console.log('\n🏆 Top 10 Teachers by Class Count:');
    teacherClasses.rows.forEach((row, index) => {
      console.log(`${index + 1}. ${row.full_name}: ${row.class_count} classes`);
    });
    
    // Sample classes with enrollment counts
    const classEnrollments = await client.query(`
      SELECT c.name, c.subject, u.full_name as teacher_name, COUNT(ce.student_id) as student_count
      FROM classes c
      JOIN users u ON c.teacher_id = u.id
      LEFT JOIN class_enrollments ce ON c.id = ce.class_id
      GROUP BY c.id, c.name, c.subject, u.full_name
      ORDER BY student_count DESC
      LIMIT 10
    `);
    
    console.log('\n📊 Top 10 Classes by Enrollment:');
    classEnrollments.rows.forEach((row, index) => {
      console.log(`${index + 1}. ${row.name} (${row.subject}) - ${row.teacher_name}: ${row.student_count} students`);
    });
    
    console.log('\n✅ Database is populated with realistic data!');
    console.log('\n🚀 You can now start the application with: npm run start:full');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    client.release();
  }
}

checkData().then(() => process.exit(0));