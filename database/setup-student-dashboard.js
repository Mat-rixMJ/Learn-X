const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'learnx',
  user: 'postgres',
  password: 'postgres'
});

async function setupStudentDashboard() {
  try {
    console.log('🚀 Setting up Student Dashboard Database...');

    // First, let's check what tables exist
    const existingTables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('student_profiles', 'calendar_events', 'course_progress', 'attendance', 'class_schedules', 'assignments', 'assignment_submissions', 'student_analytics', 'progress_recommendations')
    `);

    console.log('📋 Existing student dashboard tables:', existingTables.rows.map(r => r.table_name));

    // Create tables that don't exist
    const tablesToCreate = [
      {
        name: 'student_profiles',
        sql: `
          CREATE TABLE IF NOT EXISTS student_profiles (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            user_id UUID REFERENCES users(id) ON DELETE CASCADE,
            student_id VARCHAR(50) UNIQUE,
            full_name VARCHAR(255),
            email VARCHAR(255),
            phone VARCHAR(20),
            profile_picture TEXT,
            academic_year VARCHAR(20),
            enrollment_date DATE DEFAULT CURRENT_DATE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
          );
        `
      },
      {
        name: 'calendar_events',
        sql: `
          CREATE TABLE IF NOT EXISTS calendar_events (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            user_id UUID REFERENCES users(id) ON DELETE CASCADE,
            title VARCHAR(255) NOT NULL,
            description TEXT,
            event_date DATE NOT NULL,
            event_time TIME,
            event_type VARCHAR(50) DEFAULT 'class',
            class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
            is_holiday BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
          );
        `
      },
      {
        name: 'course_progress',
        sql: `
          CREATE TABLE IF NOT EXISTS course_progress (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            user_id UUID REFERENCES users(id) ON DELETE CASCADE,
            class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
            progress_percentage INTEGER DEFAULT 0,
            completed_lessons INTEGER DEFAULT 0,
            total_lessons INTEGER DEFAULT 0,
            performance_score INTEGER DEFAULT 0,
            time_spent INTEGER DEFAULT 0,
            last_accessed TIMESTAMP WITH TIME ZONE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(user_id, class_id)
          );
        `
      },
      {
        name: 'attendance',
        sql: `
          CREATE TABLE IF NOT EXISTS attendance (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            user_id UUID REFERENCES users(id) ON DELETE CASCADE,
            class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
            attendance_date DATE NOT NULL,
            status VARCHAR(20) DEFAULT 'present',
            marked_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            marked_by UUID REFERENCES users(id),
            notes TEXT,
            UNIQUE(user_id, class_id, attendance_date)
          );
        `
      },
      {
        name: 'class_schedules',
        sql: `
          CREATE TABLE IF NOT EXISTS class_schedules (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
            day_of_week INTEGER NOT NULL,
            start_time TIME NOT NULL,
            end_time TIME NOT NULL,
            room VARCHAR(100),
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(class_id, day_of_week, start_time)
          );
        `
      },
      {
        name: 'assignments',
        sql: `
          CREATE TABLE IF NOT EXISTS assignments (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
            title VARCHAR(255) NOT NULL,
            description TEXT,
            due_date DATE NOT NULL,
            total_marks INTEGER DEFAULT 100,
            assignment_type VARCHAR(50) DEFAULT 'homework',
            attachment_url TEXT,
            created_by UUID REFERENCES users(id),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
          );
        `
      },
      {
        name: 'assignment_submissions',
        sql: `
          CREATE TABLE IF NOT EXISTS assignment_submissions (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            assignment_id UUID REFERENCES assignments(id) ON DELETE CASCADE,
            user_id UUID REFERENCES users(id) ON DELETE CASCADE,
            submission_text TEXT,
            attachment_url TEXT,
            submitted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            marks_obtained INTEGER,
            feedback TEXT,
            graded_by UUID REFERENCES users(id),
            graded_at TIMESTAMP WITH TIME ZONE,
            status VARCHAR(20) DEFAULT 'submitted',
            UNIQUE(assignment_id, user_id)
          );
        `
      },
      {
        name: 'student_analytics',
        sql: `
          CREATE TABLE IF NOT EXISTS student_analytics (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            user_id UUID REFERENCES users(id) ON DELETE CASCADE,
            overall_average DECIMAL(5,2),
            completed_courses INTEGER DEFAULT 0,
            total_study_hours INTEGER DEFAULT 0,
            active_courses INTEGER DEFAULT 0,
            current_streak INTEGER DEFAULT 0,
            longest_streak INTEGER DEFAULT 0,
            week_study_days INTEGER DEFAULT 0,
            last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(user_id)
          );
        `
      },
      {
        name: 'progress_recommendations',
        sql: `
          CREATE TABLE IF NOT EXISTS progress_recommendations (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            user_id UUID REFERENCES users(id) ON DELETE CASCADE,
            title VARCHAR(255) NOT NULL,
            description TEXT,
            priority VARCHAR(20) DEFAULT 'medium',
            impact VARCHAR(20) DEFAULT 'medium',
            effort VARCHAR(20) DEFAULT 'medium',
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
          );
        `
      }
    ];

    // Create each table
    for (const table of tablesToCreate) {
      try {
        await pool.query(table.sql);
        console.log(`✅ Table '${table.name}' created or verified`);
      } catch (error) {
        console.error(`❌ Error creating table '${table.name}':`, error.message);
      }
    }

    // Insert some sample data for testing
    console.log('📝 Inserting sample data...');

    // Check if sample data already exists
    const existingProfile = await pool.query('SELECT id FROM student_profiles LIMIT 1');
    
    if (existingProfile.rows.length === 0) {
      // Get a sample user
      const userResult = await pool.query("SELECT id, username FROM users WHERE role = 'student' LIMIT 1");
      
      if (userResult.rows.length > 0) {
        const user = userResult.rows[0];
        
        // Insert sample profile
        await pool.query(`
          INSERT INTO student_profiles (user_id, student_id, full_name, email, academic_year)
          VALUES ($1, $2, $3, $4, $5)
        `, [user.id, 'STU2024001', user.username, `${user.username}@example.com`, '2024-2025']);

        // Insert sample analytics
        await pool.query(`
          INSERT INTO student_analytics (user_id, overall_average, completed_courses, total_study_hours, active_courses, current_streak, longest_streak, week_study_days)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [user.id, 85.5, 3, 127, 5, 7, 23, 6]);

        console.log('✅ Sample data inserted');
      }
    }

    console.log('🎉 Student Dashboard Database setup completed!');

  } catch (error) {
    console.error('❌ Error setting up student dashboard:', error.message);
  } finally {
    pool.end();
  }
}

setupStudentDashboard();