// Populate subjects table with sample data
require('dotenv').config({ path: './backend/.env' });
const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'learnx',
  password: process.env.DB_PASSWORD || 'postgres',
  port: process.env.DB_PORT || 5432,
});

async function populateSubjects() {
  try {
    console.log('Populating subjects table...');

    const subjects = [
      // Class 1-5 subjects
      { class_level: 1, subject_name: 'English' },
      { class_level: 1, subject_name: 'Mathematics' },
      { class_level: 1, subject_name: 'Science' },
      { class_level: 1, subject_name: 'Social Studies' },
      { class_level: 1, subject_name: 'Art' },
      
      { class_level: 2, subject_name: 'English' },
      { class_level: 2, subject_name: 'Mathematics' },
      { class_level: 2, subject_name: 'Science' },
      { class_level: 2, subject_name: 'Social Studies' },
      { class_level: 2, subject_name: 'Art' },
      
      { class_level: 3, subject_name: 'English' },
      { class_level: 3, subject_name: 'Mathematics' },
      { class_level: 3, subject_name: 'Science' },
      { class_level: 3, subject_name: 'Social Studies' },
      { class_level: 3, subject_name: 'Hindi' },
      
      { class_level: 4, subject_name: 'English' },
      { class_level: 4, subject_name: 'Mathematics' },
      { class_level: 4, subject_name: 'Science' },
      { class_level: 4, subject_name: 'Social Studies' },
      { class_level: 4, subject_name: 'Hindi' },
      
      { class_level: 5, subject_name: 'English' },
      { class_level: 5, subject_name: 'Mathematics' },
      { class_level: 5, subject_name: 'Science' },
      { class_level: 5, subject_name: 'Social Studies' },
      { class_level: 5, subject_name: 'Hindi' },
      
      // Class 6-8 subjects
      { class_level: 6, subject_name: 'English' },
      { class_level: 6, subject_name: 'Mathematics' },
      { class_level: 6, subject_name: 'Science' },
      { class_level: 6, subject_name: 'Social Science' },
      { class_level: 6, subject_name: 'Hindi' },
      { class_level: 6, subject_name: 'Computer Science' },
      
      { class_level: 7, subject_name: 'English' },
      { class_level: 7, subject_name: 'Mathematics' },
      { class_level: 7, subject_name: 'Science' },
      { class_level: 7, subject_name: 'Social Science' },
      { class_level: 7, subject_name: 'Hindi' },
      { class_level: 7, subject_name: 'Computer Science' },
      
      { class_level: 8, subject_name: 'English' },
      { class_level: 8, subject_name: 'Mathematics' },
      { class_level: 8, subject_name: 'Science' },
      { class_level: 8, subject_name: 'Social Science' },
      { class_level: 8, subject_name: 'Hindi' },
      { class_level: 8, subject_name: 'Computer Science' },
      
      // Class 9-10 subjects
      { class_level: 9, subject_name: 'English' },
      { class_level: 9, subject_name: 'Mathematics' },
      { class_level: 9, subject_name: 'Physics' },
      { class_level: 9, subject_name: 'Chemistry' },
      { class_level: 9, subject_name: 'Biology' },
      { class_level: 9, subject_name: 'History' },
      { class_level: 9, subject_name: 'Geography' },
      { class_level: 9, subject_name: 'Hindi' },
      { class_level: 9, subject_name: 'Computer Science' },
      
      { class_level: 10, subject_name: 'English' },
      { class_level: 10, subject_name: 'Mathematics' },
      { class_level: 10, subject_name: 'Physics' },
      { class_level: 10, subject_name: 'Chemistry' },
      { class_level: 10, subject_name: 'Biology' },
      { class_level: 10, subject_name: 'History' },
      { class_level: 10, subject_name: 'Geography' },
      { class_level: 10, subject_name: 'Hindi' },
      { class_level: 10, subject_name: 'Computer Science' },
    ];

    // Clear existing subjects
    await pool.query('DELETE FROM subjects');
    console.log('Cleared existing subjects...');

    // Insert new subjects
    for (const subject of subjects) {
      await pool.query(
        'INSERT INTO subjects (class_level, name) VALUES ($1, $2)',
        [subject.class_level, subject.subject_name]
      );
    }

    console.log(`✅ Inserted ${subjects.length} subjects successfully!`);
    
    // Verify the data
    const countQuery = await pool.query('SELECT COUNT(*) FROM subjects');
    console.log(`📊 Total subjects in database: ${countQuery.rows[0].count}`);
    
    // Show sample data
    const sampleQuery = await pool.query(`
      SELECT class_level, name 
      FROM subjects 
      ORDER BY class_level, name 
      LIMIT 10
    `);
    
    console.log('\n📋 Sample subjects:');
    sampleQuery.rows.forEach(row => {
      console.log(`   Class ${row.class_level}: ${row.name}`);
    });

    await pool.end();

  } catch (error) {
    console.error('❌ Error populating subjects:', error);
    process.exit(1);
  }
}

populateSubjects();