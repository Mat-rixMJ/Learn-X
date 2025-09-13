const { Pool } = require('../backend/node_modules/pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'remoteclassroom',
  password: 'postgres',
  port: 5432,
});

async function createAINotesTable() {
  try {
    console.log('🚀 Creating AI notes table...');
    
    // Create the ai_notes table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ai_notes (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        title VARCHAR(255) NOT NULL,
        subject VARCHAR(100),
        lecture_content TEXT NOT NULL,
        ai_analysis JSONB NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('✅ AI notes table created successfully');

    // Create indexes for better performance
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_ai_notes_user_id ON ai_notes (user_id)
    `);
    
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_ai_notes_created_at ON ai_notes (created_at)
    `);

    console.log('✅ Indexes created successfully');

    // Insert sample data
    const sampleNote = {
      user_id: 1,
      title: 'Introduction to Machine Learning',
      subject: 'Computer Science',
      lecture_content: 'Machine learning is a subset of artificial intelligence...',
      ai_analysis: {
        summary: 'This lecture introduces fundamental concepts of machine learning...',
        key_points: [
          'Machine learning is a subset of AI',
          'There are three main types: supervised, unsupervised, and reinforcement learning',
          'Data quality is crucial for model performance'
        ],
        important_questions: [
          'What are the main differences between supervised and unsupervised learning?',
          'How does data quality affect model performance?'
        ],
        highlights: [
          'Machine learning algorithms can learn patterns from data without explicit programming',
          'The choice of algorithm depends on the problem type and data characteristics'
        ]
      }
    };

    const insertQuery = `
      INSERT INTO ai_notes (user_id, title, subject, lecture_content, ai_analysis)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT DO NOTHING
    `;

    await pool.query(insertQuery, [
      sampleNote.user_id,
      sampleNote.title,
      sampleNote.subject,
      sampleNote.lecture_content,
      JSON.stringify(sampleNote.ai_analysis)
    ]);

    console.log('✅ Sample data inserted successfully');

    // Verify the table
    const result = await pool.query('SELECT COUNT(*) FROM ai_notes');
    console.log(`✅ Table verification: ${result.rows[0].count} rows in ai_notes table`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

createAINotesTable();
