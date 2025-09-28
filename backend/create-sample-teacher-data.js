const pool = require('./config/database');

async function createSampleData() {
  try {
    // First, let's check if we have a teacher user
    const teacherQuery = 'SELECT id FROM users WHERE role = $1 LIMIT 1';
    const teacherResult = await pool.query(teacherQuery, ['teacher']);
    
    if (teacherResult.rows.length === 0) {
      console.log('No teacher found. Creating sample teacher...');
      const insertTeacher = `
        INSERT INTO users (id, email, full_name, role, password_hash) 
        VALUES (gen_random_uuid(), 'teacher@test.com', 'Sample Teacher', 'teacher', 'sample_hash')
        RETURNING id
      `;
      const newTeacher = await pool.query(insertTeacher);
      console.log('Created teacher with ID:', newTeacher.rows[0].id);
    } else {
      console.log('Teacher found with ID:', teacherResult.rows[0].id);
    }
    
    // Get the teacher ID
    const teacher = await pool.query(teacherQuery, ['teacher']);
    const teacherId = teacher.rows[0].id;
    
    // Create a sample class if none exists
    const classQuery = 'SELECT id FROM classes WHERE teacher_id = $1 LIMIT 1';
    const classResult = await pool.query(classQuery, [teacherId]);
    
    let classId;
    if (classResult.rows.length === 0) {
      console.log('Creating sample class...');
      const insertClass = `
        INSERT INTO classes (id, name, subject, description, teacher_id, is_active, sharable_link) 
        VALUES (gen_random_uuid(), 'Math 101', 'Mathematics', 'Basic Mathematics Course', $1, true, 'math-101-sample')
        RETURNING id
      `;
      const newClass = await pool.query(insertClass, [teacherId]);
      classId = newClass.rows[0].id;
      console.log('Created class with ID:', classId);
    } else {
      classId = classResult.rows[0].id;
      console.log('Class found with ID:', classId);
    }
    
    // Create a sample scheduled class
    const scheduledQuery = 'SELECT id FROM scheduled_classes WHERE teacher_id = $1 LIMIT 1';
    const scheduledResult = await pool.query(scheduledQuery, [teacherId]);
    
    if (scheduledResult.rows.length === 0) {
      console.log('Creating sample scheduled class...');
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const insertScheduled = `
        INSERT INTO scheduled_classes (id, teacher_id, class_id, title, description, scheduled_at, duration_minutes) 
        VALUES (gen_random_uuid(), $1, $2, 'Upcoming Math Lesson', 'Review of Chapter 5', $3, 60)
        RETURNING id
      `;
      const newScheduled = await pool.query(insertScheduled, [teacherId, classId, tomorrow]);
      console.log('Created scheduled class with ID:', newScheduled.rows[0].id);
    } else {
      console.log('Scheduled class found with ID:', scheduledResult.rows[0].id);
    }
    
    console.log('Sample data setup complete!');
    
  } catch (error) {
    console.error('Error creating sample data:', error);
  } finally {
    await pool.end();
  }
}

createSampleData();