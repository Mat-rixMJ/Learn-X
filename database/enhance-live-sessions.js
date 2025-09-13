const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'remoteclassroom',
  password: process.env.DB_PASSWORD || 'postgres',
  port: process.env.DB_PORT || 5432,
});

async function enhanceLiveSessionsSchema() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Starting enhanced live sessions schema update...');
    
    // Read and execute the enhanced schema SQL
    const fs = require('fs');
    const path = require('path');
    const sqlPath = path.join(__dirname, 'enhanced_live_sessions.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    // Split by semicolon and execute each statement
    const statements = sql.split(';').filter(stmt => stmt.trim().length > 0);
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i].trim();
      if (statement) {
        console.log(`Executing statement ${i + 1}/${statements.length}...`);
        await client.query(statement);
      }
    }
    
    // Verify the new columns exist
    console.log('\n✅ Verifying new schema...');
    
    const result = await client.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'live_sessions' 
      AND column_name IN (
        'recording_enabled', 'recording_url', 'translation_enabled', 
        'subtitle_enabled', 'available_languages', 'stream_url'
      )
      ORDER BY column_name;
    `);
    
    console.log('New columns in live_sessions table:');
    result.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
    });
    
    // Check new tables
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name LIKE 'live_session_%'
      ORDER BY table_name;
    `);
    
    console.log('\nLive session related tables:');
    tables.rows.forEach(row => {
      console.log(`  - ${row.table_name}`);
    });
    
    console.log('\n🎉 Enhanced live sessions schema applied successfully!');
    console.log('\nNew Features Available:');
    console.log('  ✅ Video streaming with WebRTC support');
    console.log('  ✅ Session recording capabilities');
    console.log('  ✅ Real-time translation and subtitles');
    console.log('  ✅ Live chat messaging');
    console.log('  ✅ Peer connection tracking');
    console.log('  ✅ Automated caption generation');
    
  } catch (error) {
    console.error('❌ Error enhancing live sessions schema:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Run the enhancement if this file is executed directly
if (require.main === module) {
  enhanceLiveSessionsSchema()
    .then(() => {
      console.log('\n🚀 Ready to build advanced live streaming features!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Failed to enhance schema:', error);
      process.exit(1);
    });
}

module.exports = { enhanceLiveSessionsSchema };