const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT
});

async function checkEnrollmentsTable() {
  try {
    const result = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'class_enrollments' 
      ORDER BY ordinal_position
    `);
    
    console.log('Class enrollments table columns:');
    if (result.rows.length === 0) {
      console.log('❌ Table class_enrollments does not exist');
      
      // Create the table
      await pool.query(`
        CREATE TABLE class_enrollments (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
          student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          is_active BOOLEAN DEFAULT true,
          enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('✅ Created class_enrollments table');
      
      // Create indexes
      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_class_enrollments_class_id 
        ON class_enrollments(class_id)
      `);
      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_class_enrollments_student_id 
        ON class_enrollments(student_id)
      `);
      console.log('✅ Created indexes for class_enrollments');
      
    } else {
      result.rows.forEach(row => {
        console.log(`- ${row.column_name}: ${row.data_type}`);
      });
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkEnrollmentsTable();