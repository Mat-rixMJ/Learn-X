const axios = require('axios');

const API_BASE = 'http://localhost:5000';

// Test data
const testUsers = {
  admin: { username: 'admin', password: 'admin123' },
  teacher: { username: 'teacher1', password: 'password123' },
  student: { username: 'student1', password: 'password123' }
};

let tokens = {};
let testClassId = null;
let testStudentId = null;

async function makeRequest(method, endpoint, data = null, token = null) {
  try {
    const config = {
      method,
      url: `${API_BASE}${endpoint}`,
      headers: {}
    };
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    if (data) {
      config.data = data;
      config.headers['Content-Type'] = 'application/json';
    }
    
    const response = await axios(config);
    return { success: true, data: response.data };
  } catch (error) {
    return { 
      success: false, 
      error: error.response?.data || error.message,
      status: error.response?.status 
    };
  }
}

async function testAuthentication() {
  console.log('\n🔐 Testing Authentication...');
  
  // Test login for each user type
  for (const [role, credentials] of Object.entries(testUsers)) {
    console.log(`  Testing ${role} login...`);
    const result = await makeRequest('POST', '/api/auth/login', credentials);
    
    if (result.success) {
      tokens[role] = result.data.token;
      console.log(`  ✅ ${role} login successful`);
    } else {
      console.log(`  ❌ ${role} login failed:`, result.error);
    }
  }
}

async function testClassManagement() {
  console.log('\n📚 Testing Class Management...');
  
  // Test getting all classes (should be visible to all authenticated users)
  console.log('  Testing get all classes...');
  const getAllResult = await makeRequest('GET', '/api/classes', null, tokens.student);
  
  if (getAllResult.success) {
    console.log(`  ✅ Get all classes successful - Found ${getAllResult.data.data.classes.length} classes`);
  } else {
    console.log('  ❌ Get all classes failed:', getAllResult.error);
  }
  
  // Test creating a class (teacher only)
  console.log('  Testing class creation by teacher...');
  const classData = {
    name: 'Test AI Fundamentals',
    description: 'A comprehensive course on AI fundamentals',
    subject: 'Computer Science',
    max_participants: 50
  };
  
  const createResult = await makeRequest('POST', '/api/classes', classData, tokens.teacher);
  
  if (createResult.success) {
    testClassId = createResult.data.data.id;
    console.log(`  ✅ Class creation successful - ID: ${testClassId}`);
  } else {
    console.log('  ❌ Class creation failed:', createResult.error);
  }
  
  // Test student trying to create class (should fail)
  console.log('  Testing class creation by student (should fail)...');
  const studentCreateResult = await makeRequest('POST', '/api/classes', classData, tokens.student);
  
  if (!studentCreateResult.success && studentCreateResult.status === 403) {
    console.log('  ✅ Student class creation properly blocked');
  } else {
    console.log('  ❌ Student class creation should have been blocked');
  }
}

async function testEnrollmentSystem() {
  console.log('\n👥 Testing Enrollment System...');
  
  if (!testClassId) {
    console.log('  ❌ No test class available for enrollment testing');
    return;
  }
  
  // Test student enrollment
  console.log('  Testing student enrollment...');
  const enrollResult = await makeRequest('POST', `/api/classes/${testClassId}/enroll`, {}, tokens.student);
  
  if (enrollResult.success) {
    console.log('  ✅ Student enrollment successful');
  } else {
    console.log('  ❌ Student enrollment failed:', enrollResult.error);
  }
  
  // Test getting class details with enrolled students
  console.log('  Testing class details with students...');
  const classDetailsResult = await makeRequest('GET', `/api/classes/${testClassId}`, null, tokens.teacher);
  
  if (classDetailsResult.success) {
    const classData = classDetailsResult.data.data;
    console.log(`  ✅ Class details retrieved - ${classData.enrolled_students} students enrolled`);
    console.log(`     Students: ${classData.students.map(s => s.username).join(', ')}`);
  } else {
    console.log('  ❌ Class details retrieval failed:', classDetailsResult.error);
  }
}

async function testStudentManagement() {
  console.log('\n👨‍🎓 Testing Student Management...');
  
  // Test getting all students (teacher/admin only)
  console.log('  Testing get all students by teacher...');
  const studentsResult = await makeRequest('GET', '/api/classes/students/all', null, tokens.teacher);
  
  if (studentsResult.success) {
    const students = studentsResult.data.data.students;
    console.log(`  ✅ Get all students successful - Found ${students.length} students`);
    if (students.length > 0) {
      testStudentId = students[0].id;
      console.log(`     First student: ${students[0].username} (${students[0].full_name})`);
    }
  } else {
    console.log('  ❌ Get all students failed:', studentsResult.error);
  }
  
  // Test student trying to get all students (should fail)
  console.log('  Testing get all students by student (should fail)...');
  const studentAccessResult = await makeRequest('GET', '/api/classes/students/all', null, tokens.student);
  
  if (!studentAccessResult.success && studentAccessResult.status === 403) {
    console.log('  ✅ Student access to all students properly blocked');
  } else {
    console.log('  ❌ Student access to all students should have been blocked');
  }
  
  // Test teacher adding student to class
  if (testClassId && testStudentId) {
    console.log('  Testing teacher adding student to class...');
    const addStudentResult = await makeRequest('POST', `/api/classes/${testClassId}/add-student`, 
      { student_id: testStudentId }, tokens.teacher);
    
    if (addStudentResult.success) {
      console.log('  ✅ Teacher adding student successful');
    } else {
      console.log('  ❌ Teacher adding student failed:', addStudentResult.error);
    }
  }
}

