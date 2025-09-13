'use client';

import React, { useState, useRef, useEffect } from 'react';

interface ScreenSharingProps {
  socket: any;
  sessionId: string;
  userRole: 'teacher' | 'student';
  isTeacher: boolean;
}

interface SharedScreen {
  userId: string;
  userName: string;
  stream?: MediaStream;
}

const ScreenSharing: React.FC<ScreenSharingProps> = ({
  socket,
  sessionId,
  userRole,
  isTeacher
}) => {
  const [isSharing, setIsSharing] = useState(false);
  const [sharedScreens, setSharedScreens] = useState<Map<string, SharedScreen>>(new Map());
  const [viewingScreen, setViewingScreen] = useState<string | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const videoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());

  useEffect(() => {
    if (!socket) return;

    // Listen for screen share events
    socket.on('screen-share-started', ({ userId, userName }: { userId: string; userName: string }) => {
      setSharedScreens(prev => new Map(prev.set(userId, { userId, userName })));
    });

    socket.on('screen-share-stopped', ({ userId }: { userId: string }) => {
      setSharedScreens(prev => {
        const newMap = new Map(prev);
        newMap.delete(userId);
        return newMap;
      });
      if (viewingScreen === userId) {
        setViewingScreen(null);
      }
    });

    // WebRTC signaling for screen sharing
    socket.on('screen-share-offer', async ({ offer, userId }: { offer: RTCSessionDescriptionInit; userId: string }) => {
      if (userId === socket.id) return; // Don't handle our own offers
      
      const peerConnection = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      });

      peerConnection.ontrack = (event) => {
        const stream = event.streams[0];
        const videoElement = videoRefs.current.get(userId);
        if (videoElement && stream) {
          videoElement.srcObject = stream;
          setSharedScreens(prev => {
            const newMap = new Map(prev);
            const existing = newMap.get(userId);
            if (existing) {
              newMap.set(userId, { ...existing, stream });
            }
            return newMap;
          });
        }
      };

      await peerConnection.setRemoteDescription(offer);
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);

      socket.emit('screen-share-answer', {
        sessionId,
        answer,
        targetUserId: userId
      });
    });

    socket.on('screen-share-answer', async ({ answer, userId }: { answer: RTCSessionDescriptionInit; userId: string }) => {
      // Handle answer (for the screen sharer)
      console.log('Received screen share answer from:', userId);
    });

    return () => {
      socket.off('screen-share-started');
      socket.off('screen-share-stopped');
      socket.off('screen-share-offer');
      socket.off('screen-share-answer');
    };
  }, [socket, sessionId, viewingScreen]);

  const startScreenShare = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: true
      });

      localStreamRef.current = stream;
      setIsSharing(true);

      // Notify others that screen sharing started
      socket.emit('screen-share-start', {
        sessionId,
        userId: socket.id,
        userName: 'Current User' // This should come from user context
      });

      // Handle screen share ending (when user clicks browser's stop sharing)
      stream.getVideoTracks()[0].onended = () => {
        stopScreenShare();
      };

      // Create WebRTC connections to share with other participants
      const peerConnection = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      });

      stream.getTracks().forEach(track => {
        peerConnection.addTrack(track, stream);
      });

      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);

      socket.emit('screen-share-offer', {
        sessionId,
        offer,
        userId: socket.id
      });

    } catch (error) {
      console.error('Error starting screen share:', error);
      alert('Failed to start screen sharing. Please make sure you grant permission.');
    }
  };

  const stopScreenShare = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
    
    setIsSharing(false);
    
    socket.emit('screen-share-stop', {
      sessionId,
      userId: socket.id
    });
  };

  const viewSharedScreen = (userId: string) => {
    setViewingScreen(viewingScreen === userId ? null : userId);
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          📺 Screen Sharing
        </h3>
        
        {/* Screen sharing controls */}
        <div className="flex gap-2">
          {isSharing ? (
            <button
              onClick={stopScreenShare}
              className="flex items-center gap-2 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              ⏹️ Stop Sharing
            </button>
          ) : (
            <button
              onClick={startScreenShare}
              className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              disabled={userRole === 'student' && !isTeacher} // Only teachers can share by default
            >
              📺 Share Screen
            </button>
          )}
        </div>
      </div>

      {/* List of shared screens */}
      {sharedScreens.size > 0 && (
        <div className="space-y-2 mb-4">
          <h4 className="text-sm font-medium text-gray-700 flex items-center gap-2">
            👥 Available Screens ({sharedScreens.size})
          </h4>
          
          {Array.from(sharedScreens.values()).map((screen) => (
            <div
              key={screen.userId}
              className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-colors ${
                viewingScreen === screen.userId 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => viewSharedScreen(screen.userId)}
            >
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm font-medium text-gray-900">
                  {screen.userName}'s Screen
                </span>
              </div>
              
              <button className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700">
                {viewingScreen === screen.userId ? (
                  <>
                    🙈 Hide
                  </>
                ) : (
                  <>
                    👁️ View
                  </>
                )}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Screen share viewer */}
      {viewingScreen && (
        <div className="border rounded-lg p-2 bg-gray-50">
          <div className="aspect-video bg-black rounded-lg overflow-hidden">
            <video
              ref={(el) => {
                if (el && viewingScreen) {
                  videoRefs.current.set(viewingScreen, el);
                }
              }}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-contain"
            />
          </div>
          <div className="mt-2 text-center">
            <span className="text-sm text-gray-600">
              Viewing {sharedScreens.get(viewingScreen)?.userName}'s screen
            </span>
          </div>
        </div>
      )}

      {/* Instructions */}
      {sharedScreens.size === 0 && !isSharing && (
        <div className="text-center py-8 text-gray-500">
          <div className="text-6xl mb-3 opacity-50">📺</div>
          <p className="text-sm">
            {userRole === 'teacher' 
              ? 'Click "Share Screen" to share your screen with students'
              : 'Waiting for teacher to share screen...'
            }
          </p>
        </div>
      )}
    </div>
  );
};

export default ScreenSharing;