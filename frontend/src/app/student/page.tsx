'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiService } from '@/utils/api';
import { BarChart, LineChart, PieChart, DonutChart } from '@/components/Charts';
import NotificationsPanel from '@/components/NotificationsPanel';

export default function StudentDashboard() {
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [markingAttendance, setMarkingAttendance] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    initializeDashboard();
  }, []);

  const initializeDashboard = async () => {
    try {
      // Check authentication
      const token = localStorage.getItem('token');
      const userData = localStorage.getItem('user');
      
      if (!token || !userData) {
        router.push('/login');
        return;
      }

      const parsedUser = JSON.parse(userData);
      if (parsedUser.role !== 'student') {
        router.push('/login');
        return;
      }
      
      setUser(parsedUser);
      
      // Load comprehensive dashboard data
      const result = await apiService.getStudentDashboard();
      if (result.success && result.data) {
        setDashboardData(result.data);
      }
    } catch (error) {
      console.error('Dashboard initialization error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/login');
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg text-white font-medium transform transition-all duration-300 translate-x-full ${
      type === 'success' ? 'bg-green-600' : 'bg-red-600'
    }`;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    // Slide in
    setTimeout(() => notification.classList.remove('translate-x-full'), 100);
    
    // Slide out and remove
    setTimeout(() => {
      notification.classList.add('translate-x-full');
      setTimeout(() => document.body.removeChild(notification), 300);
    }, 3000);
  };

  const markAttendance = async (classId: string) => {
    try {
      setMarkingAttendance(classId);
      const result = await apiService.markStudentAttendance({ classId, status: 'present' });
      if (result.success) {
        showNotification('✅ Attendance marked successfully!', 'success');
        // Refresh dashboard data
        initializeDashboard();
      } else {
        showNotification('❌ Failed to mark attendance: ' + result.message, 'error');
      }
    } catch (error) {
      console.error('Failed to mark attendance:', error);
      showNotification('❌ Failed to mark attendance. Please try again.', 'error');
    } finally {
      setMarkingAttendance(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-blue-600 font-medium">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <div className="text-2xl font-bold text-blue-600">🎓 Learn-X</div>
              <div className="hidden md:block text-gray-500">|</div>
              <div className="hidden md:block">
                <h1 className="text-xl font-semibold text-gray-900">Student Dashboard</h1>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <NotificationsPanel userId={user?.id} />
              <div className="text-right hidden sm:block">
                <p className="text-sm text-gray-600">{getGreeting()}</p>
                <p className="text-lg font-semibold text-gray-900">
                  {user?.full_name || user?.username}
                </p>
              </div>
              <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                {(user?.full_name || user?.username || 'S').charAt(0).toUpperCase()}
              </div>
              <button
                onClick={handleLogout}
                className="text-gray-400 hover:text-red-600 p-2 rounded-lg hover:bg-red-50 transition-colors"
                title="Logout"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            {[
              { id: 'overview', label: '🏠 Overview', icon: '🏠' },
              { id: 'classes', label: '📚 My Classes', icon: '📚' },
              { id: 'live', label: '🔴 Live Sessions', icon: '🔴' },
              { id: 'recordings', label: '📹 Recordings', icon: '📹' },
              { id: 'notes', label: '🤖 AI Notes', icon: '🤖' },
              { id: 'progress', label: '📊 Progress', icon: '📊' },
              { id: 'analytics', label: '📈 Analytics', icon: '📈' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden">{tab.icon}</span>
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Profile & Welcome Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Profile Card */}
              <div className="bg-white rounded-xl shadow-lg p-6">
                <div className="text-center">
                  <div className="relative mx-auto w-24 h-24 mb-4">
                    {dashboardData?.profile?.profile_picture ? (
                      <img 
                        src={dashboardData.profile.profile_picture} 
                        alt="Profile" 
                        className="w-24 h-24 rounded-full object-cover border-4 border-blue-200"
                      />
                    ) : (
                      <div className="w-24 h-24 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                        {(dashboardData?.profile?.full_name || user?.username || 'S').charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="absolute bottom-0 right-0 w-6 h-6 bg-green-400 rounded-full border-2 border-white"></div>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">
                    {dashboardData?.profile?.full_name || user?.full_name || user?.username}
                  </h3>
                  <p className="text-gray-600 mb-2">Student ID: {dashboardData?.profile?.student_id || 'N/A'}</p>
                  <p className="text-sm text-gray-500">{dashboardData?.profile?.academic_year || '2024-2025'}</p>
                  
                  {/* Quick Info */}
                  <div className="mt-4 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Email:</span>
                      <span className="text-gray-900">{dashboardData?.profile?.email}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Phone:</span>
                      <span className="text-gray-900">{dashboardData?.profile?.phone || 'Not set'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Welcome & Today's Summary */}
              <div className="lg:col-span-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl shadow-lg p-6 text-white">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-2xl font-bold mb-2">
                      {getGreeting()}, {dashboardData?.profile?.full_name?.split(' ')[0] || user?.username}! 👋
                    </h2>
                    <p className="text-blue-100 text-lg mb-4">Ready to continue your learning journey?</p>
                    
                    {/* Today's Highlights */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-white/20 rounded-lg p-3 text-center">
                        <div className="text-2xl font-bold">{dashboardData?.stats?.todaysPendingClasses || 0}</div>
                        <div className="text-xs text-blue-100">Classes Today</div>
                      </div>
                      <div className="bg-white/20 rounded-lg p-3 text-center">
                        <div className="text-2xl font-bold">{dashboardData?.stats?.pendingAssignments || 0}</div>
                        <div className="text-xs text-blue-100">Pending Tasks</div>
                      </div>
                      <div className="bg-white/20 rounded-lg p-3 text-center">
                        <div className="text-2xl font-bold">{dashboardData?.stats?.attendancePercentage?.toFixed(0) || 0}%</div>
                        <div className="text-xs text-blue-100">Attendance</div>
                      </div>
                      <div className="bg-white/20 rounded-lg p-3 text-center">
                        <div className="text-2xl font-bold">{dashboardData?.stats?.averageProgress?.toFixed(0) || 0}%</div>
                        <div className="text-xs text-blue-100">Avg Progress</div>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-blue-100">
                      {new Date().toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white rounded-xl shadow-lg p-6 text-center">
                <div className="text-4xl mb-2">📚</div>
                <div className="text-2xl font-bold text-blue-600">
                  {dashboardData?.stats?.totalClasses || 0}
                </div>
                <div className="text-gray-600">Total Classes</div>
              </div>
              
              <div className="bg-white rounded-xl shadow-lg p-6 text-center">
                <div className="text-4xl mb-2">📹</div>
                <div className="text-2xl font-bold text-green-600">
                  {dashboardData?.stats?.totalLectures || 0}
                </div>
                <div className="text-gray-600">Recordings</div>
              </div>
              
              <div className="bg-white rounded-xl shadow-lg p-6 text-center">
                <div className="text-4xl mb-2">🤖</div>
                <div className="text-2xl font-bold text-purple-600">
                  {dashboardData?.stats?.totalNotes || 0}
                </div>
                <div className="text-gray-600">AI Notes</div>
              </div>
              
              <div className="bg-white rounded-xl shadow-lg p-6 text-center">
                <div className="text-4xl mb-2">📈</div>
                <div className="text-2xl font-bold text-orange-600">
                  {dashboardData?.stats?.avgScore || 0}%
                </div>
                <div className="text-gray-600">Progress</div>
              </div>
            </div>

            {/* Today's Classes & Assignments */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Today's Classes */}
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                  🕒 Today's Classes
                  <span className="ml-2 bg-red-100 text-red-600 text-xs px-2 py-1 rounded-full">
                    {dashboardData?.todaysClasses?.filter((c: any) => c.attendance_status === 'pending').length || 0} Pending
                  </span>
                </h3>
                
                {dashboardData?.todaysClasses?.length > 0 ? (
                  <div className="space-y-3">
                    {dashboardData.todaysClasses.map((classItem: any, index: number) => (
                      <div key={index} className={`border-2 rounded-lg p-4 ${
                        classItem.attendance_status === 'present' ? 'border-green-200 bg-green-50' :
                        classItem.attendance_status === 'pending' ? 'border-orange-200 bg-orange-50' :
                        'border-gray-200 bg-gray-50'
                      }`}>
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-900">{classItem.title}</h4>
                            <p className="text-sm text-gray-600">👨‍🏫 {classItem.instructor_name}</p>
                            <p className="text-sm text-gray-500">
                              {classItem.start_time} - {classItem.end_time}
                              {classItem.room_number && ` • Room ${classItem.room_number}`}
                            </p>
                          </div>
                          <div className="text-right">
                            <div className={`text-xs px-2 py-1 rounded-full ${
                              classItem.attendance_status === 'present' ? 'bg-green-100 text-green-700' :
                              classItem.attendance_status === 'pending' ? 'bg-orange-100 text-orange-700' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {classItem.attendance_status === 'present' ? '✓ Attended' :
                               classItem.attendance_status === 'pending' ? '⏳ Pending' : 'Absent'}
                            </div>
                            {classItem.attendance_status === 'pending' && (
                              <button 
                                onClick={() => markAttendance(classItem.id)}
                                disabled={markingAttendance === classItem.id}
                                className={`mt-2 text-xs px-3 py-1 rounded-lg transition-colors ${
                                  markingAttendance === classItem.id 
                                    ? 'bg-gray-400 text-white cursor-wait' 
                                    : 'bg-blue-600 text-white hover:bg-blue-700'
                                }`}
                              >
                                {markingAttendance === classItem.id ? (
                                  <span className="flex items-center">
                                    <svg className="animate-spin -ml-1 mr-1 h-3 w-3 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Marking...
                                  </span>
                                ) : (
                                  'Mark Present'
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <div className="text-4xl mb-2">📅</div>
                    <p>No classes scheduled for today</p>
                  </div>
                )}
              </div>

              {/* Pending Assignments */}
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                  📝 Pending Assignments
                  <span className="ml-2 bg-red-100 text-red-600 text-xs px-2 py-1 rounded-full">
                    {dashboardData?.pendingAssignments?.length || 0}
                  </span>
                </h3>
                
                {dashboardData?.pendingAssignments?.length > 0 ? (
                  <div className="space-y-3">
                    {dashboardData.pendingAssignments.slice(0, 5).map((assignment: any, index: number) => (
                      <div key={index} className={`border-2 rounded-lg p-4 ${
                        assignment.submission_status === 'overdue' ? 'border-red-200 bg-red-50' :
                        new Date(assignment.due_date) <= new Date(Date.now() + 24*60*60*1000) ? 'border-orange-200 bg-orange-50' :
                        'border-gray-200 bg-gray-50'
                      }`}>
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-900">{assignment.title}</h4>
                            <p className="text-sm text-gray-600">{assignment.class_title}</p>
                            <p className="text-sm text-gray-500">
                              Due: {new Date(assignment.due_date).toLocaleDateString('en-US', {
                                month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
                              })}
                            </p>
                          </div>
                          <div className="text-right">
                            <div className={`text-xs px-2 py-1 rounded-full ${
                              assignment.submission_status === 'overdue' ? 'bg-red-100 text-red-700' :
                              assignment.submission_status === 'submitted' ? 'bg-green-100 text-green-700' :
                              'bg-orange-100 text-orange-700'
                            }`}>
                              {assignment.submission_status === 'overdue' ? '🚨 Overdue' :
                               assignment.submission_status === 'submitted' ? '✓ Submitted' :
                               '⏳ Pending'}
                            </div>
                            <p className="text-xs text-gray-500 mt-1">{assignment.total_marks} pts</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <div className="text-4xl mb-2">✅</div>
                    <p>All caught up! No pending assignments</p>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-6">🚀 Quick Actions</h3>
              <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
                <Link
                  href="/live-classes"
                  className="bg-red-50 hover:bg-red-100 border-2 border-red-200 rounded-xl p-4 text-center transition-all hover:scale-105 relative"
                  title="Join active live classes and participate in real-time"
                >
                  <div className="text-3xl mb-2">🔴</div>
                  <div className="font-semibold text-red-700 text-sm">Join Live Class</div>
                  <div className="text-xs text-red-600">Active sessions</div>
                  {dashboardData?.stats?.activeLiveSessions > 0 && (
                    <div className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
                      {dashboardData.stats.activeLiveSessions}
                    </div>
                  )}
                </Link>
                
                <Link
                  href="/recorded-lectures"
                  className="bg-blue-50 hover:bg-blue-100 border-2 border-blue-200 rounded-xl p-4 text-center transition-all hover:scale-105"
                  title="Access all recorded lectures and video content"
                >
                  <div className="text-3xl mb-2">📹</div>
                  <div className="font-semibold text-blue-700 text-sm">Watch Recordings</div>
                  <div className="text-xs text-blue-600">Catch up anytime</div>
                </Link>
                
                <Link
                  href="/ai-notes"
                  className="bg-green-50 hover:bg-green-100 border-2 border-green-200 rounded-xl p-4 text-center transition-all hover:scale-105"
                  title="View AI-generated notes and summaries"
                >
                  <div className="text-3xl mb-2">🤖</div>
                  <div className="font-semibold text-green-700 text-sm">AI Notes</div>
                  <div className="text-xs text-green-600">Smart summaries</div>
                </Link>
                
                <Link
                  href="/classes"
                  className="bg-purple-50 hover:bg-purple-100 border-2 border-purple-200 rounded-xl p-4 text-center transition-all hover:scale-105"
                  title="Browse and enroll in available classes"
                >
                  <div className="text-3xl mb-2">🔍</div>
                  <div className="font-semibold text-purple-700 text-sm">Browse Classes</div>
                  <div className="text-xs text-purple-600">Find new courses</div>
                </Link>

                <Link
                  href="/student-assignments"
                  className="bg-orange-50 hover:bg-orange-100 border-2 border-orange-200 rounded-xl p-4 text-center transition-all hover:scale-105 relative"
                  title="View and submit assignments"
                >
                  <div className="text-3xl mb-2">📝</div>
                  <div className="font-semibold text-orange-700 text-sm">Assignments</div>
                  <div className="text-xs text-orange-600">Submit work</div>
                  {dashboardData?.stats?.pendingAssignments > 0 && (
                    <div className="absolute -top-2 -right-2 bg-orange-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
                      {dashboardData.stats.pendingAssignments}
                    </div>
                  )}
                </Link>

                <button
                  onClick={() => setActiveTab('analytics')}
                  className="bg-indigo-50 hover:bg-indigo-100 border-2 border-indigo-200 rounded-xl p-4 text-center transition-all hover:scale-105 cursor-pointer"
                  title="View detailed performance analytics"
                >
                  <div className="text-3xl mb-2">📊</div>
                  <div className="font-semibold text-indigo-700 text-sm">Analytics</div>
                  <div className="text-xs text-indigo-600">Performance data</div>
                </button>
              </div>
            </div>

            {/* Overview Charts Section */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-2xl font-bold text-gray-900 mb-6">📊 Quick Analytics Overview</h3>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Weekly Progress Line Chart */}
                <LineChart
                  title="📈 Weekly Progress Trend"
                  data={{
                    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                    data: [78, 82, 85, 83, 88, 90, 87],
                    colors: ['#3B82F6']
                  }}
                  height={200}
                />

                {/* Subject Performance Donut Chart */}
                <DonutChart
                  title="🎯 Current Performance"
                  data={{
                    labels: ['Excellent', 'Good', 'Needs Work'],
                    data: [70, 25, 5],
                    colors: ['#10B981', '#F59E0B', '#EF4444']
                  }}
                  centerValue="85%"
                  centerLabel="Overall"
                  size={200}
                />
              </div>
            </div>
          </div>
        )}

        {/* My Classes Tab */}
        {activeTab === 'classes' && (
          <div className="space-y-8">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-gray-900">📚 My Enrolled Classes</h3>
                <div className="text-sm text-gray-600">
                  {dashboardData?.enrolledClasses?.length || 0} classes enrolled
                </div>
              </div>
              
              {dashboardData?.enrolledClasses?.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {dashboardData.enrolledClasses.map((classItem: any, index: number) => (
                    <div key={index} className="border-2 border-gray-200 rounded-xl p-6 hover:border-blue-300 transition-colors">
                      {/* Class Header */}
                      <div className="mb-4">
                        <h4 className="text-lg font-semibold text-gray-900 mb-2">{classItem.title}</h4>
                        <p className="text-sm text-gray-600">👨‍🏫 {classItem.instructor_name}</p>
                      </div>

                      {/* Progress Indicators */}
                      <div className="mb-4 space-y-3">
                        {/* Course Progress */}
                        <div>
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-sm font-medium text-gray-700">Course Progress</span>
                            <span className="text-sm text-gray-600">{classItem.progress_percentage || 0}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all"
                              style={{ width: `${classItem.progress_percentage || 0}%` }}
                            ></div>
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {classItem.completed_lessons || 0} of {classItem.total_lessons || 0} lessons completed
                          </div>
                        </div>

                        {/* Performance Score */}
                        <div>
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-sm font-medium text-gray-700">Performance</span>
                            <span className="text-sm text-gray-600">{classItem.performance_score || 0}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full transition-all ${
                                (classItem.performance_score || 0) >= 80 ? 'bg-green-500' :
                                (classItem.performance_score || 0) >= 60 ? 'bg-yellow-500' :
                                'bg-red-500'
                              }`}
                              style={{ width: `${classItem.performance_score || 0}%` }}
                            ></div>
                          </div>
                        </div>

                        {/* Study Time */}
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Study Time:</span>
                          <span className="text-gray-900 font-medium">
                            {Math.floor((classItem.time_spent || 0) / 60)}h {(classItem.time_spent || 0) % 60}m
                          </span>
                        </div>

                        {/* Last Accessed */}
                        {classItem.last_accessed && (
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Last Accessed:</span>
                            <span className="text-gray-900">
                              {new Date(classItem.last_accessed).toLocaleDateString()}
                            </span>
                          </div>
                        )}
                      </div>
                      
                      {/* Action Buttons */}
                      <div className="grid grid-cols-2 gap-2 mb-4">
                        <Link
                          href={`/classes/${classItem.id}/syllabus`}
                          className="bg-blue-50 hover:bg-blue-100 text-blue-700 text-center py-2 rounded-lg transition-colors text-sm font-medium"
                        >
                          📋 Syllabus
                        </Link>
                        
                        <Link
                          href={`/classes/${classItem.id}/quiz`}
                          className="bg-green-50 hover:bg-green-100 text-green-700 text-center py-2 rounded-lg transition-colors text-sm font-medium"
                        >
                          📝 Quiz
                        </Link>
                        
                        <Link
                          href={`/classes/${classItem.id}/weekly-quiz`}
                          className="bg-orange-50 hover:bg-orange-100 text-orange-700 text-center py-2 rounded-lg transition-colors text-sm font-medium"
                        >
                          📊 Weekly
                        </Link>
                        
                        <Link
                          href={`/classes/${classItem.id}/join`}
                          className="bg-purple-50 hover:bg-purple-100 text-purple-700 text-center py-2 rounded-lg transition-colors text-sm font-medium"
                        >
                          🚀 Join
                        </Link>
                      </div>

                      {/* Grade Badge */}
                      <div className="flex justify-center">
                        <div className={`px-3 py-1 rounded-full text-xs font-bold ${
                          (classItem.performance_score || 0) >= 90 ? 'bg-green-100 text-green-800' :
                          (classItem.performance_score || 0) >= 80 ? 'bg-blue-100 text-blue-800' :
                          (classItem.performance_score || 0) >= 70 ? 'bg-yellow-100 text-yellow-800' :
                          (classItem.performance_score || 0) >= 60 ? 'bg-orange-100 text-orange-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {(classItem.performance_score || 0) >= 90 ? 'A' :
                           (classItem.performance_score || 0) >= 80 ? 'B' :
                           (classItem.performance_score || 0) >= 70 ? 'C' :
                           (classItem.performance_score || 0) >= 60 ? 'D' : 'F'} Grade
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">📚</div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">No Classes Yet</h3>
                  <p className="text-gray-600 mb-6">Start learning by enrolling in your first class</p>
                  <Link
                    href="/classes"
                    className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    🔍 Browse Available Classes
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Live Sessions Tab */}
        {activeTab === 'live' && (
          <div className="space-y-8">
            <div className="bg-white rounded-xl shadow-lg p-8 text-center">
              <div className="text-6xl mb-4">🔴</div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Live Sessions</h3>
              <p className="text-gray-600 mb-8">Join live interactive classes with your instructors and classmates</p>
              <Link
                href="/live-classes"
                className="inline-flex items-center px-8 py-4 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-lg font-semibold"
              >
                🔴 Join Live Classes
              </Link>
            </div>
          </div>
        )}

        {/* Recordings Tab */}
        {activeTab === 'recordings' && (
          <div className="space-y-8">
            <div className="bg-white rounded-xl shadow-lg p-8 text-center">
              <div className="text-6xl mb-4">📹</div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Recorded Lectures</h3>
              <p className="text-gray-600 mb-8">Access all recorded lectures and watch them at your own pace</p>
              <Link
                href="/recorded-lectures"
                className="inline-flex items-center px-8 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-lg font-semibold"
              >
                📹 Watch Recordings
              </Link>
            </div>
          </div>
        )}

        {/* AI Notes Tab */}
        {activeTab === 'notes' && (
          <div className="space-y-8">
            <div className="bg-white rounded-xl shadow-lg p-8 text-center">
              <div className="text-6xl mb-4">🤖</div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">AI Generated Notes</h3>
              <p className="text-gray-600 mb-8">Smart study materials automatically generated from your lectures</p>
              <Link
                href="/ai-notes"
                className="inline-flex items-center px-8 py-4 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-lg font-semibold"
              >
                🤖 View AI Notes
              </Link>
            </div>
          </div>
        )}

        {/* Progress Tab */}
        {activeTab === 'progress' && (
          <div className="space-y-8">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-2xl font-bold text-gray-900 mb-6">📊 Your Learning Progress</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="text-center">
                  <div className="text-6xl mb-4">📈</div>
                  <div className="text-3xl font-bold text-blue-600 mb-2">
                    {dashboardData?.stats?.avgScore || 0}%
                  </div>
                  <div className="text-gray-600">Overall Progress</div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">Classes Completed</span>
                      <span className="text-sm text-gray-600">
                        {Math.floor((dashboardData?.stats?.totalClasses || 0) * 0.6)} / {dashboardData?.stats?.totalClasses || 0}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-blue-600 h-2 rounded-full" style={{ width: '60%' }}></div>
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">Lectures Watched</span>
                      <span className="text-sm text-gray-600">
                        {Math.floor((dashboardData?.stats?.totalLectures || 0) * 0.8)} / {dashboardData?.stats?.totalLectures || 0}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-green-600 h-2 rounded-full" style={{ width: '80%' }}></div>
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">Notes Generated</span>
                      <span className="text-sm text-gray-600">
                        {dashboardData?.stats?.totalNotes || 0}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-purple-600 h-2 rounded-full" style={{ width: '90%' }}></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <div className="space-y-8">
            {/* Overall Progress Summary */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-2xl font-bold text-gray-900 mb-6">📈 Learning Analytics & Growth</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-xl">
                  <div className="text-blue-600 text-2xl mb-2">📈</div>
                  <div className="text-2xl font-bold text-gray-900">{dashboardData?.analytics?.overall_average || 85}%</div>
                  <div className="text-sm text-gray-600">Overall Average</div>
                </div>
                
                <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-xl">
                  <div className="text-green-600 text-2xl mb-2">✅</div>
                  <div className="text-2xl font-bold text-gray-900">{dashboardData?.analytics?.completed_courses || 3}</div>
                  <div className="text-sm text-gray-600">Completed Courses</div>
                </div>
                
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-xl">
                  <div className="text-purple-600 text-2xl mb-2">🎯</div>
                  <div className="text-2xl font-bold text-gray-900">{dashboardData?.analytics?.total_study_hours || 127}</div>
                  <div className="text-sm text-gray-600">Study Hours</div>
                </div>
                
                <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-4 rounded-xl">
                  <div className="text-orange-600 text-2xl mb-2">📚</div>
                  <div className="text-2xl font-bold text-gray-900">{dashboardData?.analytics?.active_courses || 5}</div>
                  <div className="text-sm text-gray-600">Active Courses</div>
                </div>
              </div>

              {/* Subject-wise Progress */}
              <div className="mb-8">
                <h4 className="text-lg font-semibold text-gray-900 mb-4">📖 Subject-wise Progress & Attendance</h4>
                <div className="space-y-4">
                  {(dashboardData?.analytics?.subject_progress || [
                    { subject_name: 'Mathematics', progress_percentage: 78, attendance_percentage: 95, average_score: 82, study_hours: 45 },
                    { subject_name: 'Physics', progress_percentage: 65, attendance_percentage: 88, average_score: 75, study_hours: 32 },
                    { subject_name: 'Chemistry', progress_percentage: 90, attendance_percentage: 92, average_score: 89, study_hours: 38 },
                    { subject_name: 'Computer Science', progress_percentage: 95, attendance_percentage: 98, average_score: 94, study_hours: 52 }
                  ]).map((subject: any, index: number) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-medium text-gray-900">{subject.subject_name}</span>
                        <span className="text-sm text-gray-600">{subject.progress_percentage}%</span>
                      </div>
                      
                      <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
                        <div 
                          className={`h-3 rounded-full transition-all ${
                            subject.progress_percentage >= 80 ? 'bg-green-500' :
                            subject.progress_percentage >= 60 ? 'bg-blue-500' :
                            subject.progress_percentage >= 40 ? 'bg-yellow-500' :
                            'bg-red-500'
                          }`}
                          style={{ width: `${subject.progress_percentage}%` }}
                        ></div>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Attendance:</span>
                          <span className={`ml-1 font-medium ${
                            subject.attendance_percentage >= 90 ? 'text-green-600' :
                            subject.attendance_percentage >= 75 ? 'text-yellow-600' :
                            'text-red-600'
                          }`}>{subject.attendance_percentage}%</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Avg Score:</span>
                          <span className="ml-1 font-medium">{subject.average_score}%</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Study Time:</span>
                          <span className="ml-1 font-medium">{subject.study_hours}h</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Performance Trends with Interactive Charts */}
              <div className="mb-8">
                <h4 className="text-lg font-semibold text-gray-900 mb-6">📈 Performance Trends & Analytics</h4>
                
                {/* Chart Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                  {/* Weekly Study Hours Bar Chart */}
                  <BarChart
                    title="📊 Weekly Study Hours"
                    data={{
                      labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                      data: [65, 55, 82, 50, 74, 30, 44],
                      colors: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#EC4899']
                    }}
                    height={250}
                  />

                  {/* Performance Trend Line Chart */}
                  <LineChart
                    title="📈 Performance Over Time"
                    data={{
                      labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5'],
                      data: [75, 82, 78, 85, 88],
                      colors: ['#3B82F6']
                    }}
                    height={250}
                  />

                  {/* Subject Distribution Pie Chart */}
                  <PieChart
                    title="📚 Study Time Distribution"
                    data={{
                      labels: ['Math', 'Physics', 'Chemistry', 'CS', 'English'],
                      data: [25, 20, 18, 22, 15],
                      colors: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6']
                    }}
                    size={250}
                  />

                  {/* Overall Performance Donut Chart */}
                  <DonutChart
                    title="🎯 Overall Performance"
                    data={{
                      labels: ['Completed', 'In Progress', 'Pending'],
                      data: [85, 10, 5],
                      colors: ['#10B981', '#F59E0B', '#EF4444']
                    }}
                    centerValue="85%"
                    centerLabel="Complete"
                    size={250}
                  />
                </div>

                {/* Additional Analytics */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Learning Streaks */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h5 className="font-medium text-gray-900 mb-4">🔥 Learning Streaks</h5>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Current Streak:</span>
                        <span className="font-bold text-green-600 text-lg">🔥 {dashboardData?.analytics?.current_streak || 7} days</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Longest Streak:</span>
                        <span className="font-bold text-blue-600 text-lg">⭐ {dashboardData?.analytics?.longest_streak || 23} days</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">This Week:</span>
                        <span className="font-bold text-purple-600 text-lg">📚 {dashboardData?.analytics?.week_study_days || 6}/7 days</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Monthly Goal:</span>
                        <span className="font-bold text-orange-600 text-lg">🎯 84/100 hours</span>
                      </div>
                    </div>
                  </div>

                  {/* Weekly Activity Heatmap */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h5 className="font-medium text-gray-900 mb-4">📅 Activity Heatmap</h5>
                    <div className="grid grid-cols-7 gap-1">
                      {Array.from({ length: 35 }, (_, i) => {
                        const intensity = Math.floor(Math.random() * 4);
                        const colors = ['bg-gray-200', 'bg-green-200', 'bg-green-400', 'bg-green-600'];
                        return (
                          <div
                            key={i}
                            className={`w-4 h-4 rounded-sm ${colors[intensity]} hover:scale-110 transition-transform cursor-pointer`}
                            title={`Day ${i + 1}: ${intensity * 2} hours`}
                          />
                        );
                      })}
                    </div>
                    <div className="flex justify-between items-center mt-2 text-xs text-gray-600">
                      <span>Less</span>
                      <div className="flex space-x-1">
                        <div className="w-3 h-3 bg-gray-200 rounded-sm"></div>
                        <div className="w-3 h-3 bg-green-200 rounded-sm"></div>
                        <div className="w-3 h-3 bg-green-400 rounded-sm"></div>
                        <div className="w-3 h-3 bg-green-600 rounded-sm"></div>
                      </div>
                      <span>More</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Growth Recommendations */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-6">🚀 Personalized Growth Recommendations</h3>
              
              <div className="space-y-4">
                {(dashboardData?.recommendations || [
                  {
                    id: 1,
                    title: 'Improve Physics Performance',
                    description: 'Your Physics scores are below average. Consider reviewing fundamental concepts and practicing more problems.',
                    priority: 'high',
                    impact: 'High',
                    effort: 'Medium'
                  },
                  {
                    id: 2,
                    title: 'Maintain Study Streak',
                    description: 'Great job on your 7-day study streak! Keep it up to build lasting learning habits.',
                    priority: 'medium',
                    impact: 'Medium',
                    effort: 'Low'
                  },
                  {
                    id: 3,
                    title: 'Optimize Weekend Study',
                    description: 'Your weekend study hours are lower. Consider scheduling focused study sessions on weekends.',
                    priority: 'low',
                    impact: 'Medium',
                    effort: 'Low'
                  }
                ]).map((recommendation: any, index: number) => (
                  <div key={index} className={`border-l-4 rounded-lg p-4 ${
                    recommendation.priority === 'high' ? 'border-red-500 bg-red-50' :
                    recommendation.priority === 'medium' ? 'border-yellow-500 bg-yellow-50' :
                    'border-green-500 bg-green-50'
                  }`}>
                    <div className="flex items-start">
                      <div className="mr-3 mt-1">
                        {recommendation.priority === 'high' ? '🚨' :
                         recommendation.priority === 'medium' ? '⚠️' : '💡'}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900 mb-1">{recommendation.title}</h4>
                        <p className="text-gray-700 mb-2">{recommendation.description}</p>
                        <div className="flex items-center text-sm text-gray-600">
                          <span>Impact: {recommendation.impact}</span>
                          <span className="mx-2">•</span>
                          <span>Effort: {recommendation.effort}</span>
                        </div>
                      </div>
                      <button 
                        className="ml-4 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                        onClick={() => {
                          alert(`Taking action on: ${recommendation.title}`);
                        }}
                      >
                        Take Action
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Achievement Badges */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-6">🏆 Achievement Badges</h3>
              
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {(dashboardData?.achievements || [
                  { name: 'First Steps', description: 'Completed first course', icon: '🎯', earned: true },
                  { name: 'Study Streak', description: '7 days in a row', icon: '🔥', earned: true },
                  { name: 'High Achiever', description: '90%+ average', icon: '⭐', earned: false },
                  { name: 'Perfect Attendance', description: '100% attendance', icon: '📅', earned: false },
                  { name: 'Night Owl', description: 'Study after 10 PM', icon: '🦉', earned: true },
                  { name: 'Speed Reader', description: 'Fast note completion', icon: '📚', earned: true }
                ]).map((achievement: any, index: number) => (
                  <div key={index} className="text-center">
                    <div className={`text-4xl mb-2 ${achievement.earned ? '' : 'grayscale opacity-50'}`}>
                      {achievement.icon}
                    </div>
                    <div className="text-sm font-medium text-gray-900">{achievement.name}</div>
                    <div className="text-xs text-gray-600">{achievement.description}</div>
                    {achievement.earned && (
                      <div className="text-xs text-green-600 mt-1 font-semibold">Earned!</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}