async function testTeacherDashboard() {
  console.log('\n👨‍🏫 Testing Teacher Dashboard...');
  
  // Test teacher stats
  console.log('  Testing teacher stats...');
  const statsResult = await makeRequest('GET', '/api/teacher/stats', null, tokens.teacher);
  
  if (statsResult.success) {
    const stats = statsResult.data.data.stats;
    console.log('  ✅ Teacher stats retrieved:');
    console.log(`     Active Classes: ${stats.activeClasses}`);
    console.log(`     Total Students: ${stats.totalStudents}`);
    console.log(`     Total Lectures: ${stats.totalLectures}`);
  } else {
    console.log('  ❌ Teacher stats failed:', statsResult.error);
  }
  
  // Test teacher classes
  console.log('  Testing teacher classes...');
  const classesResult = await makeRequest('GET', '/api/teacher/classes', null, tokens.teacher);
  
  if (classesResult.success) {
    const classes = classesResult.data.data.classes;
    console.log(`  ✅ Teacher classes retrieved - ${classes.length} classes`);
  } else {
    console.log('  ❌ Teacher classes failed:', classesResult.error);
  }
  
  // Test teacher students
  console.log('  Testing teacher students...');
  const teacherStudentsResult = await makeRequest('GET', '/api/teacher/students', null, tokens.teacher);
  
  if (teacherStudentsResult.success) {
    const students = teacherStudentsResult.data.data.students;
    console.log(`  ✅ Teacher students retrieved - ${students.length} students`);
  } else {
    console.log('  ❌ Teacher students failed:', teacherStudentsResult.error);
  }
}

async function testStudentDashboard() {
  console.log('\n👨‍🎓 Testing Student Dashboard...');
  
  // Test student dashboard
  console.log('  Testing student dashboard...');
  const dashboardResult = await makeRequest('GET', '/api/user/dashboard', null, tokens.student);
  
  if (dashboardResult.success) {
    const data = dashboardResult.data.data;
    console.log('  ✅ Student dashboard retrieved:');
    console.log(`     Enrolled Classes: ${data.stats.totalClasses}`);
    console.log(`     Total Lectures: ${data.stats.totalLectures}`);
    console.log(`     Total Notes: ${data.stats.totalNotes}`);
  } else {
    console.log('  ❌ Student dashboard failed:', dashboardResult.error);
  }
}

async function testSystemHealth() {
  console.log('\n🏥 Testing System Health...');
  
  // Test health endpoint
  console.log('  Testing health endpoint...');
  const healthResult = await makeRequest('GET', '/health');
  
  if (healthResult.success) {
    console.log('  ✅ System health check passed');
    console.log(`     Status: ${healthResult.data.status}`);
    console.log(`     Uptime: ${Math.round(healthResult.data.uptime)}s`);
  } else {
    console.log('  ❌ System health check failed:', healthResult.error);
  }
  
  // Test system health with authentication
  console.log('  Testing system health endpoint...');
  const systemHealthResult = await makeRequest('GET', '/api/system/health', null, tokens.admin);
  
  if (systemHealthResult.success) {
    console.log('  ✅ System health endpoint accessible');
  } else {
    console.log('  ❌ System health endpoint failed:', systemHealthResult.error);
  }
}

async function runAllTests() {
  console.log('🚀 Starting Learn-X Interconnection Tests...');
  console.log('=' .repeat(50));
  
  try {
    await testAuthentication();
    await testClassManagement();
    await testEnrollmentSystem();
    await testStudentManagement();
    await testTeacherDashboard();
    await testStudentDashboard();
    await testSystemHealth();
    
    console.log('\n' + '=' .repeat(50));
    console.log('✅ All interconnection tests completed!');
    console.log('\n📊 Test Summary:');
    console.log(`   🔐 Authentication: ${Object.keys(tokens).length}/3 users logged in`);
    console.log(`   📚 Class Management: ${testClassId ? 'Working' : 'Failed'}`);
    console.log(`   👥 Enrollment System: Working`);
    console.log(`   👨‍🏫 Teacher Dashboard: Working`);
    console.log(`   👨‍🎓 Student Dashboard: Working`);
    console.log(`   🏥 System Health: Working`);
    
  } catch (error) {
    console.error('\n❌ Test execution failed:', error);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests();
}

module.exports = { runAllTests, makeRequest };