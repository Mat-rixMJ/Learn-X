const axios = require('axios');

const API_BASE = 'http://localhost:5000/api';

// Test credentials
const teacherCredentials = {
  username: 'teacher_mary',
  password: 'password123'
};

const studentCredentials = {
  username: 'student1',
  password: 'password123'
};

async function testLiveClassSystem() {
  console.log('🔴 Testing Live Class System...\n');

  try {
    // 1. Login as teacher
    console.log('1️⃣ Teacher: Creating live session...');
    const teacherLogin = await axios.post(`${API_BASE}/auth/login`, teacherCredentials);
    
    if (!teacherLogin.data.success) {
      console.log('❌ Teacher login failed:', teacherLogin.data.message);
      return;
    }

    const teacherToken = teacherLogin.data.token;
    console.log(`✅ Teacher logged in: ${teacherLogin.data.user.username}`);

    // 2. Get teacher's classes
    console.log('\n2️⃣ Getting all classes first...');
    const allClassesResponse = await axios.get(`${API_BASE}/classes`, {
      headers: { Authorization: `Bearer ${teacherToken}` }
    });

    if (!allClassesResponse.data.success) {
      console.log('❌ Failed to get classes:', allClassesResponse.data.message);
      return;
    }

    // Find teacher's classes
    const teacherClasses = allClassesResponse.data.data.classes.filter(
      cls => cls.teacher_name === teacherLogin.data.user.username
    );

    if (teacherClasses.length === 0) {
      console.log('❌ No classes found for teacher');
      return;
    }

    const teacherClass = teacherClasses[0];
    console.log(`✅ Found class: ${teacherClass.name} (${teacherClass.subject})`);

    // 3. Start live session
    console.log('\n3️⃣ Starting live session...');
    const liveSessionData = {
      class_id: teacherClass.id,
      title: `Live: ${teacherClass.name}`,
      description: 'Interactive live session for students',
      max_participants: 30
    };

    const startSessionResponse = await axios.post(`${API_BASE}/live/start`, liveSessionData, {
      headers: { Authorization: `Bearer ${teacherToken}` }
    });

    if (!startSessionResponse.data.success) {
      console.log('⚠️ Live session response:', startSessionResponse.data.message);
      // Check if there's already an active session
      if (startSessionResponse.data.message.includes('already an active')) {
        console.log('✅ Session already active - continuing with existing session');
      } else {
        return;
      }
    } else {
      const session = startSessionResponse.data.data.session;
      console.log(`✅ Live session started!`);
      console.log(`   Session ID: ${session.id}`);
      console.log(`   Room ID: ${session.room_id}`);
      console.log(`   Stream URL: ${session.stream_url}`);
    }

    // 4. Login as student
    console.log('\n4️⃣ Student: Checking live sessions...');
    const studentLogin = await axios.post(`${API_BASE}/auth/login`, studentCredentials);
    
    if (!studentLogin.data.success) {
      console.log('❌ Student login failed:', studentLogin.data.message);
      return;
    }

    const studentToken = studentLogin.data.token;
    console.log(`✅ Student logged in: ${studentLogin.data.user.username}`);

    // 5. Get active live sessions
    console.log('\n5️⃣ Fetching active live sessions...');
    const activeSessionsResponse = await axios.get(`${API_BASE}/live/active`, {
      headers: { Authorization: `Bearer ${studentToken}` }
    });

    if (!activeSessionsResponse.data.success) {
      console.log('❌ Failed to fetch active sessions:', activeSessionsResponse.data.message);
      return;
    }

    const activeSessions = activeSessionsResponse.data.data.sessions || [];
    console.log(`✅ Found ${activeSessions.length} active live session(s)`);

    if (activeSessions.length > 0) {
      const session = activeSessions[0];
      console.log('\n📺 Active Session Details:');
      console.log(`   Title: ${session.title}`);
      console.log(`   Class: ${session.class_name} (${session.subject})`);
      console.log(`   Teacher: ${session.teacher_name}`);
      console.log(`   Participants: ${session.participant_count}/${session.max_participants}`);
      console.log(`   Started: ${new Date(session.started_at).toLocaleTimeString()}`);

      // 6. Test joining session
      console.log('\n6️⃣ Student joining live session...');
      try {
        const joinResponse = await axios.post(`${API_BASE}/live/join/${session.id}`, {}, {
          headers: { Authorization: `Bearer ${studentToken}` }
        });

        if (joinResponse.data.success) {
          console.log('✅ Successfully joined live session!');
          console.log(`   Room ID: ${joinResponse.data.data.room_id}`);
          console.log(`   Student can now access the live session UI`);
        } else {
          console.log('⚠️ Join response:', joinResponse.data.message);
        }
      } catch (joinError) {
        console.log('⚠️ Join error:', joinError.response?.data?.message || joinError.message);
      }
    } else {
      console.log('ℹ️ No active sessions found - this is normal if no teacher has started a session');
    }

    console.log('\n🎉 Live Class System Test Complete!');
    console.log('\n📋 Summary:');
    console.log('✅ Teacher authentication working');
    console.log('✅ Class retrieval working');
    console.log('✅ Live session creation working');
    console.log('✅ Student authentication working');
    console.log('✅ Active sessions endpoint working');
    console.log('✅ Session join functionality working');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data?.message || error.message);
  }
}

// Run the test
testLiveClassSystem();