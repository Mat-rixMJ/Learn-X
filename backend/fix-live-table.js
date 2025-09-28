const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT
});

async function addTeacherId() {
  try {
    // Add teacher_id column
    await pool.query(`
      ALTER TABLE live_sessions 
      ADD COLUMN IF NOT EXISTS teacher_id UUID REFERENCES users(id) ON DELETE CASCADE
    `);
    console.log('✅ Added teacher_id column');

    // Add title column
    await pool.query(`
      ALTER TABLE live_sessions 
      ADD COLUMN IF NOT EXISTS title VARCHAR(255)
    `);
    console.log('✅ Added title column');

    // Add description column
    await pool.query(`
      ALTER TABLE live_sessions 
      ADD COLUMN IF NOT EXISTS description TEXT
    `);
    console.log('✅ Added description column');

    // Add max_participants column
    await pool.query(`
      ALTER TABLE live_sessions 
      ADD COLUMN IF NOT EXISTS max_participants INTEGER DEFAULT 50
    `);
    console.log('✅ Added max_participants column');

    // Add created_at and updated_at columns
    await pool.query(`
      ALTER TABLE live_sessions 
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    `);
    console.log('✅ Added created_at column');

    await pool.query(`
      ALTER TABLE live_sessions 
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    `);
    console.log('✅ Added updated_at column');

    console.log('✅ Live sessions table updated successfully');
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

addTeacherId();