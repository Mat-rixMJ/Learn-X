'use client';

import { useState, useEffect, useRef } from 'react';
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

export default function LiveClass() {
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
      router.push('/login');
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

      const data = await response.json();
      if (data.success) {
        setAvailableSessions(data.data.sessions);
      }
    } catch (error) {
      console.error('Fetch active sessions error:', error);
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
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="bg-white/80 backdrop-blur-md p-8 rounded-2xl shadow-lg">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-center">Loading live classes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md shadow-lg rounded-2xl p-6 m-4">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">
            📺 Live Classes
          </h1>
          <div className="flex items-center space-x-4">
            <span className="text-gray-700 font-medium">👋 {userName} ({userRole})</span>
            <button
              onClick={() => router.push('/dashboard')}
              className="px-6 py-2 bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-full hover:from-gray-600 hover:to-gray-700 font-medium shadow-lg"
            >
              ← Back to Dashboard
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-4">
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-xl mb-4">
            {error}
          </div>
        )}

        {/* Tab Navigation */}
        <div className="bg-white/80 backdrop-blur-md rounded-2xl p-2 mb-6 shadow-lg">
          <div className="flex space-x-2">
            <button
              onClick={() => setActiveTab('sessions')}
              className={`flex-1 py-3 px-4 rounded-xl text-center font-semibold transition-all duration-200 ${
                activeTab === 'sessions'
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              📋 Available Sessions
            </button>
            {currentSession && (
              <button
                onClick={() => setActiveTab('live')}
                className={`flex-1 py-3 px-4 rounded-xl text-center font-semibold transition-all duration-200 ${
                  activeTab === 'live'
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg'
                    : 'text-gray-600 hover:bg-gray-100'
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
              <h2 className="text-2xl font-bold text-gray-800">
                🎯 {userRole === 'teacher' ? 'Your Active Sessions' : 'Join Live Classes'} ({availableSessions.length})
              </h2>
              <button
                onClick={fetchActiveSessions}
                className="px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-full hover:from-blue-600 hover:to-cyan-600 font-semibold shadow-lg"
              >
                🔄 Refresh
              </button>
            </div>

            {availableSessions.length === 0 ? (
              <div className="bg-white/70 backdrop-blur-sm p-12 rounded-3xl shadow-xl text-center">
                <div className="text-6xl mb-4">📺</div>
                <h3 className="text-2xl font-bold text-gray-800 mb-4">
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
                    className="px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-full hover:from-indigo-700 hover:to-purple-700 font-semibold shadow-lg text-lg"
                  >
                    📊 Go to Teacher Dashboard
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {availableSessions.map((session) => (
                  <div key={session.id} className="bg-white/70 backdrop-blur-sm p-6 rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-300">
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="text-xl font-bold text-gray-800">{session.title}</h3>
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                        <span className="text-sm text-red-600 font-semibold">LIVE</span>
                      </div>
                    </div>
                    
                    <div className="space-y-2 text-sm text-gray-600 mb-4">
                      <p>📚 <strong>Class:</strong> {session.class_name}</p>
                      <p>📖 <strong>Subject:</strong> {session.subject}</p>
                      {session.teacher_name && (
                        <p>👨‍🏫 <strong>Teacher:</strong> {session.teacher_name}</p>
                      )}
                      <p>👥 <strong>Participants:</strong> {session.current_participants}/{session.max_participants}</p>
                      <p>⏰ <strong>Started:</strong> {new Date(session.started_at).toLocaleTimeString()}</p>
                    </div>
                    
                    <div className="flex space-x-2">
                      {session.is_joined ? (
                        <button
                          onClick={() => joinSessionById(session.id)}
                          className="flex-1 px-4 py-2 bg-gradient-to-r from-green-500 to-teal-500 text-white rounded-full text-sm hover:from-green-600 hover:to-teal-600 font-semibold"
                        >
                          🎥 Rejoin Session
                        </button>
                      ) : (
                        <button
                          onClick={() => joinSessionById(session.id)}
                          disabled={session.current_participants >= session.max_participants && userRole !== 'teacher'}
                          className={`flex-1 px-4 py-2 text-white rounded-full text-sm font-semibold ${
                            session.current_participants >= session.max_participants && userRole !== 'teacher'
                              ? 'bg-gray-400 cursor-not-allowed'
                              : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700'
                          }`}
                        >
                          {session.current_participants >= session.max_participants && userRole !== 'teacher'
                            ? '🚫 Session Full'
                            : '🚀 Join Session'
                          }
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
              <div className="bg-white/70 backdrop-blur-sm p-4 rounded-2xl shadow-lg">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-2xl font-bold text-gray-800">{currentSession.title}</h3>
                    <p className="text-gray-600">{currentSession.class_name} - {currentSession.subject}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                    <span className="text-red-600 font-semibold">LIVE</span>
                    <span className="text-gray-600">({participants.length} participants)</span>
                  </div>
                </div>
              </div>

              {/* Main Video */}
              <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg overflow-hidden">
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
                <div className="p-4 bg-white border-t">
                  <div className="flex justify-center space-x-4">
                    <button
                      onClick={isVideoOn ? stopVideo : startVideo}
                      className={`px-6 py-3 rounded-full font-semibold shadow-lg transition-all ${
                        isVideoOn
                          ? 'bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700'
                          : 'bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700'
                      }`}
                    >
                      {isVideoOn ? '📹 Stop Video' : '📷 Start Video'}
                    </button>
                    
                    <button
                      onClick={toggleAudio}
                      className={`px-6 py-3 rounded-full font-semibold shadow-lg transition-all ${
                        isAudioOn
                          ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700'
                          : 'bg-gradient-to-r from-gray-500 to-gray-600 text-white hover:from-gray-600 hover:to-gray-700'
                      }`}
                    >
                      {isAudioOn ? '🎤 Mute' : '🔇 Unmute'}
                    </button>
                    
                    <button
                      onClick={leaveSession}
                      className="px-6 py-3 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-full hover:from-red-600 hover:to-pink-600 font-semibold shadow-lg"
                    >
                      🚪 Leave Session
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Participants */}
              <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg p-4">
                <h4 className="text-lg font-bold text-gray-800 mb-4">👥 Participants ({participants.length})</h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {participants.map((participant) => (
                    <div key={participant.userId} className="flex items-center justify-between p-2 bg-gray-50 rounded-xl">
                      <div className="flex items-center space-x-2">
                        <div className="h-8 w-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                          {participant.userName.charAt(0)}
                        </div>
                        <div>
                          <div className="font-medium text-gray-800">{participant.userName}</div>
                          <div className="text-xs text-gray-500">{participant.role}</div>
                        </div>
                      </div>
                      {participant.role === 'teacher' && (
                        <div className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
                          👑 Teacher
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Chat */}
              <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg p-4 flex flex-col h-96">
                <h4 className="text-lg font-bold text-gray-800 mb-4">💬 Chat</h4>
                
                <div className="flex-1 overflow-y-auto space-y-2 mb-4">
                  {chatMessages.map((message) => (
                    <div key={message.id} className="p-2 bg-gray-50 rounded-xl">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-gray-800 text-sm">
                          {message.role === 'teacher' && '👑'} {message.user}
                        </span>
                        <span className="text-xs text-gray-500">{message.time}</span>
                      </div>
                      <p className="text-gray-700 text-sm">{message.message}</p>
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
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    onClick={sendMessage}
                    disabled={!newMessage.trim()}
                    className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 font-semibold disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    📤
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
