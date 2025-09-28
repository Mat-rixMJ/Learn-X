'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function TeacherDashboard() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const router = useRouter();

  useEffect(() => {
    // Check for user data and verify teacher role
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    
    if (!token || !userData) {
      console.log('No auth data found, redirecting to login');
      router.push('/login');
      return;
    }

    try {
      const parsedUser = JSON.parse(userData);
      console.log('Parsed user data:', parsedUser);
      
      // Verify teacher role
      if (parsedUser.role !== 'teacher') {
        console.log('User is not a teacher, redirecting to student dashboard');
        router.push('/simple-dashboard');
        return;
      }
      
      setUser(parsedUser);
    } catch (error) {
      console.error('Error parsing user data:', error);
      router.push('/login');
      return;
    }
    
    setLoading(false);
  }, [router]);

  useEffect(() => {
    // Update time every minute
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center pt-20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-purple-500 mx-auto mb-6"></div>
          <p className="text-white text-lg">Loading your teacher dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect
  }

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 pt-20">
      {/* Header Section */}
      <div className="bg-white/10 backdrop-blur-md border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-white mb-2">
                {getGreeting()}, Prof. {user.fullName || user.username}! 👨‍🏫
              </h1>
              <p className="text-gray-300 text-lg">{formatDate(currentTime)}</p>
              <p className="text-purple-300 font-medium">Teacher Dashboard • Ready to inspire minds</p>
            </div>
            <div className="mt-4 lg:mt-0 lg:ml-6">
              <div className="bg-gradient-to-r from-green-500/20 to-blue-500/20 backdrop-blur-sm border border-green-400/30 rounded-xl p-4">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-green-300 font-medium">Ready to Teach</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Teacher Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20 hover:bg-white/15 transition-all duration-300">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-400">Total Classes</p>
                <p className="text-2xl font-bold text-white">12</p>
              </div>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20 hover:bg-white/15 transition-all duration-300">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-400">Active Students</p>
                <p className="text-2xl font-bold text-white">248</p>
              </div>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20 hover:bg-white/15 transition-all duration-300">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-400">Live Sessions</p>
                <p className="text-2xl font-bold text-white">3</p>
              </div>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20 hover:bg-white/15 transition-all duration-300">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-yellow-500/20 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-400">Assignments</p>
                <p className="text-2xl font-bold text-white">18</p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions for Teachers */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white mb-6">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Link href="/create-class" className="group bg-gradient-to-br from-blue-500/20 to-cyan-500/20 backdrop-blur-md rounded-xl p-6 border border-blue-400/30 hover:from-blue-500/30 hover:to-cyan-500/30 transition-all duration-300 transform hover:scale-105">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-blue-500/30 rounded-xl flex items-center justify-center group-hover:bg-blue-500/40 transition-colors">
                  <svg className="w-6 h-6 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-white ml-4">Create New Class</h3>
              </div>
              <p className="text-gray-300">Set up a new class with curriculum and schedule</p>
            </Link>

            <Link href="/start-live-session" className="group bg-gradient-to-br from-green-500/20 to-emerald-500/20 backdrop-blur-md rounded-xl p-6 border border-green-400/30 hover:from-green-500/30 hover:to-emerald-500/30 transition-all duration-300 transform hover:scale-105">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-green-500/30 rounded-xl flex items-center justify-center group-hover:bg-green-500/40 transition-colors">
                  <svg className="w-6 h-6 text-green-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-white ml-4">Start Live Session</h3>
              </div>
              <p className="text-gray-300">Begin a live teaching session with your students</p>
            </Link>

            <Link href="/assignments" className="group bg-gradient-to-br from-purple-500/20 to-pink-500/20 backdrop-blur-md rounded-xl p-6 border border-purple-400/30 hover:from-purple-500/30 hover:to-pink-500/30 transition-all duration-300 transform hover:scale-105">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-purple-500/30 rounded-xl flex items-center justify-center group-hover:bg-purple-500/40 transition-colors">
                  <svg className="w-6 h-6 text-purple-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-white ml-4">Manage Assignments</h3>
              </div>
              <p className="text-gray-300">Create and review student assignments</p>
            </Link>

            <Link href="/analytics" className="group bg-gradient-to-br from-orange-500/20 to-red-500/20 backdrop-blur-md rounded-xl p-6 border border-orange-400/30 hover:from-orange-500/30 hover:to-red-500/30 transition-all duration-300 transform hover:scale-105">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-orange-500/30 rounded-xl flex items-center justify-center group-hover:bg-orange-500/40 transition-colors">
                  <svg className="w-6 h-6 text-orange-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-white ml-4">Student Analytics</h3>
              </div>
              <p className="text-gray-300">View detailed student performance insights</p>
            </Link>

            <Link href="/content-library" className="group bg-gradient-to-br from-teal-500/20 to-cyan-500/20 backdrop-blur-md rounded-xl p-6 border border-teal-400/30 hover:from-teal-500/30 hover:to-cyan-500/30 transition-all duration-300 transform hover:scale-105">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-teal-500/30 rounded-xl flex items-center justify-center group-hover:bg-teal-500/40 transition-colors">
                  <svg className="w-6 h-6 text-teal-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-white ml-4">Content Library</h3>
              </div>
              <p className="text-gray-300">Upload and organize teaching materials</p>
            </Link>

            <Link href="/gradebook" className="group bg-gradient-to-br from-indigo-500/20 to-purple-500/20 backdrop-blur-md rounded-xl p-6 border border-indigo-400/30 hover:from-indigo-500/30 hover:to-purple-500/30 transition-all duration-300 transform hover:scale-105">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-indigo-500/30 rounded-xl flex items-center justify-center group-hover:bg-indigo-500/40 transition-colors">
                  <svg className="w-6 h-6 text-indigo-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-white ml-4">Digital Gradebook</h3>
              </div>
              <p className="text-gray-300">Track and manage student grades</p>
            </Link>
          </div>
        </div>

        {/* Recent Activity & Upcoming Classes */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Activity */}
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <h3 className="text-xl font-bold text-white mb-6 flex items-center">
              <svg className="w-6 h-6 text-purple-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Recent Activity
            </h3>
            <div className="space-y-4">
              <div className="flex items-start space-x-4 p-4 bg-white/5 rounded-xl border border-white/10">
                <div className="w-2 h-2 bg-green-400 rounded-full mt-2 flex-shrink-0"></div>
                <div>
                  <p className="text-white font-medium">Class &quot;Advanced Mathematics&quot; completed</p>
                  <p className="text-gray-400 text-sm">28 students attended • 2 hours ago</p>
                </div>
              </div>
              <div className="flex items-start space-x-4 p-4 bg-white/5 rounded-xl border border-white/10">
                <div className="w-2 h-2 bg-blue-400 rounded-full mt-2 flex-shrink-0"></div>
                <div>
                  <p className="text-white font-medium">New assignment submitted by Priya Sharma</p>
                  <p className="text-gray-400 text-sm">Physics Assignment #3 • 4 hours ago</p>
                </div>
              </div>
              <div className="flex items-start space-x-4 p-4 bg-white/5 rounded-xl border border-white/10">
                <div className="w-2 h-2 bg-yellow-400 rounded-full mt-2 flex-shrink-0"></div>
                <div>
                  <p className="text-white font-medium">Student asked question in Chemistry forum</p>
                  <p className="text-gray-400 text-sm">Rahul Kumar • 6 hours ago</p>
                </div>
              </div>
            </div>
          </div>

          {/* Upcoming Classes */}
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <h3 className="text-xl font-bold text-white mb-6 flex items-center">
              <svg className="w-6 h-6 text-blue-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Upcoming Classes
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-500/10 to-cyan-500/10 rounded-xl border border-blue-400/20">
                <div>
                  <p className="text-white font-medium">Physics - Grade 12</p>
                  <p className="text-gray-300 text-sm">Quantum Mechanics Introduction</p>
                  <p className="text-blue-300 text-sm">Today, 2:00 PM</p>
                </div>
                <button className="px-4 py-2 bg-blue-500/20 text-blue-300 rounded-lg hover:bg-blue-500/30 transition-colors">
                  Join
                </button>
              </div>
              <div className="flex items-center justify-between p-4 bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-xl border border-green-400/20">
                <div>
                  <p className="text-white font-medium">Mathematics - Grade 11</p>
                  <p className="text-gray-300 text-sm">Calculus Applications</p>
                  <p className="text-green-300 text-sm">Tomorrow, 10:00 AM</p>
                </div>
                <button className="px-4 py-2 bg-green-500/20 text-green-300 rounded-lg hover:bg-green-500/30 transition-colors">
                  Prepare
                </button>
              </div>
              <div className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-xl border border-purple-400/20">
                <div>
                  <p className="text-white font-medium">Chemistry - Grade 10</p>
                  <p className="text-gray-300 text-sm">Organic Chemistry Basics</p>
                  <p className="text-purple-300 text-sm">Tomorrow, 3:00 PM</p>
                </div>
                <button className="px-4 py-2 bg-purple-500/20 text-purple-300 rounded-lg hover:bg-purple-500/30 transition-colors">
                  Prepare
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}