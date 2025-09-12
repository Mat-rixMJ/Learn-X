-- Database initialization for Render PostgreSQL
-- This will run automatically when the database is created

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'student',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create classes table
CREATE TABLE IF NOT EXISTS classes (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    teacher_id INTEGER REFERENCES users (id),
    subject VARCHAR(255),
    class_code VARCHAR(10) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create ai_notes table
CREATE TABLE IF NOT EXISTS ai_notes (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    class_id INTEGER REFERENCES classes(id),
    title VARCHAR(255) NOT NULL,
    content TEXT,
    file_type VARCHAR(50),
    file_path VARCHAR(255),
    ai_summary TEXT,
    ai_key_points TEXT[],
    ai_questions TEXT[],
    processed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create live_sessions table
CREATE TABLE IF NOT EXISTS live_sessions (
    id SERIAL PRIMARY KEY,
    class_id INTEGER REFERENCES classes (id),
    teacher_id INTEGER REFERENCES users (id),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    room_id VARCHAR(255) UNIQUE NOT NULL,
    status VARCHAR(50) DEFAULT 'scheduled',
    max_participants INTEGER DEFAULT 50,
    scheduled_at TIMESTAMP,
    started_at TIMESTAMP,
    ended_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);

CREATE INDEX IF NOT EXISTS idx_classes_teacher ON classes (teacher_id);

CREATE INDEX IF NOT EXISTS idx_ai_notes_user ON ai_notes (user_id);

CREATE INDEX IF NOT EXISTS idx_ai_notes_class ON ai_notes (class_id);

CREATE INDEX IF NOT EXISTS idx_live_sessions_class ON live_sessions (class_id);

-- Insert default admin user (password: admin123)
INSERT INTO
    users (
        username,
        email,
        password_hash,
        role
    )
VALUES (
        'admin',
        'admin@wishtiq.online',
        '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
        'admin'
    ) ON CONFLICT (email) DO NOTHING;

-- Insert sample class
INSERT INTO
    classes (
        name,
        description,
        teacher_id,
        subject,
        class_code
    )
SELECT 'Introduction to AI', 'Learn the basics of Artificial Intelligence', u.id, 'Computer Science', 'AI101'
FROM users u
WHERE
    u.role = 'admin'
LIMIT 1 ON CONFLICT (class_code) DO NOTHING;