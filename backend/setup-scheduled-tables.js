const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'remote_classroom',
  password: process.env.DB_PASSWORD || 'password',
  port: process.env.DB_PORT || 5432,
});

async function setupScheduledClassTables() {
  try {
    console.log('Setting up scheduled classes and notifications tables...');

    // Create scheduled_classes table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS scheduled_classes (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          class_id UUID NOT NULL,
          teacher_id UUID NOT NULL,
          title VARCHAR(255) NOT NULL,
          description TEXT,
          scheduled_at TIMESTAMP NOT NULL,
          duration_minutes INTEGER DEFAULT 60,
          max_participants INTEGER DEFAULT 50,
          send_reminders BOOLEAN DEFAULT true,
          status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'started', 'completed', 'cancelled')),
          started_at TIMESTAMP,
          completed_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create notifications table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS notifications (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          user_id UUID NOT NULL,
          type VARCHAR(50) NOT NULL,
          title VARCHAR(255) NOT NULL,
          message TEXT NOT NULL,
          data JSONB,
          read_at TIMESTAMP,
          scheduled_for TIMESTAMP,
          sent_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create indexes for better performance
    console.log('Creating indexes...');
    
    try {
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_scheduled_classes_teacher_id ON scheduled_classes(teacher_id);`);
      console.log('✅ Created index on scheduled_classes.teacher_id');
    } catch (err) {
      console.log('⚠️  Index on teacher_id already exists or failed:', err.message);
    }

    try {
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_scheduled_classes_class_id ON scheduled_classes(class_id);`);
      console.log('✅ Created index on scheduled_classes.class_id');
    } catch (err) {
      console.log('⚠️  Index on class_id already exists or failed:', err.message);
    }

    try {
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_scheduled_classes_scheduled_at ON scheduled_classes(scheduled_at);`);
      console.log('✅ Created index on scheduled_classes.scheduled_at');
    } catch (err) {
      console.log('⚠️  Index on scheduled_at already exists or failed:', err.message);
    }

    try {
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_scheduled_classes_status ON scheduled_classes(status);`);
      console.log('✅ Created index on scheduled_classes.status');
    } catch (err) {
      console.log('⚠️  Index on status already exists or failed:', err.message);
    }

    try {
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);`);
      console.log('✅ Created index on notifications.user_id');
    } catch (err) {
      console.log('⚠️  Index on user_id already exists or failed:', err.message);
    }

    try {
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);`);
      console.log('✅ Created index on notifications.type');
    } catch (err) {
      console.log('⚠️  Index on type already exists or failed:', err.message);
    }

    try {
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_notifications_scheduled_for ON notifications(scheduled_for);`);
      console.log('✅ Created index on notifications.scheduled_for');
    } catch (err) {
      console.log('⚠️  Index on scheduled_for already exists or failed:', err.message);
    }

    console.log('✅ Scheduled classes and notifications tables created successfully!');

  } catch (error) {
    console.error('❌ Error setting up scheduled classes tables:', error);
  } finally {
    await pool.end();
  }
}

// Run the setup
setupScheduledClassTables();
