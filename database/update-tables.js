const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'learnx',
  user: 'postgres',
  password: 'postgres'
});

async function updateTables() {
  try {
    console.log('🔧 Updating existing tables...');

    // Add missing columns to student_profiles
    const alterCommands = [
      'ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS student_id VARCHAR(50)',
      'ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS full_name VARCHAR(255)',
      'ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS email VARCHAR(255)',
      'ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS phone VARCHAR(20)',
      'ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS profile_picture TEXT',
      'ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS academic_year VARCHAR(20)',
      'ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS enrollment_date DATE DEFAULT CURRENT_DATE'
    ];

    for (const command of alterCommands) {
      try {
        await pool.query(command);
        console.log('✅ Column added/verified');
      } catch (error) {
        if (!error.message.includes('already exists')) {
          console.error('❌ Error:', error.message);
        }
      }
    }

    // Insert sample data
    const userResult = await pool.query("SELECT id, username FROM users WHERE role = 'student' LIMIT 1");
    
    if (userResult.rows.length > 0) {
      const user = userResult.rows[0];
      
      // Check if profile exists
      const profileExists = await pool.query('SELECT id FROM student_profiles WHERE user_id = $1', [user.id]);
      
      if (profileExists.rows.length === 0) {
        await pool.query(
          'INSERT INTO student_profiles (user_id, student_id, full_name, email, academic_year) VALUES ($1, $2, $3, $4, $5)',
          [user.id, 'STU2024001', user.username, user.username + '@example.com', '2024-2025']
        );
        console.log('✅ Sample profile created');
      }

      // Insert analytics
      const analyticsExists = await pool.query('SELECT id FROM student_analytics WHERE user_id = $1', [user.id]);
      
      if (analyticsExists.rows.length === 0) {
        await pool.query(
          'INSERT INTO student_analytics (user_id, overall_average, completed_courses, total_study_hours, active_courses, current_streak, longest_streak, week_study_days) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
          [user.id, 85.5, 3, 127, 5, 7, 23, 6]
        );
        console.log('✅ Sample analytics created');
      }
    }

    console.log('🎉 Database update completed!');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    pool.end();
  }
}

updateTables();