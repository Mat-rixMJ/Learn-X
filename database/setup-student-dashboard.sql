-- Student Dashboard Database Setup
-- This script ensures all required tables and sample data exist for the dashboard

-- 1. Ensure class_enrollments table has proper structure
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'class_enrollments' AND column_name = 'enrolled_at') THEN
        ALTER TABLE class_enrollments ADD COLUMN enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'class_enrollments' AND column_name = 'is_active') THEN
        ALTER TABLE class_enrollments ADD COLUMN is_active BOOLEAN DEFAULT true;
    END IF;
END $$;

-- 2. Ensure classes table has proper structure for scheduling
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'classes' AND column_name = 'scheduled_at') THEN
        ALTER TABLE classes ADD COLUMN scheduled_at TIMESTAMP WITH TIME ZONE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'classes' AND column_name = 'duration_minutes') THEN
        ALTER TABLE classes ADD COLUMN duration_minutes INTEGER DEFAULT 60;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'classes' AND column_name = 'class_code') THEN
        ALTER TABLE classes ADD COLUMN class_code VARCHAR(10) UNIQUE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'classes' AND column_name = 'max_students') THEN
        ALTER TABLE classes ADD COLUMN max_students INTEGER DEFAULT 50;
    END IF;
END $$;

-- 3. Ensure recorded_lectures table exists and has proper structure
CREATE TABLE IF NOT EXISTS recorded_lectures (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4 (),
    class_id UUID REFERENCES classes (id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    video_url VARCHAR(500),
    duration_seconds INTEGER,
    recorded_at TIMESTAMP
    WITH
        TIME ZONE DEFAULT NOW(),
        created_at TIMESTAMP
    WITH
        TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP
    WITH
        TIME ZONE DEFAULT NOW()
);

-- 4. Ensure notifications table exists
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4 (),
    user_id UUID REFERENCES users (id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    notification_type VARCHAR(50) DEFAULT 'info',
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP
    WITH
        TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP
    WITH
        TIME ZONE DEFAULT NOW()
);

-- 5. Create activity_log table for recent activities
CREATE TABLE IF NOT EXISTS activity_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4 (),
    user_id UUID REFERENCES users (id) ON DELETE CASCADE,
    activity_type VARCHAR(50) NOT NULL,
    activity_title VARCHAR(255) NOT NULL,
    activity_description TEXT,
    related_id UUID, -- Can reference classes, lectures, etc.
    related_type VARCHAR(50), -- 'class', 'lecture', 'note', etc.
    created_at TIMESTAMP
    WITH
        TIME ZONE DEFAULT NOW()
);

-- 6. Create student_progress table for tracking learning progress
CREATE TABLE IF NOT EXISTS student_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4 (),
    student_id UUID REFERENCES users (id) ON DELETE CASCADE,
    class_id UUID REFERENCES classes (id) ON DELETE CASCADE,
    progress_percentage DECIMAL(5, 2) DEFAULT 0.00,
    last_accessed_at TIMESTAMP
    WITH
        TIME ZONE DEFAULT NOW(),
        total_time_spent_minutes INTEGER DEFAULT 0,
        created_at TIMESTAMP
    WITH
        TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP
    WITH
        TIME ZONE DEFAULT NOW(),
        UNIQUE (student_id, class_id)
);

-- 7. Update ai_notes table structure if needed
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'ai_notes' AND column_name = 'class_id') THEN
        ALTER TABLE ai_notes ADD COLUMN class_id UUID REFERENCES classes(id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'ai_notes' AND column_name = 'lecture_id') THEN
        ALTER TABLE ai_notes ADD COLUMN lecture_id UUID REFERENCES recorded_lectures(id);
    END IF;
END $$;

-- 8. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_class_enrollments_student_id ON class_enrollments (student_id);

CREATE INDEX IF NOT EXISTS idx_class_enrollments_class_id ON class_enrollments (class_id);

CREATE INDEX IF NOT EXISTS idx_classes_scheduled_at ON classes (scheduled_at);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications (user_id);

CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications (created_at);

CREATE INDEX IF NOT EXISTS idx_activity_log_user_id ON activity_log (user_id);

CREATE INDEX IF NOT EXISTS idx_activity_log_created_at ON activity_log (created_at);

CREATE INDEX IF NOT EXISTS idx_student_progress_student_id ON student_progress (student_id);

CREATE INDEX IF NOT EXISTS idx_recorded_lectures_class_id ON recorded_lectures (class_id);

CREATE INDEX IF NOT EXISTS idx_ai_notes_user_id ON ai_notes (user_id);

-- Print completion message
SELECT 'Database schema updated successfully for student dashboard!' as status;