#!/usr/bin/env node

const axios = require('axios');

const API_BASE = 'http://localhost:5000';

// Test all available API endpoints
const API_ENDPOINTS = {
  // Authentication
  auth: {
    login: { method: 'POST', url: '/api/auth/login', requiresAuth: false },
    register: { method: 'POST', url: '/api/auth/register', requiresAuth: false },
    refresh: { method: 'POST', url: '/api/auth/refresh', requiresAuth: true },
  },
  
  // User management
  user: {
    dashboard: { method: 'GET', url: '/api/user/dashboard', requiresAuth: true },
    profile: { method: 'GET', url: '/api/user/profile', requiresAuth: true },
    updateProfile: { method: 'PUT', url: '/api/user/profile', requiresAuth: true },
  },
  
  // Classes
  classes: {
    list: { method: 'GET', url: '/api/classes', requiresAuth: true },
    create: { method: 'POST', url: '/api/classes', requiresAuth: true },
    getById: { method: 'GET', url: '/api/classes/:id', requiresAuth: true },
    update: { method: 'PUT', url: '/api/classes/:id', requiresAuth: true },
    delete: { method: 'DELETE', url: '/api/classes/:id', requiresAuth: true },
    join: { method: 'POST', url: '/api/classes/:id/join', requiresAuth: true },
  },
  
  // Lectures
  lectures: {
    list: { method: 'GET', url: '/api/lectures', requiresAuth: true },
    create: { method: 'POST', url: '/api/lectures', requiresAuth: true },
    getById: { method: 'GET', url: '/api/lectures/:id', requiresAuth: true },
    byClass: { method: 'GET', url: '/api/lectures/class/:classId', requiresAuth: true },
  },
  
  // Live sessions
  live: {
    start: { method: 'POST', url: '/api/live/start', requiresAuth: true },
    join: { method: 'POST', url: '/api/live/join/:sessionId', requiresAuth: true },
    active: { method: 'GET', url: '/api/live/active', requiresAuth: true },
    end: { method: 'POST', url: '/api/live/end/:sessionId', requiresAuth: true },
  },
  
  // AI Notes
  aiNotes: {
    list: { method: 'GET', url: '/api/ai-notes', requiresAuth: true },
    create: { method: 'POST', url: '/api/ai-notes', requiresAuth: true },
    getById: { method: 'GET', url: '/api/ai-notes/:id', requiresAuth: true },
    byUser: { method: 'GET', url: '/api/ai-notes/user/:userId', requiresAuth: true },
  },
  
  // Profiles
  profiles: {
    completeStudent: { method: 'POST', url: '/api/profiles/complete-student', requiresAuth: true },
    completeTeacher: { method: 'POST', url: '/api/profiles/complete-teacher', requiresAuth: true },
    checkCompletion: { method: 'GET', url: '/api/profiles/check-completion', requiresAuth: true },
  },
  
  // Teacher stats
  teacher: {
    stats: { method: 'GET', url: '/api/teacher/stats', requiresAuth: true },
    classes: { method: 'GET', url: '/api/teacher/classes', requiresAuth: true },
  },
  
  // Scheduled classes
  scheduled: {
    list: { method: 'GET', url: '/api/scheduled', requiresAuth: true },
    create: { method: 'POST', url: '/api/scheduled', requiresAuth: true },
    upcoming: { method: 'GET', url: '/api/scheduled/upcoming', requiresAuth: true },
  },
  
  // Assignments
  assignments: {
    list: { method: 'GET', url: '/api/assignments', requiresAuth: true },
    create: { method: 'POST', url: '/api/assignments', requiresAuth: true },
    submit: { method: 'POST', url: '/api/assignments/:id/submit', requiresAuth: true },
  },
  
  // Analytics
  analytics: {
    overview: { method: 'GET', url: '/api/analytics/overview', requiresAuth: true },
    engagement: { method: 'GET', url: '/api/analytics/engagement', requiresAuth: true },
  },
  
  // Translation
  translate: {
    text: { method: 'POST', url: '/api/translate/text', requiresAuth: true },
    captions: { method: 'POST', url: '/api/translate/captions', requiresAuth: true },
  },
  
  // Content
  content: {
    list: { method: 'GET', url: '/api/content', requiresAuth: true },
    upload: { method: 'POST', url: '/api/content/upload', requiresAuth: true },
  },
};

