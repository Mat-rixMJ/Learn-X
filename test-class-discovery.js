const axios = require('axios');

const API_BASE = 'http://localhost:5000/api';

// Test credentials
const studentCredentials = {
  username: 'student1',
  password: 'password123'
};

async function testClassDiscovery() {
  console.log('🧪 Testing Class Discovery System...\n');

  try {
    // 1. Login as student
    console.log('1️⃣ Logging in as student...');
    const loginResponse = await axios.post(`${API_BASE}/auth/login`, studentCredentials);
    
    if (!loginResponse.data.success) {
      console.log('❌ Login failed:', loginResponse.data.message);
      return;
    }

    const token = loginResponse.data.token;
    const user = loginResponse.data.user;
    console.log(`✅ Logged in as: ${user.username} (${user.role})`);
    console.log(`   Redirect URL: ${loginResponse.data.redirectTo}\n`);

    // 2. Test fetching all classes
    console.log('2️⃣ Fetching available classes...');
    const classesResponse = await axios.get(`${API_BASE}/classes`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!classesResponse.data.success) {
      console.log('❌ Failed to fetch classes:', classesResponse.data.message);
      return;
    }

    const classes = classesResponse.data.data.classes;
    console.log(`✅ Found ${classes.length} classes available\n`);

    // Display class details
    classes.slice(0, 3).forEach((cls, index) => {
      console.log(`   📚 Class ${index + 1}:`);
      console.log(`      Name: ${cls.name}`);
      console.log(`      Subject: ${cls.subject}`);
      console.log(`      Teacher: ${cls.teacher_full_name || cls.teacher_name}`);
      console.log(`      Enrolled: ${cls.enrolled_students}/${cls.max_students}`);
      console.log(`      Lectures: ${cls.total_lectures}`);
      console.log('');
    });

    // 3. Test class enrollment
    if (classes.length > 0) {
      const testClass = classes[0];
      console.log(`3️⃣ Testing enrollment in class: ${testClass.name}`);
      
      try {
        const enrollResponse = await axios.post(`${API_BASE}/classes/${testClass.id}/enroll`, {}, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (enrollResponse.data.success) {
          console.log('✅ Successfully enrolled in class!');
        } else {
          console.log('⚠️ Enrollment response:', enrollResponse.data.message);
        }
      } catch (enrollError) {
        if (enrollError.response?.status === 400) {
          console.log('⚠️ Already enrolled or class full:', enrollError.response.data.message);
        } else {
          console.log('❌ Enrollment error:', enrollError.response?.data?.message || enrollError.message);
        }
      }
      console.log('');

      // 4. Test getting class details
      console.log(`4️⃣ Getting detailed class information...`);
      try {
        const detailResponse = await axios.get(`${API_BASE}/classes/${testClass.id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (detailResponse.data.success) {
          const classDetails = detailResponse.data.data;
          console.log('✅ Class details retrieved:');
          console.log(`   📚 ${classDetails.name}`);
          console.log(`   👨‍🏫 Teacher: ${classDetails.teacher_full_name}`);
          console.log(`   📧 Contact: ${classDetails.teacher_email}`);
          console.log(`   🎓 Students: ${classDetails.enrolled_students}`);
          console.log(`   📹 Sessions: ${classDetails.total_sessions}`);
          console.log(`   📚 Lectures: ${classDetails.total_lectures}`);
        }
      } catch (detailError) {
        console.log('❌ Failed to get class details:', detailError.response?.data?.message || detailError.message);
      }
    }

    console.log('\n🎉 Class Discovery System Test Complete!');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data?.message || error.message);
  }
}

// Run the test
testClassDiscovery();