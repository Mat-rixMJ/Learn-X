'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface TeacherStats {
  totalClasses: number;
  totalStudents: number;
  totalLectures: number;
  recentViews: number;
}

interface UserInfo {
  id: string;
  username: string;
  email: string;
  role: string;
}

export default function TeacherDashboard() {
  const [currentTab, setCurrentTab] = useState<'overview' | 'lectures' | 'classes' | 'analytics'>('overview');
  const [teacherData, setTeacherData] = useState<{
    user: UserInfo;
    stats: TeacherStats;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    checkAuthAndRole();
    fetchTeacherDashboard();
  }, []);

  const checkAuthAndRole = () => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
  };

  const fetchTeacherDashboard = async () => {
    try {
      const token = localStorage.getItem('token');
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      
      // Fetch basic user data first
      const userResponse = await fetch(`${baseUrl}/api/user/profile`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const userData = await userResponse.json();
      
      if (userData.success) {
        // Check if user is actually a teacher
        if (userData.data.role !== 'teacher' && userData.data.role !== 'admin') {
          router.push('/dashboard'); // Redirect non-teachers to student dashboard
          return;
        }

        // Mock stats for now - in real app you'd fetch these from dedicated endpoints
        const mockStats: TeacherStats = {
          totalClasses: 5,
          totalStudents: 42,
          totalLectures: 18,
          recentViews: 156
        };

        setTeacherData({
          user: userData.data,
          stats: mockStats
        });
      } else {
        setError('Failed to load teacher dashboard');
      }
    } catch (err) {
      console.error('Dashboard fetch error:', err);
      setError('Unable to connect to server');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="bg-white/80 backdrop-blur-md p-8 rounded-2xl shadow-lg">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-center">Loading teacher dashboard...</p>
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
            onClick={fetchTeacherDashboard}
            className="px-6 py-2 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 mr-4"
          >
            Try Again
          </button>
          <button 
            onClick={() => router.push('/dashboard')}
            className="px-6 py-2 bg-gray-500 text-white rounded-full hover:bg-gray-600"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md shadow-lg rounded-2xl p-6 m-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">
              👨‍🏫 Teacher Control Panel
            </h1>
            <p className="text-gray-600 mt-2">Welcome back, {teacherData?.user.username}!</p>
          </div>
          <div className="flex items-center space-x-4">
            <Link href="/dashboard">
              <button className="px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-full hover:from-blue-600 hover:to-cyan-600 font-medium shadow-lg transform hover:scale-105 transition-all duration-200">
                👨‍🎓 Student View
              </button>
            </Link>
            <button 
              onClick={handleLogout}
              className="px-6 py-2 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-full hover:from-red-600 hover:to-pink-600 font-medium shadow-lg transform hover:scale-105 transition-all duration-200"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="bg-white/60 backdrop-blur-md shadow-lg rounded-2xl p-2 m-4">
        <div className="flex space-x-2">
          {[
            { id: 'overview', label: '📊 Overview', icon: '📊' },
            { id: 'lectures', label: '🎥 Manage Lectures', icon: '🎥' },
            { id: 'classes', label: '📚 My Classes', icon: '📚' },
            { id: 'analytics', label: '📈 Analytics', icon: '📈' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setCurrentTab(tab.id as any)}
              className={`flex-1 px-6 py-3 rounded-xl font-semibold transition-all duration-200 ${
                currentTab === tab.id
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg transform scale-105'
                  : 'bg-white/50 text-gray-700 hover:bg-white/80 hover:transform hover:scale-102'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-4">
        {/* Overview Tab */}
        {currentTab === 'overview' && (
          <div className="space-y-8">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white/70 backdrop-blur-sm p-6 rounded-3xl shadow-xl hover:shadow-2xl transform hover:-translate-y-2 transition-all duration-300">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm">Total Classes</p>
                    <p className="text-3xl font-bold text-indigo-600">{teacherData?.stats.totalClasses || 0}</p>
                  </div>
                  <div className="text-4xl">📚</div>
                </div>
              </div>
              
              <div className="bg-white/70 backdrop-blur-sm p-6 rounded-3xl shadow-xl hover:shadow-2xl transform hover:-translate-y-2 transition-all duration-300">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm">Total Students</p>
                    <p className="text-3xl font-bold text-green-600">{teacherData?.stats.totalStudents || 0}</p>
                  </div>
                  <div className="text-4xl">👥</div>
                </div>
              </div>
              
              <div className="bg-white/70 backdrop-blur-sm p-6 rounded-3xl shadow-xl hover:shadow-2xl transform hover:-translate-y-2 transition-all duration-300">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm">Recorded Lectures</p>
                    <p className="text-3xl font-bold text-purple-600">{teacherData?.stats.totalLectures || 0}</p>
                  </div>
                  <div className="text-4xl">🎥</div>
                </div>
              </div>
              
              <div className="bg-white/70 backdrop-blur-sm p-6 rounded-3xl shadow-xl hover:shadow-2xl transform hover:-translate-y-2 transition-all duration-300">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm">Recent Views</p>
                    <p className="text-3xl font-bold text-orange-600">{teacherData?.stats.recentViews || 0}</p>
                  </div>
                  <div className="text-4xl">👀</div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white/70 backdrop-blur-sm p-8 rounded-3xl shadow-xl">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">⚡ Quick Actions</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <button
                  onClick={() => setCurrentTab('lectures')}
                  className="p-6 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-2xl hover:from-blue-600 hover:to-cyan-600 transform hover:scale-105 transition-all duration-200 shadow-lg"
                >
                  <div className="text-3xl mb-2">🎥</div>
                  <div className="font-semibold">Add New Lecture</div>
                  <div className="text-sm opacity-90">Upload or link videos</div>
                </button>
                
                <Link href="/live-class">
                  <button className="w-full p-6 bg-gradient-to-r from-green-500 to-teal-500 text-white rounded-2xl hover:from-green-600 hover:to-teal-600 transform hover:scale-105 transition-all duration-200 shadow-lg">
                    <div className="text-3xl mb-2">📺</div>
                    <div className="font-semibold">Start Live Class</div>
                    <div className="text-sm opacity-90">Begin live session</div>
                  </button>
                </Link>
                
                <button
                  onClick={() => setCurrentTab('classes')}
                  className="p-6 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-2xl hover:from-purple-600 hover:to-pink-600 transform hover:scale-105 transition-all duration-200 shadow-lg"
                >
                  <div className="text-3xl mb-2">📚</div>
                  <div className="font-semibold">Manage Classes</div>
                  <div className="text-sm opacity-90">View class details</div>
                </button>
                
                <button
                  onClick={() => setCurrentTab('analytics')}
                  className="p-6 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-2xl hover:from-orange-600 hover:to-red-600 transform hover:scale-105 transition-all duration-200 shadow-lg"
                >
                  <div className="text-3xl mb-2">📈</div>
                  <div className="font-semibold">View Analytics</div>
                  <div className="text-sm opacity-90">Student engagement</div>
                </button>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white/70 backdrop-blur-sm p-8 rounded-3xl shadow-xl">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">📋 Recent Activity</h2>
              <div className="space-y-4">
                <div className="flex items-center p-4 bg-blue-50 rounded-xl">
                  <div className="text-2xl mr-4">🎥</div>
                  <div>
                    <p className="font-semibold text-gray-800">New lecture uploaded</p>
                    <p className="text-sm text-gray-600">Introduction to Machine Learning - 2 hours ago</p>
                  </div>
                </div>
                <div className="flex items-center p-4 bg-green-50 rounded-xl">
                  <div className="text-2xl mr-4">👥</div>
                  <div>
                    <p className="font-semibold text-gray-800">5 new students enrolled</p>
                    <p className="text-sm text-gray-600">Advanced AI Course - 1 day ago</p>
                  </div>
                </div>
                <div className="flex items-center p-4 bg-purple-50 rounded-xl">
                  <div className="text-2xl mr-4">📺</div>
                  <div>
                    <p className="font-semibold text-gray-800">Live class completed</p>
                    <p className="text-sm text-gray-600">Neural Networks Workshop - 2 days ago</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Lectures Tab */}
        {currentTab === 'lectures' && (
          <div className="bg-white/70 backdrop-blur-sm p-8 rounded-3xl shadow-xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">🎥 Lecture Management</h2>
              <Link href="/teacher-dashboard">
                <button className="px-6 py-3 bg-gradient-to-r from-green-500 to-teal-500 text-white rounded-full hover:from-green-600 hover:to-teal-600 font-semibold shadow-lg transform hover:scale-105 transition-all duration-200">
                  📝 Manage All Lectures
                </button>
              </Link>
            </div>
            <p className="text-gray-600 mb-4">
              Upload and manage your lecture recordings. You can add video links, transcripts, and make lectures public or private.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-6 border-2 border-dashed border-gray-300 rounded-xl text-center hover:border-indigo-400 transition-colors">
                <div className="text-4xl mb-4">📹</div>
                <h3 className="font-semibold mb-2">Upload Video</h3>
                <p className="text-sm text-gray-600">Add video recordings of your lectures</p>
              </div>
              <div className="p-6 border-2 border-dashed border-gray-300 rounded-xl text-center hover:border-indigo-400 transition-colors">
                <div className="text-4xl mb-4">📝</div>
                <h3 className="font-semibold mb-2">Add Transcripts</h3>
                <p className="text-sm text-gray-600">Include lecture transcripts and notes</p>
              </div>
              <div className="p-6 border-2 border-dashed border-gray-300 rounded-xl text-center hover:border-indigo-400 transition-colors">
                <div className="text-4xl mb-4">🤖</div>
                <h3 className="font-semibold mb-2">AI Summaries</h3>
                <p className="text-sm text-gray-600">Auto-generate lecture summaries</p>
              </div>
            </div>
          </div>
        )}

        {/* Classes Tab */}
        {currentTab === 'classes' && (
          <div className="bg-white/70 backdrop-blur-sm p-8 rounded-3xl shadow-xl">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">📚 My Classes</h2>
            <p className="text-gray-600 mb-6">Manage your classes, view enrolled students, and class schedules.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Mock class data */}
              {[
                { name: 'Introduction to AI', students: 25, subject: 'Artificial Intelligence' },
                { name: 'Machine Learning Basics', students: 18, subject: 'ML' },
                { name: 'Advanced Neural Networks', students: 12, subject: 'Deep Learning' }
              ].map((classItem, index) => (
                <div key={index} className="p-6 bg-white rounded-2xl shadow-lg hover:shadow-xl transition-shadow">
                  <h3 className="font-bold text-lg mb-2">{classItem.name}</h3>
                  <p className="text-gray-600 mb-4">{classItem.subject}</p>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">{classItem.students} students</span>
                    <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm">
                      View Details
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Analytics Tab */}
        {currentTab === 'analytics' && (
          <div className="bg-white/70 backdrop-blur-sm p-8 rounded-3xl shadow-xl">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">📈 Analytics & Insights</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="p-6 bg-white rounded-2xl shadow-lg">
                <h3 className="font-bold text-lg mb-4">📊 Student Engagement</h3>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-2">
                      <span>Lecture Views</span>
                      <span className="font-semibold">85%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-blue-600 h-2 rounded-full" style={{width: '85%'}}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between mb-2">
                      <span>Assignment Completion</span>
                      <span className="font-semibold">72%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-green-600 h-2 rounded-full" style={{width: '72%'}}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between mb-2">
                      <span>Live Class Attendance</span>
                      <span className="font-semibold">91%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-purple-600 h-2 rounded-full" style={{width: '91%'}}></div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 bg-white rounded-2xl shadow-lg">
                <h3 className="font-bold text-lg mb-4">⏱️ Popular Lecture Times</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span>9:00 AM - 11:00 AM</span>
                    <span className="text-green-600 font-semibold">High</span>
                  </div>
                  <div className="flex justify-between">
                    <span>2:00 PM - 4:00 PM</span>
                    <span className="text-green-600 font-semibold">High</span>
                  </div>
                  <div className="flex justify-between">
                    <span>7:00 PM - 9:00 PM</span>
                    <span className="text-yellow-600 font-semibold">Medium</span>
                  </div>
                  <div className="flex justify-between">
                    <span>11:00 PM - 1:00 AM</span>
                    <span className="text-red-600 font-semibold">Low</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
