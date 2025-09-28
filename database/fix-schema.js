require('dotenv').config({ path: '../backend/.env' });
const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

async function fixDatabaseSchema() {
  try {
    console.log('🔧 Fixing database schema for simulation...');

    // Check and fix notifications table
    console.log('📢 Checking notifications table...');
    try {
      await pool.query('SELECT type FROM notifications LIMIT 1');
      console.log('   ✅ Notifications table has type column');
    } catch (error) {
      if (error.code === '42703') {
        console.log('   🔧 Adding type column to notifications table...');
        await pool.query('ALTER TABLE notifications ADD COLUMN type VARCHAR(50) DEFAULT \'general\'');
      } else if (error.code === '42P01') {
        console.log('   📝 Creating notifications table...');
        await pool.query(`
          CREATE TABLE notifications (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            title VARCHAR(255) NOT NULL,
            message TEXT NOT NULL,
            type VARCHAR(50) NOT NULL DEFAULT 'general',
            class_id UUID REFERENCES classes(id) ON DELETE SET NULL,
            schedule_id UUID REFERENCES daily_schedules(id) ON DELETE SET NULL,
            metadata JSONB,
            is_read BOOLEAN DEFAULT false,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            read_at TIMESTAMP WITH TIME ZONE
          );
          CREATE INDEX idx_notifications_user_id ON notifications(user_id);
          CREATE INDEX idx_notifications_created_at ON notifications(created_at);
          CREATE INDEX idx_notifications_type ON notifications(type);
          CREATE INDEX idx_notifications_is_read ON notifications(is_read);
        `);
      }
    }

    // Check and fix attendance table
    console.log('👥 Checking attendance table...');
    try {
      await pool.query('SELECT student_id FROM attendance LIMIT 1');
      console.log('   ✅ Attendance table has student_id column');
    } catch (error) {
      if (error.code === '42703') {
        console.log('   🔧 Adding student_id column to attendance table...');
        await pool.query('ALTER TABLE attendance ADD COLUMN student_id UUID REFERENCES users(id) ON DELETE CASCADE');
      } else if (error.code === '42P01') {
        console.log('   📝 Creating attendance table...');
        await pool.query(`
          CREATE TABLE attendance (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
            schedule_date DATE NOT NULL,
            time_slot_id INTEGER REFERENCES time_slots(id),
            is_present BOOLEAN NOT NULL DEFAULT false,
            absence_reason VARCHAR(100),
            marked_by UUID REFERENCES users(id),
            marked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            UNIQUE(student_id, class_id, schedule_date, time_slot_id)
          );
          CREATE INDEX idx_attendance_student_id ON attendance(student_id);
          CREATE INDEX idx_attendance_class_id ON attendance(class_id);
          CREATE INDEX idx_attendance_date ON attendance(schedule_date);
        `);
      }
    }

    // Check and fix assignments table
    console.log('📝 Checking assignments table...');
    try {
      await pool.query('SELECT total_points FROM assignments LIMIT 1');
      console.log('   ✅ Assignments table has total_points column');
    } catch (error) {
      if (error.code === '42703') {
        console.log('   🔧 Adding total_points column to assignments table...');
        try {
          await pool.query('ALTER TABLE assignments ADD COLUMN total_points INTEGER DEFAULT 100');
        } catch (e) {
          if (e.code !== '42701') throw e; // Ignore if column already exists
        }
        try {
          await pool.query('ALTER TABLE assignments ADD COLUMN assignment_type VARCHAR(50) DEFAULT \'homework\'');
        } catch (e) {
          if (e.code !== '42701') throw e; // Ignore if column already exists
        }
      } else if (error.code === '42P01') {
        console.log('   📝 Creating assignments table...');
        await pool.query(`
          CREATE TABLE assignments (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
            title VARCHAR(255) NOT NULL,
            description TEXT,
            assignment_type VARCHAR(50) DEFAULT 'homework',
            total_points INTEGER DEFAULT 100,
            due_date TIMESTAMP WITH TIME ZONE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );
          CREATE INDEX idx_assignments_class_id ON assignments(class_id);
          CREATE INDEX idx_assignments_due_date ON assignments(due_date);
        `);
      }
    }

    // Check and create assignment_submissions table
    console.log('✍️  Checking assignment_submissions table...');
    try {
      await pool.query('SELECT id FROM assignment_submissions LIMIT 1');
      console.log('   ✅ Assignment submissions table exists');
    } catch (error) {
      if (error.code === '42P01') {
        console.log('   📝 Creating assignment_submissions table...');
        await pool.query(`
          CREATE TABLE assignment_submissions (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
            student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            points_earned INTEGER,
            is_late BOOLEAN DEFAULT false,
            graded_at TIMESTAMP WITH TIME ZONE,
            feedback TEXT,
            UNIQUE(assignment_id, student_id)
          );
          CREATE INDEX idx_assignment_submissions_assignment_id ON assignment_submissions(assignment_id);
          CREATE INDEX idx_assignment_submissions_student_id ON assignment_submissions(student_id);
        `);
      }
    }

    // Check schedule_date column in various queries
    console.log('📅 Checking schedule-related tables...');
    
    // Check if daily_schedules has all necessary columns
    const dsColumns = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'daily_schedules'
    `);
    
    const hasScheduleDate = dsColumns.rows.some(row => row.column_name === 'schedule_date');
    if (!hasScheduleDate) {
      console.log('   🔧 Adding schedule_date column to daily_schedules...');
      await pool.query('ALTER TABLE daily_schedules ADD COLUMN schedule_date DATE DEFAULT CURRENT_DATE');
    }

    console.log('✅ Database schema fixes completed!');
    
    // Test the fixes
    console.log('\n🧪 Testing schema fixes...');
    
    const testQueries = [
      'SELECT type FROM notifications LIMIT 1',
      'SELECT student_id FROM attendance LIMIT 1',
      'SELECT total_points FROM assignments LIMIT 1',
      'SELECT id FROM assignment_submissions LIMIT 1',
      'SELECT schedule_date FROM daily_schedules LIMIT 1'
    ];
    
    for (const query of testQueries) {
      try {
        await pool.query(query);
        console.log(`   ✅ ${query.split(' ')[1]} - OK`);
      } catch (error) {
        console.log(`   ❌ ${query.split(' ')[1]} - ${error.message}`);
      }
    }
    
    console.log('\n🎯 Schema is ready for simulation!');

  } catch (error) {
    console.error('❌ Error fixing database schema:', error);
  } finally {
    await pool.end();
  }
}

// Run the schema fix
fixDatabaseSchema();