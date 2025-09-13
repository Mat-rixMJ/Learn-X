const pool = require('./config/database');

async function createTestClass() {
  try {
    // Get our test teacher ID
    const teacherResult = await pool.query("SELECT id FROM users WHERE username = 'testteacher'");
    
    if (teacherResult.rows.length === 0) {
      console.log('Test teacher not found');
      return;
    }
    
    const teacherId = teacherResult.rows[0].id;
    
    // Create a test class for this teacher
    const classResult = await pool.query(
      'INSERT INTO classes (id, name, subject, description, teacher_id, is_active, sharable_link) VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6) RETURNING id, name',
      ['Test Math Class', 'Mathematics', 'A test mathematics class for scheduling', teacherId, true, 'test-math-class']
    );
    
    console.log('Created test class:', classResult.rows[0]);
    console.log('Class ID for testing:', classResult.rows[0].id);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

createTestClass();