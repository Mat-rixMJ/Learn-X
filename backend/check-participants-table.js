const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT
});

async function checkParticipantsTable() {
  try {
    const result = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'live_session_participants' 
      ORDER BY ordinal_position
    `);
    
    console.log('Live session participants table columns:');
    if (result.rows.length === 0) {
      console.log('❌ Table live_session_participants does not exist');
      
      // Create the table
      await pool.query(`
        CREATE TABLE live_session_participants (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          session_id UUID NOT NULL REFERENCES live_sessions(id) ON DELETE CASCADE,
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          left_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('✅ Created live_session_participants table');
      
      // Create indexes
      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_live_session_participants_session_id 
        ON live_session_participants(session_id)
      `);
      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_live_session_participants_user_id 
        ON live_session_participants(user_id)
      `);
      console.log('✅ Created indexes for live_session_participants');
      
    } else {
      result.rows.forEach(row => {
        console.log(`- ${row.column_name}: ${row.data_type}`);
      });
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkParticipantsTable();