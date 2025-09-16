const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'remoteclassroom',
  password: 'postgres',
  port: 5432,
});

async function createUsersTable() {
  try {
    console.log('🚀 Creating users table...');
    
    // Create the users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        first_name VARCHAR(50),
        last_name VARCHAR(50),
        role VARCHAR(20) DEFAULT 'student',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('✅ Users table created successfully');

    // Create indexes for better performance
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_users_username ON users (username)
    `);
    
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_users_email ON users (email)
    `);

    console.log('✅ Indexes created successfully');

    // Insert a test user
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash('test123', 10);

    const insertQuery = `
      INSERT INTO users (username, email, password_hash, first_name, last_name, role)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (username) DO NOTHING
      RETURNING id
    `;

    const result = await pool.query(insertQuery, [
      'testuser',
      'test@example.com',
      hashedPassword,
      'Test',
      'User',
      'student'
    ]);

    if (result.rows.length > 0) {
      console.log('✅ Test user created successfully');
    } else {
      console.log('✅ Test user already exists');
    }

    // Verify the table
    const countResult = await pool.query('SELECT COUNT(*) FROM users');
    console.log(`✅ Table verification: ${countResult.rows[0].count} rows in users table`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

createUsersTable();
