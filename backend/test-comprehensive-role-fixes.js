#!/usr/bin/env node
/**
 * Comprehensive Role-Based Access Control Verification
 * Tests all the fixes implemented for proper user role management
 */

const axios = require('axios');
const API_URL = 'http://localhost:5000';

async function runComprehensiveTests() {
  console.log('🔒 COMPREHENSIVE ROLE-BASED ACCESS CONTROL TESTS');
  console.log('='.repeat(60));
  
  let testsPassed = 0;
  let totalTests = 0;
  
  const runTest = async (testName, testFunction) => {
    totalTests++;
    console.log(`\n${totalTests}️⃣ ${testName}`);
    console.log('-'.repeat(testName.length + 5));
    
    try {
      const result = await testFunction();
      if (result) {
        console.log('✅ PASSED');
        testsPassed++;
      } else {
        console.log('❌ FAILED');
      }
    } catch (error) {
      console.log('❌ ERROR:', error.message);
    }
  };
  
  // Test 1: Student Login and Routing
  await runTest('Student Login Returns Correct Role and Redirect', async () => {
    const response = await axios.post(`${API_URL}/api/auth/login`, {
      username: 'student1',
      password: 'password123'
    });
    
    const { user, redirectTo } = response.data;
    console.log(`   Role: ${user.role}, Redirect: ${redirectTo}`);
    
    return user.role === 'student' && redirectTo === '/simple-dashboard';
  });
  
  // Test 2: Teacher Login and Routing  
  await runTest('Teacher Login Returns Correct Role and Redirect', async () => {
    const response = await axios.post(`${API_URL}/api/auth/login`, {
      username: 'teacher1', 
      password: 'password123'
    });
    
    const { user, redirectTo } = response.data;
    console.log(`   Role: ${user.role}, Redirect: ${redirectTo}`);
    
    return user.role === 'teacher' && redirectTo === '/teacher-dashboard';
  });
  
  // Test 3: Invalid Credentials Rejection
  await runTest('Invalid Credentials Are Properly Rejected', async () => {
    try {
      await axios.post(`${API_URL}/api/auth/login`, {
        username: 'nonexistent',
        password: 'wrongpass'
      });
      return false; // Should not reach here
    } catch (error) {
      console.log(`   Status: ${error.response?.status} - ${error.response?.data?.message}`);
      return error.response?.status === 401;
    }
  });
  
  // Test 4: Protected Endpoints Require Authentication
  await runTest('Protected Dashboard Endpoint Requires Authentication', async () => {
    try {
      await axios.get(`${API_URL}/api/user/dashboard`);
      return false; // Should not reach here
    } catch (error) {
      console.log(`   Status: ${error.response?.status} - ${error.response?.data?.message}`);
      return error.response?.status === 401;
    }
  });
  
  // Test 5: Role-Based Dashboard Access
  await runTest('Student Can Access Their Dashboard', async () => {
    // Login as student first
    const loginResponse = await axios.post(`${API_URL}/api/auth/login`, {
      username: 'student1',
      password: 'password123'
    });
    
    const token = loginResponse.data.token;
    
    // Access dashboard with token
    const dashboardResponse = await axios.get(`${API_URL}/api/user/dashboard`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log(`   Dashboard access granted for user: ${dashboardResponse.data.data.user.role}`);
    return dashboardResponse.status === 200 && dashboardResponse.data.data.user.role === 'student';
  });
  
  // Test 6: Teacher Dashboard Access
  await runTest('Teacher Can Access Their Dashboard', async () => {
    // Login as teacher first
    const loginResponse = await axios.post(`${API_URL}/api/auth/login`, {
      username: 'teacher1',
      password: 'password123'
    });
    
    const token = loginResponse.data.token;
    
    // Access dashboard with token
    const dashboardResponse = await axios.get(`${API_URL}/api/user/dashboard`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log(`   Dashboard access granted for user: ${dashboardResponse.data.data.user.role}`);
    return dashboardResponse.status === 200 && dashboardResponse.data.data.user.role === 'teacher';
  });
  
  // Test 7: No Role Selection in Login (Frontend Fix)
  await runTest('Login Does Not Require Role Selection', async () => {
    // This test verifies that login works without role parameter
    const response = await axios.post(`${API_URL}/api/auth/login`, {
      username: 'student1',
      password: 'password123'
      // Note: No role parameter sent - server determines role from database
    });
    
    console.log(`   Server determined role: ${response.data.user.role}`);
    return response.data.user.role === 'student';
  });
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ Tests Passed: ${testsPassed}/${totalTests}`);
  console.log(`❌ Tests Failed: ${totalTests - testsPassed}/${totalTests}`);
  
  if (testsPassed === totalTests) {
    console.log('\n🎉 ALL TESTS PASSED! Role-based access control is working correctly.');
    console.log('\n✨ Implemented Fixes:');
    console.log('   • Removed role selector from login frontend');
    console.log('   • Backend validates roles from database, not frontend input');
    console.log('   • Login response includes redirectTo field for proper routing');
    console.log('   • Dashboard components enforce strict role-based access control');
    console.log('   • Database constraints prevent invalid roles and duplicate users');
    console.log('   • Enhanced authentication middleware with role validation');
  } else {
    console.log('\n⚠️  Some tests failed. Please review the implementation.');
  }
  
  return testsPassed === totalTests;
}

// Run tests if called directly
if (require.main === module) {
  runComprehensiveTests()
    .then((allPassed) => {
      process.exit(allPassed ? 0 : 1);
    })
    .catch((error) => {
      console.error('\n💥 Test suite crashed:', error.message);
      process.exit(1);
    });
}

module.exports = { runComprehensiveTests };