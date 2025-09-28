#!/usr/bin/env node

const axios = require('axios');
const { Pool } = require('pg');
require('dotenv').config({ path: './backend/.env' });

// Database configuration
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'remoteclassroom',
  password: process.env.DB_PASSWORD || 'password',
  port: process.env.DB_PORT || 5432,
});

const BASE_URL = 'http://localhost:5000';

// Test data
const testUser = {
  username: 'teststudent',
  password: 'testpass123',
  full_name: 'Test Student',
  email: 'teststudent@test.com',
  role: 'student'
};

const testProfileData = {
  phone: '1234567890',
  address: '123 Test Street',
  date_of_birth: '2000-01-01',
  gender: 'male',
  emergency_contact: 'Test Parent',
  emergency_phone: '0987654321',
  student_class: '5',
  roll_number: 'TEST001',
  parent_name: 'Test Parent',
  parent_phone: '0987654321',
  previous_school: 'Test Elementary'
};

let authToken = null;
let userId = null;

async function testProfileSystem() {
  console.log('🧪 Testing Learn-X Profile Completion System\n');
  console.log('=' .repeat(60));

  try {
    // Test 1: Student Registration and Profile Completion
    console.log('📝 Test 1: Student Registration and Profile Completion');
    
    // Register a new student
    const studentRegisterResponse = await axios.post(`${BASE_URL}/api/auth/register`, {
      username: `teststudent_${Date.now()}`,
      email: `teststudent_${Date.now()}@example.com`,
      fullName: 'Test Student',
      password: 'password123',
      role: 'student'
    });

    if (studentRegisterResponse.data.success) {
      console.log('✅ Student registration successful');
      
      // Login as student
      const studentLoginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
        username: studentRegisterResponse.data.user.username,
        password: 'password123'
      });

      if (studentLoginResponse.data.success) {
        console.log('✅ Student login successful');
        console.log(`📍 Redirect URL: ${studentLoginResponse.data.redirectTo}`);
        console.log(`📊 Profile Complete: ${studentLoginResponse.data.user.profile_complete}`);

        const studentToken = studentLoginResponse.data.token;

        // Test profile completion
        const profileCompleteResponse = await axios.post(`${BASE_URL}/api/profiles/student/complete`, {
          class_number: 10,
          roll_number: 'S001',
          section: 'A',
          parent_name: 'John Doe Sr.',
          parent_phone: '1234567890',
          parent_email: 'parent@example.com',
          address: '123 Test Street',
          date_of_birth: '2008-01-01',
          selected_subjects: ['Mathematics', 'Physics', 'Chemistry']
        }, {
          headers: { Authorization: `Bearer ${studentToken}` }
        });

        if (profileCompleteResponse.data.success) {
          console.log('✅ Student profile completion successful');
        } else {
          console.log('❌ Student profile completion failed:', profileCompleteResponse.data.message);
        }
      } else {
        console.log('❌ Student login failed:', studentLoginResponse.data.message);
      }
    } else {
      console.log('❌ Student registration failed:', studentRegisterResponse.data.message);
    }

    console.log('\n' + '='.repeat(50) + '\n');

    // Test 2: Teacher Registration and Profile Completion
    console.log('📝 Test 2: Teacher Registration and Profile Completion');
    
    // Register a new teacher
    const teacherRegisterResponse = await axios.post(`${BASE_URL}/api/auth/register`, {
      username: `testteacher_${Date.now()}`,
      email: `testteacher_${Date.now()}@example.com`,
      fullName: 'Test Teacher',
      password: 'password123',
      role: 'teacher'
    });

    if (teacherRegisterResponse.data.success) {
      console.log('✅ Teacher registration successful');
      
      // Login as teacher
      const teacherLoginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
        username: teacherRegisterResponse.data.user.username,
        password: 'password123'
      });

      if (teacherLoginResponse.data.success) {
        console.log('✅ Teacher login successful');
        console.log(`📍 Redirect URL: ${teacherLoginResponse.data.redirectTo}`);
        console.log(`📊 Profile Complete: ${teacherLoginResponse.data.user.profile_complete}`);

        const teacherToken = teacherLoginResponse.data.token;

        // Test profile completion
        const profileCompleteResponse = await axios.post(`${BASE_URL}/api/profiles/teacher/complete`, {
          employee_id: 'T001',
          department: 'Mathematics',
          qualification: 'M.Sc. Mathematics, B.Ed.',
          experience_years: 5,
          phone: '9876543210',
          emergency_contact: '9876543211',
          address: '456 Teacher Lane',
          date_of_joining: '2020-01-01',
          specialization: 'Algebra and Calculus',
          class_assignments: [
            {
              class_number: 10,
              section: 'A',
              subject_name: 'Mathematics',
              is_class_teacher: true
            },
            {
              class_number: 11,
              section: 'B',
              subject_name: 'Mathematics',
              is_class_teacher: false
            }
          ]
        }, {
          headers: { Authorization: `Bearer ${teacherToken}` }
        });

        if (profileCompleteResponse.data.success) {
          console.log('✅ Teacher profile completion successful');
        } else {
          console.log('❌ Teacher profile completion failed:', profileCompleteResponse.data.message);
        }
      } else {
        console.log('❌ Teacher login failed:', teacherLoginResponse.data.message);
      }
    } else {
      console.log('❌ Teacher registration failed:', teacherRegisterResponse.data.message);
    }

    console.log('\n' + '='.repeat(50) + '\n');

    // Test 3: Profile Status Check
    console.log('📝 Test 3: Available Subjects API Test');
    
    for (let classNum = 1; classNum <= 12; classNum++) {
      try {
        const subjectsResponse = await axios.get(`${BASE_URL}/api/profiles/subjects/${classNum}`);
        if (subjectsResponse.data.success) {
          const subjects = subjectsResponse.data.data;
          console.log(`✅ Class ${classNum}: ${subjects.length} subjects available`);
        } else {
          console.log(`❌ Class ${classNum}: Failed to fetch subjects`);
        }
      } catch (error) {
        console.log(`❌ Class ${classNum}: Error fetching subjects`);
      }
    }

    console.log('\n🎉 Profile system test completed!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
  }
}

// Check if server is running
async function checkServer() {
  try {
    const response = await axios.get(`${BASE_URL}/api/health`);
    console.log('✅ Server is running\n');
    return true;
  } catch (error) {
    console.log('❌ Server is not running. Please start the backend server first.');
    console.log('Run: npm run dev:backend or npm run start:full\n');
    return false;
  }
}

async function main() {
  const serverRunning = await checkServer();
  if (serverRunning) {
    await testProfileSystem();
  }
}

main();