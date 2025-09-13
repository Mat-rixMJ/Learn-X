'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

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

  const fetchDashboardData = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }

      const apiUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/$/, '');
      
      const response = await fetch(`${apiUrl}/api/user/dashboard`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch dashboard data');
      }

      const result = await response.json();
      setDashboardData(result.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  useEffect(() => {
    // Redirect teachers to their dedicated teacher dashboard
    if (dashboardData?.user.role === 'teacher') {
      router.push('/teacher-dashboard');
    }
  }, [dashboardData, router]);  const handleLogout = () => {
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-2 sm:p-4 lg:p-6">
      {/* Header */}
      <header className="bg-white/95 backdrop-blur-xl shadow-sm rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8 mb-4 sm:mb-6 lg:mb-8 border border-gray-200/50">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-4 sm:space-y-0">
          <div className="flex items-center space-x-3 sm:space-x-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg">
              <span className="text-white text-lg sm:text-xl font-bold">L</span>
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Dashboard</h1>
              <p className="text-gray-600 text-xs sm:text-sm">Welcome back, {dashboardData?.user.username}</p>
            </div>
          </div>
          <div className="flex items-center justify-between sm:justify-end space-x-3 sm:space-x-4">
            <div className="flex items-center space-x-2 bg-gray-50 rounded-full px-3 py-2 sm:px-4">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-gray-700 text-xs sm:text-sm font-medium">Online</span>
            </div>
            <button 
              onClick={handleLogout}
              className="px-6 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full font-medium transition-all duration-200 flex items-center space-x-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span>Sign out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-6">
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 sm:gap-6 mb-6 sm:mb-8">
          {/* Quick Actions - Top Left */}
          <div className="xl:col-span-4 bg-white/95 backdrop-blur-xl rounded-2xl sm:rounded-3xl shadow-sm border border-gray-200/50 p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900">Quick Actions</h3>
              <div className="w-6 h-6 sm:w-8 sm:h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
            </div>
            <div className="space-y-3">
              <Link href="/live-class">
                <button className="w-full flex items-center justify-between p-3 sm:p-4 bg-blue-50 hover:bg-blue-100 rounded-xl sm:rounded-2xl transition-all duration-200 group">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-500 rounded-lg sm:rounded-xl flex items-center justify-center">
                      <svg className="w-4 h-4 sm:w-5 sm:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div className="text-left">
                      <div className="font-medium text-gray-900 text-sm sm:text-base">Join Live Class</div>
                      <div className="text-xs sm:text-sm text-gray-600">Start or join a session</div>
                    </div>
                  </div>
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 group-hover:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </Link>
              
              <Link href="/recorded-lectures">
                <button className="w-full flex items-center justify-between p-3 sm:p-4 bg-gray-50 hover:bg-gray-100 rounded-xl sm:rounded-2xl transition-all duration-200 group">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gray-600 rounded-lg sm:rounded-xl flex items-center justify-center">
                      <svg className="w-4 h-4 sm:w-5 sm:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h8m2-10v6.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 01-.293.707V21a1 1 0 01-1 1H4a1 1 0 01-1-1V3a1 1 0 011-1h16a1 1 0 011 1v6z" />
                      </svg>
                    </div>
                    <div className="text-left">
                      <div className="font-medium text-gray-900 text-sm sm:text-base">View Lectures</div>
                      <div className="text-xs sm:text-sm text-gray-600">Browse recordings</div>
                    </div>
                  </div>
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 group-hover:text-gray-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </Link>
              
              <Link href="/ai-notes">
                <button className="w-full flex items-center justify-between p-3 sm:p-4 bg-purple-50 hover:bg-purple-100 rounded-xl sm:rounded-2xl transition-all duration-200 group">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-purple-500 rounded-lg sm:rounded-xl flex items-center justify-center">
                      <svg className="w-4 h-4 sm:w-5 sm:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                    </div>
                    <div className="text-left">
                      <div className="font-medium text-gray-900 text-sm sm:text-base">AI Notes</div>
                      <div className="text-xs sm:text-sm text-gray-600">Smart study assistance</div>
                    </div>
                  </div>
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 group-hover:text-purple-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </Link>
            </div>
            
            {/* Stats */}
            <div className="mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-gray-200">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <div className="text-xl sm:text-2xl font-bold text-blue-600">{dashboardData?.stats.totalLectures || 0}</div>
                  <div className="text-xs text-gray-600">Lectures</div>
                </div>
                <div className="text-center">
                  <div className="text-xl sm:text-2xl font-bold text-purple-600">{dashboardData?.stats.totalNotes || 0}</div>
                  <div className="text-xs text-gray-600">AI Notes</div>
                </div>
              </div>
            </div>
          </div>

          {/* Upcoming Classes - Top Center */}
          <div className="xl:col-span-4 bg-white/95 backdrop-blur-xl rounded-2xl sm:rounded-3xl shadow-sm border border-gray-200/50 p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900">Upcoming Classes</h3>
              <div className="w-6 h-6 sm:w-8 sm:h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <svg className="w-3 h-3 sm:w-4 sm:h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
            <div className="space-y-3">
              {dashboardData?.upcomingClasses.length ? (
                dashboardData.upcomingClasses.slice(0, 4).map((classItem) => (
                  <div key={classItem.id} className="flex items-center space-x-3 p-3 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-xs sm:text-sm font-medium">{classItem.title.charAt(0)}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 truncate text-sm sm:text-base">{classItem.title}</div>
                      <div className="text-xs sm:text-sm text-gray-600">{classItem.instructor_name}</div>
                      <div className="text-xs text-gray-500">{formatDate(classItem.schedule_start)}</div>
                    </div>
                    <div className="w-5 h-5 sm:w-6 sm:h-6 bg-blue-100 rounded-full flex items-center justify-center">
                      <svg className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-6 sm:py-8 text-gray-500">
                  <svg className="w-10 h-10 sm:w-12 sm:h-12 text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="text-xs sm:text-sm font-medium">No upcoming classes</p>
                  <p className="text-xs">Your schedule is clear</p>
                </div>
              )}
            </div>
            {(dashboardData?.upcomingClasses.length || 0) > 0 && (
              <Link href="/live-class">
                <button className="w-full mt-4 py-2 sm:py-3 text-xs sm:text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors">
                  View all classes →
                </button>
              </Link>
            )}
          </div>

          {/* My Courses - Top Right */}
          <div className="xl:col-span-4 bg-white/95 backdrop-blur-xl rounded-2xl sm:rounded-3xl shadow-sm border border-gray-200/50 p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900">My Courses</h3>
              <div className="flex items-center space-x-2">
                <span className="text-xs sm:text-sm text-gray-600">({dashboardData?.stats.totalClasses || 0})</span>
                <div className="w-6 h-6 sm:w-8 sm:h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
                  <svg className="w-3 h-3 sm:w-4 sm:h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              {dashboardData?.enrolledClasses.length ? (
                dashboardData.enrolledClasses.slice(0, 4).map((classItem) => (
                  <div key={classItem.id} className="flex items-center space-x-3 p-3 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-indigo-400 to-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-xs sm:text-sm font-medium">{classItem.title.charAt(0)}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 truncate">{classItem.title}</div>
                      <div className="text-sm text-gray-600">by {classItem.instructor_name}</div>
                    </div>
                    <div className="w-6 h-6 bg-indigo-100 rounded-full flex items-center justify-center">
                      <svg className="w-3 h-3 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-gray-500">
                  <svg className="w-12 h-12 text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                  <p className="text-sm font-medium">No enrolled courses</p>
                  <p className="text-xs">Start learning today</p>
                </div>
              )}
            </div>
            {(dashboardData?.enrolledClasses.length || 0) === 0 && (
              <button className="w-full mt-4 py-3 text-sm font-medium text-indigo-600 hover:text-indigo-700 transition-colors">
                Browse courses →
              </button>
            )}
          </div>
        </div>

        {/* Notifications */}
        <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-sm border border-gray-200/50 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM7 7h3v3H7z" />
                </svg>
              </div>
              <button className="text-sm text-gray-600 hover:text-gray-800 transition-colors">Mark all read</button>
            </div>
          </div>
          <div className="space-y-3">
            {(dashboardData?.notifications.length || 0) > 0 ? (
              dashboardData?.notifications.slice(0, 5).map((notification) => (
                <div 
                  key={notification.id} 
                  className={`flex items-start space-x-3 p-4 rounded-2xl transition-all duration-200 hover:bg-gray-50 cursor-pointer ${
                    notification.type === 'warning' ? 'bg-amber-50 border-l-4 border-amber-400' :
                    notification.type === 'error' ? 'bg-red-50 border-l-4 border-red-400' :
                    'bg-blue-50 border-l-4 border-blue-400'
                  } ${!notification.is_read ? 'ring-2 ring-blue-100' : ''}`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    notification.type === 'warning' ? 'bg-amber-200' :
                    notification.type === 'error' ? 'bg-red-200' :
                    'bg-blue-200'
                  }`}>
                    {notification.type === 'warning' ? (
                      <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.664-.833-2.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                    ) : notification.type === 'error' ? (
                      <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-medium text-gray-900">{notification.title}</div>
                        <div className="text-gray-600 text-sm mt-1">{notification.message}</div>
                      </div>
                      <div className="text-xs text-gray-500 ml-4 flex-shrink-0">
                        {formatDate(notification.created_at)}
                      </div>
                    </div>
                    {!notification.is_read && (
                      <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                <svg className="w-16 h-16 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 17h5l-5 5v-5zM7 7h3v3H7z" />
                </svg>
                <p className="text-sm font-medium">All caught up!</p>
                <p className="text-xs">No new notifications</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
