// Seed development users
require('dotenv').config();
const bcrypt = require('bcryptjs');
const pool = require('./config/database');

async function seed() {
  const users = [
    { username: 'student1', email: 'student1@example.com', full_name: 'Student One', password: 'password123', role: 'student' },
    { username: 'teacher1', email: 'teacher1@example.com', full_name: 'Teacher One', password: 'password123', role: 'teacher' }
  ];

  for (const u of users) {
    try {
      const existing = await pool.query('SELECT id FROM users WHERE username=$1', [u.username]);
      if (existing.rows.length) {
        console.log(`User ${u.username} already exists, skipping.`);
        continue;
      }
      const hash = await bcrypt.hash(u.password, 10);
      const result = await pool.query(
        'INSERT INTO users (username, email, full_name, password_hash, role, is_active) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id, username, role',
        [u.username, u.email, u.full_name, hash, u.role, true]
      );
      console.log('Created user:', result.rows[0]);
    } catch (e) {
      console.error('Error creating user', u.username, e.message);
    }
  }
  console.log('Seeding complete. You can login with student1/password123 or teacher1/password123');
  process.exit(0);
}

seed();
