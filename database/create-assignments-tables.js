// Load environment variables from backend directory
require('dotenv').config({ path: './backend/.env' });
const { Pool } = require('pg');

// Create pool with backend configuration
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'learnx',
  password: process.env.DB_PASSWORD || 'postgres',
  port: process.env.DB_PORT || 5432,
});

async function createAssignmentsTables() {
  try {
    console.log('Creating assignments and grades tables...');

    // Create assignments table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS assignments (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
        teacher_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(200) NOT NULL,
        description TEXT,
        instructions TEXT,
        due_date TIMESTAMP WITH TIME ZONE,
        points_possible INTEGER DEFAULT 100,
        assignment_type VARCHAR(50) DEFAULT 'homework' CHECK (assignment_type IN ('homework', 'quiz', 'exam', 'project', 'discussion')),
        is_published BOOLEAN DEFAULT false,
        allow_late_submission BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create grades table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS grades (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
        student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        points_earned INTEGER,
        max_points INTEGER,
        percentage DECIMAL(5,2),
        letter_grade VARCHAR(2),
        feedback TEXT,
        submitted_at TIMESTAMP WITH TIME ZONE,
        graded_at TIMESTAMP WITH TIME ZONE,
        is_late BOOLEAN DEFAULT false,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(assignment_id, student_id)
      )
    `);

    // Create assignment submissions table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS assignment_submissions (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
        student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        submission_text TEXT,
        file_path VARCHAR(500),
        submitted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        is_late BOOLEAN DEFAULT false,
        attempt_number INTEGER DEFAULT 1,
        UNIQUE(assignment_id, student_id, attempt_number)
      )
    `);

    // Create content files table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS content_files (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        teacher_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
        filename VARCHAR(255) NOT NULL,
        original_filename VARCHAR(255) NOT NULL,
        file_path VARCHAR(500) NOT NULL,
        file_type VARCHAR(50),
        file_size BIGINT,
        mime_type VARCHAR(100),
        description TEXT,
        is_shared BOOLEAN DEFAULT false,
        download_count INTEGER DEFAULT 0,
        uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create analytics data table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS analytics_events (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
        session_id UUID REFERENCES live_sessions(id) ON DELETE CASCADE,
        event_type VARCHAR(50) NOT NULL,
        event_data JSONB,
        ip_address INET,
        user_agent TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes for better performance
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_assignments_class_id ON assignments(class_id);
      CREATE INDEX IF NOT EXISTS idx_assignments_teacher_id ON assignments(teacher_id);
      CREATE INDEX IF NOT EXISTS idx_assignments_due_date ON assignments(due_date);
      CREATE INDEX IF NOT EXISTS idx_grades_assignment_id ON grades(assignment_id);
      CREATE INDEX IF NOT EXISTS idx_grades_student_id ON grades(student_id);
      CREATE INDEX IF NOT EXISTS idx_content_files_teacher_id ON content_files(teacher_id);
      CREATE INDEX IF NOT EXISTS idx_content_files_class_id ON content_files(class_id);
      CREATE INDEX IF NOT EXISTS idx_analytics_events_user_id ON analytics_events(user_id);
      CREATE INDEX IF NOT EXISTS idx_analytics_events_class_id ON analytics_events(class_id);
      CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON analytics_events(created_at);
    `);

    console.log('✅ All tables created successfully!');
    
  } catch (error) {
    console.error('❌ Error creating tables:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  createAssignmentsTables()
    .then(() => {
      console.log('Database setup complete!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Database setup failed:', error);
      process.exit(1);
    });
}

module.exports = createAssignmentsTables;