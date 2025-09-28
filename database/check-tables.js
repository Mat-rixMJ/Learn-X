const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'learnx',
  user: 'postgres',
  password: 'postgres'
});

async function checkTables() {
  try {
    // Check users table structure
    const usersResult = await pool.query('SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = $1 ORDER BY ordinal_position', ['users']);
    console.log('=== USERS TABLE STRUCTURE ===');
    usersResult.rows.forEach(row => {
      console.log(`${row.column_name}: ${row.data_type} (${row.is_nullable})`);
    });

    // Check existing users
    const userData = await pool.query('SELECT id, username, role FROM users LIMIT 5');
    console.log('\n=== EXISTING USERS ===');
    userData.rows.forEach(user => {
      console.log(`${user.username} (${user.role}) - ID: ${user.id}`);
    });

    // Check if teacher_profiles table exists
    const teacherTableCheck = await pool.query('SELECT table_name FROM information_schema.tables WHERE table_name = $1', ['teacher_profiles']);
    console.log('\n=== TEACHER PROFILES TABLE ===');
    console.log('Exists:', teacherTableCheck.rows.length > 0);

    // Check student_profiles table
    const studentTableCheck = await pool.query('SELECT column_name FROM information_schema.columns WHERE table_name = $1', ['student_profiles']);
    console.log('\n=== STUDENT PROFILES COLUMNS ===');
    studentTableCheck.rows.forEach(row => {
      console.log(`- ${row.column_name}`);
    });

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    pool.end();
  }
}

checkTables();