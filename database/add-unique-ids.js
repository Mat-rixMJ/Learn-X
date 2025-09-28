const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'learnx',
  user: 'postgres',
  password: 'postgres'
});

async function addUniqueIds() {
  try {
    console.log('🚀 Adding unique IDs for students and teachers...');

    // 1. Ensure student_profiles has proper student_id column
    await pool.query('ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS student_id VARCHAR(50) UNIQUE');
    console.log('✅ Student ID column verified');

    // 2. Create/update teacher_profiles table with teacher_id
    const createTeacherProfiles = `
      CREATE TABLE IF NOT EXISTS teacher_profiles (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        teacher_id VARCHAR(50) UNIQUE,
        full_name VARCHAR(255),
        email VARCHAR(255),
        phone VARCHAR(20),
        profile_picture TEXT,
        department VARCHAR(100),
        designation VARCHAR(100),
        qualification TEXT,
        experience_years INTEGER DEFAULT 0,
        joining_date DATE DEFAULT CURRENT_DATE,
        specialization TEXT,
        bio TEXT,
        office_location VARCHAR(100),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id)
      );
    `;
    
    await pool.query(createTeacherProfiles);
    console.log('✅ Teacher profiles table created/verified');

    // 3. Add teacher_id column if it doesn't exist
    await pool.query('ALTER TABLE teacher_profiles ADD COLUMN IF NOT EXISTS teacher_id VARCHAR(50) UNIQUE');
    console.log('✅ Teacher ID column verified');

    // 4. Generate unique student IDs for existing students without IDs
    const studentsWithoutIds = await pool.query(`
      SELECT sp.id, sp.user_id, u.username 
      FROM student_profiles sp 
      JOIN users u ON sp.user_id = u.id 
      WHERE sp.student_id IS NULL OR sp.student_id = ''
    `);

    console.log(`📝 Found ${studentsWithoutIds.rows.length} students without IDs`);

    for (let i = 0; i < studentsWithoutIds.rows.length; i++) {
      const student = studentsWithoutIds.rows[i];
      const studentId = `STU${new Date().getFullYear()}${String(i + 1).padStart(3, '0')}`;
      
      await pool.query(
        'UPDATE student_profiles SET student_id = $1 WHERE id = $2',
        [studentId, student.id]
      );
      
      console.log(`✅ Assigned student ID ${studentId} to ${student.username}`);
    }

    // 5. Generate unique teacher IDs for existing teachers without IDs
    const teachersWithoutIds = await pool.query(`
      SELECT u.id, u.username, u.full_name
      FROM users u 
      LEFT JOIN teacher_profiles tp ON u.id = tp.user_id
      WHERE u.role = 'teacher' AND (tp.teacher_id IS NULL OR tp.teacher_id = '' OR tp.id IS NULL)
    `);

    console.log(`📝 Found ${teachersWithoutIds.rows.length} teachers without IDs`);

    for (let i = 0; i < teachersWithoutIds.rows.length; i++) {
      const teacher = teachersWithoutIds.rows[i];
      const teacherId = `TCH${new Date().getFullYear()}${String(i + 1).padStart(3, '0')}`;
      
      // Insert or update teacher profile
      const existingProfile = await pool.query('SELECT id FROM teacher_profiles WHERE user_id = $1', [teacher.id]);
      
      if (existingProfile.rows.length > 0) {
        await pool.query(
          'UPDATE teacher_profiles SET teacher_id = $1, full_name = $2, email = $3 WHERE user_id = $4',
          [teacherId, teacher.full_name, teacher.username + '@school.edu', teacher.id]
        );
      } else {
        await pool.query(
          'INSERT INTO teacher_profiles (user_id, teacher_id, full_name, email, department) VALUES ($1, $2, $3, $4, $5)',
          [teacher.id, teacherId, teacher.full_name || teacher.username, teacher.username + '@school.edu', 'General']
        );
      }
      
      console.log(`✅ Assigned teacher ID ${teacherId} to ${teacher.username}`);
    }

    // 6. Create sequence tables for future ID generation
    const createSequences = `
      CREATE TABLE IF NOT EXISTS id_sequences (
        sequence_name VARCHAR(50) PRIMARY KEY,
        current_value INTEGER DEFAULT 0,
        prefix VARCHAR(10),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      
      INSERT INTO id_sequences (sequence_name, current_value, prefix) 
      VALUES 
        ('student_id', ${studentsWithoutIds.rows.length}, 'STU'),
        ('teacher_id', ${teachersWithoutIds.rows.length}, 'TCH')
      ON CONFLICT (sequence_name) DO UPDATE SET 
        current_value = GREATEST(id_sequences.current_value, EXCLUDED.current_value);
    `;
    
    await pool.query(createSequences);
    console.log('✅ ID sequence tracking created');

    // 7. Display summary
    const studentCount = await pool.query('SELECT COUNT(*) FROM student_profiles WHERE student_id IS NOT NULL');
    const teacherCount = await pool.query('SELECT COUNT(*) FROM teacher_profiles WHERE teacher_id IS NOT NULL');
    
    console.log('\n🎉 SUMMARY:');
    console.log(`📚 Students with unique IDs: ${studentCount.rows[0].count}`);
    console.log(`👨‍🏫 Teachers with unique IDs: ${teacherCount.rows[0].count}`);

    // 8. Show some examples
    const sampleStudents = await pool.query('SELECT student_id, full_name FROM student_profiles WHERE student_id IS NOT NULL LIMIT 3');
    const sampleTeachers = await pool.query('SELECT teacher_id, full_name FROM teacher_profiles WHERE teacher_id IS NOT NULL LIMIT 3');
    
    console.log('\n📋 Sample Student IDs:');
    sampleStudents.rows.forEach(s => console.log(`  ${s.student_id}: ${s.full_name || 'N/A'}`));
    
    console.log('\n👨‍🏫 Sample Teacher IDs:');
    sampleTeachers.rows.forEach(t => console.log(`  ${t.teacher_id}: ${t.full_name || 'N/A'}`));

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    pool.end();
  }
}

addUniqueIds();