async function testAllEndpoints() {
  console.log('🔍 Testing All API Endpoints\n');
  
  let token = null;
  let results = {
    working: [],
    notWorking: [],
    requiresData: []
  };
  
  try {
    // Step 1: Login to get token
    console.log('1️⃣ Getting authentication token...');
    const loginResponse = await axios.post(`${API_BASE}/api/auth/login`, {
      username: 'student1',
      password: 'password123'
    });
    
    if (loginResponse.data.success) {
      token = loginResponse.data.token;
      console.log('✅ Authentication successful');
      results.working.push('POST /api/auth/login');
    } else {
      console.log('❌ Authentication failed');
      results.notWorking.push('POST /api/auth/login');
      return results;
    }
    
    // Step 2: Test all endpoints
    console.log('\n2️⃣ Testing all API endpoints...\n');
    
    for (const [category, endpoints] of Object.entries(API_ENDPOINTS)) {
      console.log(`📂 Testing ${category.toUpperCase()} endpoints:`);
      
      for (const [name, config] of Object.entries(endpoints)) {
        const url = `${API_BASE}${config.url}`;
        const testUrl = url.replace(':id', '123').replace(':classId', '123').replace(':sessionId', '123').replace(':userId', '123');
        
        try {
          const headers = config.requiresAuth ? { Authorization: `Bearer ${token}` } : {};
          
          let response;
          if (config.method === 'GET') {
            response = await axios.get(testUrl, { headers });
          } else if (config.method === 'POST') {
            response = await axios.post(testUrl, {}, { headers });
          } else if (config.method === 'PUT') {
            response = await axios.put(testUrl, {}, { headers });
          } else if (config.method === 'DELETE') {
            response = await axios.delete(testUrl, { headers });
          }
          
          if (response.status < 300) {
            console.log(`  ✅ ${config.method} ${config.url}`);
            results.working.push(`${config.method} ${config.url}`);
          }
          
        } catch (error) {
          if (error.response) {
            const status = error.response.status;
            if (status === 404) {
              console.log(`  ⚠️  ${config.method} ${config.url} - Not Found (may need specific data)`);
              results.requiresData.push(`${config.method} ${config.url}`);
            } else if (status === 400) {
              console.log(`  ⚠️  ${config.method} ${config.url} - Bad Request (may need specific data)`);
              results.requiresData.push(`${config.method} ${config.url}`);
            } else if (status === 403) {
              console.log(`  🔒 ${config.method} ${config.url} - Forbidden (may need different role)`);
              results.requiresData.push(`${config.method} ${config.url}`);
            } else {
              console.log(`  ❌ ${config.method} ${config.url} - Status: ${status}`);
              results.notWorking.push(`${config.method} ${config.url}`);
            }
          } else {
            console.log(`  ❌ ${config.method} ${config.url} - Network Error`);
            results.notWorking.push(`${config.method} ${config.url}`);
          }
        }
        
        // Small delay to avoid overwhelming the server
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      console.log('');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
  
  return results;
}

async function generateFrontendMapping(results) {
  console.log('\n📊 API ENDPOINT TEST RESULTS');
  console.log('='.repeat(80));
  
  console.log(`\n✅ WORKING ENDPOINTS (${results.working.length}):`);
  results.working.forEach(endpoint => console.log(`   ${endpoint}`));
  
  console.log(`\n⚠️  ENDPOINTS REQUIRING SPECIFIC DATA (${results.requiresData.length}):`);
  results.requiresData.forEach(endpoint => console.log(`   ${endpoint}`));
  
  console.log(`\n❌ NOT WORKING ENDPOINTS (${results.notWorking.length}):`);
  results.notWorking.forEach(endpoint => console.log(`   ${endpoint}`));
  
  console.log(`\n📈 SUMMARY:`);
  console.log(`   Total Tested: ${results.working.length + results.requiresData.length + results.notWorking.length}`);
  console.log(`   Working: ${results.working.length}`);
  console.log(`   Need Data: ${results.requiresData.length}`);
  console.log(`   Broken: ${results.notWorking.length}`);
  
  // Generate frontend integration recommendations
  console.log(`\n🎯 FRONTEND INTEGRATION RECOMMENDATIONS:`);
  console.log('='.repeat(80));
  
  const frontendPages = [
    { page: '/login', endpoints: ['POST /api/auth/login', 'POST /api/auth/register'] },
    { page: '/dashboard', endpoints: ['GET /api/user/dashboard', 'GET /api/user/profile'] },
    { page: '/student', endpoints: ['GET /api/user/dashboard', 'GET /api/classes', 'GET /api/lectures'] },
    { page: '/classes', endpoints: ['GET /api/classes', 'POST /api/classes/:id/join'] },
    { page: '/lectures', endpoints: ['GET /api/lectures', 'GET /api/lectures/class/:classId'] },
    { page: '/live-classes', endpoints: ['GET /api/live/active', 'POST /api/live/join/:sessionId'] },
    { page: '/ai-notes', endpoints: ['GET /api/ai-notes', 'GET /api/ai-notes/user/:userId'] },
    { page: '/complete-profile', endpoints: ['POST /api/profiles/complete-student', 'POST /api/profiles/complete-teacher'] },
    { page: '/teacher/stats', endpoints: ['GET /api/teacher/stats', 'GET /api/teacher/classes'] },
  ];
  
  frontendPages.forEach(({ page, endpoints }) => {
    console.log(`\n📄 ${page}:`);
    endpoints.forEach(endpoint => {
      const status = results.working.includes(endpoint) ? '✅' : 
                    results.requiresData.includes(endpoint) ? '⚠️ ' :
                    results.notWorking.includes(endpoint) ? '❌' : '❓';
      console.log(`   ${status} ${endpoint}`);
    });
  });
}

// Run the comprehensive test
testAllEndpoints().then(results => {
  generateFrontendMapping(results);
  
  console.log('\n🚀 NEXT STEPS FOR FRONTEND UPDATE:');
  console.log('1. Update API service utilities');
  console.log('2. Fix broken endpoints integration');
  console.log('3. Add error handling for missing data endpoints');
  console.log('4. Create comprehensive frontend components');
  console.log('5. Test all user flows end-to-end');
  
}).catch(error => {
  console.error('❌ Comprehensive test failed:', error);
});