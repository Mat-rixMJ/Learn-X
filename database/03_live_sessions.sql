-- Create live sessions table
CREATE TABLE IF NOT EXISTS live_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    class_id UUID NOT NULL REFERENCES classes (id) ON DELETE CASCADE,
    teacher_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    max_participants INTEGER DEFAULT 50,
    status VARCHAR(20) DEFAULT 'active' CHECK (
        status IN (
            'active',
            'ended',
            'cancelled'
        )
    ),
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create live session participants table
CREATE TABLE IF NOT EXISTS live_session_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    session_id UUID NOT NULL REFERENCES live_sessions (id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    left_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_live_sessions_class_id ON live_sessions (class_id);

CREATE INDEX IF NOT EXISTS idx_live_sessions_teacher_id ON live_sessions (teacher_id);

CREATE INDEX IF NOT EXISTS idx_live_sessions_status ON live_sessions (status);

CREATE INDEX IF NOT EXISTS idx_live_session_participants_session_id ON live_session_participants (session_id);

CREATE INDEX IF NOT EXISTS idx_live_session_participants_user_id ON live_session_participants (user_id);

-- Add unique constraint to prevent duplicate active participants
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_participant ON live_session_participants (session_id, user_id)
WHERE
    left_at IS NULL;