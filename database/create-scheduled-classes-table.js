const pool = require('../backend/config/database');

async function createScheduledClassesTable() {
  try {
    console.log('Creating scheduled_classes table...');
    
    // Create scheduled_classes table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS scheduled_classes (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
        teacher_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(200) NOT NULL,
        description TEXT,
        scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
        duration_minutes INTEGER DEFAULT 60,
        max_participants INTEGER DEFAULT 50,
        send_reminders BOOLEAN DEFAULT true,
        status VARCHAR(20) DEFAULT 'scheduled' CHECK (
          status IN ('scheduled', 'started', 'completed', 'cancelled')
        ),
        meeting_link VARCHAR(255),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Scheduled classes table created');
    
    // Create indexes for better performance
    await pool.query('CREATE INDEX IF NOT EXISTS idx_scheduled_classes_teacher ON scheduled_classes(teacher_id)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_scheduled_classes_class ON scheduled_classes(class_id)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_scheduled_classes_scheduled_at ON scheduled_classes(scheduled_at)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_scheduled_classes_status ON scheduled_classes(status)');
    console.log('✅ Indexes created');
    
    // Create scheduled_class_participants table for tracking who joined
    await pool.query(`
      CREATE TABLE IF NOT EXISTS scheduled_class_participants (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        scheduled_class_id UUID NOT NULL REFERENCES scheduled_classes(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        joined_at TIMESTAMP WITH TIME ZONE,
        left_at TIMESTAMP WITH TIME ZONE,
        is_present BOOLEAN DEFAULT false,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(scheduled_class_id, user_id)
      )
    `);
    console.log('✅ Scheduled class participants table created');
    
    console.log('🎉 Scheduled classes database setup complete!');
    
  } catch (error) {
    console.error('❌ Setup failed:', error.message);
  }
  
  process.exit(0);
}

createScheduledClassesTable();