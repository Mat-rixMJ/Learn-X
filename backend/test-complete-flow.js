// Test retrieving scheduled classes and show the actual data
const http = require('http');

function makeRequest(options, data) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });
    
    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function testDataRetrieval() {
  try {
    // Test login
    const loginResponse = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      username: 'testteacher',
      password: 'testpassword'
    });
    
    if (loginResponse.status === 200 && loginResponse.data.token) {
      console.log('🔑 Authentication successful!');
      
      // Test getting teacher stats (including scheduled classes count)
      const statsResponse = await makeRequest({
        hostname: 'localhost',
        port: 5000,
        path: '/api/teacher/stats',
        method: 'GET',
        headers: { 
          'Authorization': `Bearer ${loginResponse.data.token}`
        }
      });
      
      console.log('\\n📊 Teacher Stats:');
      console.log('Status:', statsResponse.status);
      if (statsResponse.data.success) {
        console.log('Active Classes:', statsResponse.data.data.stats.activeClasses);
        console.log('Total Lectures:', statsResponse.data.data.stats.totalLectures);
        console.log('Total Students:', statsResponse.data.data.stats.totalStudents);
        console.log('Scheduled Classes:', statsResponse.data.data.stats.scheduledClasses);
        console.log('Average Rating:', statsResponse.data.data.stats.avgRating);
      } else {
        console.log('Error:', statsResponse.data.message);
      }
      
      // Test getting specific scheduled classes
      const scheduledResponse = await makeRequest({
        hostname: 'localhost',
        port: 5000,
        path: '/api/teacher/scheduled-classes',
        method: 'GET',
        headers: { 
          'Authorization': `Bearer ${loginResponse.data.token}`
        }
      });
      
      console.log('\\n📅 Scheduled Classes:');
      console.log('Status:', scheduledResponse.status);
      if (scheduledResponse.data.success) {
        const classes = scheduledResponse.data.data.scheduledClasses;
        console.log(`Found ${classes.length} scheduled classes:`);
        classes.forEach((cls, index) => {
          console.log(`${index + 1}. ${cls.title}`);
          console.log(`   Class: ${cls.class_name} (${cls.subject})`);
          console.log(`   Scheduled: ${cls.scheduled_at}`);
          console.log(`   Duration: ${cls.duration_minutes} minutes`);
          console.log(`   Enrolled: ${cls.enrolled_participants} students`);
          console.log(`   Status: ${cls.status}`);
          console.log('');
        });
      } else {
        console.log('Error:', scheduledResponse.data.message);
      }
      
    } else {
      console.log('❌ Login failed!');
    }
    
  } catch (error) {
    console.error('💥 Error:', error);
  }
}

testDataRetrieval();