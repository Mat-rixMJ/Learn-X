// Check subjects table structure
require('dotenv').config({ path: './backend/.env' });
const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'learnx',
  password: process.env.DB_PASSWORD || 'postgres',
  port: process.env.DB_PORT || 5432,
});

async function checkSubjectsTable() {
  try {
    console.log('Checking subjects table structure...');

    // Get column information
    const columnsQuery = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'subjects'
      ORDER BY ordinal_position
    `);

    console.log('\n📋 Subjects table columns:');
    columnsQuery.rows.forEach(row => {
      console.log(`   ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
    });

    // Check current data
    const dataQuery = await pool.query('SELECT * FROM subjects LIMIT 5');
    console.log('\n📊 Current subjects data:');
    if (dataQuery.rows.length === 0) {
      console.log('   No data found');
    } else {
      dataQuery.rows.forEach(row => {
        console.log('   ', row);
      });
    }

    await pool.end();

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkSubjectsTable();