'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { io, Socket } from 'socket.io-client';
import VideoPlayer from '@/components/live-session/VideoPlayer';
import ChatPanel from '@/components/live-session/ChatPanel';
import ParticipantsList from '@/components/live-session/ParticipantsList';
import ControlPanel from '@/components/live-session/ControlPanel';
import SubtitleOverlay from '@/components/live-session/SubtitleOverlay';
import ScreenSharing from '@/components/live-session/ScreenSharing';
import PDFViewer from '@/components/live-session/PDFViewer';
import PowerPointViewer from '@/components/live-session/PowerPointViewer';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

interface Participant {
  userId: string;
  userName: string;
  role: 'teacher' | 'student';
  isStreaming?: boolean;
}

interface SessionData {
  id: string;
  title: string;
  description?: string;
  teacher: {
    id: string;
    name: string;
  };
  class: {
    id: string;
    name: string;
  };
  status: 'active' | 'ended';
  isRecording: boolean;
  hasTranslation: boolean;
  hasSubtitles: boolean;
  participants: Participant[];
}

interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  message: string;
  timestamp: Date;
  translations?: { [language: string]: string };
}

interface LiveCaption {
  id: string;
  text: string;
  confidence: number;
  timestamp: number;
  startTime: number;
  translations?: { [language: string]: string };
}

export default function LiveSessionPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.sessionId as string;
  
  // State management
  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [userRole, setUserRole] = useState<'teacher' | 'student' | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [liveCaptions, setLiveCaptions] = useState<LiveCaption[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  
  // Video/Audio refs
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  
  // Configuration
  const [isRecording, setIsRecording] = useState(false);
  const [subtitlesEnabled, setSubtitlesEnabled] = useState(false);
  const [translationEnabled, setTranslationEnabled] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [activeTab, setActiveTab] = useState<'chat' | 'screen' | 'pdf' | 'ppt'>('chat');
  
  // Socket configuration
  const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000';

  useEffect(() => {
    initializeSession();
    return () => {
      cleanup();
    };
  }, [sessionId]);

  const initializeSession = async () => {
    try {
      // Get user info
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/auth/login');
        return;
      }

      // Fetch session data
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/live/${sessionId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch session data');
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.message);
      }

      const session = result.data;
      setSessionData(session);
      
      // Get current user info
      let userResult = null;
      const userResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/user/profile`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (userResponse.ok) {
        userResult = await userResponse.json();
        setCurrentUser(userResult.data);
        setUserRole(userResult.data.role);
      }

      // Initialize Socket.IO connection
      const newSocket = io(SOCKET_URL, {
        auth: { token },
        transports: ['websocket']
      });

      setSocket(newSocket);
      setupSocketListeners(newSocket);
      
      // Join the session
      newSocket.emit('join-session', {
        sessionId,
        userId: userResult.data?.id,
        userRole: userResult.data?.role,
        userName: userResult.data?.name
      });

      setLoading(false);
    } catch (err) {
      console.error('Error initializing session:', err);
      setError(err instanceof Error ? err.message : 'Failed to initialize session');
      setLoading(false);
    }
  };

  const setupSocketListeners = (socket: Socket) => {
    socket.on('connect', () => {
      console.log('🔌 Connected to server');
      setIsConnected(true);
    });

    socket.on('disconnect', () => {
      console.log('💔 Disconnected from server');
      setIsConnected(false);
    });

    socket.on('session-joined', (data) => {
      console.log('✅ Joined session:', data);
      setParticipants(data.participants || []);
      setIsRecording(data.isRecording || false);
    });

    socket.on('user-joined', (data) => {
      console.log('👤 User joined:', data);
      setParticipants(prev => [...prev, data]);
    });

    socket.on('user-left', (data) => {
      console.log('👋 User left:', data);
      setParticipants(prev => prev.filter(p => p.userId !== data.userId));
    });

    socket.on('chat-message', (data) => {
      console.log('💬 Chat message:', data);
      setChatMessages(prev => [...prev, {
        ...data,
        timestamp: new Date(data.timestamp)
      }]);
    });

    socket.on('live-caption', (data) => {
      console.log('📝 Live caption:', data);
      setLiveCaptions(prev => {
        const newCaptions = [...prev, data];
        // Keep only last 10 captions
        return newCaptions.slice(-10);
      });
    });

    socket.on('live-caption-translated', (data) => {
      console.log('🌐 Translated caption:', data);
      setLiveCaptions(prev => {
        const newCaptions = [...prev, data];
        return newCaptions.slice(-10);
      });
    });

    socket.on('recording-status', (data) => {
      console.log('📹 Recording status:', data);
      setIsRecording(data.isRecording);
    });

    socket.on('stream-started', (data) => {
      console.log('🎥 Stream started:', data);
      handleRemoteStream(data);
    });

    socket.on('stream-stopped', (data) => {
      console.log('⏹️ Stream stopped:', data);
      stopRemoteStream();
    });

    // WebRTC signaling
    socket.on('offer-received', handleOffer);
    socket.on('answer-received', handleAnswer);
    socket.on('ice-candidate-received', handleIceCandidate);

    socket.on('join-error', (data) => {
      setError(data.message);
    });

    socket.on('session-ended', (data) => {
      alert('Session has ended');
      router.push('/dashboard');
    });
  };

  const cleanup = () => {
    if (socket) {
      socket.disconnect();
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
    }
  };

  const startLocalStream = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: userRole === 'teacher' ? { width: 1280, height: 720 } : false,
        audio: true
      });

      localStreamRef.current = stream;
      if (localVideoRef.current && userRole === 'teacher') {
        localVideoRef.current.srcObject = stream;
      }

      // Initialize peer connection for WebRTC
      initializePeerConnection(stream);

      return stream;
    } catch (error) {
      console.error('Error accessing media devices:', error);
      setError('Failed to access camera/microphone');
    }
  };

  const initializePeerConnection = (stream: MediaStream) => {
    const config = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    };

    const pc = new RTCPeerConnection(config);
    peerConnectionRef.current = pc;

    // Add local stream tracks
    stream.getTracks().forEach(track => {
      pc.addTrack(track, stream);
    });

    // Handle remote stream
    pc.ontrack = (event) => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate && socket) {
        socket.emit('ice-candidate', {
          sessionId,
          candidate: event.candidate,
          targetUserId: 'broadcast' // For broadcasting to all participants
        });
      }
    };
  };

  const handleOffer = async (data: any) => {
    if (!peerConnectionRef.current) return;

    try {
      await peerConnectionRef.current.setRemoteDescription(data.offer);
      const answer = await peerConnectionRef.current.createAnswer();
      await peerConnectionRef.current.setLocalDescription(answer);

      if (socket) {
        socket.emit('answer', {
          sessionId,
          answer,
          targetUserId: data.fromUserId
        });
      }
    } catch (error) {
      console.error('Error handling offer:', error);
    }
  };

  const handleAnswer = async (data: any) => {
    if (!peerConnectionRef.current) return;

    try {
      await peerConnectionRef.current.setRemoteDescription(data.answer);
    } catch (error) {
      console.error('Error handling answer:', error);
    }
  };

  const handleIceCandidate = async (data: any) => {
    if (!peerConnectionRef.current) return;

    try {
      await peerConnectionRef.current.addIceCandidate(data.candidate);
    } catch (error) {
      console.error('Error handling ICE candidate:', error);
    }
  };

  const handleRemoteStream = (data: any) => {
    // Handle incoming stream from teacher
    console.log('Handling remote stream:', data);
  };

  const stopRemoteStream = () => {
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }
  };

  const sendChatMessage = (message: string) => {
    if (socket && message.trim()) {
      socket.emit('chat-message', {
        sessionId,
        message: message.trim(),
        messageType: 'chat'
      });
    }
  };

  const toggleRecording = () => {
    if (socket && userRole === 'teacher') {
      socket.emit('toggle-recording', {
        sessionId,
        enable: !isRecording
      });
    }
  };

  const toggleSubtitles = () => {
    const newState = !subtitlesEnabled;
    setSubtitlesEnabled(newState);
    
    if (socket && userRole === 'teacher') {
      if (newState) {
        socket.emit('start-captions', {
          sessionId,
          language: selectedLanguage
        });
      } else {
        socket.emit('stop-captions', {
          sessionId
        });
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Error</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{sessionData?.title}</h1>
            <p className="text-gray-600">{sessionData?.class.name}</p>
          </div>
          <div className="flex items-center space-x-4">
            <div className={`px-3 py-1 rounded-full text-sm font-medium ${
              isConnected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
              {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
            </div>
            {userRole === 'teacher' && (
              <button
                onClick={() => router.push('/teacher-dashboard')}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Back to Dashboard
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex h-[calc(100vh-88px)]">
        {/* Left Panel - Video and Controls */}
        <div className="flex-1 flex flex-col">
          {/* Video Area */}
          <div className="flex-1 bg-black relative">
            <VideoPlayer
              localVideoRef={localVideoRef}
              remoteVideoRef={remoteVideoRef}
              userRole={userRole}
              isStreaming={false}
              onStartStream={startLocalStream}
            />
            
            {/* Subtitle Overlay */}
            {subtitlesEnabled && (
              <SubtitleOverlay
                captions={liveCaptions}
                selectedLanguage={selectedLanguage}
                translationEnabled={translationEnabled}
              />
            )}
          </div>

          {/* Control Panel */}
          {userRole === 'teacher' && (
            <ControlPanel
              isRecording={isRecording}
              subtitlesEnabled={subtitlesEnabled}
              translationEnabled={translationEnabled}
              selectedLanguage={selectedLanguage}
              onToggleRecording={toggleRecording}
              onToggleSubtitles={toggleSubtitles}
              onToggleTranslation={setTranslationEnabled}
              onLanguageChange={setSelectedLanguage}
            />
          )}
        </div>

        {/* Right Panel - Tabbed Interface */}
        <div className="w-96 bg-white shadow-lg flex flex-col">
          {/* Tab Navigation */}
          <div className="border-b bg-gray-50">
            <div className="flex">
              {[
                { id: 'chat', label: '💬 Chat', icon: '💬' },
                { id: 'screen', label: '📺 Screen', icon: '📺' },
                { id: 'pdf', label: '📄 PDF', icon: '📄' },
                { id: 'ppt', label: '🎯 PPT', icon: '🎯' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as 'chat' | 'screen' | 'pdf' | 'ppt')}
                  className={`flex-1 px-3 py-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600 bg-white'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <span className="block text-lg mb-1">{tab.icon}</span>
                  <span className="text-xs">{tab.label.split(' ')[1]}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Participants (always visible) */}
          <div className="border-b bg-gray-50 p-2">
            <ParticipantsList
              participants={participants}
              currentUserId={currentUser?.id}
            />
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-hidden">
            {activeTab === 'chat' && (
              <ChatPanel
                messages={chatMessages}
                onSendMessage={sendChatMessage}
                currentUserId={currentUser?.id}
                translationEnabled={translationEnabled}
                selectedLanguage={selectedLanguage}
              />
            )}
            
            {activeTab === 'screen' && (
              <div className="h-full overflow-y-auto p-4">
                <ScreenSharing
                  socket={socket}
                  sessionId={sessionId}
                  userRole={userRole || 'student'}
                  isTeacher={userRole === 'teacher'}
                />
              </div>
            )}
            
            {activeTab === 'pdf' && (
              <div className="h-full overflow-y-auto p-4">
                <PDFViewer
                  socket={socket}
                  sessionId={sessionId}
                  userRole={userRole || 'student'}
                  isTeacher={userRole === 'teacher'}
                />
              </div>
            )}
            
            {activeTab === 'ppt' && (
              <div className="h-full overflow-y-auto p-4">
                <PowerPointViewer
                  socket={socket}
                  sessionId={sessionId}
                  userRole={userRole || 'student'}
                  isTeacher={userRole === 'teacher'}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}