const pool = require('./config/database');
const fs = require('fs');
const path = require('path');

async function setupDatabase() {
  try {
    console.log('Setting up database schema...');
    
    // Read and execute the schema file
    const schemaPath = path.join(__dirname, '..', 'database', 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    // Split by semicolon and execute each statement
    const statements = schema.split(';').filter(stmt => stmt.trim());
    
    for (const statement of statements) {
      if (statement.trim()) {
        try {
          await pool.query(statement.trim());
          console.log('✅ Executed statement');
        } catch (error) {
          // Ignore "already exists" errors
          if (error.message.includes('already exists')) {
            console.log('⚠️ Already exists:', error.message.split(':')[1]?.trim());
          } else {
            console.error('❌ Error:', error.message);
          }
        }
      }
    }
    
    console.log('✅ Database schema setup complete!');
    
    // Test the teacher stats query
    console.log('\nTesting teacher stats query...');
    const testQuery = await pool.query('SELECT COUNT(*) FROM classes');
    console.log('Classes table accessible:', testQuery.rows[0].count);
    
  } catch (error) {
    console.error('Setup failed:', error.message);
  }
  
  process.exit(0);
}

setupDatabase();