const axios = require('axios');

const API_BASE = 'http://localhost:5000/api';

const studentCredentials = {
  username: 'student1',
  password: 'password123'
};

async function enrollStudentInTeacherMaryClasses() {
  console.log('📚 Enrolling student1 in teacher_mary classes...\n');

  try {
    // 1. Login as student
    const loginResponse = await axios.post(`${API_BASE}/auth/login`, studentCredentials);
    
    if (!loginResponse.data.success) {
      console.log('❌ Login failed:', loginResponse.data.message);
      return;
    }

    const token = loginResponse.data.token;
    console.log(`✅ Logged in as: ${loginResponse.data.user.username}`);

    // 2. Get all classes
    const classesResponse = await axios.get(`${API_BASE}/classes`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!classesResponse.data.success) {
      console.log('❌ Failed to fetch classes');
      return;
    }

    // 3. Find teacher_mary's classes
    const teacherMaryClasses = classesResponse.data.data.classes.filter(
      cls => cls.teacher_name === 'teacher_mary'
    );

    console.log(`Found ${teacherMaryClasses.length} classes by teacher_mary:`);
    teacherMaryClasses.forEach(cls => console.log(`  - ${cls.name} (${cls.subject})`));

    // 4. Enroll in each class
    for (const cls of teacherMaryClasses) {
      try {
        const enrollResponse = await axios.post(`${API_BASE}/classes/${cls.id}/enroll`, {}, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (enrollResponse.data.success) {
          console.log(`✅ Enrolled in: ${cls.name}`);
        } else {
          console.log(`⚠️ ${cls.name}: ${enrollResponse.data.message}`);
        }
      } catch (error) {
        console.log(`⚠️ ${cls.name}: ${error.response?.data?.message || error.message}`);
      }
    }

    console.log('\n🎉 Enrollment process complete!');

  } catch (error) {
    console.error('❌ Process failed:', error.response?.data?.message || error.message);
  }
}

enrollStudentInTeacherMaryClasses();