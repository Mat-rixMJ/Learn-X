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
  const [sidebarTab, setSidebarTab] = useState<'people' | 'chat' | null>('people');
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
      if (!token) {
        router.push('/login');
        return;
      }

      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const response = await fetch(`${baseUrl}/api/user/profile`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 429) {
          setError('Too many requests from this IP, please try again later.');
          setLoading(false);
          return;
        }
        if (response.status === 401) {
          router.push('/login');
          return;
        }
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      if (data.success) {
        setUserId(data.data.id);
        setUserName(data.data.name);
        setUserRole(data.data.role);
        await fetchActiveSessions();
      } else {
        router.push('/login');
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      if (!(error instanceof Error) || !error.message.includes('Too many requests')) {
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
      
      const response = await fetch(`${baseUrl}/api/live/active`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 429) {
          setError('Too many requests from this IP, please try again later.');
          return;
        }
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      if (data.success) {
        setAvailableSessions(data.data.sessions);
      }
    } catch (error) {
      console.error('Fetch active sessions error:', error);
      if (!(error instanceof Error) || !error.message.includes('Too many requests')) {
        setError('Failed to load sessions. Please try again.');
      }
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

      if (!response.ok) {
        if (response.status === 429) {
          setError('Too many requests from this IP, please try again later.');
          return;
        }
        throw new Error(`HTTP ${response.status}`);
      }

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
      if (!(error instanceof Error) || !error.message.includes('Too many requests')) {
        setError('Failed to join session. Please try again.');
      }
    }
  };

  const leaveSession = async () => {
    if (!currentSession) return;

    try {
      const token = localStorage.getItem('token');
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      
      const response = await fetch(`${baseUrl}/api/live/leave/${currentSession.id}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok && response.status === 429) {
        setError('Too many requests from this IP, please try again later.');
        return;
      }

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
      if (!(error instanceof Error) || !error.message.includes('Too many requests')) {
        setError('Failed to leave session. Please try again.');
      }
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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center p-4">
        <div className="bg-white/95 backdrop-blur-xl p-6 sm:p-8 rounded-2xl sm:rounded-3xl shadow-sm border border-gray-200/50">
          <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-center font-medium text-sm sm:text-base">Loading live classes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <header className="bg-white/95 backdrop-blur-xl shadow-sm rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8 m-2 sm:m-4 border border-gray-200/50">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-4 sm:space-y-0">
          <div className="flex items-center space-x-3 sm:space-x-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Live Classes</h1>
              <p className="text-gray-600 text-sm">Join or start a class session</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            {userName ? (
              <>
                <div className="hidden md:flex items-center space-x-3 bg-gray-50 rounded-full px-4 py-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-medium">{userName.charAt(0).toUpperCase()}</span>
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-medium text-gray-900">{userName}</div>
                    <div className="text-xs text-gray-600 capitalize">{userRole}</div>
                  </div>
                </div>
                <button
                  onClick={() => router.push('/dashboard')}
                  className="px-6 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full font-medium transition-all duration-200 flex items-center space-x-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  <span>Dashboard</span>
                </button>
                <button
                  onClick={() => {
                    localStorage.removeItem('token');
                    router.push('/login');
                  }}
                  className="px-6 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full font-medium transition-all duration-200 flex items-center space-x-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  <span>Sign out</span>
                </button>
              </>
            ) : null}
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl mb-4 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <svg className="w-5 h-5 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{error}</span>
            </div>
            {error.includes('Too many requests') && (
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => {
                    setError('');
                    fetchActiveSessions();
                  }}
                  className="px-3 py-1 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg text-sm font-medium transition-colors duration-200 flex items-center space-x-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span>Retry</span>
                </button>
                <button
                  onClick={() => setError('')}
                  className="p-1 hover:bg-red-200 rounded text-red-500 transition-colors duration-200"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}
            {!error.includes('Too many requests') && (
              <button
                onClick={() => setError('')}
                className="p-1 hover:bg-red-200 rounded text-red-500 transition-colors duration-200"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        )}

        {/* Tab Navigation */}
        <div className="bg-white/95 backdrop-blur-xl rounded-3xl p-2 mb-6 shadow-sm border border-gray-200/50">
          <div className="flex space-x-2">
            <button
              onClick={() => setActiveTab('sessions')}
              className={`flex-1 py-3 px-6 rounded-2xl text-center font-medium transition-all duration-200 ${
                activeTab === 'sessions'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              📋 Available Sessions
            </button>
            {currentSession && (
              <button
                onClick={() => setActiveTab('live')}
                className={`flex-1 py-3 px-6 rounded-2xl text-center font-medium transition-all duration-200 ${
                  activeTab === 'live'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                🎥 Live Session
              </button>
            )}
          </div>
        </div>

        {/* Sessions Tab */}
        {activeTab === 'sessions' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-900">
                {userRole === 'teacher' ? 'Your Active Sessions' : 'Join Live Classes'} 
                <span className="ml-2 text-sm font-normal text-gray-600">({availableSessions.length})</span>
              </h2>
              <button
                onClick={fetchActiveSessions}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-2xl font-medium transition-all duration-200 flex items-center space-x-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>Refresh</span>
              </button>
            </div>

            {availableSessions.length === 0 ? (
              <div className="bg-white/95 backdrop-blur-xl p-12 rounded-3xl shadow-sm border border-gray-200/50 text-center">
                <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {userRole === 'teacher' ? 'No Active Sessions' : 'No Live Classes Available'}
                </h3>
                <p className="text-gray-600 mb-6">
                  {userRole === 'teacher' 
                    ? 'Start a live session from your teacher dashboard to begin teaching.'
                    : 'Check back later for live classes from your enrolled courses.'
                  }
                </p>
                {userRole === 'teacher' && (
                  <button
                    onClick={() => router.push('/teacher-dashboard')}
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-medium transition-all duration-200"
                  >
                    Go to Teacher Dashboard →
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {availableSessions.map((session) => (
                  <div key={session.id} className="bg-white/95 backdrop-blur-xl p-6 rounded-3xl shadow-sm border border-gray-200/50 hover:shadow-md transition-all duration-300">
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="text-lg font-semibold text-gray-900">{session.title}</h3>
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                        <span className="text-xs font-medium text-red-600 uppercase tracking-wide">Live</span>
                      </div>
                    </div>
                    
                    <div className="space-y-2 text-sm text-gray-600 mb-6">
                      <div className="flex items-center space-x-2">
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                        <span>{session.class_name}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                        </svg>
                        <span>{session.subject}</span>
                      </div>
                      {session.teacher_name && (
                        <div className="flex items-center space-x-2">
                          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          <span>{session.teacher_name}</span>
                        </div>
                      )}
                      <div className="flex items-center space-x-2">
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        <span>{session.current_participants}/{session.max_participants} participants</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>Started {new Date(session.started_at).toLocaleTimeString()}</span>
                      </div>
                    </div>
                    
                    <div className="flex space-x-2">
                      {session.is_joined ? (
                        <button
                          onClick={() => joinSessionById(session.id)}
                          className="flex-1 px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-2xl text-sm font-medium transition-all duration-200 flex items-center justify-center space-x-2"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                          <span>Rejoin Session</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => joinSessionById(session.id)}
                          disabled={session.current_participants >= session.max_participants && userRole !== 'teacher'}
                          className={`flex-1 px-4 py-3 text-white rounded-2xl text-sm font-medium transition-all duration-200 flex items-center justify-center space-x-2 ${
                            session.current_participants >= session.max_participants && userRole !== 'teacher'
                              ? 'bg-gray-400 cursor-not-allowed'
                              : 'bg-blue-600 hover:bg-blue-700'
                          }`}
                        >
                          {session.current_participants >= session.max_participants && userRole !== 'teacher' ? (
                            <>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636" />
                              </svg>
                              <span>Session Full</span>
                            </>
                          ) : (
                            <>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                              <span>Join Session</span>
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
          <div className="h-screen bg-black flex flex-col overflow-hidden">
            {/* Google Meet Style Header */}
            <div className="bg-black px-4 py-2 flex items-center justify-between text-white">
              <div className="flex items-center space-x-3">
                <div className="text-2xl font-medium">Google Classroom</div>
                <div className="text-sm text-gray-300 bg-gray-800 px-2 py-1 rounded">
                  {currentSession.title}
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                <div className="text-sm text-gray-300">
                  {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
                <button className="p-2 hover:bg-gray-800 rounded-full">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Main Google Meet/Zoom Style Video Area */}
            <div className="flex-1 flex relative">
              {/* Main Video Grid - Google Meet Style */}
              <div className="flex-1 p-6 bg-black">
                {/* Video Layout Based on Participant Count */}
                {participants.length <= 1 ? (
                  /* Single User - Large Video */
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="relative w-full max-w-4xl aspect-video bg-gray-900 rounded-lg overflow-hidden">
                      <video
                        ref={localVideoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover"
                      />
                      {!isVideoOn && (
                        <div className="absolute inset-0 bg-gray-900 flex items-center justify-center">
                          <div className="w-24 h-24 bg-gray-600 rounded-full flex items-center justify-center">
                            <span className="text-white text-3xl font-medium">{userName.charAt(0)}</span>
                          </div>
                        </div>
                      )}
                      
                      {/* Bottom Name Bar */}
                      <div className="absolute bottom-4 left-4">
                        <div className="bg-black bg-opacity-60 px-3 py-1 rounded text-white text-sm flex items-center space-x-2">
                          <span>{userName} (You)</span>
                          {!isAudioOn && (
                            <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M12.293 5.293a1 1 0 011.414 0l2 2a1 1 0 010 1.414l-2 2a1 1 0 01-1.414-1.414L13.586 8l-1.293-1.293a1 1 0 010-1.414zM13.414 8L11 5.586A3 3 0 008 5v3a3 3 0 003 3h2.414z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : participants.length <= 4 ? (
                  /* 2-4 Participants - Google Meet Grid */
                  <div className="grid grid-cols-2 gap-4 h-full p-4">
                    {/* Your Video */}
                    <div className="relative bg-gray-900 rounded-lg overflow-hidden">
                      <video
                        ref={localVideoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover"
                      />
                      {!isVideoOn && (
                        <div className="absolute inset-0 bg-gray-900 flex items-center justify-center">
                          <div className="w-16 h-16 bg-gray-600 rounded-full flex items-center justify-center">
                            <span className="text-white text-xl font-medium">{userName.charAt(0)}</span>
                          </div>
                        </div>
                      )}
                      <div className="absolute bottom-3 left-3">
                        <div className="bg-black bg-opacity-60 px-2 py-1 rounded text-white text-sm flex items-center space-x-1">
                          <span>{userName} (You)</span>
                          {!isAudioOn && (
                            <svg className="w-3 h-3 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M12.293 5.293a1 1 0 011.414 0l2 2a1 1 0 010 1.414l-2 2a1 1 0 01-1.414-1.414L13.586 8l-1.293-1.293a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Other Participants */}
                    {participants.slice(0, 3).map((participant) => (
                      <div key={participant.userId} className="relative bg-gray-900 rounded-lg overflow-hidden">
                        <div className="w-full h-full flex items-center justify-center">
                          <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center">
                            <span className="text-white text-xl font-medium">{participant.userName.charAt(0)}</span>
                          </div>
                        </div>
                        <div className="absolute bottom-3 left-3">
                          <div className="bg-black bg-opacity-60 px-2 py-1 rounded text-white text-sm flex items-center space-x-1">
                            <span>{participant.userName}</span>
                            {participant.role === 'teacher' && (
                              <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  /* 5+ Participants - Zoom Gallery View */
                  <div className="grid grid-cols-3 gap-3 h-full p-4">
                    {/* Your Video */}
                    <div className="relative bg-gray-900 rounded overflow-hidden">
                      <video
                        ref={localVideoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover"
                      />
                      {!isVideoOn && (
                        <div className="absolute inset-0 bg-gray-900 flex items-center justify-center">
                          <div className="w-12 h-12 bg-gray-600 rounded-full flex items-center justify-center">
                            <span className="text-white text-sm font-medium">{userName.charAt(0)}</span>
                          </div>
                        </div>
                      )}
                      <div className="absolute bottom-2 left-2">
                        <div className="bg-black bg-opacity-60 px-2 py-1 rounded text-white text-xs flex items-center space-x-1">
                          <span>{userName}</span>
                          {!isAudioOn && (
                            <svg className="w-3 h-3 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M12.293 5.293a1 1 0 011.414 0l2 2a1 1 0 010 1.414l-2 2a1 1 0 01-1.414-1.414L13.586 8l-1.293-1.293a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Other Participants */}
                    {participants.slice(0, 8).map((participant) => (
                      <div key={participant.userId} className="relative bg-gray-900 rounded overflow-hidden">
                        <div className="w-full h-full flex items-center justify-center">
                          <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
                            <span className="text-white text-sm font-medium">{participant.userName.charAt(0)}</span>
                          </div>
                        </div>
                        <div className="absolute bottom-2 left-2">
                          <div className="bg-black bg-opacity-60 px-2 py-1 rounded text-white text-xs">
                            <span>{participant.userName}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Google Meet Style Right Panel */}
              {sidebarTab && (
                <div className="w-80 bg-white border-l border-gray-200 flex flex-col">
                  {/* Panel Header */}
                  <div className="flex items-center justify-between p-4 border-b border-gray-200">
                    <div className="flex space-x-4">
                      <button
                        onClick={() => setSidebarTab('people')}
                        className={`pb-2 px-1 text-sm font-medium border-b-2 ${
                          sidebarTab === 'people'
                            ? 'text-blue-600 border-blue-600'
                            : 'text-gray-500 border-transparent hover:text-gray-700'
                        }`}
                      >
                        People ({participants.length})
                      </button>
                      <button
                        onClick={() => setSidebarTab('chat')}
                        className={`pb-2 px-1 text-sm font-medium border-b-2 ${
                          sidebarTab === 'chat'
                            ? 'text-blue-600 border-blue-600'
                            : 'text-gray-500 border-transparent hover:text-gray-700'
                        }`}
                      >
                        Chat
                      </button>
                    </div>
                    <button
                      onClick={() => setSidebarTab(null)}
                      className="p-1 hover:bg-gray-100 rounded"
                    >
                      <svg className="w-5 h-5 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>

                  {/* Panel Content */}
                  <div className="flex-1 overflow-hidden">
                    {sidebarTab === 'people' ? (
                      <div className="p-4 space-y-3 overflow-y-auto h-full">
                        {/* You */}
                        <div className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded">
                          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                            <span className="text-white text-sm font-medium">{userName.charAt(0)}</span>
                          </div>
                          <div className="flex-1">
                            <div className="text-sm font-medium text-gray-900">{userName} (You)</div>
                            <div className="text-xs text-gray-500">{userRole}</div>
                          </div>
                          <div className="flex space-x-1">
                            {isAudioOn ? (
                              <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                              </svg>
                            ) : (
                              <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M12.293 5.293a1 1 0 011.414 0l2 2a1 1 0 010 1.414l-2 2a1 1 0 01-1.414-1.414L13.586 8l-1.293-1.293a1 1 0 010-1.414z" clipRule="evenodd" />
                              </svg>
                            )}
                            {isVideoOn ? (
                              <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
                              </svg>
                            ) : (
                              <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781z" clipRule="evenodd" />
                              </svg>
                            )}
                          </div>
                        </div>

                        {/* Other Participants */}
                        {participants.map((participant) => (
                          <div key={participant.userId} className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded">
                            <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center">
                              <span className="text-white text-sm font-medium">{participant.userName.charAt(0)}</span>
                            </div>
                            <div className="flex-1">
                              <div className="text-sm font-medium text-gray-900 flex items-center space-x-2">
                                <span>{participant.userName}</span>
                                {participant.role === 'teacher' && (
                                  <span className="text-xs bg-yellow-100 text-yellow-800 px-1.5 py-0.5 rounded">Host</span>
                                )}
                              </div>
                              <div className="text-xs text-gray-500">{participant.role}</div>
                            </div>
                            <div className="flex space-x-1">
                              <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                              </svg>
                              <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
                              </svg>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      /* Chat Panel */
                      <div className="flex flex-col h-full">
                        <div className="flex-1 p-4 space-y-3 overflow-y-auto">
                          {chatMessages.map((message) => (
                            <div key={message.id} className="space-y-1">
                              <div className="flex items-center space-x-2">
                                <span className="text-sm font-medium text-gray-900">{message.user}</span>
                                <span className="text-xs text-gray-500">{message.time}</span>
                              </div>
                              <div className="text-sm text-gray-700 bg-gray-50 p-2 rounded">
                                {message.message}
                              </div>
                            </div>
                          ))}
                        </div>

                        <div className="p-4 border-t border-gray-200">
                          <div className="flex space-x-2">
                            <input
                              type="text"
                              value={newMessage}
                              onChange={(e) => setNewMessage(e.target.value)}
                              onKeyPress={handleKeyPress}
                              placeholder="Send a message to everyone"
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-full text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                            />
                            <button
                              onClick={sendMessage}
                              disabled={!newMessage.trim()}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-full disabled:text-gray-400 disabled:hover:bg-transparent"
                            >
                              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Google Meet/Zoom Style Bottom Controls */}
            <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-6 py-3">
              <div className="flex items-center justify-between">
                {/* Left side - Meeting info */}
                <div className="flex items-center space-x-4">
                  <div className="text-sm text-gray-600">
                    <span className="font-medium">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    <span className="mx-2">•</span>
                    <span>{currentSession.room_id}</span>
                  </div>
                </div>

                {/* Center - Main Controls */}
                <div className="flex items-center space-x-2">
                  {/* Microphone */}
                  <button
                    onClick={toggleAudio}
                    className={`w-12 h-12 rounded-full flex items-center justify-center transition-all hover:scale-105 ${
                      isAudioOn
                        ? 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                        : 'bg-red-500 hover:bg-red-600 text-white'
                    }`}
                    title={isAudioOn ? 'Mute' : 'Unmute'}
                  >
                    {isAudioOn ? (
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M12.293 5.293a1 1 0 011.414 0l2 2a1 1 0 010 1.414l-2 2a1 1 0 01-1.414-1.414L13.586 8l-1.293-1.293a1 1 0 010-1.414zM13.414 8L11 5.586A3 3 0 008 5v3a3 3 0 003 3h2.414z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>

                  {/* Camera */}
                  <button
                    onClick={isVideoOn ? stopVideo : startVideo}
                    className={`w-12 h-12 rounded-full flex items-center justify-center transition-all hover:scale-105 ${
                      isVideoOn
                        ? 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                        : 'bg-red-500 hover:bg-red-600 text-white'
                    }`}
                    title={isVideoOn ? 'Turn off camera' : 'Turn on camera'}
                  >
                    {isVideoOn ? (
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clipRule="evenodd" />
                        <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z" />
                      </svg>
                    )}
                  </button>

                  {/* Share Screen */}
                  <button
                    className="w-12 h-12 rounded-full bg-gray-200 hover:bg-gray-300 text-gray-700 flex items-center justify-center transition-all hover:scale-105"
                    title="Present now"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                    </svg>
                  </button>

                  {/* More Options */}
                  <button
                    className="w-12 h-12 rounded-full bg-gray-200 hover:bg-gray-300 text-gray-700 flex items-center justify-center transition-all hover:scale-105"
                    title="More options"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                    </svg>
                  </button>

                  {/* Leave Call */}
                  <button
                    onClick={leaveSession}
                    className="w-12 h-12 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center transition-all hover:scale-105"
                    title="Leave call"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>

                {/* Right side - Panel toggles */}
                <div className="flex items-center space-x-2">
                  {/* Meeting details */}
                  <button
                    className="p-2 hover:bg-gray-100 rounded-full text-gray-600"
                    title="Meeting details"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </button>

                  {/* People */}
                  <button
                    onClick={() => setSidebarTab(sidebarTab === 'people' ? null : 'people')}
                    className={`p-2 rounded-full transition-colors ${
                      sidebarTab === 'people'
                        ? 'bg-blue-100 text-blue-600'
                        : 'hover:bg-gray-100 text-gray-600'
                    }`}
                    title="Show everyone"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM9 16a7 7 0 00-7-7h14a7 7 0 00-7 7z" />
                    </svg>
                  </button>

                  {/* Chat */}
                  <button
                    onClick={() => setSidebarTab(sidebarTab === 'chat' ? null : 'chat')}
                    className={`p-2 rounded-full transition-colors ${
                      sidebarTab === 'chat'
                        ? 'bg-blue-100 text-blue-600'
                        : 'hover:bg-gray-100 text-gray-600'
                    }`}
                    title="Chat with everyone"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <LiveClassContent />
    </Suspense>
  );
}
