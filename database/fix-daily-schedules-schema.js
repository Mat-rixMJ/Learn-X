require('dotenv').config({ path: '../backend/.env' });
const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

async function fixDailySchedulesSchema() {
  try {
    console.log('🔧 Fixing daily_schedules table schema...');

    // First, let's see what constraints we have
    const constraints = await pool.query(`
      SELECT constraint_name, constraint_type 
      FROM information_schema.table_constraints 
      WHERE table_name = 'daily_schedules' AND constraint_type = 'NOT NULL'
    `);
    
    console.log('Current constraints:', constraints.rows);

    // Make period_number nullable and add default
    await pool.query(`
      ALTER TABLE daily_schedules 
      ALTER COLUMN period_number DROP NOT NULL
    `);
    console.log('✅ Made period_number nullable');

    // Make start_time and end_time nullable  
    await pool.query(`
      ALTER TABLE daily_schedules 
      ALTER COLUMN start_time DROP NOT NULL
    `);
    console.log('✅ Made start_time nullable');

    await pool.query(`
      ALTER TABLE daily_schedules 
      ALTER COLUMN end_time DROP NOT NULL
    `);
    console.log('✅ Made end_time nullable');

    // Add a function to automatically populate period_number, start_time, end_time from time_slot_id
    await pool.query(`
      CREATE OR REPLACE FUNCTION populate_schedule_times()
      RETURNS TRIGGER AS $$
      BEGIN
        IF NEW.time_slot_id IS NOT NULL THEN
          SELECT period_number, start_time, end_time
          INTO NEW.period_number, NEW.start_time, NEW.end_time
          FROM time_slots 
          WHERE id = NEW.time_slot_id;
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);
    console.log('✅ Created trigger function to populate schedule times');

    // Drop existing trigger if it exists
    await pool.query(`
      DROP TRIGGER IF EXISTS populate_schedule_times_trigger ON daily_schedules;
    `);

    // Create trigger
    await pool.query(`
      CREATE TRIGGER populate_schedule_times_trigger
        BEFORE INSERT OR UPDATE ON daily_schedules
        FOR EACH ROW
        EXECUTE FUNCTION populate_schedule_times();
    `);
    console.log('✅ Created trigger to auto-populate schedule times');

    // Update existing records that have null values
    await pool.query(`
      UPDATE daily_schedules 
      SET 
        period_number = ts.period_number,
        start_time = ts.start_time,
        end_time = ts.end_time
      FROM time_slots ts
      WHERE daily_schedules.time_slot_id = ts.id
        AND (daily_schedules.period_number IS NULL 
             OR daily_schedules.start_time IS NULL 
             OR daily_schedules.end_time IS NULL)
    `);
    console.log('✅ Updated existing records with missing time data');

    console.log('🎉 Daily schedules schema fixed successfully!');

  } catch (error) {
    console.error('❌ Error fixing schema:', error);
  } finally {
    await pool.end();
  }
}

fixDailySchedulesSchema();