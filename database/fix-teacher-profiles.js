const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'learnx',
  user: 'postgres',
  password: 'postgres'
});

async function updateTeacherProfiles() {
  try {
    console.log('🔧 Updating teacher_profiles table...');

    // Add missing columns to teacher_profiles
    const alterCommands = [
      'ALTER TABLE teacher_profiles ADD COLUMN IF NOT EXISTS teacher_id VARCHAR(50) UNIQUE',
      'ALTER TABLE teacher_profiles ADD COLUMN IF NOT EXISTS full_name VARCHAR(255)',
      'ALTER TABLE teacher_profiles ADD COLUMN IF NOT EXISTS email VARCHAR(255)',
      'ALTER TABLE teacher_profiles ADD COLUMN IF NOT EXISTS phone VARCHAR(20)',
      'ALTER TABLE teacher_profiles ADD COLUMN IF NOT EXISTS profile_picture TEXT',
      'ALTER TABLE teacher_profiles ADD COLUMN IF NOT EXISTS department VARCHAR(100)',
      'ALTER TABLE teacher_profiles ADD COLUMN IF NOT EXISTS designation VARCHAR(100)',
      'ALTER TABLE teacher_profiles ADD COLUMN IF NOT EXISTS qualification TEXT',
      'ALTER TABLE teacher_profiles ADD COLUMN IF NOT EXISTS experience_years INTEGER DEFAULT 0',
      'ALTER TABLE teacher_profiles ADD COLUMN IF NOT EXISTS joining_date DATE DEFAULT CURRENT_DATE',
      'ALTER TABLE teacher_profiles ADD COLUMN IF NOT EXISTS specialization TEXT',
      'ALTER TABLE teacher_profiles ADD COLUMN IF NOT EXISTS bio TEXT',
      'ALTER TABLE teacher_profiles ADD COLUMN IF NOT EXISTS office_location VARCHAR(100)'
    ];

    for (const command of alterCommands) {
      try {
        await pool.query(command);
        console.log('✅ Column added/verified');
      } catch (error) {
        if (!error.message.includes('already exists')) {
          console.error('❌ Error:', error.message);
        }
      }
    }

    // Now generate teacher IDs
    const teachersResult = await pool.query(`
      SELECT u.id, u.username, u.full_name, tp.id as profile_id, tp.teacher_id
      FROM users u 
      LEFT JOIN teacher_profiles tp ON u.id = tp.user_id
      WHERE u.role = 'teacher'
    `);

    console.log(`📝 Processing ${teachersResult.rows.length} teachers`);

    for (let i = 0; i < teachersResult.rows.length; i++) {
      const teacher = teachersResult.rows[i];
      const teacherId = `TCH${new Date().getFullYear()}${String(i + 1).padStart(3, '0')}`;
      
      if (!teacher.profile_id) {
        // Create new profile
        await pool.query(
          'INSERT INTO teacher_profiles (user_id, teacher_id, full_name, email, department) VALUES ($1, $2, $3, $4, $5)',
          [teacher.id, teacherId, teacher.full_name || teacher.username, teacher.username + '@school.edu', 'General']
        );
        console.log(`✅ Created profile for ${teacher.username} with ID ${teacherId}`);
      } else if (!teacher.teacher_id) {
        // Update existing profile
        await pool.query(
          'UPDATE teacher_profiles SET teacher_id = $1, full_name = $2, email = $3 WHERE user_id = $4',
          [teacherId, teacher.full_name || teacher.username, teacher.username + '@school.edu', teacher.id]
        );
        console.log(`✅ Updated ${teacher.username} with ID ${teacherId}`);
      } else {
        console.log(`ℹ️  ${teacher.username} already has ID ${teacher.teacher_id}`);
      }
    }

    // Generate student IDs too
    const studentsResult = await pool.query(`
      SELECT sp.id, sp.user_id, u.username, sp.student_id
      FROM student_profiles sp 
      JOIN users u ON sp.user_id = u.id 
      WHERE sp.student_id IS NULL OR sp.student_id = ''
    `);

    console.log(`📝 Processing ${studentsResult.rows.length} students without IDs`);

    for (let i = 0; i < studentsResult.rows.length; i++) {
      const student = studentsResult.rows[i];
      const studentId = `STU${new Date().getFullYear()}${String(i + 1).padStart(3, '0')}`;
      
      await pool.query(
        'UPDATE student_profiles SET student_id = $1 WHERE id = $2',
        [studentId, student.id]
      );
      
      console.log(`✅ Assigned student ID ${studentId} to ${student.username}`);
    }

    console.log('🎉 Unique IDs setup completed!');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    pool.end();
  }
}

updateTeacherProfiles();