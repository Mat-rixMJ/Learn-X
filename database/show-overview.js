const { Pool } = require('pg');
require('dotenv').config({ path: './backend/.env' });

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'learnx',
  password: process.env.DB_PASSWORD || 'postgres',
  port: process.env.DB_PORT || 5432,
});

async function showDetailedStats() {
  const client = await pool.connect();
  
  try {
    console.log('🎓 LEARN-X DATABASE - DETAILED OVERVIEW');
    console.log('=====================================\n');
    
    // Basic counts
    const teachers = await client.query("SELECT COUNT(*) FROM users WHERE role = 'teacher'");
    const students = await client.query("SELECT COUNT(*) FROM users WHERE role = 'student'");
    const classes = await client.query("SELECT COUNT(*) FROM classes");
    const enrollments = await client.query("SELECT COUNT(*) FROM class_enrollments");
    
    console.log('📊 SUMMARY STATISTICS:');
    console.log(`   👨‍🏫 Teachers: ${teachers.rows[0].count}`);
    console.log(`   👨‍🎓 Students: ${students.rows[0].count}`);
    console.log(`   📚 Classes: ${classes.rows[0].count}`);
    console.log(`   📝 Enrollments: ${enrollments.rows[0].count}`);
    console.log('');
    
    // Teachers by subject
    const teachersBySubject = await client.query(`
      SELECT 
        CASE 
          WHEN full_name LIKE '%Mathematics%' THEN 'Mathematics'
          WHEN full_name LIKE '%Physics%' THEN 'Physics'
          WHEN full_name LIKE '%Chemistry%' THEN 'Chemistry'
          WHEN full_name LIKE '%Biology%' THEN 'Biology'
          WHEN full_name LIKE '%Computer Science%' THEN 'Computer Science'
          WHEN full_name LIKE '%English%' THEN 'English'
          WHEN full_name LIKE '%History%' THEN 'History'
          WHEN full_name LIKE '%Geography%' THEN 'Geography'
          WHEN full_name LIKE '%Economics%' THEN 'Economics'
          WHEN full_name LIKE '%Psychology%' THEN 'Psychology'
          WHEN full_name LIKE '%Art%' THEN 'Art'
          WHEN full_name LIKE '%Music%' THEN 'Music'
          WHEN full_name LIKE '%Physical Education%' THEN 'Physical Education'
          WHEN full_name LIKE '%Business%' THEN 'Business'
          WHEN full_name LIKE '%Statistics%' THEN 'Statistics'
          ELSE 'Other'
        END as subject,
        COUNT(*) as teacher_count
      FROM users 
      WHERE role = 'teacher'
      GROUP BY subject
      ORDER BY teacher_count DESC, subject
    `);
    
    console.log('👨‍🏫 TEACHERS BY SUBJECT:');
    teachersBySubject.rows.forEach(row => {
      console.log(`   ${row.subject}: ${row.teacher_count} teachers`);
    });
    console.log('');
    
    // Classes by subject with enrollment stats
    const classBySubject = await client.query(`
      SELECT 
        c.subject,
        COUNT(*) as class_count,
        AVG(enrollment_count.count) as avg_enrollment,
        MAX(enrollment_count.count) as max_enrollment,
        MIN(enrollment_count.count) as min_enrollment
      FROM classes c
      LEFT JOIN (
        SELECT class_id, COUNT(*) as count
        FROM class_enrollments
        GROUP BY class_id
      ) enrollment_count ON c.id = enrollment_count.class_id
      GROUP BY c.subject
      ORDER BY class_count DESC
    `);
    
    console.log('📚 CLASSES BY SUBJECT (with enrollment stats):');
    classBySubject.rows.forEach(row => {
      const avg = row.avg_enrollment ? Math.round(row.avg_enrollment) : 0;
      const max = row.max_enrollment || 0;
      const min = row.min_enrollment || 0;
      console.log(`   ${row.subject}: ${row.class_count} classes (avg: ${avg}, range: ${min}-${max} students)`);
    });
    console.log('');
    
    // Sample login credentials
    const sampleTeachers = await client.query(`
      SELECT username, full_name, email
      FROM users 
      WHERE role = 'teacher' 
      ORDER BY username 
      LIMIT 5
    `);
    
    const sampleStudents = await client.query(`
      SELECT username, full_name, email
      FROM users 
      WHERE role = 'student' 
      ORDER BY username 
      LIMIT 5
    `);
    
    console.log('🔐 SAMPLE LOGIN CREDENTIALS:');
    console.log('');
    console.log('   Teachers (password: password123):');
    sampleTeachers.rows.forEach(row => {
      console.log(`   • ${row.username} - ${row.full_name} (${row.email})`);
    });
    console.log('   ... and 45 more teachers (teacher6 to teacher50)');
    console.log('');
    
    console.log('   Students (password: password123):');
    sampleStudents.rows.forEach(row => {
      console.log(`   • ${row.username} - ${row.full_name} (${row.email})`);
    });
    console.log('   ... and 1,195 more students (student6 to student1200)');
    console.log('');
    
    // Most enrolled classes
    const topClasses = await client.query(`
      SELECT c.name, c.subject, u.full_name as teacher_name, COUNT(ce.student_id) as student_count
      FROM classes c
      JOIN users u ON c.teacher_id = u.id
      LEFT JOIN class_enrollments ce ON c.id = ce.class_id
      GROUP BY c.id, c.name, c.subject, u.full_name
      ORDER BY student_count DESC
      LIMIT 5
    `);
    
    console.log('🏆 TOP 5 MOST ENROLLED CLASSES:');
    topClasses.rows.forEach((row, index) => {
      console.log(`   ${index + 1}. ${row.name} (${row.subject})`);
      console.log(`      Teacher: ${row.teacher_name}`);
      console.log(`      Students: ${row.student_count}`);
      console.log('');
    });
    
    console.log('🚀 READY TO START:');
    console.log('   Run: npm run start:full');
    console.log('   Then login with any teacher/student credentials above');
    console.log('   Test dashboards, class creation, enrollments, and more!');
    console.log('');
    console.log('✅ Your Learn-X platform now has realistic data for testing!');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    client.release();
  }
}

showDetailedStats().then(() => process.exit(0));