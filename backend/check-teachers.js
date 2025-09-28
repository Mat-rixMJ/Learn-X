const pool = require('./config/database');

async function checkTeachers() {
  try {
    const result = await pool.query("SELECT id, username, email, full_name, role FROM users WHERE role = 'teacher'");
    console.log('Teachers in database:');
    result.rows.forEach(user => {
      console.log(`Username: ${user.username}, Email: ${user.email}, Name: ${user.full_name}`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

checkTeachers();