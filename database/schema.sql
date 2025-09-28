-- LearnX Database Schema
-- Version: 1.0
-- Created: 2025-01-XX

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('student', 'teacher', 'admin')),
    is_active BOOLEAN DEFAULT true,
    profile_complete BOOLEAN DEFAULT false,
    email_verified BOOLEAN DEFAULT false,
    profile_picture VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP WITH TIME ZONE,

-- Indexes
CONSTRAINT users_username_check CHECK (length(username) >= 3),
    CONSTRAINT users_email_check CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- Classes table
CREATE TABLE classes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4 (),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    subject VARCHAR(50),
    teacher_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    max_participants INTEGER DEFAULT 100,
    is_active BOOLEAN DEFAULT true,
    sharable_link VARCHAR(32) UNIQUE NOT NULL,
    scheduled_at TIMESTAMP
    WITH
        TIME ZONE,
        duration_minutes INTEGER DEFAULT 60,
        meeting_room_id VARCHAR(100),
        created_at TIMESTAMP
    WITH
        TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP
    WITH
        TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Class enrollments
CREATE TABLE class_enrollments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4 (),
    class_id UUID NOT NULL REFERENCES classes (id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    enrolled_at TIMESTAMP
    WITH
        TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        is_active BOOLEAN DEFAULT true,
        UNIQUE (class_id, student_id)
);

-- Live sessions
CREATE TABLE live_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4 (),
    class_id UUID NOT NULL REFERENCES classes (id) ON DELETE CASCADE,
    started_at TIMESTAMP
    WITH
        TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        ended_at TIMESTAMP
    WITH
        TIME ZONE,
        is_recording BOOLEAN DEFAULT false,
        recording_url VARCHAR(255),
        participant_count INTEGER DEFAULT 0,
        status VARCHAR(20) DEFAULT 'active' CHECK (
            status IN ('active', 'ended', 'paused')
        )
);

-- Session participants tracking
CREATE TABLE session_participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4 (),
    session_id UUID NOT NULL REFERENCES live_sessions (id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    joined_at TIMESTAMP
    WITH
        TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        left_at TIMESTAMP
    WITH
        TIME ZONE,
        is_present BOOLEAN DEFAULT true,
        role_in_session VARCHAR(20) DEFAULT 'participant' CHECK (
            role_in_session IN (
                'presenter',
                'participant',
                'moderator'
            )
        )
);

-- Recorded lectures
CREATE TABLE recorded_lectures (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4 (),
    class_id UUID NOT NULL REFERENCES classes (id) ON DELETE CASCADE,
    session_id UUID REFERENCES live_sessions (id),
    title VARCHAR(200) NOT NULL,
    description TEXT,
    video_url VARCHAR(255),
    audio_url VARCHAR(255),
    slides_url VARCHAR(255),
    transcript TEXT,
    ai_summary TEXT,
    duration_seconds INTEGER,
    file_size_bytes BIGINT,
    recorded_at TIMESTAMP
    WITH
        TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        is_processed BOOLEAN DEFAULT false,
        is_public BOOLEAN DEFAULT false
);

-- AI-generated notes and transcripts
CREATE TABLE ai_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lecture_id UUID NOT NULL REFERENCES recorded_lectures(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    summary TEXT,
    key_points JSONB,
    tags TEXT[],
    confidence_score DECIMAL(3,2),
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_verified BOOLEAN DEFAULT false
);

-- Chat messages
CREATE TABLE chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4 (),
    session_id UUID NOT NULL REFERENCES live_sessions (id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    message_type VARCHAR(20) DEFAULT 'text' CHECK (
        message_type IN (
            'text',
            'emoji',
            'file',
            'poll'
        )
    ),
    is_private BOOLEAN DEFAULT false,
    reply_to UUID REFERENCES chat_messages (id),
    sent_at TIMESTAMP
    WITH
        TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        is_deleted BOOLEAN DEFAULT false
);

-- Polls and quizzes
CREATE TABLE polls (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4 (),
    session_id UUID NOT NULL REFERENCES live_sessions (id) ON DELETE CASCADE,
    teacher_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    options JSONB NOT NULL,
    poll_type VARCHAR(20) DEFAULT 'multiple_choice' CHECK (
        poll_type IN (
            'multiple_choice',
            'single_choice',
            'text',
            'rating'
        )
    ),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP
    WITH
        TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        ends_at TIMESTAMP
    WITH
        TIME ZONE
);

-- Poll responses
CREATE TABLE poll_responses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4 (),
    poll_id UUID NOT NULL REFERENCES polls (id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    response JSONB NOT NULL,
    submitted_at TIMESTAMP
    WITH
        TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (poll_id, user_id)
);

