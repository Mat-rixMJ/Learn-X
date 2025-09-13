// Test retrieving scheduled classes
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

async function testGetScheduled() {
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
    
    if (loginResponse.status === 200 && loginResponse.data.token) {
      console.log('Login successful!');
      
      // Test getting upcoming scheduled classes
      console.log('\\nTesting GET upcoming scheduled classes...');
      
      const upcomingResponse = await makeRequest({
        hostname: 'localhost',
        port: 5000,
        path: '/api/scheduled/upcoming',
        method: 'GET',
        headers: { 
          'Authorization': `Bearer ${loginResponse.data.token}`
        }
      });
      
      console.log('Upcoming classes response:', upcomingResponse);
      
      // Test getting teacher's scheduled classes via teacher stats
      console.log('\\nTesting teacher stats scheduled classes...');
      
      const statsResponse = await makeRequest({
        hostname: 'localhost',
        port: 5000,
        path: '/api/teacher/scheduled-classes',
        method: 'GET',
        headers: { 
          'Authorization': `Bearer ${loginResponse.data.token}`
        }
      });
      
      console.log('Teacher scheduled classes response:', statsResponse);
      
    } else {
      console.log('Login failed!');
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testGetScheduled();