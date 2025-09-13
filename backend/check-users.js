const pool = require('./config/database');

async function checkUsers() {
  try {
    const result = await pool.query('SELECT id, email, full_name, role FROM users LIMIT 5');
    console.log('Users in database:');
    result.rows.forEach(user => {
      console.log(`ID: ${user.id}, Email: ${user.email}, Name: ${user.full_name}, Role: ${user.role}`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

checkUsers();