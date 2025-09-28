// Test database connection
require('dotenv').config();
const { Pool } = require('pg');

async function testDatabase() {
  const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'learnx',
    password: process.env.DB_PASSWORD || 'postgres',
    port: process.env.DB_PORT || 5432,
  });

  try {
    console.log('Testing database connection...');
    
    // Test basic connection
    const client = await pool.connect();
    console.log('✅ Database connection successful!');
    
    // Test database version
    const versionResult = await client.query('SELECT version()');
    console.log('📊 PostgreSQL Version:', versionResult.rows[0].version);
    
    // Check if database exists
    const dbResult = await client.query('SELECT current_database()');
    console.log('🗄️ Current Database:', dbResult.rows[0].current_database);
    
    // List existing tables
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    console.log('\n📋 Existing tables:');
    if (tablesResult.rows.length === 0) {
      console.log('   No tables found - database is empty');
    } else {
      tablesResult.rows.forEach(row => {
        console.log('   -', row.table_name);
      });
    }
    
    // Test if users table exists and has data
    try {
      const userCountResult = await client.query('SELECT COUNT(*) FROM users');
      console.log('\n👥 Users count:', userCountResult.rows[0].count);
    } catch (error) {
      console.log('\n⚠️ Users table does not exist or is empty');
    }
    
    client.release();
    await pool.end();
    
    console.log('\n✅ Database test completed successfully!');
    
  } catch (error) {
    console.error('❌ Database connection failed:');
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Suggestions:');
      console.log('   1. Make sure PostgreSQL service is running');
      console.log('   2. Check if the database "learnx" exists');
      console.log('   3. Verify connection settings in .env file');
    } else if (error.code === '28P01') {
      console.log('\n💡 Authentication failed. Check:');
      console.log('   1. Database username and password in .env');
      console.log('   2. PostgreSQL authentication method (pg_hba.conf)');
    } else if (error.code === '3D000') {
      console.log('\n💡 Database "learnx" does not exist. Create it with:');
      console.log('   CREATE DATABASE learnx;');
    }
    
    process.exit(1);
  }
}

testDatabase();