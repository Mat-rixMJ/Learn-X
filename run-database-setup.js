const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config({ path: './backend/.env' });

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'remoteclassroom',
  password: process.env.DB_PASSWORD || 'password',
  port: process.env.DB_PORT || 5432,
});

async function runDatabaseSetup() {
  console.log('🗄️ Setting up Student Dashboard Database Schema...\n');

  try {
    // Read the SQL file
    const sqlFilePath = path.join(__dirname, 'database', 'setup-student-dashboard.sql');
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
    
    console.log('📝 Executing database setup script...');
    
    // Execute the SQL
    const result = await pool.query(sqlContent);
    
    console.log('✅ Database setup completed successfully!');
    
    if (result.rows && result.rows.length > 0) {
      console.log('📋 Result:', result.rows[0]);
    }

  } catch (error) {
    console.error('❌ Database setup failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run the setup
runDatabaseSetup().catch(error => {
  console.error('Setup failed:', error);
  process.exit(1);
});