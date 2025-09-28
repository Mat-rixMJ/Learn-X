// Test authentication and then test schedule creation
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

async function testAPI() {
  try {
    console.log('Testing authentication...');
    
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
    
    console.log('Login response:', loginResponse);
    
    if (loginResponse.status === 200 && loginResponse.data.token) {
      console.log('Login successful! Token:', loginResponse.data.token.substring(0, 20) + '...');
      
      // Now test creating a scheduled class
      console.log('\\nTesting scheduled class creation...');
      
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(10, 0, 0, 0); // 10 AM tomorrow
      
      const scheduleResponse = await makeRequest({
        hostname: 'localhost',
        port: 5000,
        path: '/api/scheduled/schedule',
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${loginResponse.data.token}`
        }
      }, {
        class_id: '09b4872a-63f3-4523-a26e-eba182ef6517', // Our test teacher's class ID
        title: 'Test Scheduled Class',
        description: 'This is a test scheduled class',
        scheduled_at: tomorrow.toISOString(),
        duration_minutes: 60,
        send_reminders: true
      });
      
      console.log('Schedule response:', scheduleResponse);
      
    } else {
      console.log('Login failed!');
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testAPI();