const pool = require('./config/database');

async function checkScheduledClassesTable() {
  try {
    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'scheduled_classes' 
      ORDER BY ordinal_position
    `);
    
    console.log('scheduled_classes table structure:');
    result.rows.forEach(row => {
      console.log(`${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

checkScheduledClassesTable();