#!/usr/bin/env node

const axios = require('axios');

const API_BASE = 'http://localhost:5000';

async function testStudentDashboard() {
  console.log('🧪 Testing Student Dashboard Integration\n');
  
  try {
    // Step 1: Login as student
    console.log('1️⃣ Logging in as student...');
    const loginResponse = await axios.post(`${API_BASE}/api/auth/login`, {
      username: 'student1',
      password: 'password123'
    });
    
    if (!loginResponse.data.success) {
      throw new Error('Login failed: ' + loginResponse.data.message);
    }
    
    const token = loginResponse.data.token;
    const user = loginResponse.data.user;
    console.log(`✅ Logged in as: ${user.username} (${user.full_name})`);
    
    // Step 2: Fetch dashboard data
    console.log('\n2️⃣ Fetching dashboard data...');
    const dashboardResponse = await axios.get(`${API_BASE}/api/user/dashboard`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (!dashboardResponse.data.success) {
      throw new Error('Dashboard fetch failed: ' + dashboardResponse.data.message);
    }
    
    const dashboardData = dashboardResponse.data.data;
    console.log('✅ Dashboard data fetched successfully');
    
    // Step 3: Display dashboard summary
    console.log('\n📊 DASHBOARD SUMMARY');
    console.log('='.repeat(50));
    console.log(`👤 User: ${dashboardData.user.username} (${dashboardData.user.role})`);
    console.log(`📧 Email: ${dashboardData.user.email}`);
    
    console.log('\n📈 Statistics:');
    console.log(`   🎓 Total Classes: ${dashboardData.stats.totalClasses}`);
    console.log(`   📹 Total Lectures: ${dashboardData.stats.totalLectures}`);
    console.log(`   🤖 Total AI Notes: ${dashboardData.stats.totalNotes}`);
    console.log(`   📊 Average Score: ${dashboardData.stats.avgScore}%`);
    
    console.log('\n📚 Enrolled Classes:');
    if (dashboardData.enrolledClasses.length > 0) {
      dashboardData.enrolledClasses.forEach((classItem, index) => {
        console.log(`   ${index + 1}. ${classItem.title}`);
        console.log(`      👨‍🏫 Instructor: ${classItem.instructor_name}`);
        console.log(`      📅 Scheduled: ${new Date(classItem.schedule_start).toLocaleString()}`);
      });
    } else {
      console.log('   No enrolled classes found');
    }
    
    console.log('\n🔔 Recent Notifications:');
    if (dashboardData.notifications.length > 0) {
      dashboardData.notifications.slice(0, 3).forEach((notification, index) => {
        console.log(`   ${index + 1}. ${notification.title}`);
        console.log(`      📝 ${notification.message}`);
        console.log(`      🕒 ${new Date(notification.created_at).toLocaleString()}`);
      });
    } else {
      console.log('   No notifications found');
    }
    
    console.log('\n📋 Recent Activities:');
    if (dashboardData.recentActivities && dashboardData.recentActivities.length > 0) {
      dashboardData.recentActivities.forEach((activity, index) => {
        console.log(`   ${index + 1}. ${activity.activity_title}`);
        console.log(`      📝 ${activity.activity_description}`);
        console.log(`      🕒 ${new Date(activity.created_at).toLocaleString()}`);
      });
    } else {
      console.log('   No recent activities found');
    }
    
    console.log('\n🎉 Student Dashboard Integration Test PASSED!');
    console.log('\n🌐 Frontend URLs to test:');
    console.log('   • Main Dashboard: http://localhost:3000/dashboard');
    console.log('   • Student Dashboard: http://localhost:3000/student');
    console.log('   • Login: http://localhost:3000/login');
    console.log('\n🔐 Test Credentials:');
    console.log('   Username: student1');
    console.log('   Password: password123');
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data?.message || error.message);
    return false;
  }
  
  return true;
}

// Run the test
testStudentDashboard().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('❌ Test script failed:', error);
  process.exit(1);
});