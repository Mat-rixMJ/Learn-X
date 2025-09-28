// Create test user for development
const bcrypt = require('bcryptjs');

async function createTestUser() {
  console.log('Creating test user for development...');
  
  const testUsers = [
    {
      username: 'student1',
      email: 'student@test.com',
      fullName: 'Test Student',
      password: 'password123',
      role: 'student'
    },
    {
      username: 'teacher1', 
      email: 'teacher@test.com',
      fullName: 'Test Teacher',
      password: 'password123',
      role: 'teacher'
    }
  ];

  console.log('Test users you can use:');
  console.log('Student: username=student1, password=password123');
  console.log('Teacher: username=teacher1, password=password123');
  
  // For development, just output the credentials
  // In production, you'd actually insert these into the database
}

createTestUser();