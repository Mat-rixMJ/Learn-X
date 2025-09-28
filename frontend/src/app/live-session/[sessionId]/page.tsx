'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { io, Socket } from 'socket.io-client';
import VideoPlayer from '@/components/live-session/VideoPlayer';
import ChatPanel from '@/components/live-session/ChatPanel';
import ParticipantsList from '@/components/live-session/ParticipantsList';
import ControlPanel from '@/components/live-session/ControlPanel';
import SubtitleOverlay from '@/components/live-session/SubtitleOverlay';
import EnhancedSubtitleOverlay from '@/components/live-session/EnhancedSubtitleOverlay';
import LanguageSelect from '@/components/live-session/LanguageSelect';
import ScreenSharing from '@/components/live-session/ScreenSharing';
import PDFViewer from '@/components/live-session/PDFViewer';
import PowerPointViewer from '@/components/live-session/PowerPointViewer';
import BreakoutRooms from '@/components/live-session/BreakoutRooms';
import VideoQualityControls, { VideoQualitySettings } from '@/components/live-session/VideoQualityControls';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import LiveTranslationService, { SupportedLanguage } from '@/services/LiveTranslationService';
import { authenticatedFetch, validateToken, debugTokenInfo } from '@/utils/auth';
import {
  Participant,
  SessionData,
  ChatMessage,
  LiveCaption,
  TranslationResult,
  SubtitleSettings,
  SpeechRecognitionResult as CustomSpeechResult,
  StreamData,
  SocketJoinData,
  SocketUserData,
  SocketChatData,
  SocketCaptionData,
  SocketRecordingData,
  SocketErrorData,
  WebRTCOffer,
  WebRTCAnswer,
  WebRTCIceCandidate
} from '@/types/live-session';

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
  const [translations, setTranslations] = useState<TranslationResult[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  
  // Translation and Subtitle State
  const [translationService] = useState(() => new LiveTranslationService());
  const [subtitleSettings, setSubtitleSettings] = useState<SubtitleSettings>({
    enabled: false,
    language: 'en-US',
    fontSize: 18,
    position: 'bottom',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    textColor: '#ffffff',
    autoTranslate: false,
    showOriginal: false,
    translationLanguage: 'hi'
  });
  const [targetLanguages, setTargetLanguages] = useState<string[]>([]);
  const [supportedLanguages, setSupportedLanguages] = useState<SupportedLanguage[]>([]);
  const [isRecognizing, setIsRecognizing] = useState(false);
  const [showLanguageSelect, setShowLanguageSelect] = useState(false);
  
  // Video Quality & Network
  const [videoQuality, setVideoQuality] = useState<VideoQualitySettings>({
    resolution: '720p',
    frameRate: 30,
    bitrate: 'medium',
    codec: 'H264',
    adaptiveBitrate: true,
    noiseSuppression: true,
    echoCancellation: true,
    autoGainControl: true
  });
  
  const [networkStats, setNetworkStats] = useState({
    bandwidth: 2000,
    latency: 50,
    packetLoss: 0,
    jitter: 5,
    quality: 'good' as const
  });
  
  const [showQualityControls, setShowQualityControls] = useState(false);
  const [currentBreakoutRoom, setCurrentBreakoutRoom] = useState<string | null>(null);
  
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
  const [activeTab, setActiveTab] = useState<'chat' | 'screen' | 'pdf' | 'ppt' | 'breakout' | 'translation'>('chat');
  
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
        console.log('No token found - redirecting to login');
        router.push('/login');
        return;
      }

      // Validate token before making requests
      const tokenInfo = validateToken(token);
      if (!tokenInfo.valid) {
        console.error('Invalid token:', tokenInfo.error);
        if (process.env.NODE_ENV === 'development') {
          debugTokenInfo(token);
        }
        localStorage.removeItem('token');
        router.push('/login');
        return;
      }

      console.log('Token validated successfully');

      // Fetch session data using authenticated fetch
      const response = await authenticatedFetch(`${process.env.NEXT_PUBLIC_API_URL}/api/live/${sessionId}`);

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.message);
      }

      const session = result.data;
      setSessionData(session);
      
      // Get current user info
      let userResult = null;
      try {
        const userResponse = await authenticatedFetch(`${process.env.NEXT_PUBLIC_API_URL}/api/user/profile`);
        
        if (userResponse.ok) {
          userResult = await userResponse.json();
          setCurrentUser(userResult.data);
          setUserRole(userResult.data.role);
        } else {
          console.warn('Failed to fetch user profile:', userResponse.status);
        }
      } catch (authError) {
        console.error('Authentication error during user profile fetch:', authError);
        // The authenticatedFetch will handle redirecting to login
        return;
      }

      // Initialize Socket.IO connection
      const newSocket = io(SOCKET_URL, {
        auth: { token },
        transports: ['websocket']
      });

      setSocket(newSocket);
      setupSocketListeners(newSocket);
      
      // Initialize translation service
      initializeTranslationService(newSocket);
      
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

    socket.on('session-joined', (data: SocketJoinData) => {
      console.log('✅ Joined session:', data);
      const participantsWithStatus = (data.participants || []).map(p => ({
        ...p,
        isOnline: true
      }));
      setParticipants(participantsWithStatus);
      setIsRecording(data.isRecording || false);
    });

    socket.on('user-joined', (data: SocketUserData) => {
      console.log('👤 User joined:', data);
      setParticipants(prev => [...prev, {
        userId: data.userId,
        userName: data.userName,
        role: data.role,
        isOnline: true,
        isStreaming: false
      }]);
    });

    socket.on('user-left', (data: SocketUserData) => {
      console.log('👋 User left:', data);
      setParticipants(prev => prev.filter(p => p.userId !== data.userId));
    });

    socket.on('chat-message', (data: SocketChatData) => {
      console.log('💬 Chat message:', data);
      setChatMessages(prev => [...prev, {
        id: data.id,
        userName: data.userName,
        message: data.message,
        timestamp: new Date(data.timestamp),
        type: data.type || 'user',
        userId: data.userId || 'unknown',
        messageType: (data.type === 'system' ? 'system' : 'chat') as 'chat' | 'system' | 'translation'
      }]);
    });

    socket.on('live-caption', (data: SocketCaptionData) => {
      console.log('📝 Live caption:', data);
      setLiveCaptions(prev => {
        const newCaption: LiveCaption = {
          id: data.id,
          text: data.text,
          timestamp: new Date(data.timestamp),
          language: data.language,
          isTranslated: data.isTranslated,
          original: data.original,
          translated: data.translated,
          confidence: data.confidence,
          startTime: data.startTime
        };
        const newCaptions = [...prev, newCaption];
        // Keep only last 10 captions
        return newCaptions.slice(-10);
      });
    });

    socket.on('live-caption-translated', (data: SocketCaptionData) => {
      console.log('🌐 Translated caption:', data);
      setLiveCaptions(prev => {
        const translatedCaption: LiveCaption = {
          id: data.id,
          text: data.text,
          timestamp: new Date(data.timestamp),
          language: data.language,
          isTranslated: data.isTranslated,
          original: data.original,
          translated: data.translated,
          confidence: data.confidence,
          startTime: data.startTime
        };
        const updatedCaptions = [...prev, translatedCaption];
        return updatedCaptions.slice(-10);
      });
    });

    // Translation event listeners
    socket.on('live-translation', (data: TranslationResult) => {
      console.log('🔄 Live translation:', data);
      setTranslations(prev => {
        const newTranslations = [...prev, data];
        // Keep only last 20 translations
        return newTranslations.slice(-20);
      });
    });

    socket.on('recording-status', (data: SocketRecordingData) => {
      console.log('📹 Recording status:', data);
      setIsRecording(data.isRecording);
    });

    socket.on('stream-started', (data: StreamData) => {
      console.log('🎥 Stream started:', data);
      handleRemoteStream(data);
    });

    socket.on('stream-stopped', (data: StreamData) => {
      console.log('⏹️ Stream stopped:', data);
      stopRemoteStream();
    });

    // WebRTC signaling
    socket.on('offer-received', handleOffer);
    socket.on('answer-received', handleAnswer);
    socket.on('ice-candidate-received', handleIceCandidate);

    socket.on('join-error', (data: SocketErrorData) => {
      setError(data.message);
    });

    socket.on('session-ended', (data: SocketErrorData) => {
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
    // Stop translation service
    if (translationService) {
      translationService.stopRecognition();
    }
  };

  // Initialize translation service
  const initializeTranslationService = (socket: Socket) => {
    // Set socket for real-time communication
    translationService.setSocket(socket);
    
    // Get supported languages
    const languages = translationService.getAvailableLanguages();
    setSupportedLanguages(languages);

    // Set up translation callbacks
    translationService.onTranscript((result: CustomSpeechResult) => {
      const newCaption: LiveCaption = {
        id: Date.now().toString(),
        text: result.transcript,
        timestamp: result.timestamp,
        language: result.language,
        confidence: result.confidence
      };
      
      setLiveCaptions(prev => {
        const updated = [...prev, newCaption];
        return updated.slice(-10);
      });
    });

    translationService.onTranslation((result: TranslationResult) => {
      setTranslations(prev => {
        const updated = [...prev, result];
        return updated.slice(-20);
      });
    });
  };

  // Translation control functions
  const handleStartRecognition = () => {
    const success = translationService.startRecognition(subtitleSettings.language);
    if (success) {
      setIsRecognizing(true);
      translationService.setTargetLanguages(targetLanguages);
    }
  };

  const handleStopRecognition = () => {
    translationService.stopRecognition();
    setIsRecognizing(false);
  };

  const handleLanguageChange = (language: string) => {
    setSubtitleSettings(prev => ({ ...prev, language }));
    if (isRecognizing) {
      translationService.setLanguage(language);
    }
  };

  const handleTargetLanguagesChange = (languages: string[]) => {
    setTargetLanguages(languages);
    if (isRecognizing) {
      translationService.setTargetLanguages(languages);
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
            <p className="text-gray-600">{sessionData?.description || 'Live Session'}</p>
          </div>
          <div className="flex items-center space-x-4">
            <div className={`px-3 py-1 rounded-full text-sm font-medium ${
              isConnected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
              {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
            </div>
            
            {/* Video Quality Controls Button */}
            <button
              onClick={() => setShowQualityControls(!showQualityControls)}
              className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                showQualityControls 
                  ? 'bg-blue-100 text-blue-800 border border-blue-200' 
                  : 'bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200'
              }`}
              title="Video Quality & Network Stats"
            >
              📺 Quality ({videoQuality.resolution})
            </button>
            
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
            
            {/* Enhanced Subtitle Overlay */}
            <EnhancedSubtitleOverlay
              captions={liveCaptions}
              translations={translations}
              settings={subtitleSettings}
              onSettingsChange={setSubtitleSettings}
            />
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
                { id: 'translation', label: '🌐 Translate', icon: '🌐' },
                { id: 'screen', label: '📺 Screen', icon: '📺' },
                { id: 'pdf', label: '📄 PDF', icon: '📄' },
                { id: 'ppt', label: '🎯 PPT', icon: '🎯' },
                { id: 'breakout', label: '🏠 Rooms', icon: '🏠' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as 'chat' | 'translation' | 'screen' | 'pdf' | 'ppt' | 'breakout')}
                  className={`flex-1 px-2 py-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600 bg-white'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <span className="block text-sm mb-1">{tab.icon}</span>
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
            
            {activeTab === 'translation' && (
              <div className="h-full overflow-y-auto p-4">
                <LanguageSelect
                  selectedLanguage={subtitleSettings.language}
                  targetLanguages={targetLanguages}
                  supportedLanguages={supportedLanguages}
                  onLanguageChange={handleLanguageChange}
                  onTargetLanguagesChange={handleTargetLanguagesChange}
                  onStartRecognition={handleStartRecognition}
                  onStopRecognition={handleStopRecognition}
                  isRecognizing={isRecognizing}
                />
                
                {/* Live Captions Display */}
                <div className="mt-4 border-t pt-4">
                  <h4 className="text-sm font-medium mb-2">📝 Live Captions</h4>
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 max-h-40 overflow-y-auto">
                    {liveCaptions.length === 0 ? (
                      <p className="text-gray-500 text-sm text-center py-4">
                        {isRecognizing ? 'Listening for speech...' : 'Start recognition to see live captions'}
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {liveCaptions.slice(-5).map((caption) => (
                          <div key={caption.id} className="text-sm">
                            <div className="font-medium">{caption.text}</div>
                            {caption.translated && subtitleSettings.autoTranslate && (
                              <div className="text-blue-600 text-xs mt-1">
                                🌐 {caption.translated}
                              </div>
                            )}
                            <div className="text-xs text-gray-500">
                              {caption.timestamp.toLocaleTimeString()} • 
                              Confidence: {Math.round((caption.confidence || 0.8) * 100)}%
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Translations Display */}
                {translations.length > 0 && (
                  <div className="mt-4 border-t pt-4">
                    <h4 className="text-sm font-medium mb-2">🔄 Recent Translations</h4>
                    <div className="bg-blue-50 dark:bg-blue-900 rounded-lg p-3 max-h-40 overflow-y-auto">
                      <div className="space-y-2">
                        {translations.slice(-5).map((translation, index) => (
                          <div key={index} className="text-sm">
                            <div className="text-gray-700 dark:text-gray-300">
                              Original: {translation.original}
                            </div>
                            <div className="font-medium text-blue-800 dark:text-blue-200">
                              {supportedLanguages.find(l => l.code.startsWith(translation.language))?.nativeName || translation.language}: {translation.translated}
                            </div>
                            <div className="text-xs text-gray-500">
                              {translation.timestamp.toLocaleTimeString()}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
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
            
            {activeTab === 'breakout' && (
              <div className="h-full">
                <BreakoutRooms
                  socket={socket}
                  sessionId={sessionId}
                  currentUser={currentUser}
                  participants={participants}
                  userRole={userRole || 'student'}
                  onJoinRoom={(roomId) => setCurrentBreakoutRoom(roomId)}
                  onLeaveRoom={() => setCurrentBreakoutRoom(null)}
                />
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Floating Video Quality Controls */}
      {showQualityControls && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="relative max-w-md w-full mx-4">
            <VideoQualityControls
              currentSettings={videoQuality}
              networkStats={networkStats}
              onSettingsChange={setVideoQuality}
              isHost={userRole === 'teacher'}
            />
            <button
              onClick={() => setShowQualityControls(false)}
              className="absolute -top-2 -right-2 w-8 h-8 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors flex items-center justify-center text-sm font-bold"
            >
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  );
}