const pool = require('./config/database');

async function checkTables() {
  try {
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    
    console.log('Existing tables:');
    result.rows.forEach(row => console.log('- ' + row.table_name));
    
    // Check for required tables
    const tables = result.rows.map(row => row.table_name);
    const required = ['users', 'classes', 'recorded_lectures', 'user_classes'];
    
    console.log('\nMissing tables:');
    required.forEach(table => {
      if (!tables.includes(table)) {
        console.log('- ' + table + ' (MISSING)');
      } else {
        console.log('- ' + table + ' (EXISTS)');
      }
    });
    
  } catch (error) {
    console.error('Error checking tables:', error.message);
  }
  
  process.exit(0);
}

checkTables();