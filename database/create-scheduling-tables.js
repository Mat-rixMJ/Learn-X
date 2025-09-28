const { Pool } = require('pg');
require('dotenv').config({ path: './backend/.env' });

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'learnx',
  password: process.env.DB_PASSWORD || 'postgres',
  port: process.env.DB_PORT || 5432,
});

async function createSchedulingTables() {
  const client = await pool.connect();
  
  try {
    console.log('📊 Creating scheduling system tables...');
    
    // Daily schedules table
    await client.query(`
      CREATE TABLE IF NOT EXISTS daily_schedules (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        schedule_date DATE NOT NULL,
        time_slot_id INTEGER NOT NULL,
        period_number INTEGER NOT NULL,
        start_time TIME NOT NULL,
        end_time TIME NOT NULL,
        class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
        teacher_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        is_substitute BOOLEAN DEFAULT false,
        original_teacher_id UUID REFERENCES users(id) ON DELETE SET NULL,
        subject VARCHAR(100),
        room_number VARCHAR(50),
        status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled', 'rescheduled')),
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(schedule_date, time_slot_id, class_id)
      )
    `);
    
    // Teacher availability table
    await client.query(`
      CREATE TABLE IF NOT EXISTS teacher_availability (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        teacher_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        date DATE NOT NULL,
        is_available BOOLEAN DEFAULT true,
        reason VARCHAR(100), -- 'vacation', 'sick_leave', 'meeting', 'training'
        unavailable_slots INTEGER[], -- Array of time slot IDs
        max_periods INTEGER DEFAULT 6,
        preferred_subjects TEXT[],
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(teacher_id, date)
      )
    `);
    
    // Class requirements table
    await client.query(`
      CREATE TABLE IF NOT EXISTS class_requirements (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
        required_periods_per_week INTEGER DEFAULT 5,
        preferred_time_slots INTEGER[], -- Array of preferred slot IDs
        room_requirements TEXT,
        special_equipment TEXT[],
        min_consecutive_periods INTEGER DEFAULT 1,
        max_consecutive_periods INTEGER DEFAULT 2,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(class_id)
      )
    `);
    
    // Schedule conflicts log
    await client.query(`
      CREATE TABLE IF NOT EXISTS schedule_conflicts (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        schedule_date DATE NOT NULL,
        conflict_type VARCHAR(50) NOT NULL, -- 'teacher_unavailable', 'room_conflict', 'time_conflict'
        class_id UUID REFERENCES classes(id) ON DELETE SET NULL,
        teacher_id UUID REFERENCES users(id) ON DELETE SET NULL,
        time_slot_id INTEGER,
        description TEXT,
        resolution_status VARCHAR(20) DEFAULT 'unresolved' CHECK (resolution_status IN ('unresolved', 'resolved', 'ignored')),
        resolution_notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    
    // Time slots master table
    await client.query(`
      CREATE TABLE IF NOT EXISTS time_slots (
        id INTEGER PRIMARY KEY,
        period_number INTEGER,
        start_time TIME NOT NULL,
        end_time TIME NOT NULL,
        is_break BOOLEAN DEFAULT false,
        break_type VARCHAR(20), -- 'short_break', 'lunch_break'
        is_active BOOLEAN DEFAULT true,
        description VARCHAR(100)
      )
    `);
    
    // Insert default time slots
    await client.query(`
      INSERT INTO time_slots (id, period_number, start_time, end_time, is_break, break_type, description) 
      VALUES 
        (1, 1, '08:00', '08:45', false, null, 'Period 1'),
        (2, 2, '08:45', '09:30', false, null, 'Period 2'),
        (3, 3, '09:30', '10:15', false, null, 'Period 3'),
        (4, null, '10:15', '10:30', true, 'short_break', 'Morning Break'),
        (5, 4, '10:30', '11:15', false, null, 'Period 4'),
        (6, 5, '11:15', '12:00', false, null, 'Period 5'),
        (7, 6, '12:00', '12:45', false, null, 'Period 6'),
        (8, null, '12:45', '13:30', true, 'lunch_break', 'Lunch Break'),
        (9, 7, '13:30', '14:15', false, null, 'Period 7'),
        (10, 8, '14:15', '15:00', false, null, 'Period 8'),
        (11, 9, '15:00', '15:45', false, null, 'Period 9'),
        (12, null, '15:45', '16:00', true, 'short_break', 'Afternoon Break'),
        (13, 10, '16:00', '16:45', false, null, 'Period 10')
      ON CONFLICT (id) DO NOTHING
    `);
    
    // Create indexes for better performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_daily_schedules_date ON daily_schedules(schedule_date);
      CREATE INDEX IF NOT EXISTS idx_daily_schedules_teacher ON daily_schedules(teacher_id);
      CREATE INDEX IF NOT EXISTS idx_daily_schedules_class ON daily_schedules(class_id);
      CREATE INDEX IF NOT EXISTS idx_daily_schedules_time ON daily_schedules(time_slot_id);
      
      CREATE INDEX IF NOT EXISTS idx_teacher_availability_teacher ON teacher_availability(teacher_id);
      CREATE INDEX IF NOT EXISTS idx_teacher_availability_date ON teacher_availability(date);
      
      CREATE INDEX IF NOT EXISTS idx_class_requirements_class ON class_requirements(class_id);
      
      CREATE INDEX IF NOT EXISTS idx_schedule_conflicts_date ON schedule_conflicts(schedule_date);
      CREATE INDEX IF NOT EXISTS idx_schedule_conflicts_type ON schedule_conflicts(conflict_type);
    `);
    
    // Create trigger for updated_at
    await client.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.updated_at = CURRENT_TIMESTAMP;
          RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);
    
    await client.query(`
      CREATE TRIGGER update_daily_schedules_updated_at 
      BEFORE UPDATE ON daily_schedules 
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
      
      CREATE TRIGGER update_teacher_availability_updated_at 
      BEFORE UPDATE ON teacher_availability 
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
      
      CREATE TRIGGER update_class_requirements_updated_at 
      BEFORE UPDATE ON class_requirements 
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `);
    
    console.log('✅ Scheduling system tables created successfully!');
    
    // Initialize class requirements for existing classes
    console.log('📚 Initializing class requirements...');
    
    const classes = await client.query('SELECT id FROM classes');
    
    for (const classRow of classes.rows) {
      await client.query(`
        INSERT INTO class_requirements (class_id, required_periods_per_week, preferred_time_slots)
        VALUES ($1, $2, $3)
        ON CONFLICT (class_id) DO NOTHING
      `, [
        classRow.id,
        Math.floor(Math.random() * 3) + 3, // 3-5 periods per week
        [1, 2, 5, 6, 9, 10] // Prefer non-break periods
      ]);
    }
    
    console.log('✅ Class requirements initialized!');
    
  } catch (error) {
    console.error('❌ Error creating scheduling tables:', error);
    throw error;
  } finally {
    client.release();
  }
}

if (require.main === module) {
  createSchedulingTables()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Script failed:', error);
      process.exit(1);
    });
}

module.exports = { createSchedulingTables };