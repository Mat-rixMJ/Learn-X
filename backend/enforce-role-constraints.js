const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'learnx',
  password: process.env.DB_PASSWORD || 'postgres',
  port: process.env.DB_PORT || 5432,
});

async function enforceRoleConstraints() {
  try {
    console.log('🔒 Enforcing role constraints on users table...');
    
    // Check if role constraint already exists
    const constraintCheck = await pool.query(`
      SELECT conname as constraint_name
      FROM pg_constraint c
      JOIN pg_class t ON c.conrelid = t.oid
      WHERE t.relname = 'users' AND c.conname = 'users_role_check'
    `);
    
    if (constraintCheck.rows.length === 0) {
      // Add role constraint to ensure only valid roles
      await pool.query(`
        ALTER TABLE users 
        ADD CONSTRAINT users_role_check 
        CHECK (role IN ('student', 'teacher', 'admin'))
      `);
      console.log('✅ Role constraint added successfully');
    } else {
      console.log('✅ Role constraint already exists');
    }
    
    // Ensure role is not nullable and has a default
    await pool.query(`
      ALTER TABLE users 
      ALTER COLUMN role SET NOT NULL,
      ALTER COLUMN role SET DEFAULT 'student'
    `);
    console.log('✅ Role column constraints updated');
    
    // Add unique constraint on username to prevent duplicate accounts
    const uniqueCheck = await pool.query(`
      SELECT conname as constraint_name
      FROM pg_constraint c
      JOIN pg_class t ON c.conrelid = t.oid
      WHERE t.relname = 'users' AND c.conname = 'users_username_key'
    `);
    
    if (uniqueCheck.rows.length === 0) {
      await pool.query(`
        ALTER TABLE users 
        ADD CONSTRAINT users_username_key UNIQUE (username)
      `);
      console.log('✅ Username uniqueness constraint added');
    } else {
      console.log('✅ Username uniqueness constraint already exists');
    }
    
    // Add unique constraint on email
    const emailUniqueCheck = await pool.query(`
      SELECT conname as constraint_name
      FROM pg_constraint c
      JOIN pg_class t ON c.conrelid = t.oid
      WHERE t.relname = 'users' AND c.conname = 'users_email_key'
    `);
    
    if (emailUniqueCheck.rows.length === 0) {
      await pool.query(`
        ALTER TABLE users 
        ADD CONSTRAINT users_email_key UNIQUE (email)
      `);
      console.log('✅ Email uniqueness constraint added');
    } else {
      console.log('✅ Email uniqueness constraint already exists');
    }
    
    // Add is_active column if it doesn't exist
    const columnCheck = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'is_active'
    `);
    
    if (columnCheck.rows.length === 0) {
      await pool.query(`
        ALTER TABLE users 
        ADD COLUMN is_active BOOLEAN DEFAULT TRUE
      `);
      console.log('✅ is_active column added');
    } else {
      console.log('✅ is_active column already exists');
    }
    
    // Create index on role for better query performance
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_users_role ON users (role)
    `);
    console.log('✅ Role index created');
    
    // Create index on is_active for better query performance
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_users_is_active ON users (is_active)
    `);
    console.log('✅ Active status index created');
    
    console.log('🎉 All role constraints and indexes applied successfully!');
    
  } catch (error) {
    console.error('❌ Error enforcing role constraints:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run the script
if (require.main === module) {
  enforceRoleConstraints()
    .then(() => {
      console.log('✅ Role constraint script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Role constraint script failed:', error);
      process.exit(1);
    });
}

module.exports = { enforceRoleConstraints };