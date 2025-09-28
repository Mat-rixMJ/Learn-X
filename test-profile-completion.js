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

const API_BASE = 'http://localhost:5000';

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

async function runTests() {
  console.log('🚀 Profile Completion System Test Suite');
  console.log('='.repeat(50));
  
  let passed = 0;
  let failed = 0;

  // Test 1: Database Connection
  console.log('\n1️⃣ Testing Database Connection...');
  try {
    const result = await pool.query('SELECT NOW()');
    console.log('✅ Database connected successfully');
    passed++;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    failed++;
    return;
  }

  // Test 2: Check Tables
  console.log('\n2️⃣ Checking Required Tables...');
  try {
    const tables = ['users', 'user_profiles', 'subjects'];
    for (const table of tables) {
      const result = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        )
      `, [table]);
      
      if (!result.rows[0].exists) {
        throw new Error(`Table '${table}' missing`);
      }
    }
    console.log('✅ All required tables exist');
    passed++;
  } catch (error) {
    console.error('❌ Table check failed:', error.message);
    failed++;
    return;
  }

  // Test 3: Subjects Data
  console.log('\n3️⃣ Testing Subjects Data...');
  try {
    const result = await pool.query('SELECT COUNT(*) FROM subjects');
    const count = parseInt(result.rows[0].count);
    if (count > 0) {
      console.log(`✅ Found ${count} subjects in database`);
      passed++;
    } else {
      throw new Error('No subjects found');
    }
  } catch (error) {
    console.error('❌ Subjects data check failed:', error.message);
    failed++;
  }

  // Test 4: Public Subjects API
  console.log('\n4️⃣ Testing Public Subjects API...');
  try {
    const response = await axios.get(`${API_BASE}/api/profiles/public/subjects`);
    if (response.data.success && response.data.data.length > 0) {
      console.log(`✅ Public subjects API working - ${response.data.data.length} subjects found`);
      passed++;
    } else {
      throw new Error('No subjects returned from API');
    }
  } catch (error) {
    console.error('❌ Public subjects API failed:', error.response?.data?.message || error.message);
    failed++;
  }

  // Test 5: Create Test User
  console.log('\n5️⃣ Creating Test User...');
  try {
    // Delete existing test user first
    await pool.query('DELETE FROM users WHERE username = $1', [testUser.username]);
    
    const response = await axios.post(`${API_BASE}/api/auth/register`, testUser);
    if (response.data.success) {
      console.log('✅ Test user created successfully');
      passed++;
    } else {
      throw new Error(response.data.message);
    }
  } catch (error) {
    console.error('❌ User creation failed:', error.response?.data?.message || error.message);
    failed++;
  }

  // Test 6: Login Test User
  console.log('\n6️⃣ Logging in Test User...');
  try {
    const response = await axios.post(`${API_BASE}/api/auth/login`, {
      username: testUser.username,
      password: testUser.password
    });
    
    if (response.data.success) {
      authToken = response.data.token;
      userId = response.data.user.id;
      console.log('✅ User logged in successfully');
      passed++;
    } else {
      throw new Error(response.data.message);
    }
  } catch (error) {
    console.error('❌ Login failed:', error.response?.data?.message || error.message);
    failed++;
    return;
  }

  // Test 7: Class Subjects API
  console.log('\n7️⃣ Testing Class-Specific Subjects API...');
  try {
    const response = await axios.get(`${API_BASE}/api/profiles/subjects/5`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    if (response.data.success && response.data.data.length > 0) {
      console.log(`✅ Class 5 subjects API working - ${response.data.data.length} subjects found`);
      console.log('   Subjects for Class 5:');
      response.data.data.forEach(subject => {
        console.log(`   - ${subject.name} ${subject.is_core ? '(core)' : ''}`);
      });
      passed++;
    } else {
      throw new Error('No subjects returned for class 5');
    }
  } catch (error) {
    console.error('❌ Class subjects API failed:', error.response?.data?.message || error.message);
    failed++;
  }

  // Test 8: Roll Number Check
  console.log('\n8️⃣ Testing Roll Number Check API...');
  try {
    const response = await axios.post(`${API_BASE}/api/profiles/check-roll-number`, {
      student_class: '5',
      roll_number: 'TEST001'
    }, {
      headers: { 
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.data.success) {
      console.log(`✅ Roll number check working - TEST001 is ${response.data.data.available ? 'available' : 'taken'}`);
      passed++;
    } else {
      throw new Error(response.data.message);
    }
  } catch (error) {
    console.error('❌ Roll number check failed:', error.response?.data?.message || error.message);
    failed++;
  }

  // Test 9: Profile Completion
  console.log('\n9️⃣ Testing Profile Completion API...');
  try {
    const response = await axios.post(`${API_BASE}/api/profiles/complete-profile`, testProfileData, {
      headers: { 
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.data.success) {
      console.log('✅ Profile completion successful');
      passed++;
    } else {
      throw new Error(response.data.message);
    }
  } catch (error) {
    console.error('❌ Profile completion failed:', error.response?.data?.message || error.message);
    failed++;
  }

  // Test 10: Verify Profile in Database
  console.log('\n🔟 Verifying Profile in Database...');
  try {
    const result = await pool.query('SELECT * FROM user_profiles WHERE user_id = $1', [userId]);
    
    if (result.rows.length > 0) {
      const profile = result.rows[0];
      console.log('✅ Profile found in database');
      console.log(`   Student Class: ${profile.student_class}`);
      console.log(`   Roll Number: ${profile.roll_number}`);
      console.log(`   Phone: ${profile.phone}`);
      console.log(`   Parent Name: ${profile.parent_name}`);
      passed++;
    } else {
      throw new Error('Profile not found in database');
    }
  } catch (error) {
    console.error('❌ Profile verification failed:', error.message);
    failed++;
  }

  // Cleanup
  console.log('\n🧹 Cleaning up test data...');
  try {
    await pool.query('DELETE FROM user_profiles WHERE user_id = $1', [userId]);
    await pool.query('DELETE FROM users WHERE username = $1', [testUser.username]);
    console.log('✅ Test data cleaned up');
  } catch (error) {
    console.error('❌ Cleanup failed:', error.message);
  }

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(50));
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);
  
  if (failed === 0) {
    console.log('\n🎉 All tests passed! Profile completion system is working correctly.');
    console.log('\n📋 What was tested:');
    console.log('   • Database connectivity and table structure');
    console.log('   • Subjects data population');
    console.log('   • Public subjects API endpoint');
    console.log('   • User registration and authentication');
    console.log('   • Class-specific subjects API');
    console.log('   • Roll number availability checking');
    console.log('   • Complete profile submission');
    console.log('   • Database profile verification');
  } else {
    console.log('\n⚠️  Some tests failed. Check backend server and database connection.');
  }
  
  await pool.end();
  process.exit(failed === 0 ? 0 : 1);
}

// Run the tests
runTests().catch(error => {
  console.error('❌ Test suite failed:', error);
  process.exit(1);
});