-- File uploads
CREATE TABLE file_uploads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4 (),
    user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    original_filename VARCHAR(255) NOT NULL,
    stored_filename VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    file_size BIGINT NOT NULL,
    upload_type VARCHAR(50) NOT NULL,
    is_processed BOOLEAN DEFAULT false,
    created_at TIMESTAMP
    WITH
        TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Notifications
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4 (),
    user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    notification_type VARCHAR(50) NOT NULL,
    is_read BOOLEAN DEFAULT false,
    action_url VARCHAR(255),
    expires_at TIMESTAMP
    WITH
        TIME ZONE,
        created_at TIMESTAMP
    WITH
        TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- User sessions (for authentication)
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4 (),
    user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    refresh_token VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP
    WITH
        TIME ZONE NOT NULL,
        created_at TIMESTAMP
    WITH
        TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        last_used TIMESTAMP
    WITH
        TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        ip_address INET,
        user_agent TEXT
);

-- System settings
CREATE TABLE system_settings (
    key VARCHAR(100) PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMP
    WITH
        TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_by UUID REFERENCES users (id)
);

-- Audit log for security
CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4 (),
    user_id UUID REFERENCES users (id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    table_name VARCHAR(50),
    record_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP
    WITH
        TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX idx_users_email ON users (email);

CREATE INDEX idx_users_username ON users (username);

CREATE INDEX idx_users_role ON users (role);

CREATE INDEX idx_users_active ON users (is_active);

CREATE INDEX idx_classes_teacher ON classes (teacher_id);

CREATE INDEX idx_classes_active ON classes (is_active);

CREATE INDEX idx_classes_sharable_link ON classes (sharable_link);

CREATE INDEX idx_class_enrollments_class ON class_enrollments (class_id);

CREATE INDEX idx_class_enrollments_student ON class_enrollments (student_id);

CREATE INDEX idx_live_sessions_class ON live_sessions (class_id);

CREATE INDEX idx_live_sessions_status ON live_sessions (status);

CREATE INDEX idx_live_sessions_started ON live_sessions (started_at);

CREATE INDEX idx_session_participants_session ON session_participants (session_id);

CREATE INDEX idx_session_participants_user ON session_participants (user_id);

CREATE INDEX idx_recorded_lectures_class ON recorded_lectures (class_id);

CREATE INDEX idx_recorded_lectures_recorded_at ON recorded_lectures (recorded_at);

CREATE INDEX idx_ai_notes_lecture ON ai_notes (lecture_id);

CREATE INDEX idx_ai_notes_user ON ai_notes (user_id);

CREATE INDEX idx_ai_notes_tags ON ai_notes USING GIN (tags);

CREATE INDEX idx_chat_messages_session ON chat_messages (session_id);

CREATE INDEX idx_chat_messages_user ON chat_messages (user_id);

CREATE INDEX idx_chat_messages_sent_at ON chat_messages (sent_at);

CREATE INDEX idx_polls_session ON polls (session_id);

CREATE INDEX idx_polls_active ON polls (is_active);

CREATE INDEX idx_notifications_user ON notifications (user_id);

CREATE INDEX idx_notifications_unread ON notifications (user_id, is_read)
WHERE
    is_read = false;

CREATE INDEX idx_user_sessions_user ON user_sessions (user_id);

CREATE INDEX idx_user_sessions_token ON user_sessions (refresh_token);

CREATE INDEX idx_user_sessions_expires ON user_sessions (expires_at);

CREATE INDEX idx_audit_log_user ON audit_log (user_id);

CREATE INDEX idx_audit_log_action ON audit_log (action);

CREATE INDEX idx_audit_log_created ON audit_log (created_at);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at trigger to relevant tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_classes_updated_at BEFORE UPDATE ON classes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default system settings
INSERT INTO
    system_settings (key, value, description)
VALUES (
        'max_concurrent_sessions',
        '1000',
        'Maximum number of concurrent live sessions'
    ),
    (
        'max_participants_per_session',
        '100',
        'Maximum participants per live session'
    ),
    (
        'recording_enabled',
        'true',
        'Whether recording is enabled globally'
    ),
    (
        'ai_features_enabled',
        'true',
        'Whether AI features are enabled'
    ),
    (
        'file_upload_max_size',
        '52428800',
        'Maximum file upload size in bytes (50MB)'
    ),
    (
        'session_timeout_minutes',
        '30',
        'Session timeout in minutes'
    ),
    (
        'rate_limit_requests_per_minute',
        '100',
        'Rate limit for API requests per minute'
    );

-- Create default admin user (password: admin123 - CHANGE IN PRODUCTION!)
INSERT INTO
    users (
        id,
        username,
        email,
        full_name,
        password_hash,
        role,
        is_active,
        email_verified
    )
VALUES (
        '00000000-0000-0000-0000-000000000001',
        'admin',
        'admin@learnx.com',
        'System Administrator',
        '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
        'admin',
        true,
        true
    );

COMMIT;