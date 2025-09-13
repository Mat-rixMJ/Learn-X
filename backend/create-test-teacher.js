const pool = require('./config/database');
const bcrypt = require('bcryptjs');

async function createTestTeacher() {
  try {
    // Create a test teacher with known credentials
    const hashedPassword = await bcrypt.hash('testpassword', 10);
    
    // First check if test teacher already exists
    const existingUser = await pool.query("SELECT id FROM users WHERE username = 'testteacher'");
    
    if (existingUser.rows.length === 0) {
      const result = await pool.query(
        'INSERT INTO users (username, email, full_name, password_hash, role, is_active) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, username',
        ['testteacher', 'testteacher@example.com', 'Test Teacher', hashedPassword, 'teacher', true]
      );
      console.log('Created test teacher:', result.rows[0]);
    } else {
      console.log('Test teacher already exists');
    }
    
    console.log('Test credentials: username=testteacher, password=testpassword');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

createTestTeacher();