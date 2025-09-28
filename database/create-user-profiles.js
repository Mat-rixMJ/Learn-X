// Create user profiles table for student and teacher information
require('dotenv').config({ path: './backend/.env' });
const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'learnx',
  password: process.env.DB_PASSWORD || 'postgres',
  port: process.env.DB_PORT || 5432,
});

async function createUserProfileTables() {
  try {
    console.log('Creating user profile tables...');

    // Create student profiles table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS student_profiles (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        student_class INTEGER NOT NULL CHECK (student_class >= 1 AND student_class <= 12),
        roll_number VARCHAR(20) NOT NULL,
        section VARCHAR(10) DEFAULT 'A',
        academic_year VARCHAR(20) DEFAULT '2024-25',
        parent_name VARCHAR(100),
        parent_phone VARCHAR(20),
        parent_email VARCHAR(100),
        address TEXT,
        date_of_birth DATE,
        emergency_contact VARCHAR(20),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(student_class, roll_number, section, academic_year)
      )
    `);

    // Create teacher profiles table  
    await pool.query(`
      CREATE TABLE IF NOT EXISTS teacher_profiles (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        employee_id VARCHAR(50) UNIQUE NOT NULL,
        department VARCHAR(100),
        qualification VARCHAR(200),
        experience_years INTEGER DEFAULT 0,
        phone VARCHAR(20),
        emergency_contact VARCHAR(20),
        address TEXT,
        date_of_joining DATE,
        specialization TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create class subjects mapping (what subjects are taught in each class)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS class_subjects (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        class_number INTEGER NOT NULL CHECK (class_number >= 1 AND class_number <= 12),
        subject_name VARCHAR(100) NOT NULL,
        subject_code VARCHAR(20),
        is_core BOOLEAN DEFAULT true,
        is_optional BOOLEAN DEFAULT false,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(class_number, subject_name)
      )
    `);

    // Create teacher class assignments (which teacher teaches which class/subject)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS teacher_class_assignments (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        teacher_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        class_number INTEGER NOT NULL CHECK (class_number >= 1 AND class_number <= 12),
        section VARCHAR(10) DEFAULT 'A',
        subject_name VARCHAR(100) NOT NULL,
        is_class_teacher BOOLEAN DEFAULT false,
        academic_year VARCHAR(20) DEFAULT '2024-25',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(class_number, section, subject_name, academic_year)
      )
    `);

    // Create student subject enrollments
    await pool.query(`
      CREATE TABLE IF NOT EXISTS student_subject_enrollments (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        class_number INTEGER NOT NULL,
        subject_name VARCHAR(100) NOT NULL,
        teacher_id UUID REFERENCES users(id) ON DELETE SET NULL,
        enrollment_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        is_active BOOLEAN DEFAULT true,
        academic_year VARCHAR(20) DEFAULT '2024-25',
        UNIQUE(student_id, subject_name, academic_year)
      )
    `);

    // Insert default subjects for each class
    console.log('Inserting default subjects for classes 1-12...');
    
    const subjectsData = [
      // Class 1-5 (Primary)
      { class: 1, subjects: ['English', 'Mathematics', 'Hindi', 'EVS', 'Art', 'Physical Education'] },
      { class: 2, subjects: ['English', 'Mathematics', 'Hindi', 'EVS', 'Art', 'Physical Education'] },
      { class: 3, subjects: ['English', 'Mathematics', 'Hindi', 'EVS', 'Art', 'Physical Education'] },
      { class: 4, subjects: ['English', 'Mathematics', 'Hindi', 'EVS', 'Art', 'Physical Education'] },
      { class: 5, subjects: ['English', 'Mathematics', 'Hindi', 'EVS', 'Art', 'Physical Education'] },
      
      // Class 6-8 (Middle School)
      { class: 6, subjects: ['English', 'Mathematics', 'Hindi', 'Science', 'Social Science', 'Sanskrit', 'Computer Science', 'Physical Education'] },
      { class: 7, subjects: ['English', 'Mathematics', 'Hindi', 'Science', 'Social Science', 'Sanskrit', 'Computer Science', 'Physical Education'] },
      { class: 8, subjects: ['English', 'Mathematics', 'Hindi', 'Science', 'Social Science', 'Sanskrit', 'Computer Science', 'Physical Education'] },
      
      // Class 9-10 (Secondary)
      { class: 9, subjects: ['English', 'Mathematics', 'Hindi', 'Science', 'Social Science', 'Computer Science', 'Physical Education'] },
      { class: 10, subjects: ['English', 'Mathematics', 'Hindi', 'Science', 'Social Science', 'Computer Science', 'Physical Education'] },
      
      // Class 11-12 (Senior Secondary)
      { class: 11, subjects: ['English', 'Mathematics', 'Physics', 'Chemistry', 'Biology', 'Computer Science', 'Economics', 'Business Studies', 'Accountancy', 'Political Science', 'History', 'Geography', 'Psychology', 'Physical Education'] },
      { class: 12, subjects: ['English', 'Mathematics', 'Physics', 'Chemistry', 'Biology', 'Computer Science', 'Economics', 'Business Studies', 'Accountancy', 'Political Science', 'History', 'Geography', 'Psychology', 'Physical Education'] },
    ];

    for (const classData of subjectsData) {
      for (const subject of classData.subjects) {
        await pool.query(`
          INSERT INTO class_subjects (class_number, subject_name, subject_code, is_core, is_optional)
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (class_number, subject_name) DO NOTHING
        `, [
          classData.class,
          subject,
          subject.replace(/\s+/g, '').toUpperCase().substring(0, 10),
          ['English', 'Mathematics', 'Hindi', 'Science'].includes(subject),
          ['Sanskrit', 'Computer Science', 'Physical Education'].includes(subject)
        ]);
      }
    }

    // Create indexes for better performance
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_student_profiles_user_id ON student_profiles(user_id);
      CREATE INDEX IF NOT EXISTS idx_student_profiles_class ON student_profiles(student_class);
      CREATE INDEX IF NOT EXISTS idx_teacher_profiles_user_id ON teacher_profiles(user_id);
      CREATE INDEX IF NOT EXISTS idx_teacher_class_assignments_teacher_id ON teacher_class_assignments(teacher_id);
      CREATE INDEX IF NOT EXISTS idx_teacher_class_assignments_class_subject ON teacher_class_assignments(class_number, subject_name);
      CREATE INDEX IF NOT EXISTS idx_student_subject_enrollments_student_id ON student_subject_enrollments(student_id);
    `);

    console.log('✅ User profile tables created successfully!');
    console.log('✅ Default subjects inserted for all classes!');
    
  } catch (error) {
    console.error('❌ Error creating profile tables:', error);
    throw error;
  }
}

if (require.main === module) {
  createUserProfileTables()
    .then(() => {
      console.log('Profile database setup complete!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Profile database setup failed:', error);
      process.exit(1);
    });
}

module.exports = createUserProfileTables;