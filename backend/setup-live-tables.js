const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'remote_classroom',
  password: process.env.DB_PASSWORD || 'password',
  port: process.env.DB_PORT || 5432,
});

async function setupLiveSessionTables() {
  try {
    console.log('Setting up live session tables...');

    // Create live_sessions table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS live_sessions (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          class_id UUID NOT NULL,
          teacher_id UUID NOT NULL,
          title VARCHAR(255) NOT NULL,
          description TEXT,
          max_participants INTEGER DEFAULT 50,
          status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'ended', 'cancelled')),
          started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          ended_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create live_session_participants table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS live_session_participants (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          session_id UUID NOT NULL,
          user_id UUID NOT NULL,
          joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          left_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create indexes for better performance - only after tables are created
    console.log('Creating indexes...');
    
    try {
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_live_sessions_class_id ON live_sessions(class_id);`);
      console.log('✅ Created index on class_id');
    } catch (err) {
      console.log('⚠️  Index on class_id already exists or failed:', err.message);
    }

    try {
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_live_sessions_teacher_id ON live_sessions(teacher_id);`);
      console.log('✅ Created index on teacher_id');
    } catch (err) {
      console.log('⚠️  Index on teacher_id already exists or failed:', err.message);
    }

    try {
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_live_sessions_status ON live_sessions(status);`);
      console.log('✅ Created index on status');
    } catch (err) {
      console.log('⚠️  Index on status already exists or failed:', err.message);
    }

    try {
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_live_session_participants_session_id ON live_session_participants(session_id);`);
      console.log('✅ Created index on session_id');
    } catch (err) {
      console.log('⚠️  Index on session_id already exists or failed:', err.message);
    }

    try {
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_live_session_participants_user_id ON live_session_participants(user_id);`);
      console.log('✅ Created index on user_id');
    } catch (err) {
      console.log('⚠️  Index on user_id already exists or failed:', err.message);
    }

    // Add unique constraint to prevent duplicate active participants
    await pool.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_participant 
      ON live_session_participants(session_id, user_id) 
      WHERE left_at IS NULL;
    `);

    console.log('✅ Live session tables created successfully!');

  } catch (error) {
    console.error('❌ Error setting up live session tables:', error);
  } finally {
    await pool.end();
  }
}

// Run the setup
setupLiveSessionTables();
