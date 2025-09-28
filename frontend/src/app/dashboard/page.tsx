'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authenticatedFetch, validateToken, debugTokenInfo, clearExpiredToken } from '@/utils/auth';

interface DashboardData {
  user: {
    id: string;
    username: string;
    email: string;
    role: string;
  };
  enrolledClasses: Array<{
    id: string;
    title: string;
    description: string;
    instructor_name: string;
    schedule_start: string;
    schedule_end: string;
  }>;
  upcomingClasses: Array<{
    id: string;
    title: string;
    instructor_name: string;
    schedule_start: string;
    schedule_end: string;
  }>;
  notifications: Array<{
    id: string;
    title: string;
    message: string;
    type: string;
    is_read: boolean;
    created_at: string;
  }>;
  stats: {
    totalClasses: number;
    totalLectures: number;
    totalNotes: number;
  };
}

export default function Dashboard() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    // Clear any expired tokens on component mount
    clearExpiredToken();
    fetchDashboardData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    // Redirect teachers to their dedicated teacher dashboard
    if (dashboardData?.user.role === 'teacher') {
      router.push('/teacher-dashboard');
    }
  }, [dashboardData, router]);

  const fetchDashboardData = async () => {
    try {
      // First, validate the token and get debug info
      const token = localStorage.getItem('token');
      if (!token) {
        console.log('No token found, redirecting to login');
        router.push('/login');
        return;
      }

      // Debug token information
      debugTokenInfo(token);
      
      // Validate token before making the request
      const tokenInfo = validateToken(token);
      if (!tokenInfo.valid && tokenInfo.expired) {
        console.log('Token expired, redirecting to login:', tokenInfo.error);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        router.push('/login');
        return;
      }
      
      // For other validation errors, try to proceed with the API call
      if (!tokenInfo.valid) {
        console.warn('Token validation warning (but proceeding):', tokenInfo.error);
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const response = await authenticatedFetch(`${apiUrl}/api/user/dashboard`, {
        method: 'GET'
      });

      const data = await response.json();

      if (data && data.success) {
        setDashboardData(data.data);
      } else {
        setError(data?.message || 'Failed to fetch dashboard data');
      }
    } catch (err) {
      console.error('Dashboard fetch error:', err);
      
      // Handle authentication errors
      if (err instanceof Error && err.message.includes('Authentication failed')) {
        // The authenticatedFetch function will handle the redirect
        return;
      }
      
      setError('Unable to connect to server');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    router.push('/login');
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="bg-white/80 backdrop-blur-md p-8 rounded-2xl shadow-lg">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-center">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="bg-white/80 backdrop-blur-md p-8 rounded-2xl shadow-lg text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <p className="text-red-600 mb-4">{error}</p>
          <button 
            onClick={fetchDashboardData}
            className="px-6 py-2 bg-indigo-600 text-white rounded-full hover:bg-indigo-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100 p-4">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md shadow-lg rounded-2xl p-6 mb-8 border border-white/20">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">LearnX Dashboard</h1>
          <div className="flex items-center space-x-4">
            <span className="text-gray-700 font-medium">👋 Welcome, {dashboardData?.user.username}!</span>
            <button 
              onClick={handleLogout}
              className="px-6 py-2 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-full hover:from-red-600 hover:to-pink-600 font-medium shadow-lg transform hover:scale-105 transition-all duration-200"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-8">
          {/* Upcoming Classes */}
          <div className="bg-white/70 backdrop-blur-sm p-8 rounded-3xl shadow-xl hover:shadow-2xl transform hover:-translate-y-2 transition-all duration-300 border border-white/20">
            <h3 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
              <span className="text-3xl mr-3">📅</span> Upcoming Classes
            </h3>
            <ul className="space-y-3 mb-6">
              {dashboardData?.upcomingClasses.length ? (
                dashboardData.upcomingClasses.slice(0, 3).map((classItem) => (
                  <li key={classItem.id} className="text-gray-600 bg-gray-50 p-3 rounded-xl">
                    <div className="font-medium">{classItem.title}</div>
                    <div className="text-sm text-gray-500">
                      {classItem.instructor_name} • {formatDate(classItem.schedule_start)}
                    </div>
                  </li>
                ))
              ) : (
                <li className="text-gray-500 bg-gray-50 p-3 rounded-xl text-center">No upcoming classes</li>
              )}
            </ul>
            <Link href="/live-class">
              <button className="w-full px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-full hover:from-indigo-700 hover:to-purple-700 font-semibold shadow-lg transform hover:scale-105 transition-all duration-200">
                View All Classes
              </button>
            </Link>
          </div>

          {/* Course List */}
          <div className="bg-white/70 backdrop-blur-sm p-8 rounded-3xl shadow-xl hover:shadow-2xl transform hover:-translate-y-2 transition-all duration-300 border border-white/20">
            <h3 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
              <span className="text-3xl mr-3">📚</span> My Courses ({dashboardData?.stats.totalClasses || 0})
            </h3>
            <ul className="space-y-3 mb-6">
              {dashboardData?.enrolledClasses.length ? (
                dashboardData.enrolledClasses.slice(0, 3).map((classItem) => (
                  <li key={classItem.id} className="text-gray-600 bg-gray-50 p-3 rounded-xl">
                    <div className="font-medium">{classItem.title}</div>
                    <div className="text-sm text-gray-500">by {classItem.instructor_name}</div>
                  </li>
                ))
              ) : (
                <li className="text-gray-500 bg-gray-50 p-3 rounded-xl text-center">No enrolled courses</li>
              )}
            </ul>
            <button className="w-full px-6 py-3 bg-gradient-to-r from-green-500 to-teal-500 text-white rounded-full hover:from-green-600 hover:to-teal-600 font-semibold shadow-lg transform hover:scale-105 transition-all duration-200">
              Browse Courses
            </button>
          </div>

          {/* Quick Actions & Stats */}
          <div className="bg-white/70 backdrop-blur-sm p-8 rounded-3xl shadow-xl hover:shadow-2xl transform hover:-translate-y-2 transition-all duration-300 border border-white/20">
            <h3 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
              <span className="text-3xl mr-3">⚡</span> Quick Actions
            </h3>
            
            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-blue-50 p-3 rounded-xl text-center">
                <div className="text-2xl font-bold text-blue-600">{dashboardData?.stats.totalLectures || 0}</div>
                <div className="text-xs text-blue-500">Lectures</div>
              </div>
              <div className="bg-purple-50 p-3 rounded-xl text-center">
                <div className="text-2xl font-bold text-purple-600">{dashboardData?.stats.totalNotes || 0}</div>
                <div className="text-xs text-purple-500">AI Notes</div>
              </div>
            </div>

            <div className="space-y-4">
              <Link href="/live-class">
                <button className="w-full px-6 py-3 bg-gradient-to-r from-green-500 to-teal-500 text-white rounded-full hover:from-green-600 hover:to-teal-600 font-semibold shadow-lg transform hover:scale-105 transition-all duration-200">
                  Join Live Class
                </button>
              </Link>
              <Link href="/recorded-lectures">
                <button className="w-full px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-full hover:from-blue-600 hover:to-cyan-600 font-semibold shadow-lg transform hover:scale-105 transition-all duration-200">
                  View Lectures
                </button>
              </Link>
              <Link href="/ai-notes">
                <button className="w-full px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-full hover:from-purple-600 hover:to-pink-600 font-semibold shadow-lg transform hover:scale-105 transition-all duration-200">
                  AI Notes
                </button>
              </Link>
              <Link href="/test-python-services">
                <button className="w-full px-6 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-full hover:from-orange-600 hover:to-red-600 font-semibold shadow-lg transform hover:scale-105 transition-all duration-200">
                  🐍 Test Python Services
                </button>
              </Link>
            </div>
          </div>
        </div>

        {/* Notifications */}
        <div className="bg-white/70 backdrop-blur-sm p-8 rounded-3xl shadow-xl border border-white/20">
          <h3 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
            <span className="text-3xl mr-3">🔔</span> Notifications
          </h3>
          <ul className="space-y-4">
            {dashboardData?.notifications.length ? (
              dashboardData.notifications.slice(0, 5).map((notification) => (
                <li 
                  key={notification.id} 
                  className={`p-4 rounded-xl border-l-4 ${
                    notification.type === 'warning' ? 'bg-yellow-50 border-yellow-400' :
                    notification.type === 'error' ? 'bg-red-50 border-red-400' :
                    'bg-blue-50 border-blue-400'
                  } ${!notification.is_read ? 'ring-2 ring-blue-200' : ''}`}
                >
                  <div className="flex justify-between">
                    <div>
                      <div className="font-medium text-gray-800">{notification.title}</div>
                      <div className="text-gray-600 text-sm">{notification.message}</div>
                    </div>
                    <div className="text-xs text-gray-400">
                      {formatDate(notification.created_at)}
                    </div>
                  </div>
                </li>
              ))
            ) : (
              <li className="text-gray-500 bg-gray-50 p-4 rounded-xl text-center">No notifications</li>
            )}
          </ul>
        </div>
      </main>
    </div>
  );
}
