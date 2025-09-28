require('dotenv').config({ path: '../backend/.env' });
const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

async function checkNotifications() {
  try {
    console.log('🔔 NOTIFICATION STATUS CHECK');
    console.log('==============================');
    
    // Check total notifications
    const total = await pool.query('SELECT COUNT(*) as count FROM notifications');
    console.log('📊 Total notifications:', total.rows[0].count);
    
    // Check notifications in last hour
    const recent = await pool.query(`
      SELECT COUNT(*) as count 
      FROM notifications 
      WHERE created_at > NOW() - INTERVAL '1 hour'
    `);
    console.log('📊 Notifications in last hour:', recent.rows[0].count);
    
    // Check by type
    const byType = await pool.query(`
      SELECT type, COUNT(*) as count
      FROM notifications 
      GROUP BY type 
      ORDER BY count DESC
    `);
    console.log('\n📱 Notifications by type:');
    byType.rows.forEach(row => {
      console.log(`   ${row.type}: ${row.count}`);
    });
    
    // Show recent notifications
    const recentNotifications = await pool.query(`
      SELECT type, message, created_at, is_read
      FROM notifications 
      ORDER BY created_at DESC 
      LIMIT 10
    `);
    
    console.log('\n📋 Recent notifications:');
    recentNotifications.rows.forEach((n, i) => {
      const status = n.is_read ? '✅' : '🔔';
      const time = new Date(n.created_at).toLocaleTimeString();
      console.log(`${i+1}. ${status} [${n.type}] (${time})`);
      console.log(`   ${n.message.substring(0, 70)}...`);
    });
    
    await pool.end();
    console.log('\n✅ Notification check completed');
    
  } catch (error) {
    console.error('❌ Error checking notifications:', error.message);
    process.exit(1);
  }
}

checkNotifications();