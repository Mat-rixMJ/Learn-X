'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiService, DashboardData } from '@/utils/api';

export default function TeacherDashboard() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const router = useRouter();

  useEffect(() => {
    // Update time every second
    const timeInterval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timeInterval);
  }, []);

  useEffect(() => {
    const loadTeacherDashboard = async () => {
      try {
        // Check authentication and role
        const token = localStorage.getItem('token');
        const userData = localStorage.getItem('user');
        
        if (!token || !userData) {
          console.log('No auth data found, redirecting to login');
          router.push('/login');
          return;
        }

        const parsedUser = JSON.parse(userData);
        console.log('Parsed user data:', parsedUser);
        
        // Verify teacher role
        if (parsedUser.role !== 'teacher') {
          console.log('Access denied: User role is', parsedUser.role);
          // Redirect based on actual role
          if (parsedUser.role === 'student') {
            router.push('/student');
          } else if (parsedUser.role === 'admin') {
            router.push('/admin-dashboard');
          } else {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            router.push('/login');
          }
          return;
        }
        
        setUser(parsedUser);
        
        // Load dashboard data using API service
        await loadDashboardData();
        
      } catch (error) {
        console.error('Error loading teacher dashboard:', error);
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };

    loadTeacherDashboard();
  }, [router]);

  const loadDashboardData = async () => {
    try {
      setDataLoading(true);
      
      // Get dashboard data
      const dashboardResponse = await apiService.getDashboard();
      if (dashboardResponse.success && dashboardResponse.data) {
        setDashboardData(dashboardResponse.data);
      }

    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setDataLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading teacher dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const stats = dashboardData?.stats || { totalClasses: 0, totalLectures: 0, totalNotes: 0, avgScore: 0 };
  const enrolledClasses = dashboardData?.enrolledClasses || [];
  const recentActivities = dashboardData?.recentActivities || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-lg border-b-4 border-blue-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <h1 className="text-3xl font-bold text-gray-900">
                  👨‍🏫 Teacher Dashboard
                </h1>
              </div>
              <div className="ml-6">
                <p className="text-sm text-gray-500">Welcome back,</p>
                <p className="text-lg font-semibold text-gray-900">{user.username}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm text-gray-500">Current Time</p>
                <p className="text-lg font-semibold text-gray-900">
                  {currentTime.toLocaleTimeString()}
                </p>
              </div>
              
              <div className="flex space-x-2">
                <Link
                  href="/login"
                  onClick={() => {
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                  }}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  Logout
                </Link>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          
          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
            <div className="bg-white overflow-hidden shadow-lg rounded-lg border-l-4 border-blue-500">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="text-2xl">📚</div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Total Classes</dt>
                      <dd className="text-2xl font-bold text-gray-900">{stats.totalClasses}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow-lg rounded-lg border-l-4 border-green-500">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="text-2xl">👥</div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Total Notes</dt>
                      <dd className="text-2xl font-bold text-gray-900">{stats.totalNotes || 0}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow-lg rounded-lg border-l-4 border-red-500">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="text-2xl">🎯</div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Average Score</dt>
                      <dd className="text-2xl font-bold text-gray-900">{stats.avgScore || 0}%</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow-lg rounded-lg border-l-4 border-yellow-500">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="text-2xl">�</div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Activities</dt>
                      <dd className="text-2xl font-bold text-gray-900">{recentActivities.length}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow-lg rounded-lg border-l-4 border-purple-500">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="text-2xl">🎥</div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Total Lectures</dt>
                      <dd className="text-2xl font-bold text-gray-900">{stats.totalLectures}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Link
              href="/create-class"
              className="bg-white p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow border-l-4 border-blue-500 group"
            >
              <div className="flex items-center">
                <div className="text-3xl mr-4">➕</div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600">
                    Create New Class
                  </h3>
                  <p className="text-sm text-gray-500">Set up a new course</p>
                </div>
              </div>
            </Link>

            <Link
              href="/start-live-session"
              className="bg-white p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow border-l-4 border-red-500 group"
            >
              <div className="flex items-center">
                <div className="text-3xl mr-4">🔴</div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 group-hover:text-red-600">
                    Start Live Session
                  </h3>
                  <p className="text-sm text-gray-500">Begin live teaching</p>
                </div>
              </div>
            </Link>

            <Link
              href="/classes"
              className="bg-white p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow border-l-4 border-green-500 group"
            >
              <div className="flex items-center">
                <div className="text-3xl mr-4">📚</div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 group-hover:text-green-600">
                    Manage Classes
                  </h3>
                  <p className="text-sm text-gray-500">View and edit courses</p>
                </div>
              </div>
            </Link>

            <Link
              href="/teacher/stats"
              className="bg-white p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow border-l-4 border-purple-500 group"
            >
              <div className="flex items-center">
                <div className="text-3xl mr-4">📊</div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 group-hover:text-purple-600">
                    View Analytics
                  </h3>
                  <p className="text-sm text-gray-500">Performance insights</p>
                </div>
              </div>
            </Link>
          </div>

          {/* Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* My Classes */}
            <div className="bg-white shadow-lg rounded-lg overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">My Classes</h3>
              </div>
              <div className="p-6">
                {dataLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                    <p className="text-gray-500">Loading classes...</p>
                  </div>
                ) : enrolledClasses.length > 0 ? (
                  <div className="space-y-4">
                    {enrolledClasses.slice(0, 5).map((classItem: any, index: number) => (
                      <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div>
                          <h4 className="font-medium text-gray-900">{classItem.title}</h4>
                          <p className="text-sm text-gray-500">{classItem.description || 'No description'}</p>
                        </div>
                        <span className="text-sm text-blue-600 font-medium">
                          {classItem.max_students || 0} max students
                        </span>
                      </div>
                    ))}
                    <Link 
                      href="/classes" 
                      className="block text-center text-blue-600 hover:text-blue-800 font-medium mt-4"
                    >
                      View All Classes →
                    </Link>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="text-4xl mb-4">📚</div>
                    <p className="text-gray-500 mb-4">No classes yet</p>
                    <Link
                      href="/create-class"
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                    >
                      Create Your First Class
                    </Link>
                  </div>
                )}
              </div>
            </div>

            {/* Recent Activities */}
            <div className="bg-white shadow-lg rounded-lg overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Recent Teaching Activities</h3>
              </div>
              <div className="p-6">
                {dataLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                    <p className="text-gray-500">Loading activities...</p>
                  </div>
                ) : recentActivities.length > 0 ? (
                  <div className="space-y-4">
                    {recentActivities.slice(0, 5).map((activity: any, index: number) => (
                      <div key={index} className="flex items-start space-x-3">
                        <div className="flex-shrink-0">
                          <div className="text-lg">
                            {activity.type === 'class_created' && '➕'}
                            {activity.type === 'lecture_uploaded' && '🎥'}
                            {activity.type === 'live_session' && '🔴'}
                            {activity.type === 'assignment_created' && '📝'}
                            {(!activity.type || !['class_created', 'lecture_uploaded', 'live_session', 'assignment_created'].includes(activity.type)) && '📋'}
                          </div>
                        </div>
                        <div>
                          <p className="text-sm text-gray-900">{activity.description || activity.title}</p>
                          <p className="text-xs text-gray-500">
                            {activity.timestamp ? new Date(activity.timestamp).toLocaleDateString() : 'Recent'}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="text-4xl mb-4">📋</div>
                    <p className="text-gray-500">No recent activities</p>
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}