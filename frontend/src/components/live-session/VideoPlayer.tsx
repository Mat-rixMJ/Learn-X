'use client';

import React, { useEffect, useState } from 'react';

interface VideoPlayerProps {
  localVideoRef: React.RefObject<HTMLVideoElement | null>;
  remoteVideoRef: React.RefObject<HTMLVideoElement | null>;
  userRole: 'teacher' | 'student' | null;
  isStreaming: boolean;
  onStartStream: () => Promise<MediaStream | undefined>;
}

export default function VideoPlayer({
  localVideoRef,
  remoteVideoRef,
  userRole,
  isStreaming,
  onStartStream
}: VideoPlayerProps) {
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);

  const startVideo = async () => {
    try {
      const stream = await onStartStream();
      if (stream) {
        setLocalStream(stream);
      }
    } catch (error) {
      console.error('Error starting video:', error);
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      const videoTracks = localStream.getVideoTracks();
      videoTracks.forEach(track => {
        track.enabled = !isVideoEnabled;
      });
      setIsVideoEnabled(!isVideoEnabled);
    }
  };

  const toggleAudio = () => {
    if (localStream) {
      const audioTracks = localStream.getAudioTracks();
      audioTracks.forEach(track => {
        track.enabled = !isAudioEnabled;
      });
      setIsAudioEnabled(!isAudioEnabled);
    }
  };

  const startScreenShare = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true
      });

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      setIsScreenSharing(true);
      setLocalStream(stream);

      // Handle when user stops screen sharing
      stream.getVideoTracks()[0].onended = () => {
        setIsScreenSharing(false);
        startVideo(); // Return to camera
      };
    } catch (error) {
      console.error('Error starting screen share:', error);
    }
  };

  const stopScreenShare = () => {
    if (localStream && isScreenSharing) {
      localStream.getTracks().forEach(track => track.stop());
      setIsScreenSharing(false);
      startVideo(); // Return to camera
    }
  };

  return (
    <div className="relative w-full h-full bg-gray-900 flex items-center justify-center">
      {/* Remote Video (Teacher's stream for students) */}
      {userRole === 'student' && (
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="w-full h-full object-cover"
          style={{ transform: 'scaleX(-1)' }} // Mirror effect
        />
      )}

      {/* Local Video (Teacher's camera) */}
      {userRole === 'teacher' && (
        <video
          ref={localVideoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
          style={{ transform: 'scaleX(-1)' }} // Mirror effect
        />
      )}

      {/* No Video State */}
      {!isStreaming && (
        <div className="text-center text-white">
          <div className="mb-4">
            <div className="w-24 h-24 mx-auto mb-4 text-gray-400 text-6xl">📹</div>
            <h3 className="text-xl font-semibold mb-2">
              {userRole === 'teacher' ? 'Start Your Stream' : 'Waiting for Teacher'}
            </h3>
            <p className="text-gray-300">
              {userRole === 'teacher' 
                ? 'Click the button below to start streaming'
                : 'The teacher will start the session shortly'
              }
            </p>
          </div>
          {userRole === 'teacher' && (
            <button
              onClick={startVideo}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2 mx-auto"
            >
              <span>▶️</span>
              <span>Start Stream</span>
            </button>
          )}
        </div>
      )}

      {/* Video Controls Overlay */}
      {userRole === 'teacher' && isStreaming && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
          <div className="flex items-center space-x-3 bg-black bg-opacity-50 rounded-lg px-4 py-2">
            {/* Video Toggle */}
            <button
              onClick={toggleVideo}
              className={`p-3 rounded-full transition-colors ${
                isVideoEnabled 
                  ? 'bg-gray-700 hover:bg-gray-600 text-white' 
                  : 'bg-red-600 hover:bg-red-700 text-white'
              }`}
              title={isVideoEnabled ? 'Turn off camera' : 'Turn on camera'}
            >
              {isVideoEnabled ? '📹' : '📹❌'}
            </button>

            {/* Audio Toggle */}
            <button
              onClick={toggleAudio}
              className={`p-3 rounded-full transition-colors ${
                isAudioEnabled 
                  ? 'bg-gray-700 hover:bg-gray-600 text-white' 
                  : 'bg-red-600 hover:bg-red-700 text-white'
              }`}
              title={isAudioEnabled ? 'Mute microphone' : 'Unmute microphone'}
            >
              {isAudioEnabled ? '🎤' : '🎤❌'}
            </button>

            {/* Screen Share Toggle */}
            <button
              onClick={isScreenSharing ? stopScreenShare : startScreenShare}
              className={`p-3 rounded-full transition-colors ${
                isScreenSharing
                  ? 'bg-green-600 hover:bg-green-700 text-white'
                  : 'bg-gray-700 hover:bg-gray-600 text-white'
              }`}
              title={isScreenSharing ? 'Stop screen sharing' : 'Share screen'}
            >
              {isScreenSharing ? '🖥️✅' : '🖥️'}
            </button>
          </div>
        </div>
      )}

      {/* Video Status Indicators */}
      <div className="absolute top-4 left-4 flex flex-col space-y-2">
        {!isVideoEnabled && (
          <div className="px-3 py-1 bg-red-600 text-white text-sm rounded-full">
            Camera Off
          </div>
        )}
        {!isAudioEnabled && (
          <div className="px-3 py-1 bg-red-600 text-white text-sm rounded-full">
            Muted
          </div>
        )}
        {isScreenSharing && (
          <div className="px-3 py-1 bg-green-600 text-white text-sm rounded-full">
            Screen Sharing
          </div>
        )}
      </div>

      {/* Connection Status */}
      <div className="absolute top-4 right-4">
        <div className="px-3 py-1 bg-black bg-opacity-50 text-white text-sm rounded-full">
          🟢 Live
        </div>
      </div>
    </div>
  );
}