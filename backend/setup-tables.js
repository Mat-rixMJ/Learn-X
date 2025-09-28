const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'remoteclassroom',
  password: 'postgres',
  port: 5432,
});

async function setupTables() {
  console.log('🚀 Setting up required tables...');

  try {
    // Enable UUID extension
    await pool.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
    console.log('✅ UUID extension enabled');

    // Create classes table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS classes (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR(100) NOT NULL,
        description TEXT,
        subject VARCHAR(50),
        teacher_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        max_participants INTEGER DEFAULT 100,
        is_active BOOLEAN DEFAULT true,
        sharable_link VARCHAR(32) UNIQUE NOT NULL,
        scheduled_at TIMESTAMP WITH TIME ZONE,
        duration_minutes INTEGER DEFAULT 60,
        meeting_room_id VARCHAR(100),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Classes table created');

    // Create user_classes table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_classes (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
        enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, class_id)
      )
    `);
    console.log('✅ User classes table created');

    // Create lectures table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS lectures (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        title VARCHAR(200) NOT NULL,
        description TEXT,
        video_url TEXT,
        duration VARCHAR(20),
        class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
        instructor_name VARCHAR(100),
        class_name VARCHAR(100),
        subject VARCHAR(50),
        is_public BOOLEAN DEFAULT true,
        recorded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Lectures table created');

    // Create a sample video lecture
    const teacherResult = await pool.query('SELECT id FROM users WHERE role = $1 LIMIT 1', ['teacher']);
    let teacherId = teacherResult.rows[0]?.id;
    
    if (!teacherId) {
      // Create a teacher if none exists
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash('teacher123', 10);
      
      const newTeacher = await pool.query(`
        INSERT INTO users (username, email, password_hash, first_name, last_name, role)
        VALUES ($1, $2, $3, $4, $5, $6) RETURNING id
      `, ['teacher', 'teacher@example.com', hashedPassword, 'Sample', 'Teacher', 'teacher']);
      
      teacherId = newTeacher.rows[0].id;
      console.log('✅ Sample teacher created');
    }

    // Create a sample class
    const classResult = await pool.query(`
      INSERT INTO classes (name, description, subject, teacher_id, sharable_link, is_active)
      VALUES ($1, $2, $3, $4, $5, $6) 
      ON CONFLICT (sharable_link) DO NOTHING
      RETURNING id
    `, ['Introduction to AI', 'Learn the basics of Artificial Intelligence', 'Computer Science', teacherId, 'ai-intro-123', true]);

    let classId = classResult.rows[0]?.id;
    if (!classId) {
      const existingClass = await pool.query('SELECT id FROM classes WHERE sharable_link = $1', ['ai-intro-123']);
      classId = existingClass.rows[0].id;
    }

    // Create a sample lecture with the specific ID from your URL
    await pool.query(`
      INSERT INTO lectures (id, title, description, video_url, duration, class_id, instructor_name, class_name, subject, is_public)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        description = EXCLUDED.description,
        video_url = EXCLUDED.video_url
    `, [
      '1aeaa545-4179-4247-a6f9-00d252a5b4c7',
      'Introduction to Machine Learning',
      'A comprehensive introduction to machine learning concepts and applications',
      'https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4', // Sample video URL
      '45:30',
      classId,
      'Dr. Sarah Johnson',
      'Introduction to AI',
      'Computer Science',
      true
    ]);

    console.log('✅ Sample lecture created with ID: 1aeaa545-4179-4247-a6f9-00d252a5b4c7');
    console.log('🎯 You can now test at: http://localhost:3000/watch/1aeaa545-4179-4247-a6f9-00d252a5b4c7');

  } catch (error) {
    console.error('❌ Error setting up tables:', error);
  } finally {
    await pool.end();
  }
}

setupTables();