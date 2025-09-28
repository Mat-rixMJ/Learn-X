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
    
    // Execute the enhanced schema SQL directly
    console.log('Adding new columns to live_sessions table...');
    
    // Add new columns for video streaming and recording features
    await client.query(`
      ALTER TABLE live_sessions 
      ADD COLUMN IF NOT EXISTS stream_url VARCHAR(500),
      ADD COLUMN IF NOT EXISTS stream_key VARCHAR(255),
      ADD COLUMN IF NOT EXISTS recording_enabled BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS recording_url VARCHAR(500),
      ADD COLUMN IF NOT EXISTS recording_status VARCHAR(20) DEFAULT 'none' CHECK (
          recording_status IN ('none', 'recording', 'processing', 'completed', 'failed')
      ),
      ADD COLUMN IF NOT EXISTS translation_enabled BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS subtitle_enabled BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS available_languages TEXT[] DEFAULT ARRAY['en'],
      ADD COLUMN IF NOT EXISTS default_language VARCHAR(10) DEFAULT 'en';
    `);
    
    console.log('Creating live_session_messages table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS live_session_messages (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          session_id UUID NOT NULL REFERENCES live_sessions(id) ON DELETE CASCADE,
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          message TEXT NOT NULL,
          message_type VARCHAR(20) DEFAULT 'chat' CHECK (
              message_type IN ('chat', 'system', 'translation', 'caption')
          ),
          language VARCHAR(10) DEFAULT 'en',
          timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          is_translated BOOLEAN DEFAULT false,
          original_message TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    console.log('Creating live_session_recordings table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS live_session_recordings (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          session_id UUID NOT NULL REFERENCES live_sessions(id) ON DELETE CASCADE,
          file_path VARCHAR(500) NOT NULL,
          file_size BIGINT,
          duration_seconds INTEGER,
          video_quality VARCHAR(20) DEFAULT '720p',
          audio_quality VARCHAR(20) DEFAULT 'standard',
          recording_started_at TIMESTAMP,
          recording_ended_at TIMESTAMP,
          processing_status VARCHAR(20) DEFAULT 'pending' CHECK (
              processing_status IN ('pending', 'processing', 'completed', 'failed')
          ),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    console.log('Creating live_session_captions table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS live_session_captions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          session_id UUID NOT NULL REFERENCES live_sessions(id) ON DELETE CASCADE,
          speaker_id UUID REFERENCES users(id) ON DELETE SET NULL,
          text_content TEXT NOT NULL,
          language VARCHAR(10) DEFAULT 'en',
          start_time DECIMAL(10,3) NOT NULL,
          end_time DECIMAL(10,3),
          confidence_score DECIMAL(3,2),
          is_auto_generated BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    console.log('Creating live_session_peers table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS live_session_peers (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          session_id UUID NOT NULL REFERENCES live_sessions(id) ON DELETE CASCADE,
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          peer_id VARCHAR(255) NOT NULL,
          connection_type VARCHAR(20) DEFAULT 'participant' CHECK (
              connection_type IN ('broadcaster', 'participant', 'viewer')
          ),
          ice_servers JSONB,
          connection_status VARCHAR(20) DEFAULT 'connecting' CHECK (
              connection_status IN ('connecting', 'connected', 'disconnected', 'failed')
          ),
          connected_at TIMESTAMP,
          disconnected_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    console.log('Creating indexes...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_live_session_messages_session_id ON live_session_messages(session_id);
      CREATE INDEX IF NOT EXISTS idx_live_session_messages_timestamp ON live_session_messages(timestamp);
      CREATE INDEX IF NOT EXISTS idx_live_session_recordings_session_id ON live_session_recordings(session_id);
      CREATE INDEX IF NOT EXISTS idx_live_session_captions_session_id ON live_session_captions(session_id);
      CREATE INDEX IF NOT EXISTS idx_live_session_captions_time ON live_session_captions(session_id, start_time);
      CREATE INDEX IF NOT EXISTS idx_live_session_peers_session_id ON live_session_peers(session_id);
      CREATE INDEX IF NOT EXISTS idx_live_session_peers_user_id ON live_session_peers(user_id);
    `);
    
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