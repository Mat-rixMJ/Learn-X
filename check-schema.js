require('dotenv').config({ path: './backend/.env' });
const pool = require('./backend/config/database');

async function checkSchema() {
  try {
    console.log('Checking database schema...\n');
    
    // Check classes table columns
    const classesColumns = await pool.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'classes' 
      ORDER BY ordinal_position
    `);
    
    console.log('Classes table columns:');
    classesColumns.rows.forEach(row => {
      console.log(`  - ${row.column_name} (${row.data_type}) ${row.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });
    
    // Check users table
    const usersColumns = await pool.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      ORDER BY ordinal_position
    `);
    
    console.log('\nUsers table columns:');
    usersColumns.rows.forEach(row => {
      console.log(`  - ${row.column_name} (${row.data_type}) ${row.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });
    
    // Check if admin user exists
    const adminUser = await pool.query("SELECT username, role FROM users WHERE username = 'admin'");
    console.log('\nAdmin user check:');
    if (adminUser.rows.length > 0) {
      console.log(`  ✅ Admin user exists: ${adminUser.rows[0].username} (${adminUser.rows[0].role})`);
    } else {
      console.log('  ❌ Admin user not found');
    }
    
    // Check sample data
    const classCount = await pool.query('SELECT COUNT(*) FROM classes');
    const userCount = await pool.query('SELECT COUNT(*) FROM users');
    const enrollmentCount = await pool.query('SELECT COUNT(*) FROM class_enrollments');
    
    console.log('\nData counts:');
    console.log(`  - Classes: ${classCount.rows[0].count}`);
    console.log(`  - Users: ${userCount.rows[0].count}`);
    console.log(`  - Enrollments: ${enrollmentCount.rows[0].count}`);
    
  } catch (error) {
    console.error('Error checking schema:', error);
  } finally {
    pool.end();
  }
}

checkSchema();