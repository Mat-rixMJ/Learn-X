'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { io, Socket } from 'socket.io-client';

interface LiveSession {
  id: string;
  class_id: string;
  teacher_id: string;
  title: string;
  description: string;
  class_name: string;
  subject: string;
  teacher_name?: string;
  max_participants: number;
  current_participants: number;
  status: string;
  room_id: string;
  user_role: string;
  is_teacher: boolean;
  started_at: string;
}

interface Participant {
  userId: string;
  userName: string;
  role: string;
  joinedAt: string;
}

interface ChatMessage {
  id: number;
  user: string;
  message: string;
  time: string;
  role?: string;
}

interface AvailableSession {
  id: string;
  title: string;
  class_name: string;
  subject: string;
  teacher_name: string;
  current_participants: number;
  max_participants: number;
  started_at: string;
  is_joined?: boolean;
}

function LiveClassContent() {
  // Authentication & Session State
  const [currentSession, setCurrentSession] = useState<LiveSession | null>(null);
  const [availableSessions, setAvailableSessions] = useState<AvailableSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [userRole, setUserRole] = useState<string>('');
  const [userName, setUserName] = useState<string>('');
  const [userId, setUserId] = useState<string>('');

  // UI State
  const [activeTab, setActiveTab] = useState<'sessions' | 'live'>('sessions');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [participants, setParticipants] = useState<Participant[]>([]);
  
  // Video streaming state
  const [isConnected, setIsConnected] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(false);
  const [isAudioOn, setIsAudioOn] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);

  // Refs
  const socketRef = useRef<Socket | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  
  const router = useRouter();
  const searchParams = useSearchParams();

  // Check authentication and get user info
  useEffect(() => {
    checkAuth();
  }, []);

  // Debug token on component mount
  useEffect(() => {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    console.log('🔑 Debug - Token in localStorage:', token ? 'EXISTS' : 'MISSING');
    console.log('👤 Debug - User in localStorage:', user ? JSON.parse(user) : 'MISSING');
  }, []);

  // Handle session ID from URL
  useEffect(() => {
    const sessionId = searchParams.get('session');
    if (sessionId && userRole) {
      joinSessionById(sessionId);
    }
  }, [searchParams, userRole]);

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('token');
      const user = localStorage.getItem('user');
      console.log('🔍 Live Class Auth Check - Token exists:', !!token);
      console.log('🔍 Live Class Auth Check - User exists:', !!user);
      
      if (!token) {
        console.log('❌ No token found, redirecting to login');
        alert('Please log in first to access live classes');
        router.push('/login');
        return;
      }

      // Try to get user info from localStorage first
      if (user) {
        const userData = JSON.parse(user);
        console.log('📦 Using cached user data:', userData);
        setUserId(userData.id);
        setUserName(userData.name || userData.username);
        setUserRole(userData.role);
        await fetchActiveSessions();
        return;
      }

      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      console.log('🌐 Making request to:', `${baseUrl}/api/user/profile`);
      
      const response = await fetch(`${baseUrl}/api/user/profile`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('📡 Response status:', response.status);
      const data = await response.json();
      console.log('📊 Response data:', data);
      
      if (data.success) {
        console.log('✅ Auth successful, user role:', data.data.role);
        setUserId(data.data.id);
        setUserName(data.data.name);
        setUserRole(data.data.role);
        await fetchActiveSessions();
      } else {
        console.log('❌ Auth API failed, but checking localStorage fallback');
        // Try fallback with localStorage data
        const user = localStorage.getItem('user');
        if (user) {
          const userData = JSON.parse(user);
          console.log('📦 Using localStorage fallback:', userData);
          setUserId(userData.id);
          setUserName(userData.name || userData.username);
          setUserRole(userData.role);
          await fetchActiveSessions();
        } else {
          console.log('❌ No fallback data, redirecting to login');
          alert('Session expired. Please log in again.');
          router.push('/login');
        }
      }
    } catch (error) {
      console.error('❌ Auth check failed:', error);
      // Try fallback with localStorage data
      const user = localStorage.getItem('user');
      if (user) {
        const userData = JSON.parse(user);
        console.log('📦 Using localStorage fallback after error:', userData);
        setUserId(userData.id);
        setUserName(userData.name || userData.username);
        setUserRole(userData.role);
        await fetchActiveSessions();
      } else {
        console.log('❌ No fallback data after error, redirecting to login');
        alert('Connection error. Please log in again.');
        router.push('/login');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchActiveSessions = async () => {
    try {
      const token = localStorage.getItem('token');
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      
      console.log('🔍 Fetching active sessions from:', `${baseUrl}/api/live/active`);
      
      const response = await fetch(`${baseUrl}/api/live/active`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('📡 Active sessions response status:', response.status);
      const data = await response.json();
      console.log('📊 Active sessions data:', data);
      
      if (data.success) {
        setAvailableSessions(data.data.sessions);
        console.log('✅ Sessions loaded:', data.data.sessions.length);
      }
      setLoading(false);
    } catch (error) {
      console.error('❌ Fetch active sessions error:', error);
      setLoading(false);
    }
  };

  const joinSessionById = async (sessionId: string) => {
    try {
      const token = localStorage.getItem('token');
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      
      const response = await fetch(`${baseUrl}/api/live/join/${sessionId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      if (data.success) {
        setCurrentSession(data.data.session);
        setActiveTab('live');
        initializeWebRTC(data.data.session);
      } else {
        setError(data.message || 'Failed to join session');
      }
    } catch (error) {
      console.error('Join session error:', error);
      setError('Failed to join session');
    }
  };

  const leaveSession = async () => {
    if (!currentSession) return;

    try {
      const token = localStorage.getItem('token');
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      
      await fetch(`${baseUrl}/api/live/leave/${currentSession.id}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      // Cleanup WebRTC
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
        setLocalStream(null);
      }
      
      if (socketRef.current) {
        socketRef.current.disconnect();
        setIsConnected(false);
      }

      setCurrentSession(null);
      setActiveTab('sessions');
      setChatMessages([]);
      setParticipants([]);
      
      // Refresh available sessions
      await fetchActiveSessions();
    } catch (error) {
      console.error('Leave session error:', error);
    }
  };

  const initializeWebRTC = async (session: LiveSession) => {
    try {
      // Initialize socket connection
      socketRef.current = io(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000');
      const socket = socketRef.current;

      socket.on('connect', () => {
        console.log('Connected to signaling server');
        setIsConnected(true);
        socket.emit('join-room', { 
          roomId: session.room_id, 
          userId, 
          userName, 
          role: userRole 
        });
      });

      socket.on('user-joined', (data) => {
        console.log('User joined:', data);
        setParticipants(prev => [...prev.filter(p => p.userId !== data.userId), {
          userId: data.userId,
          userName: data.userName,
          role: data.role,
          joinedAt: new Date().toISOString()
        }]);
      });

      socket.on('user-left', (data) => {
        console.log('User left:', data);
        setParticipants(prev => prev.filter(p => p.userId !== data.userId));
      });

      socket.on('chat-message', (data) => {
        setChatMessages(prev => [...prev, {
          id: Date.now(),
          user: data.userName,
          message: data.message,
          time: new Date().toLocaleTimeString(),
          role: data.role
        }]);
      });

      socket.on('disconnect', () => {
        console.log('Disconnected from signaling server');
        setIsConnected(false);
      });

    } catch (error) {
      console.error('WebRTC initialization error:', error);
    }
  };

  const startVideo = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: true, 
        audio: isAudioOn 
      });
      
      setLocalStream(stream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      setIsVideoOn(true);
    } catch (error) {
      console.error('Error starting video:', error);
    }
  };

  const stopVideo = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach(track => track.stop());
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = null;
      }
    }
    setIsVideoOn(false);
  };

  const toggleAudio = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach(track => {
        track.enabled = !isAudioOn;
      });
    }
    setIsAudioOn(!isAudioOn);
  };

  const sendMessage = () => {
    if (!newMessage.trim() || !socketRef.current) return;

    const messageData = {
      roomId: currentSession?.room_id,
      userId,
      userName,
      role: userRole,
      message: newMessage.trim()
    };

    socketRef.current.emit('chat-message', messageData);
    setNewMessage('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center pt-20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-purple-500 mx-auto mb-6"></div>
          <p className="text-white text-lg">Loading live classes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 pt-20">
      {/* Header */}
      <header className="bg-white/10 backdrop-blur-md border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold text-white flex items-center">
              <svg className="w-8 h-8 text-purple-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Live Classes
            </h1>
            <div className="flex items-center space-x-4">
              <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl px-4 py-2">
                <span className="text-white font-medium">👋 {userName}</span>
                <span className="text-purple-300 ml-2 capitalize">({userRole})</span>
              </div>
              <button
                onClick={() => router.push(userRole === 'teacher' ? '/teacher-dashboard' : '/simple-dashboard')}
                className="px-6 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:from-purple-700 hover:to-pink-700 font-medium shadow-lg transition-all duration-300"
              >
                ← Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="bg-red-500/20 border border-red-400/30 text-red-300 px-4 py-3 rounded-xl mb-6 backdrop-blur-md">
            {error}
          </div>
        )}

        {/* Tab Navigation */}
        <div className="bg-white/10 backdrop-blur-md rounded-xl p-2 mb-8 border border-white/20">
          <div className="flex space-x-2">
            <button
              onClick={() => setActiveTab('sessions')}
              className={`flex-1 py-3 px-4 rounded-lg text-center font-semibold transition-all duration-300 flex items-center justify-center ${
                activeTab === 'sessions'
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg'
                  : 'text-gray-300 hover:bg-white/10 hover:text-white'
              }`}
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              Available Sessions
            </button>
            {currentSession && (
              <button
                onClick={() => setActiveTab('live')}
                className={`flex-1 py-3 px-4 rounded-lg text-center font-semibold transition-all duration-300 flex items-center justify-center ${
                  activeTab === 'live'
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg'
                    : 'text-gray-300 hover:bg-white/10 hover:text-white'
                }`}
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Live Session
              </button>
            )}
          </div>
        </div>

        {/* Sessions Tab */}
        {activeTab === 'sessions' && (
          <div>
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-bold text-white flex items-center">
                <svg className="w-6 h-6 text-purple-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                {userRole === 'teacher' ? 'Your Active Sessions' : 'Join Live Classes'} ({availableSessions.length})
              </h2>
              <button
                onClick={fetchActiveSessions}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl hover:from-blue-700 hover:to-cyan-700 font-semibold shadow-lg transition-all duration-300 flex items-center"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh
              </button>
            </div>

            {availableSessions.length === 0 ? (
              <div className="bg-white/10 backdrop-blur-md p-12 rounded-xl border border-white/20 text-center">
                <div className="w-24 h-24 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg className="w-12 h-12 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-white mb-4">
                  {userRole === 'teacher' ? 'No Active Sessions' : 'No Live Classes Available'}
                </h3>
                <p className="text-gray-300 mb-8 max-w-md mx-auto">
                  {userRole === 'teacher' 
                    ? 'Start a live session from your teacher dashboard to begin teaching students.'
                    : 'Check back later for live classes from your enrolled courses or contact your teachers.'
                  }
                </p>
                {userRole === 'teacher' && (
                  <button
                    onClick={() => router.push('/teacher-dashboard')}
                    className="px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:from-purple-700 hover:to-pink-700 font-semibold shadow-lg text-lg transition-all duration-300"
                  >
                    <svg className="w-6 h-6 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    Go to Teacher Dashboard
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {availableSessions.map((session) => (
                  <div key={session.id} className="bg-white/10 backdrop-blur-md p-6 rounded-xl border border-white/20 hover:bg-white/15 transition-all duration-300 transform hover:scale-105">
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="text-xl font-bold text-white">{session.title}</h3>
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                        <span className="text-sm text-red-400 font-semibold bg-red-500/20 px-2 py-1 rounded-full">LIVE</span>
                      </div>
                    </div>
                    
                    <div className="space-y-3 mb-6">
                      <div className="flex items-center text-gray-300">
                        <svg className="w-4 h-4 mr-2 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                        <span className="text-sm"><strong>Class:</strong> {session.class_name}</span>
                      </div>
                      <div className="flex items-center text-gray-300">
                        <svg className="w-4 h-4 mr-2 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                        <span className="text-sm"><strong>Subject:</strong> {session.subject}</span>
                      </div>
                      {session.teacher_name && (
                        <div className="flex items-center text-gray-300">
                          <svg className="w-4 h-4 mr-2 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          <span className="text-sm"><strong>Teacher:</strong> {session.teacher_name}</span>
                        </div>
                      )}
                      <div className="flex items-center text-gray-300">
                        <svg className="w-4 h-4 mr-2 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                        </svg>
                        <span className="text-sm"><strong>Participants:</strong> {session.current_participants}/{session.max_participants}</span>
                      </div>
                      <div className="flex items-center text-gray-300">
                        <svg className="w-4 h-4 mr-2 text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-sm"><strong>Started:</strong> {new Date(session.started_at).toLocaleTimeString()}</span>
                      </div>
                    </div>
                    
                    <div className="flex space-x-3">
                      {session.is_joined ? (
                        <button
                          onClick={() => joinSessionById(session.id)}
                          className="flex-1 px-4 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl text-sm hover:from-green-700 hover:to-emerald-700 font-semibold transition-all duration-300 flex items-center justify-center"
                        >
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                          Rejoin Session
                        </button>
                      ) : (
                        <button
                          onClick={() => joinSessionById(session.id)}
                          disabled={session.current_participants >= session.max_participants && userRole !== 'teacher'}
                          className={`flex-1 px-4 py-3 text-white rounded-xl text-sm font-semibold transition-all duration-300 flex items-center justify-center ${
                            session.current_participants >= session.max_participants && userRole !== 'teacher'
                              ? 'bg-gray-500/50 cursor-not-allowed border border-gray-400/30'
                              : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-lg'
                          }`}
                        >
                          {session.current_participants >= session.max_participants && userRole !== 'teacher' ? (
                            <>
                              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18 18M5.636 5.636L6 6" />
                              </svg>
                              Session Full
                            </>
                          ) : (
                            <>
                              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                              </svg>
                              Join Session
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Live Session Tab */}
        {activeTab === 'live' && currentSession && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Video Area */}
            <div className="lg:col-span-3 space-y-6">
              {/* Session Info */}
              <div className="bg-white/10 backdrop-blur-md p-6 rounded-xl border border-white/20">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-2xl font-bold text-white">{currentSession.title}</h3>
                    <p className="text-gray-300">{currentSession.class_name} - {currentSession.subject}</p>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                    <span className="text-red-400 font-semibold bg-red-500/20 px-3 py-1 rounded-full">LIVE</span>
                    <span className="text-gray-300 bg-white/10 px-3 py-1 rounded-full">({participants.length} participants)</span>
                  </div>
                </div>
              </div>

              {/* Main Video */}
              <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 overflow-hidden">
                <div className="aspect-video bg-gray-900 relative">
                  <video
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-4 left-4 bg-black/50 text-white px-3 py-1 rounded-full text-sm">
                    {isVideoOn ? '📹' : '📵'} {userName} (You)
                  </div>
                </div>
                
                {/* Video Controls */}
                <div className="p-6 bg-white/5 border-t border-white/10">
                  <div className="flex justify-center space-x-4">
                    <button
                      onClick={isVideoOn ? stopVideo : startVideo}
                      className={`px-6 py-3 rounded-xl font-semibold shadow-lg transition-all duration-300 flex items-center ${
                        isVideoOn
                          ? 'bg-gradient-to-r from-red-600 to-red-700 text-white hover:from-red-700 hover:to-red-800'
                          : 'bg-gradient-to-r from-green-600 to-green-700 text-white hover:from-green-700 hover:to-green-800'
                      }`}
                    >
                      {isVideoOn ? (
                        <>
                          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                          Stop Video
                        </>
                      ) : (
                        <>
                          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                          Start Video
                        </>
                      )}
                    </button>
                    
                    <button
                      onClick={toggleAudio}
                      className={`px-6 py-3 rounded-xl font-semibold shadow-lg transition-all duration-300 flex items-center ${
                        isAudioOn
                          ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800'
                          : 'bg-gradient-to-r from-gray-600 to-gray-700 text-white hover:from-gray-700 hover:to-gray-800'
                      }`}
                    >
                      {isAudioOn ? (
                        <>
                          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                          </svg>
                          Mute
                        </>
                      ) : (
                        <>
                          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" strokeDasharray="2 2" />
                          </svg>
                          Unmute
                        </>
                      )}
                    </button>
                    
                    <button
                      onClick={leaveSession}
                      className="px-6 py-3 bg-gradient-to-r from-red-600 to-pink-600 text-white rounded-xl hover:from-red-700 hover:to-pink-700 font-semibold shadow-lg transition-all duration-300 flex items-center"
                    >
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      Leave Session
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Participants */}
              <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6">
                <h4 className="text-lg font-bold text-white mb-4 flex items-center">
                  <svg className="w-5 h-5 text-purple-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                  </svg>
                  Participants ({participants.length})
                </h4>
                <div className="space-y-3 max-h-48 overflow-y-auto">
                  {participants.map((participant) => (
                    <div key={participant.userId} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/10">
                      <div className="flex items-center space-x-3">
                        <div className="h-10 w-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                          {participant.userName.charAt(0)}
                        </div>
                        <div>
                          <div className="font-medium text-white">{participant.userName}</div>
                          <div className="text-xs text-gray-400 capitalize">{participant.role}</div>
                        </div>
                      </div>
                      {participant.role === 'teacher' && (
                        <div className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded-full border border-yellow-400/30">
                          👑 Teacher
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Chat */}
              <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6 flex flex-col h-96">
                <h4 className="text-lg font-bold text-white mb-4 flex items-center">
                  <svg className="w-5 h-5 text-blue-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  Chat
                </h4>
                
                <div className="flex-1 overflow-y-auto space-y-3 mb-4">
                  {chatMessages.map((message) => (
                    <div key={message.id} className="p-3 bg-white/5 rounded-xl border border-white/10">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-white text-sm flex items-center">
                          {message.role === 'teacher' && (
                            <svg className="w-4 h-4 text-yellow-400 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                            </svg>
                          )}
                          {message.user}
                        </span>
                        <span className="text-xs text-gray-400">{message.time}</span>
                      </div>
                      <p className="text-gray-300 text-sm">{message.message}</p>
                    </div>
                  ))}
                </div>

                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Type a message..."
                    className="flex-1 px-4 py-2 bg-white/5 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-white placeholder-gray-400"
                  />
                  <button
                    onClick={sendMessage}
                    disabled={!newMessage.trim()}
                    className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center space-x-1"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function LiveClass() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center pt-20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-purple-500 mx-auto mb-6"></div>
          <p className="text-white text-lg">Loading live classes...</p>
        </div>
      </div>
    }>
      <LiveClassContent />
    </Suspense>
  );
}
