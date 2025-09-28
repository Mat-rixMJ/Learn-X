-- Student Dashboard Database Schema
-- This schema supports all student dashboard features

-- Create extensions if not exists
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Student Profile Extended Table
CREATE TABLE IF NOT EXISTS student_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4 (),
    user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    profile_picture TEXT,
    phone VARCHAR(20),
    address TEXT,
    date_of_birth DATE,
    guardian_name VARCHAR(255),
    guardian_phone VARCHAR(20),
    blood_group VARCHAR(5),
    emergency_contact VARCHAR(20),
    bio TEXT,
    academic_year VARCHAR(20),
    student_id VARCHAR(50) UNIQUE,
    created_at TIMESTAMP
    WITH
        TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP
    WITH
        TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Calendar Events Table
CREATE TABLE IF NOT EXISTS calendar_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4 (),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    event_date DATE NOT NULL,
    event_type VARCHAR(50) DEFAULT 'general', -- 'holiday', 'exam', 'assignment', 'class', 'general'
    is_holiday BOOLEAN DEFAULT FALSE,
    color VARCHAR(7) DEFAULT '#3B82F6', -- Hex color code
    all_day BOOLEAN DEFAULT TRUE,
    start_time TIME,
    end_time TIME,
    created_by UUID REFERENCES users (id),
    class_id UUID REFERENCES classes (id) ON DELETE CASCADE,
    created_at TIMESTAMP
    WITH
        TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP
    WITH
        TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Course Progress Table
CREATE TABLE IF NOT EXISTS course_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4 (),
    student_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES classes (id) ON DELETE CASCADE,
    total_lessons INTEGER DEFAULT 0,
    completed_lessons INTEGER DEFAULT 0,
    progress_percentage DECIMAL(5, 2) DEFAULT 0.00,
    last_accessed TIMESTAMP
    WITH
        TIME ZONE,
        time_spent INTEGER DEFAULT 0, -- in minutes
        performance_score DECIMAL(5, 2) DEFAULT 0.00,
        created_at TIMESTAMP
    WITH
        TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP
    WITH
        TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (student_id, class_id)
);

-- Attendance Table
CREATE TABLE IF NOT EXISTS attendance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4 (),
    student_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES classes (id) ON DELETE CASCADE,
    session_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'absent', -- 'present', 'absent', 'late', 'excused'
    check_in_time TIMESTAMP
    WITH
        TIME ZONE,
        check_out_time TIMESTAMP
    WITH
        TIME ZONE,
        duration_minutes INTEGER DEFAULT 0,
        notes TEXT,
        marked_by UUID REFERENCES users (id),
        created_at TIMESTAMP
    WITH
        TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP
    WITH
        TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (
            student_id,
            class_id,
            session_date
        )
);

