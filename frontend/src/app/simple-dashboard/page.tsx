'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function SimpleDashboard() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const router = useRouter();

  useEffect(() => {
    // Simple check for user data
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    
    if (!token || !userData) {
      console.log('No auth data found, redirecting to login');
      router.push('/login');
      return;
    }

    try {
      const parsedUser = JSON.parse(userData);
      setUser(parsedUser);
      console.log('User loaded:', parsedUser);
    } catch (error) {
      console.error('Error parsing user data:', error);
      router.push('/login');
      return;
    }

    setLoading(false);
  }, [router]);

  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-purple-500 mx-auto mb-6"></div>
          <p className="text-white text-lg">Loading your dashboard...</p>
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
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-white">
                {getGreeting()}, {user.fullName || user.username}! 👋
              </h1>
              <p className="text-purple-200 mt-1">{formatDate(currentTime)}</p>
            </div>

          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
            <div className="flex items-center">
              <div className="p-3 bg-blue-500/20 rounded-xl">
                <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-purple-200 text-sm">Live Classes</p>
                <p className="text-white text-2xl font-bold">3</p>
              </div>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
            <div className="flex items-center">
              <div className="p-3 bg-green-500/20 rounded-xl">
                <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2M7 4h10M7 4l-2 14h14l-2-14M11 9v4m4-4v4" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-purple-200 text-sm">Recordings</p>
                <p className="text-white text-2xl font-bold">12</p>
              </div>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
            <div className="flex items-center">
              <div className="p-3 bg-purple-500/20 rounded-xl">
                <svg className="w-8 h-8 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-purple-200 text-sm">AI Notes</p>
                <p className="text-white text-2xl font-bold">8</p>
              </div>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
            <div className="flex items-center">
              <div className="p-3 bg-yellow-500/20 rounded-xl">
                <svg className="w-8 h-8 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-purple-200 text-sm">Progress</p>
                <p className="text-white text-2xl font-bold">85%</p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Quick Actions */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center">
              <svg className="w-6 h-6 mr-2 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Quick Actions
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Link href="/live-class" className="group bg-gradient-to-r from-blue-500/20 to-cyan-500/20 hover:from-blue-500/30 hover:to-cyan-500/30 border border-blue-300/20 rounded-xl p-6 transition-all duration-300 hover:scale-105">
                <div className="flex items-center justify-center w-12 h-12 bg-blue-500/30 rounded-xl mb-4 group-hover:bg-blue-500/40 transition-colors duration-300">
                  <svg className="w-6 h-6 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="font-semibold text-white mb-2">Join Live Class</h3>
                <p className="text-purple-200 text-sm">Attend live interactive sessions</p>
              </Link>

              <Link href="/recorded-lectures" className="group bg-gradient-to-r from-green-500/20 to-emerald-500/20 hover:from-green-500/30 hover:to-emerald-500/30 border border-green-300/20 rounded-xl p-6 transition-all duration-300 hover:scale-105">
                <div className="flex items-center justify-center w-12 h-12 bg-green-500/30 rounded-xl mb-4 group-hover:bg-green-500/40 transition-colors duration-300">
                  <svg className="w-6 h-6 text-green-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2M7 4h10M7 4l-2 14h14l-2-14M11 9v4m4-4v4" />
                  </svg>
                </div>
                <h3 className="font-semibold text-white mb-2">Watch Recordings</h3>
                <p className="text-purple-200 text-sm">Access recorded lectures anytime</p>
              </Link>

              <Link href="/ai-notes" className="group bg-gradient-to-r from-purple-500/20 to-pink-500/20 hover:from-purple-500/30 hover:to-pink-500/30 border border-purple-300/20 rounded-xl p-6 transition-all duration-300 hover:scale-105">
                <div className="flex items-center justify-center w-12 h-12 bg-purple-500/30 rounded-xl mb-4 group-hover:bg-purple-500/40 transition-colors duration-300">
                  <svg className="w-6 h-6 text-purple-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="font-semibold text-white mb-2">AI Smart Notes</h3>
                <p className="text-purple-200 text-sm">Auto-generated study materials</p>
              </Link>

              <Link href="/" className="group bg-gradient-to-r from-orange-500/20 to-yellow-500/20 hover:from-orange-500/30 hover:to-yellow-500/30 border border-orange-300/20 rounded-xl p-6 transition-all duration-300 hover:scale-105">
                <div className="flex items-center justify-center w-12 h-12 bg-orange-500/30 rounded-xl mb-4 group-hover:bg-orange-500/40 transition-colors duration-300">
                  <svg className="w-6 h-6 text-orange-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                  </svg>
                </div>
                <h3 className="font-semibold text-white mb-2">Explore Courses</h3>
                <p className="text-purple-200 text-sm">Discover new learning opportunities</p>
              </Link>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center">
              <svg className="w-6 h-6 mr-2 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Recent Activity
            </h2>
            <div className="space-y-4">
              <div className="flex items-center p-4 bg-white/5 rounded-xl border border-white/10">
                <div className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="ml-4 flex-1">
                  <p className="text-white font-medium">Joined Mathematics Live Class</p>
                  <p className="text-purple-200 text-sm">2 hours ago</p>
                </div>
              </div>

              <div className="flex items-center p-4 bg-white/5 rounded-xl border border-white/10">
                <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2M7 4h10M7 4l-2 14h14l-2-14M11 9v4m4-4v4" />
                  </svg>
                </div>
                <div className="ml-4 flex-1">
                  <p className="text-white font-medium">Completed Physics Lecture</p>
                  <p className="text-purple-200 text-sm">Yesterday</p>
                </div>
              </div>

              <div className="flex items-center p-4 bg-white/5 rounded-xl border border-white/10">
                <div className="w-10 h-10 bg-purple-500/20 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div className="ml-4 flex-1">
                  <p className="text-white font-medium">Generated AI Notes for Chemistry</p>
                  <p className="text-purple-200 text-sm">2 days ago</p>
                </div>
              </div>
            </div>
          </div>
        </div>


      </div>
    </div>
  );
}