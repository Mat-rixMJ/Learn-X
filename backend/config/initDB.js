const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Database initialization for Render
const initializeDatabase = async () => {
  if (process.env.NODE_ENV !== 'production') {
    return; // Skip in development
  }

  try {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });

    console.log('🗄️  Initializing database...');
    
    // Read and execute init-db.sql
    const initSQL = fs.readFileSync(path.join(__dirname, 'init-db.sql'), 'utf8');
    await pool.query(initSQL);
    
    console.log('✅ Database initialized successfully');
    await pool.end();
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
  }
};

module.exports = { initializeDatabase };
