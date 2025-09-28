'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiService, type Lecture as ApiLecture } from '@/utils/api';

interface Lecture {
  id: string;
  title: string;
  teacher: string;
  className: string;
  subject: string;
  date: string;
  duration: string;
  description: string;
  transcript: string;
  summary: string;
  downloadUrl: string;
  audioUrl: string;
  slidesUrl: string;
  fileSize: number;
  isPublic: boolean;
}

interface User {
  id: string;
  name: string;
  username: string;
  role: string;
}

export default function RecordedLectures() {
  const [lectures, setLectures] = useState<Lecture[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedLecture, setSelectedLecture] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<string>('');
  const router = useRouter();

  useEffect(() => {
    checkAuthAndLoadData();
  }, []);

  useEffect(() => {
    if (user) {
      fetchLectures();
    }
  }, [searchTerm, user]);

  const checkAuthAndLoadData = async () => {
    try {
      const token = localStorage.getItem('token');
      const userData = localStorage.getItem('user');
      
      console.log('🔍 Lectures Auth Check - Token exists:', !!token);
      console.log('🔍 Lectures Auth Check - User exists:', !!userData);
      
      if (!token) {
        console.log('❌ No token found, redirecting to login');
        alert('Please log in first to access lectures');
        router.push('/login');
        return;
      }

      // Try to get user info from localStorage first
      if (userData) {
        const parsedUser = JSON.parse(userData);
        console.log('📦 Using cached user data:', parsedUser);
        setUser(parsedUser);
        setUserRole(parsedUser.role);
        return;
      }

      // If no cached user data, fetch from API
      console.log('🌐 Fetching user profile from API');
      
      const result = await apiService.getProfile();
      console.log('� Profile result:', result);
      
      if (result.success && result.data) {
        console.log('✅ Auth successful, user role:', result.data.role);
        const userData = {
          id: result.data.id,
          name: result.data.full_name || result.data.username,
          username: result.data.username,
          role: result.data.role
        };
        setUser(userData);
        setUserRole(userData.role);
      } else {
        console.log('❌ Auth API failed, but checking localStorage fallback');
        const cachedUser = localStorage.getItem('user');
        if (cachedUser) {
          const parsedUser = JSON.parse(cachedUser);
          console.log('📦 Using localStorage fallback:', parsedUser);
          setUser(parsedUser);
          setUserRole(parsedUser.role);
        } else {
          console.log('❌ No fallback data, redirecting to login');
          alert('Session expired. Please log in again.');
          router.push('/login');
        }
      }
    } catch (error) {
      console.error('❌ Auth check failed:', error);
      // Try fallback with localStorage data
      const cachedUser = localStorage.getItem('user');
      if (cachedUser) {
        const parsedUser = JSON.parse(cachedUser);
        console.log('📦 Using localStorage fallback after error:', parsedUser);
        setUser(parsedUser);
        setUserRole(parsedUser.role);
      } else {
        console.log('❌ No fallback data after error, redirecting to login');
        alert('Connection error. Please log in again.');
        router.push('/login');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchLectures = async () => {
    try {
      if (!user) {
        return;
      }

      console.log('🎥 Fetching lectures for user role:', userRole);
      
      const result = await apiService.getLectures();
      console.log('📡 Lectures result:', result);

      if (result.success && result.data) {
        // Convert API lectures to our interface format
        const convertedLectures = result.data.map((lecture: ApiLecture) => ({
          id: lecture.id,
          title: lecture.title,
          teacher: user?.name || 'Unknown Teacher',
          className: 'General Class',
          subject: 'General',
          date: lecture.recorded_at || new Date().toISOString(),
          duration: lecture.duration_seconds ? `${Math.round(lecture.duration_seconds / 60)} minutes` : 'Unknown',
          description: lecture.description || 'No description available',
          transcript: 'Transcript not available',
          summary: lecture.description || 'No summary available',
          downloadUrl: lecture.video_url || '#',
          audioUrl: '#',
          slidesUrl: '#',
          fileSize: 100000000,
          isPublic: true
        }));
        
        setLectures(convertedLectures);
        setError('');
        console.log('✅ Lectures loaded:', convertedLectures.length);
      } else {
        console.log('❌ API failed, using mock data');
        setLectures(getMockLectures());
        setError('');
      }
    } catch (err) {
      console.error('❌ Lectures fetch error:', err);
      console.log('📦 Loading demo lectures instead');
      setLectures(getMockLectures());
      setError('');
    }
  };

  const getMockLectures = () => {
    return [
      {
        id: '1',
        title: 'Introduction to React Hooks',
        teacher: user?.name || 'Demo Teacher',
        className: 'Web Development 101',
        subject: 'Computer Science',
        date: new Date().toISOString(),
        duration: '45 minutes',
        description: 'Learn the fundamentals of React Hooks including useState, useEffect, and custom hooks.',
        transcript: 'This is a sample transcript of the React Hooks lecture...',
        summary: 'This lecture covers the basic concepts of React Hooks, demonstrating practical examples and use cases.',
        downloadUrl: '#',
        audioUrl: '#',
        slidesUrl: '#',
        fileSize: 125000000,
        isPublic: true
      },
      {
        id: '2',
        title: 'Advanced JavaScript Concepts',
        teacher: user?.name || 'Demo Teacher',
        className: 'Advanced Programming',
        subject: 'Computer Science',
        date: new Date(Date.now() - 86400000).toISOString(),
        duration: '60 minutes',
        description: 'Deep dive into closures, prototypes, and asynchronous programming in JavaScript.',
        transcript: 'Welcome to Advanced JavaScript. Today we will explore...',
        summary: 'Comprehensive overview of advanced JavaScript concepts with practical examples.',
        downloadUrl: '#',
        audioUrl: '#',
        slidesUrl: '#',
        fileSize: 180000000,
        isPublic: false
      }
    ];
  };

  const handleDownload = async (lectureId: string, title: string) => {
    try {
      const token = localStorage.getItem('token');
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      
      // Check if this is a mock lecture
      if (lectureId === '1' || lectureId === '2') {
        alert(`Demo download for: ${title}\n\nIn a real application, this would download the lecture video file.`);
        return;
      }
      
      const response = await fetch(`${baseUrl}/api/lectures/${lectureId}/download`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (data.success && data.data.downloadUrl) {
        // Create a temporary link and trigger download
        const link = document.createElement('a');
        link.href = data.data.downloadUrl;
        link.download = `${title}.mp4`;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        alert(data.message || 'Download not available for this demo lecture');
      }
    } catch (error) {
      console.error('Download error:', error);
      alert('This is a demo lecture. Download functionality will be available with real lecture content.');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes) return 'Unknown size';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const filteredLectures = lectures.filter(lecture =>
    lecture.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lecture.teacher.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (lecture.className && lecture.className.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center pt-20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-purple-500 mx-auto mb-6"></div>
          <p className="text-white text-lg">Loading lectures...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center pt-20">
        <div className="bg-white/10 backdrop-blur-md p-8 rounded-xl border border-white/20 text-center max-w-md">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-white mb-4">Connection Error</h3>
          <p className="text-gray-300 mb-6">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:from-purple-700 hover:to-pink-700 font-semibold transition-all duration-300"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 pt-20">
      {/* Header */}
      <header className="bg-white/10 backdrop-blur-md border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
            <div className="flex items-center">
              <h1 className="text-3xl font-bold text-white flex items-center">
                <svg className="w-8 h-8 text-purple-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Recorded Lectures
              </h1>
              {user && (
                <div className="ml-6 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl px-4 py-2">
                  <span className="text-white font-medium">👋 {user.name}</span>
                  <span className="text-purple-300 ml-2 capitalize">({userRole})</span>
                </div>
              )}
            </div>
            <div className="flex items-center space-x-4">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search lectures, teachers, or classes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="px-4 py-2 pl-10 bg-white/5 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-white placeholder-gray-400 w-80"
                />
                <svg className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <button
                onClick={() => router.push(userRole === 'teacher' ? '/teacher-dashboard' : '/student')}
                className="px-6 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:from-purple-700 hover:to-pink-700 font-medium shadow-lg transition-all duration-300"
              >
                ← Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {lectures.length > 0 && lectures[0]?.id === '1' && (
          <div className="bg-blue-500/20 border border-blue-400/30 text-blue-300 px-4 py-3 rounded-xl mb-6 backdrop-blur-md">
            <div className="flex items-center">
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <span className="font-medium">Demo Mode: Showing sample lectures. Connect to your backend to see real lecture data.</span>
            </div>
          </div>
        )}
        
        {filteredLectures.length === 0 ? (
          <div className="bg-white/10 backdrop-blur-md p-12 rounded-xl border border-white/20 text-center">
            <div className="w-24 h-24 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-12 h-12 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-white mb-4">
              {searchTerm ? 'No Lectures Found' : 'No Lectures Available'}
            </h2>
            <p className="text-gray-300 mb-8 max-w-md mx-auto">
              {searchTerm 
                ? `No lectures match your search "${searchTerm}". Try different keywords or clear your search.`
                : userRole === 'teacher' 
                  ? "You haven't recorded any lectures yet. Start a live session and record it to create your first lecture."
                  : "No recorded lectures are available from your enrolled courses yet. Check back later or contact your teachers."
              }
            </p>
            {searchTerm ? (
              <button
                onClick={() => setSearchTerm('')}
                className="px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:from-purple-700 hover:to-pink-700 font-semibold shadow-lg text-lg transition-all duration-300"
              >
                Clear Search
              </button>
            ) : userRole === 'teacher' ? (
              <button
                onClick={() => router.push('/live-class')}
                className="px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:from-purple-700 hover:to-pink-700 font-semibold shadow-lg text-lg transition-all duration-300"
              >
                <svg className="w-6 h-6 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Start Live Session
              </button>
            ) : null}
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            {/* Lectures List */}
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
                <svg className="w-6 h-6 text-purple-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                Available Lectures ({filteredLectures.length})
              </h2>
              {filteredLectures.map((lecture) => (
                <div
                  key={lecture.id}
                  className={`bg-white/10 backdrop-blur-md p-6 rounded-xl border transition-all duration-300 cursor-pointer transform hover:scale-105 ${
                    selectedLecture === lecture.id 
                      ? 'border-purple-500 ring-2 ring-purple-500/20 bg-white/15' 
                      : 'border-white/20 hover:border-white/40 hover:bg-white/15'
                  }`}
                  onClick={() => setSelectedLecture(lecture.id)}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-white mb-3">{lecture.title}</h3>
                      <div className="grid grid-cols-2 gap-3 text-sm text-gray-300 mb-3">
                        <div className="flex items-center">
                          <svg className="w-4 h-4 text-blue-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          {lecture.teacher}
                        </div>
                        {lecture.className && (
                          <div className="flex items-center">
                            <svg className="w-4 h-4 text-green-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                            </svg>
                            {lecture.className}
                          </div>
                        )}
                        <div className="flex items-center">
                          <svg className="w-4 h-4 text-purple-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          {formatDate(lecture.date)}
                        </div>
                        <div className="flex items-center">
                          <svg className="w-4 h-4 text-pink-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {lecture.duration}
                        </div>
                      </div>
                      {lecture.fileSize && (
                        <div className="flex items-center text-xs text-gray-400">
                          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                          </svg>
                          {formatFileSize(lecture.fileSize)}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col space-y-2">
                      {lecture.isPublic && (
                        <span className="px-3 py-1 bg-green-500/20 text-green-400 text-xs rounded-full border border-green-400/30">
                          Public
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="text-gray-300 text-sm mb-4 line-clamp-2">{lecture.description}</p>
                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownload(lecture.id, lecture.title);
                      }}
                      className="px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl text-sm hover:from-blue-700 hover:to-cyan-700 transition-all duration-300 flex items-center space-x-2 font-medium"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <span>Download</span>
                    </button>
                    {lecture.audioUrl && (
                      <button className="px-4 py-2 bg-gradient-to-r from-green-600 to-teal-600 text-white rounded-xl text-sm hover:from-green-700 hover:to-teal-700 transition-all duration-300 flex items-center space-x-2 font-medium">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M9 12a3 3 0 106 0v-5a3 3 0 00-6 0v5z" />
                        </svg>
                        <span>Audio</span>
                      </button>
                    )}
                    {lecture.slidesUrl && (
                      <button className="px-4 py-2 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-xl text-sm hover:from-orange-700 hover:to-red-700 transition-all duration-300 flex items-center space-x-2 font-medium">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                        <span>Slides</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Lecture Details */}
            <div className="space-y-6">
              {selectedLecture ? (
                (() => {
                  const lecture = filteredLectures.find(l => l.id === selectedLecture);
                  return lecture ? (
                    <>
                      <div className="bg-white/10 backdrop-blur-md p-6 rounded-xl border border-white/20">
                        <h2 className="text-2xl font-bold text-white mb-4 flex items-center">
                          <svg className="w-6 h-6 text-purple-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          Lecture Details
                        </h2>
                        <h3 className="text-xl font-semibold text-purple-300 mb-4">{lecture.title}</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm mb-4">
                          <div className="bg-white/5 p-3 rounded-xl border border-white/10">
                            <span className="text-gray-400 text-xs">Teacher</span>
                            <p className="text-white font-medium">{lecture.teacher}</p>
                          </div>
                          <div className="bg-white/5 p-3 rounded-xl border border-white/10">
                            <span className="text-gray-400 text-xs">Date</span>
                            <p className="text-white font-medium">{formatDate(lecture.date)}</p>
                          </div>
                          <div className="bg-white/5 p-3 rounded-xl border border-white/10">
                            <span className="text-gray-400 text-xs">Duration</span>
                            <p className="text-white font-medium">{lecture.duration}</p>
                          </div>
                          {lecture.className && (
                            <div className="bg-white/5 p-3 rounded-xl border border-white/10">
                              <span className="text-gray-400 text-xs">Class</span>
                              <p className="text-white font-medium">{lecture.className}</p>
                            </div>
                          )}
                        </div>
                        <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                          <span className="text-gray-400 text-xs">Description</span>
                          <p className="text-gray-300 mt-1">{lecture.description}</p>
                        </div>
                      </div>

                      {lecture.summary && (
                        <div className="bg-white/10 backdrop-blur-md p-6 rounded-xl border border-white/20">
                          <h2 className="text-2xl font-bold text-white mb-4 flex items-center">
                            <svg className="w-6 h-6 text-blue-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                            </svg>
                            AI Summary
                          </h2>
                          <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                            <p className="text-gray-300 leading-relaxed">{lecture.summary}</p>
                          </div>
                        </div>
                      )}

                      {lecture.transcript && (
                        <div className="bg-white/10 backdrop-blur-md p-6 rounded-xl border border-white/20">
                          <h2 className="text-2xl font-bold text-white mb-4 flex items-center">
                            <svg className="w-6 h-6 text-green-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            Transcript
                          </h2>
                          <div className="bg-white/5 p-4 rounded-xl border border-white/10 max-h-96 overflow-y-auto">
                            <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">
                              {lecture.transcript}
                            </p>
                          </div>
                        </div>
                      )}
                    </>
                  ) : null;
                })()
              ) : (
                <div className="bg-white/10 backdrop-blur-md p-12 rounded-xl border border-white/20 text-center">
                  <div className="w-24 h-24 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                    <svg className="w-12 h-12 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                    </svg>
                  </div>
                  <h2 className="text-2xl font-bold text-white mb-4">Select a Lecture</h2>
                  <p className="text-gray-300">
                    Click on any lecture from the list to view its details, transcript, and AI summary.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
