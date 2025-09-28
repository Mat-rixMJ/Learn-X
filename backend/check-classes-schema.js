const pool = require('./config/database');

async function checkSchema() {
  try {
    const result = await pool.query(`
      SELECT column_name, is_nullable, data_type, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'classes' 
      ORDER BY ordinal_position
    `);
    
    console.log('Classes table columns:');
    result.rows.forEach(row => {
      console.log(`${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable}, default: ${row.column_default})`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

checkSchema();