require('dotenv').config({ path: '../backend/.env' });
const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

async function createNotificationsTable() {
  try {
    console.log('📢 Creating notifications table...');

    // Check if table exists
    const tableExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'notifications'
      );
    `);

    if (tableExists.rows[0].exists) {
      console.log('⚠️  Table already exists, dropping first...');
      await pool.query('DROP TABLE notifications CASCADE');
    }

    // Create notifications table
    await pool.query(`
      CREATE TABLE notifications (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        type VARCHAR(50) NOT NULL DEFAULT 'general',
        class_id UUID REFERENCES classes(id) ON DELETE SET NULL,
        schedule_id UUID REFERENCES daily_schedules(id) ON DELETE SET NULL,
        metadata JSONB,
        is_read BOOLEAN DEFAULT false,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        read_at TIMESTAMP WITH TIME ZONE
      )
    `);
    console.log('✅ Notifications table created');

    // Create indexes for better performance
    await pool.query(`
      CREATE INDEX idx_notifications_user_id ON notifications(user_id);
    `);
    await pool.query(`
      CREATE INDEX idx_notifications_created_at ON notifications(created_at);
    `);
    await pool.query(`
      CREATE INDEX idx_notifications_type ON notifications(type);
    `);
    await pool.query(`
      CREATE INDEX idx_notifications_is_read ON notifications(is_read);
    `);
    console.log('✅ Indexes created');

    // Insert some sample notifications for testing
    const users = await pool.query(`
      SELECT id FROM users WHERE role = 'student' LIMIT 5
    `);

    for (const user of users.rows) {
      await pool.query(`
        INSERT INTO notifications (user_id, title, message, type, metadata)
        VALUES ($1, $2, $3, $4, $5)
      `, [
        user.id,
        'Welcome to Learn-X! 🎓',
        'Your account has been set up successfully. Get ready for an amazing learning experience!',
        'welcome',
        JSON.stringify({ welcome: true, timestamp: new Date().toISOString() })
      ]);
    }
    console.log('✅ Sample notifications inserted');

    console.log('🎉 Notifications table setup completed!');

  } catch (error) {
    console.error('❌ Error creating notifications table:', error);
  } finally {
    await pool.end();
  }
}

createNotificationsTable();