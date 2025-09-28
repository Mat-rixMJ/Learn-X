const pool = require('./backend/config/database');

async function checkTeachersAndClasses() {
  try {
    // Get classes with teachers
    const result = await pool.query(`
      SELECT c.name, c.subject, u.username as teacher 
      FROM classes c 
      JOIN users u ON c.teacher_id = u.id 
      LIMIT 5
    `);
    
    console.log('Classes and teachers:');
    result.rows.forEach(row => {
      console.log(`  ${row.name} (${row.subject}) - Teacher: ${row.teacher}`);
    });
    
    pool.end();
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkTeachersAndClasses();