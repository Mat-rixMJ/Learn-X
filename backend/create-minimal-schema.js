const pool = require('./config/database');

async function createMinimalSchema() {
  try {
    console.log('Creating minimal schema for teacher stats...');
    
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
        teacher_id UUID NOT NULL,
        max_participants INTEGER DEFAULT 100,
        is_active BOOLEAN DEFAULT true,
        sharable_link VARCHAR(32) UNIQUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Classes table created');
    
    // Create recorded_lectures table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS recorded_lectures (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        class_id UUID NOT NULL,
        title VARCHAR(200) NOT NULL,
        description TEXT,
        video_url VARCHAR(255),
        audio_url VARCHAR(255),
        slides_url VARCHAR(255),
        duration_seconds INTEGER,
        recorded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        is_processed BOOLEAN DEFAULT false,
        is_public BOOLEAN DEFAULT false
      )
    `);
    console.log('✅ Recorded lectures table created');
    
    // Create class_enrollments table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS class_enrollments (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        class_id UUID NOT NULL,
        student_id UUID NOT NULL,
        enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        is_active BOOLEAN DEFAULT true,
        UNIQUE(class_id, student_id)
      )
    `);
    console.log('✅ Class enrollments table created');
    
    // Create some sample data for the teacher
    const teacherId = 'b3e52a2f-c785-490a-a736-8f3bf1cc5548'; // teacher1 from seed script
    
    // Insert sample class
    const classResult = await pool.query(`
      INSERT INTO classes (name, description, subject, teacher_id, sharable_link) 
      VALUES ($1, $2, $3, $4, $5) 
      ON CONFLICT (sharable_link) DO NOTHING
      RETURNING id
    `, ['Introduction to Programming', 'Basic programming concepts', 'Computer Science', teacherId, 'intro-prog-001']);
    
    if (classResult.rows.length > 0) {
      const classId = classResult.rows[0].id;
      console.log('✅ Sample class created:', classId);
      
      // Insert sample lecture
      await pool.query(`
        INSERT INTO recorded_lectures (class_id, title, description) 
        VALUES ($1, $2, $3)
        ON CONFLICT DO NOTHING
      `, [classId, 'Variables and Data Types', 'Introduction to variables and basic data types']);
      console.log('✅ Sample lecture created');
      
      // Insert sample student enrollment
      const studentId = 'b3d5d6eb-def9-4dc9-8f5c-2c9b1d1f4224'; // student1 from seed script
      await pool.query(`
        INSERT INTO class_enrollments (class_id, student_id) 
        VALUES ($1, $2)
        ON CONFLICT (class_id, student_id) DO NOTHING
      `, [classId, studentId]);
      console.log('✅ Sample enrollment created');
    }
    
    // Test the teacher stats query
    console.log('\n🧪 Testing teacher stats queries...');
    
    const classesCount = await pool.query(`
      SELECT COUNT(*) as active_classes 
      FROM classes 
      WHERE teacher_id = $1 AND is_active = true
    `, [teacherId]);
    console.log('Classes count:', classesCount.rows[0].active_classes);
    
    const lecturesCount = await pool.query(`
      SELECT COUNT(*) as total_lectures 
      FROM recorded_lectures rl
      INNER JOIN classes c ON rl.class_id = c.id
      WHERE c.teacher_id = $1
    `, [teacherId]);
    console.log('Lectures count:', lecturesCount.rows[0].total_lectures);
    
    const studentsCount = await pool.query(`
      SELECT COUNT(DISTINCT student_id) as total_students
      FROM class_enrollments ce
      INNER JOIN classes c ON ce.class_id = c.id
      WHERE c.teacher_id = $1 AND ce.is_active = true
    `, [teacherId]);
    console.log('Students count:', studentsCount.rows[0].total_students);
    
    console.log('\n🎉 Minimal schema setup complete! Teacher stats should now work.');
    
  } catch (error) {
    console.error('❌ Setup failed:', error.message);
  }
  
  process.exit(0);
}

createMinimalSchema();