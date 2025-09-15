require('dotenv').config({ path: '../backend/.env' });
const pool = require('../backend/config/database');

const setupAINotesDatabase = async () => {
  try {
    console.log('🚀 Setting up AI Notes database tables...');
    
    // Create ai_notes table
    const createAINotesTableQuery = `
      CREATE TABLE IF NOT EXISTS ai_notes (
        id SERIAL PRIMARY KEY,
        lecture_id INTEGER REFERENCES recorded_lectures(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        summary TEXT,
        key_points JSONB DEFAULT '[]',
        important_questions JSONB DEFAULT '[]',
        highlights JSONB DEFAULT '[]',
        tags JSONB DEFAULT '[]',
        difficulty VARCHAR(50) DEFAULT 'beginner',
        estimated_study_time VARCHAR(50),
        processing_status VARCHAR(50) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(lecture_id, user_id)
      );
    `;
    
    await pool.query(createAINotesTableQuery);
    console.log('✅ AI Notes table created successfully');
    
    // Create indexes for better performance
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_ai_notes_user_id ON ai_notes(user_id);',
      'CREATE INDEX IF NOT EXISTS idx_ai_notes_lecture_id ON ai_notes(lecture_id);',
      'CREATE INDEX IF NOT EXISTS idx_ai_notes_tags ON ai_notes USING GIN(tags);',
      'CREATE INDEX IF NOT EXISTS idx_ai_notes_difficulty ON ai_notes(difficulty);',
      'CREATE INDEX IF NOT EXISTS idx_ai_notes_status ON ai_notes(processing_status);'
    ];
    
    for (const indexQuery of indexes) {
      await pool.query(indexQuery);
    }
    
    console.log('✅ AI Notes indexes created successfully');
    
    // Insert some sample AI notes data for testing
    const sampleNotesQuery = `
      INSERT INTO ai_notes (
        lecture_id, user_id, title, summary, key_points, important_questions, 
        highlights, tags, difficulty, estimated_study_time, processing_status
      ) 
      SELECT 
        rl.id,
        1, -- assuming user id 1 exists
        'AI Notes: ' || rl.title,
        'This lecture covers fundamental concepts with comprehensive explanations and practical examples. The instructor demonstrates key principles through interactive discussions and real-world applications, making complex topics accessible to students.',
        '["Introduction to core concepts and theoretical foundations", "Practical applications and real-world examples demonstrated", "Interactive Q&A session addressing common misconceptions", "Step-by-step problem-solving methodology explained", "Best practices and industry standards discussed"]'::jsonb,
        '[
          {
            "question": "What are the fundamental principles covered in this lecture?",
            "timestamp": "05:23",
            "context": "Introduced during the theoretical overview section"
          },
          {
            "question": "How can these concepts be applied in real-world scenarios?",
            "timestamp": "15:47", 
            "context": "Discussed during practical examples segment"
          }
        ]'::jsonb,
        '[
          {
            "title": "Key Definition",
            "content": "Essential terminology and concepts that form the foundation of understanding",
            "timestamp": "03:45",
            "importance": "high"
          },
          {
            "title": "Best Practice",
            "content": "Industry-standard approach for implementing solutions effectively", 
            "timestamp": "22:18",
            "importance": "medium"
          }
        ]'::jsonb,
        '["fundamentals", "applications", "best-practices", "problem-solving"]'::jsonb,
        'intermediate',
        '45 minutes',
        'completed'
      FROM recorded_lectures rl
      WHERE NOT EXISTS (
        SELECT 1 FROM ai_notes an 
        WHERE an.lecture_id = rl.id AND an.user_id = 1
      )
      LIMIT 3;
    `;
    
    const result = await pool.query(sampleNotesQuery);
    console.log(`✅ Inserted ${result.rowCount} sample AI notes`);
    
    // Show table info
    const tableInfoQuery = `
      SELECT 
        COUNT(*) as total_ai_notes,
        COUNT(DISTINCT user_id) as unique_users,
        COUNT(DISTINCT lecture_id) as lectures_with_notes
      FROM ai_notes;
    `;
    
    const info = await pool.query(tableInfoQuery);
    console.log('📊 AI Notes Database Summary:');
    console.log(`   Total AI Notes: ${info.rows[0].total_ai_notes}`);
    console.log(`   Unique Users: ${info.rows[0].unique_users}`);
    console.log(`   Lectures with Notes: ${info.rows[0].lectures_with_notes}`);
    
    console.log('🎉 AI Notes database setup completed successfully!');
    
  } catch (error) {
    console.error('❌ Error setting up AI Notes database:', error);
  } finally {
    await pool.end();
  }
};

// Run the setup
setupAINotesDatabase();
