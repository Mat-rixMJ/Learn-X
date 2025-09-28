-- Enhanced Live Sessions Schema for Video Streaming, Recording & Translation
-- Add new columns to existing live_sessions table

-- Add new columns for video streaming and recording features
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

-- Create table for real-time chat messages during live sessions
CREATE TABLE IF NOT EXISTS live_session_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    session_id UUID NOT NULL REFERENCES live_sessions (id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    message_type VARCHAR(20) DEFAULT 'chat' CHECK (
        message_type IN (
            'chat',
            'system',
            'translation',
            'caption'
        )
    ),
    language VARCHAR(10) DEFAULT 'en',
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_translated BOOLEAN DEFAULT false,
    original_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create table for storing session recordings metadata
CREATE TABLE IF NOT EXISTS live_session_recordings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    session_id UUID NOT NULL REFERENCES live_sessions (id) ON DELETE CASCADE,
    file_path VARCHAR(500) NOT NULL,
    file_size BIGINT,
    duration_seconds INTEGER,
    video_quality VARCHAR(20) DEFAULT '720p',
    audio_quality VARCHAR(20) DEFAULT 'standard',
    recording_started_at TIMESTAMP,
    recording_ended_at TIMESTAMP,
    processing_status VARCHAR(20) DEFAULT 'pending' CHECK (
        processing_status IN (
            'pending',
            'processing',
            'completed',
            'failed'
        )
    ),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create table for real-time subtitles/captions
CREATE TABLE IF NOT EXISTS live_session_captions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    session_id UUID NOT NULL REFERENCES live_sessions (id) ON DELETE CASCADE,
    speaker_id UUID REFERENCES users (id) ON DELETE SET NULL,
    text_content TEXT NOT NULL,
    language VARCHAR(10) DEFAULT 'en',
    start_time DECIMAL(10, 3) NOT NULL, -- Time in seconds from session start
    end_time DECIMAL(10, 3),
    confidence_score DECIMAL(3, 2), -- Speech recognition confidence (0.0-1.0)
    is_auto_generated BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create table for WebRTC peer connections tracking
CREATE TABLE IF NOT EXISTS live_session_peers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    session_id UUID NOT NULL REFERENCES live_sessions (id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    peer_id VARCHAR(255) NOT NULL,
    connection_type VARCHAR(20) DEFAULT 'participant' CHECK (
        connection_type IN (
            'broadcaster',
            'participant',
            'viewer'
        )
    ),
    ice_servers JSONB,
    connection_status VARCHAR(20) DEFAULT 'connecting' CHECK (
        connection_status IN (
            'connecting',
            'connected',
            'disconnected',
            'failed'
        )
    ),
    connected_at TIMESTAMP,
    disconnected_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_live_session_messages_session_id ON live_session_messages (session_id);

CREATE INDEX IF NOT EXISTS idx_live_session_messages_timestamp ON live_session_messages (timestamp);

CREATE INDEX IF NOT EXISTS idx_live_session_recordings_session_id ON live_session_recordings (session_id);

CREATE INDEX IF NOT EXISTS idx_live_session_captions_session_id ON live_session_captions (session_id);

CREATE INDEX IF NOT EXISTS idx_live_session_captions_time ON live_session_captions (session_id, start_time);

CREATE INDEX IF NOT EXISTS idx_live_session_peers_session_id ON live_session_peers (session_id);

CREATE INDEX IF NOT EXISTS idx_live_session_peers_user_id ON live_session_peers (user_id);

-- Add triggers for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_live_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_live_sessions_updated_at_trigger
    BEFORE UPDATE ON live_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_live_sessions_updated_at();

CREATE TRIGGER update_live_session_recordings_updated_at_trigger
    BEFORE UPDATE ON live_session_recordings
    FOR EACH ROW
    EXECUTE FUNCTION update_live_sessions_updated_at();

-- Insert sample data for testing
INSERT INTO
    live_sessions (
        class_id,
        teacher_id,
        title,
        description,
        recording_enabled,
        translation_enabled,
        subtitle_enabled
    )
SELECT c.id, u.id, 'Sample Live Session with Recording', 'Testing advanced live streaming features', true, true, true
FROM classes c
    CROSS JOIN users u
WHERE
    u.role = 'teacher'
LIMIT 1 ON CONFLICT DO NOTHING;