-- Class Schedule Table
CREATE TABLE IF NOT EXISTS class_schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4 (),
    class_id UUID NOT NULL REFERENCES classes (id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL, -- 0=Sunday, 1=Monday, etc.
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    room_number VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP
    WITH
        TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP
    WITH
        TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Assignments Table
CREATE TABLE IF NOT EXISTS assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4 (),
    class_id UUID NOT NULL REFERENCES classes (id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    due_date TIMESTAMP
    WITH
        TIME ZONE NOT NULL,
        total_marks INTEGER DEFAULT 100,
        assignment_type VARCHAR(50) DEFAULT 'homework', -- 'homework', 'project', 'quiz', 'exam'
        file_path TEXT,
        instructions TEXT,
        is_published BOOLEAN DEFAULT FALSE,
        created_by UUID NOT NULL REFERENCES users (id),
        created_at TIMESTAMP
    WITH
        TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP
    WITH
        TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Assignment Submissions Table
CREATE TABLE IF NOT EXISTS assignment_submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4 (),
    assignment_id UUID NOT NULL REFERENCES assignments (id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    submission_text TEXT,
    file_path TEXT,
    submitted_at TIMESTAMP
    WITH
        TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        status VARCHAR(20) DEFAULT 'submitted', -- 'draft', 'submitted', 'graded', 'returned'
        score INTEGER,
        feedback TEXT,
        graded_by UUID REFERENCES users (id),
        graded_at TIMESTAMP
    WITH
        TIME ZONE,
        late_submission BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP
    WITH
        TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP
    WITH
        TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (assignment_id, student_id)
);

-- Student Analytics Table
CREATE TABLE IF NOT EXISTS student_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4 (),
    student_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    metric_name VARCHAR(100) NOT NULL, -- 'study_time', 'quiz_average', 'attendance_rate', etc.
    metric_value DECIMAL(10, 2) NOT NULL,
    metric_date DATE NOT NULL,
    class_id UUID REFERENCES classes (id) ON DELETE CASCADE,
    additional_data JSONB,
    created_at TIMESTAMP
    WITH
        TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP
    WITH
        TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Progress Recommendations Table
CREATE TABLE IF NOT EXISTS progress_recommendations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4 (),
    student_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    recommendation_type VARCHAR(50) NOT NULL, -- 'study_plan', 'resource', 'activity', 'improvement'
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    priority VARCHAR(20) DEFAULT 'medium', -- 'low', 'medium', 'high', 'urgent'
    status VARCHAR(20) DEFAULT 'active', -- 'active', 'completed', 'dismissed'
    class_id UUID REFERENCES classes (id) ON DELETE CASCADE,
    due_date DATE,
    completion_percentage DECIMAL(5, 2) DEFAULT 0.00,
    created_at TIMESTAMP
    WITH
        TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP
    WITH
        TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_student_profiles_user_id ON student_profiles (user_id);

CREATE INDEX IF NOT EXISTS idx_calendar_events_date ON calendar_events (event_date);

CREATE INDEX IF NOT EXISTS idx_calendar_events_type ON calendar_events (event_type);

CREATE INDEX IF NOT EXISTS idx_course_progress_student ON course_progress (student_id);

CREATE INDEX IF NOT EXISTS idx_course_progress_class ON course_progress (class_id);

CREATE INDEX IF NOT EXISTS idx_attendance_student ON attendance (student_id);

CREATE INDEX IF NOT EXISTS idx_attendance_class ON attendance (class_id);

CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance (session_date);

CREATE INDEX IF NOT EXISTS idx_assignments_class ON assignments (class_id);

CREATE INDEX IF NOT EXISTS idx_assignments_due_date ON assignments (due_date);

CREATE INDEX IF NOT EXISTS idx_assignment_submissions_assignment ON assignment_submissions (assignment_id);

CREATE INDEX IF NOT EXISTS idx_assignment_submissions_student ON assignment_submissions (student_id);

CREATE INDEX IF NOT EXISTS idx_student_analytics_student ON student_analytics (student_id);

CREATE INDEX IF NOT EXISTS idx_student_analytics_date ON student_analytics (metric_date);

CREATE INDEX IF NOT EXISTS idx_progress_recommendations_student ON progress_recommendations (student_id);

-- Insert sample data for testing
INSERT INTO
    calendar_events (
        title,
        description,
        event_date,
        event_type,
        is_holiday,
        color
    )
VALUES (
        'New Year',
        'New Year Holiday',
        '2025-01-01',
        'holiday',
        TRUE,
        '#FF6B6B'
    ),
    (
        'Independence Day',
        'National Holiday',
        '2025-07-04',
        'holiday',
        TRUE,
        '#FF6B6B'
    ),
    (
        'Mid-term Exams',
        'Mid-semester examinations',
        '2025-03-15',
        'exam',
        FALSE,
        '#FF9F43'
    ),
    (
        'Spring Break',
        'Spring break week',
        '2025-03-25',
        'holiday',
        TRUE,
        '#26DE81'
    ),
    (
        'Final Exams',
        'End of semester exams',
        '2025-05-15',
        'exam',
        FALSE,
        '#FF9F43'
    );

-- Sample student profile data
INSERT INTO student_profiles (user_id, phone, address, academic_year, student_id, bio) 
SELECT 
    id, 
    '+1-555-0123', 
    '123 Student Street, Education City', 
    '2024-2025', 
    'STU' || LPAD((ROW_NUMBER() OVER())::TEXT, 6, '0'),
    'Passionate learner interested in technology and innovation.'
FROM users WHERE role = 'student' LIMIT 5;

-- Sample course progress data
INSERT INTO
    course_progress (
        student_id,
        class_id,
        total_lessons,
        completed_lessons,
        progress_percentage,
        performance_score
    )
SELECT
    s.id as student_id,
    c.id as class_id,
    20 as total_lessons,
    FLOOR(RANDOM () * 15 + 5) as completed_lessons,
    FLOOR(RANDOM () * 60 + 40) as progress_percentage,
    FLOOR(RANDOM () * 30 + 70) as performance_score
FROM users s
    CROSS JOIN classes c
WHERE
    s.role = 'student'
LIMIT 20;

-- Sample attendance data for the current month
INSERT INTO
    attendance (
        student_id,
        class_id,
        session_date,
        status,
        duration_minutes
    )
SELECT
    s.id as student_id,
    c.id as class_id,
    CURRENT_DATE - INTERVAL '1 day' * FLOOR(RANDOM () * 30) as session_date,
    CASE
        WHEN RANDOM () < 0.8 THEN 'present'
        WHEN RANDOM () < 0.9 THEN 'late'
        ELSE 'absent'
    END as status,
    CASE
        WHEN RANDOM () < 0.8 THEN FLOOR(RANDOM () * 30 + 60)
        ELSE 0
    END as duration_minutes
FROM users s
    CROSS JOIN classes c
WHERE
    s.role = 'student'
LIMIT 50 ON CONFLICT (
        student_id,
        class_id,
        session_date
    ) DO NOTHING;

-- Sample assignments
INSERT INTO
    assignments (
        class_id,
        title,
        description,
        due_date,
        total_marks,
        assignment_type,
        created_by
    )
SELECT
    c.id as class_id,
    'Assignment ' || generate_series (1, 3) as title,
    'Complete the assigned tasks and submit before due date.' as description,
    CURRENT_DATE + INTERVAL '1 day' * FLOOR(RANDOM () * 14 + 1) as due_date,
    100 as total_marks,
    CASE FLOOR(RANDOM () * 3)
        WHEN 0 THEN 'homework'
        WHEN 1 THEN 'project'
        ELSE 'quiz'
    END as assignment_type,
    t.id as created_by
FROM classes c
    CROSS JOIN users t
WHERE
    t.role = 'teacher'
LIMIT 15;

-- Sample progress recommendations
INSERT INTO
    progress_recommendations (
        student_id,
        recommendation_type,
        title,
        description,
        priority,
        class_id
    )
SELECT
    s.id as student_id,
    CASE FLOOR(RANDOM () * 4)
        WHEN 0 THEN 'study_plan'
        WHEN 1 THEN 'resource'
        WHEN 2 THEN 'activity'
        ELSE 'improvement'
    END as recommendation_type,
    CASE FLOOR(RANDOM () * 4)
        WHEN 0 THEN 'Complete Daily Practice'
        WHEN 1 THEN 'Review Course Materials'
        WHEN 2 THEN 'Join Study Group'
        ELSE 'Improve Time Management'
    END as title,
    'Based on your current progress, we recommend focusing on this area for better performance.' as description,
    CASE FLOOR(RANDOM () * 3)
        WHEN 0 THEN 'low'
        WHEN 1 THEN 'medium'
        ELSE 'high'
    END as priority,
    c.id as class_id
FROM users s
    CROSS JOIN classes c
WHERE
    s.role = 'student'
LIMIT 25;