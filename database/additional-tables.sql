-- Create additional tables needed for comprehensive data
-- Run this if any tables are missing

-- Teacher Profiles Table
CREATE TABLE IF NOT EXISTS teacher_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4 (),
    user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    teacher_id VARCHAR(20) UNIQUE NOT NULL,
    subject_specialization VARCHAR(100),
    education_background TEXT,
    years_of_experience INTEGER DEFAULT 0,
    bio TEXT,
    phone VARCHAR(20),
    office_hours VARCHAR(100),
    created_at TIMESTAMP
    WITH
        TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP
    WITH
        TIME ZONE DEFAULT NOW()
);

-- Student Profiles Table
CREATE TABLE IF NOT EXISTS student_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4 (),
    user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    student_id VARCHAR(20) UNIQUE NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    academic_year VARCHAR(20),
    enrollment_date DATE,
    created_at TIMESTAMP
    WITH
        TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP
    WITH
        TIME ZONE DEFAULT NOW()
);

-- Class Schedules Table
CREATE TABLE IF NOT EXISTS class_schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4 (),
    class_id UUID NOT NULL REFERENCES classes (id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 1 AND 7),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    room_number VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP
    WITH
        TIME ZONE DEFAULT NOW()
);

-- Student Analytics Table
CREATE TABLE IF NOT EXISTS student_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4 (),
    user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE UNIQUE,
    overall_average DECIMAL(5, 2) DEFAULT 0.00,
    completed_courses INTEGER DEFAULT 0,
    total_study_hours INTEGER DEFAULT 0,
    active_courses INTEGER DEFAULT 0,
    current_streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    week_study_days INTEGER DEFAULT 0,
    last_updated TIMESTAMP
    WITH
        TIME ZONE DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_teacher_profiles_user_id ON teacher_profiles (user_id);

CREATE INDEX IF NOT EXISTS idx_student_profiles_user_id ON student_profiles (user_id);

CREATE INDEX IF NOT EXISTS idx_class_schedules_class_id ON class_schedules (class_id);

CREATE INDEX IF NOT EXISTS idx_student_analytics_user_id ON student_analytics (user_id);

CREATE INDEX IF NOT EXISTS idx_class_enrollments_student_id ON class_enrollments (student_id);

CREATE INDEX IF NOT EXISTS idx_class_enrollments_class_id ON class_enrollments (class_id);

CREATE INDEX IF NOT EXISTS idx_attendance_user_id ON attendance (user_id);

CREATE INDEX IF NOT EXISTS idx_attendance_class_id ON attendance (class_id);

CREATE INDEX IF NOT EXISTS idx_course_progress_user_id ON course_progress (user_id);

CREATE INDEX IF NOT EXISTS idx_course_progress_class_id ON course_progress (class_id);