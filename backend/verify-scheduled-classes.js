const pool = require('./config/database');

async function checkScheduledClasses() {
  try {
    const result = await pool.query('SELECT * FROM scheduled_classes ORDER BY created_at DESC LIMIT 3');
    console.log('Recent scheduled classes:');
    result.rows.forEach(row => {
      console.log(`ID: ${row.id}`);
      console.log(`Title: ${row.title}`);
      console.log(`Teacher: ${row.teacher_id}`);
      console.log(`Scheduled: ${row.scheduled_at}`);
      console.log(`Status: ${row.status}`);
      console.log('---');
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

checkScheduledClasses();