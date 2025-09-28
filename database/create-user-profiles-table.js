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

async function createUserProfilesTable() {
  try {
    console.log('Creating user profiles table...');

    // Create user_profiles table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_profiles (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        phone VARCHAR(20),
        address TEXT,
        date_of_birth DATE,
        gender VARCHAR(10) CHECK (gender IN ('male', 'female', 'other')),
        emergency_contact VARCHAR(100),
        emergency_phone VARCHAR(20),
        
        -- Student specific fields
        student_class INTEGER CHECK (student_class BETWEEN 1 AND 12),
        roll_number VARCHAR(20),
        parent_name VARCHAR(100),
        parent_phone VARCHAR(20),
        previous_school VARCHAR(200),
        
        -- Teacher specific fields
        teaching_classes INTEGER[] DEFAULT '{}',
        teaching_subjects TEXT[] DEFAULT '{}',
        assigned_classes UUID[] DEFAULT '{}',
        qualification VARCHAR(200),
        experience_years INTEGER,
        specialization TEXT,
        
        -- Common fields
        is_profile_complete BOOLEAN DEFAULT false,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        
        UNIQUE(user_id)
      )
    `);

    // Drop and recreate subjects table with proper constraints
    await pool.query(`DROP TABLE IF EXISTS subjects CASCADE`);
    
    await pool.query(`
      CREATE TABLE subjects (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR(100) NOT NULL,
        class_level INTEGER NOT NULL CHECK (class_level BETWEEN 1 AND 12),
        description TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (name, class_level)
      )
    `);

    // Insert standard subjects for each class
    const standardSubjects = [
      // Class 1-5 (Primary)
      { name: 'English', classes: [1,2,3,4,5] },
      { name: 'Mathematics', classes: [1,2,3,4,5,6,7,8,9,10,11,12] },
      { name: 'Hindi', classes: [1,2,3,4,5,6,7,8] },
      { name: 'EVS (Environmental Studies)', classes: [1,2,3,4,5] },
      { name: 'Art and Craft', classes: [1,2,3,4,5] },
      
      // Class 6-8 (Middle School)
      { name: 'Science', classes: [6,7,8] },
      { name: 'Social Science', classes: [6,7,8] },
      { name: 'Sanskrit', classes: [6,7,8] },
      { name: 'Computer Science', classes: [6,7,8,9,10,11,12] },
      
      // Class 9-10 (Secondary)
      { name: 'Physics', classes: [9,10,11,12] },
      { name: 'Chemistry', classes: [9,10,11,12] },
      { name: 'Biology', classes: [9,10,11,12] },
      { name: 'History', classes: [9,10] },
      { name: 'Geography', classes: [9,10] },
      { name: 'Civics', classes: [9,10] },
      { name: 'Economics', classes: [9,10] },
      
      // Class 11-12 (Senior Secondary)
      { name: 'Accountancy', classes: [11,12] },
      { name: 'Business Studies', classes: [11,12] },
      { name: 'Political Science', classes: [11,12] },
      { name: 'Psychology', classes: [11,12] },
      { name: 'Sociology', classes: [11,12] },
      { name: 'Philosophy', classes: [11,12] }
    ];

    for (const subject of standardSubjects) {
      for (const classLevel of subject.classes) {
        await pool.query(`
          INSERT INTO subjects (name, class_level, description)
          VALUES ($1, $2, $3)
          ON CONFLICT (name, class_level) DO NOTHING
        `, [subject.name, classLevel, `${subject.name} for Class ${classLevel}`]);
      }
    }

    // Create indexes for better performance
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
      CREATE INDEX IF NOT EXISTS idx_user_profiles_student_class ON user_profiles(student_class);
      CREATE INDEX IF NOT EXISTS idx_user_profiles_teaching_classes ON user_profiles USING GIN(teaching_classes);
      CREATE INDEX IF NOT EXISTS idx_subjects_class_level ON subjects(class_level);
    `);

    // Update users table to add profile_complete flag if it doesn't exist
    await pool.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS profile_complete BOOLEAN DEFAULT false
    `);

    console.log('✅ User profiles table and subjects created successfully!');
    
  } catch (error) {
    console.error('❌ Error creating user profiles table:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  createUserProfilesTable()
    .then(() => {
      console.log('User profiles database setup complete!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('User profiles database setup failed:', error);
      process.exit(1);
    });
}

module.exports = createUserProfilesTable;