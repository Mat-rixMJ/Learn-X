const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'remote_classroom',
  password: process.env.DB_PASSWORD || 'password',
  port: process.env.DB_PORT || 5432,
});

async function createSampleData() {
  try {
    console.log('🔨 Creating sample data for testing...\n');

    // Create sample classes for testing
    const teacherId = 'd58ff94f-d4c8-4c50-8718-ffc62516693f'; // matrix1 (teacher)
    
    const sampleClasses = [
      {
        name: 'AI Fundamentals',
        description: 'Introduction to Artificial Intelligence concepts and applications',
        subject: 'Computer Science',
        sharable_link: 'ai-fundamentals-2025'
      },
      {
        name: 'Machine Learning Basics',
        description: 'Basic concepts of machine learning and data science',
        subject: 'Data Science', 
        sharable_link: 'ml-basics-2025'
      }
    ];

    console.log('📚 Creating sample classes...');
    for (const classData of sampleClasses) {
      const query = `
        INSERT INTO classes (name, description, subject, teacher_id, sharable_link, is_active)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (sharable_link) DO NOTHING
        RETURNING id, name;
      `;
      
      const result = await pool.query(query, [
        classData.name,
        classData.description,
        classData.subject,
        teacherId,
        classData.sharable_link,
        true
      ]);
      
      if (result.rows.length > 0) {
        console.log(`✅ Created class: ${result.rows[0].name} (${result.rows[0].id})`);
        
        // Enroll the student in this class
        const studentId = '6ea5428a-476e-4b0e-afaa-de56ce8296f3'; // matrix (student)
        const enrollQuery = `
          INSERT INTO user_classes (user_id, class_id, enrolled_at)
          VALUES ($1, $2, NOW())
          ON CONFLICT (user_id, class_id) DO NOTHING;
        `;
        
        await pool.query(enrollQuery, [studentId, result.rows[0].id]);
        console.log(`   👥 Enrolled student 'matrix' in ${result.rows[0].name}`);
      } else {
        console.log(`⚠️  Class ${classData.name} already exists`);
      }
    }

    console.log('\n🎉 Sample data setup complete!');
    console.log('\n📋 You can now test:');
    console.log('1. Login as teacher (matrix1) at http://localhost:3000/login');
    console.log('2. Go to teacher dashboard and start a live session');
    console.log('3. Login as student (matrix) in another browser/tab');
    console.log('4. Join the live session from student dashboard or live-class page');

  } catch (error) {
    console.error('❌ Error creating sample data:', error);
  } finally {
    await pool.end();
  }
}

// Run the setup
createSampleData();
