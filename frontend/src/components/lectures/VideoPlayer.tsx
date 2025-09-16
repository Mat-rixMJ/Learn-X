'use client';

import React, { useState, useRef, useEffect } from 'react';
import MultiLanguageCaption from './MultiLanguageCaption';

interface VideoPlayerProps {
  videoUrl: string;
  title?: string;
  className?: string;
  controls?: boolean;
  autoPlay?: boolean;
  muted?: boolean;
  poster?: string;
  enableCaptions?: boolean;
  captionLanguages?: string[];
  enableAI?: boolean; // New prop for AI features
  lectureId?: string; // For AI analysis
}

interface AIFeatures {
  audioTranscription: boolean;
  realTimeTranslation: boolean;
  captionGeneration: boolean;
  summaryGeneration: boolean;
}

export default function VideoPlayer({ 
  videoUrl, 
  title,
  className = "w-full",
  controls = true,
  autoPlay = false,
  muted = false,
  poster,
  enableCaptions = false,
  captionLanguages = ['en-US', 'hi-IN', 'ta-IN', 'es-ES'],
  enableAI = true, // Enable AI features by default
  lectureId
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(muted);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [captionsEnabled, setCaptionsEnabled] = useState(enableCaptions);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // AI Features State
  const [aiFeatures, setAiFeatures] = useState<AIFeatures>({
    audioTranscription: false,
    realTimeTranslation: false,
    captionGeneration: true,
    summaryGeneration: false
  });
  
  const [selectedLanguage, setSelectedLanguage] = useState('en-US');
  const [targetLanguages, setTargetLanguages] = useState(['hi-IN']);
  const [aiCaptions, setAiCaptions] = useState<any[]>([]);
  const [showLanguageSelector, setShowLanguageSelector] = useState(false);
  const [showAIControls, setShowAIControls] = useState(false);
  const [aiProcessing, setAiProcessing] = useState(false);
  const [aiProgress, setAiProgress] = useState(0);
  const [aiProgressText, setAiProgressText] = useState('');
  const [aiProcessingSteps, setAiProcessingSteps] = useState<string[]>([]);

  const availableLanguages = {
    'en-US': { name: 'English (US)', flag: '🇺🇸' },
    'hi-IN': { name: 'Hindi', flag: '🇮🇳' },
    'ta-IN': { name: 'Tamil', flag: '🇮🇳' },
    'te-IN': { name: 'Telugu', flag: '🇮🇳' },
    'kn-IN': { name: 'Kannada', flag: '🇮🇳' },
    'ml-IN': { name: 'Malayalam', flag: '🇮🇳' },
    'bn-IN': { name: 'Bengali', flag: '🇮🇳' },
    'gu-IN': { name: 'Gujarati', flag: '🇮🇳' },
    'mr-IN': { name: 'Marathi', flag: '🇮🇳' },
    'pa-IN': { name: 'Punjabi', flag: '🇮🇳' },
    'es-ES': { name: 'Spanish', flag: '🇪🇸' },
    'fr-FR': { name: 'French', flag: '🇫🇷' },
    'de-DE': { name: 'German', flag: '🇩🇪' },
    'ja-JP': { name: 'Japanese', flag: '🇯🇵' },
    'ko-KR': { name: 'Korean', flag: '🇰🇷' },
    'zh-CN': { name: 'Chinese', flag: '🇨🇳' }
  };

  // Get streaming URL for local videos
  const getStreamingUrl = (url: string) => {
    if (url.startsWith('/uploads/videos/')) {
      const filename = url.split('/').pop();
      return `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/stream/video/${filename}`;
    }
    return url;
  };

  const streamingUrl = getStreamingUrl(videoUrl);

  // Enhanced error handling for video loading
  const handleVideoError = (e: React.SyntheticEvent<HTMLVideoElement, Event>) => {
    const video = e.currentTarget;
    const error = video.error;
    let errorMessage = 'Failed to load video';
    
    if (error) {
      switch (error.code) {
        case error.MEDIA_ERR_ABORTED:
          errorMessage = 'Video loading was aborted';
          break;
        case error.MEDIA_ERR_NETWORK:
          errorMessage = 'Network error while loading video';
          break;
        case error.MEDIA_ERR_DECODE:
          errorMessage = 'Video decode error';
          break;
        case error.MEDIA_ERR_SRC_NOT_SUPPORTED:
          errorMessage = 'Video format not supported';
          break;
        default:
          errorMessage = 'Unknown video error';
      }
    }
    
    console.error('Video Error:', {
      errorCode: error?.code,
      errorMessage,
      videoUrl,
      streamingUrl,
      networkState: video.networkState,
      readyState: video.readyState
    });
    
    setError(errorMessage);
    setIsLoading(false);
  };

  const handleLoadedMetadata = () => {
    const video = videoRef.current;
    if (!video) return;
    setDuration(video.duration);
    console.log('Video metadata loaded, duration:', video.duration);
  };

  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video) return;
    setCurrentTime(video.currentTime);
  };

  const handleDurationChange = () => {
    const video = videoRef.current;
    if (!video) return;
    setDuration(video.duration);
  };

  const handleVideoVolumeChange = () => {
    const video = videoRef.current;
    if (!video) return;
    setVolume(video.volume);
    setIsMuted(video.muted);
  };

  // Check if video URL is valid
  if (!videoUrl || videoUrl.trim() === '') {
    return (
      <div className={`${className} bg-gray-100 rounded-lg flex items-center justify-center p-4 sm:p-8`}>
        <div className="text-center">
          <div className="text-4xl mb-2">🎥</div>
          <p className="text-gray-600 font-medium">No video available</p>
          <p className="text-sm text-gray-500 mt-1">This lecture doesn't have an associated video file</p>
        </div>
      </div>
    );
  }

  // AI Processing Functions
  const processVideoWithAI = async () => {
    if (!videoRef.current || !enableAI) return;
    
    setAiProcessing(true);
    setAiProgress(0);
    setAiProcessingSteps([]);
    
    try {
      // Step 1: Check Python services
      setAiProgressText('Checking AI services...');
      setAiProgress(10);
      setAiProcessingSteps(prev => [...prev, '✓ Connecting to AI services']);
      
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const healthResponse = await fetch(`${apiUrl}/api/python-services/health`);
      const healthData = await healthResponse.json();
      
      if (!healthData.success) {
        console.warn('Python services not available, using fallback');
        setAiProgressText('AI services not available');
        return;
      }

      setAiProgress(25);
      setAiProcessingSteps(prev => [...prev, '✓ AI services ready']);

      // Step 2: Process audio transcription if enabled (for captions or transcription)
      if (aiFeatures.audioTranscription || aiFeatures.captionGeneration) {
        setAiProgressText('Processing audio transcription...');
        setAiProgress(40);
        await processAudioTranscription();
        setAiProcessingSteps(prev => [...prev, '✓ Audio transcription completed']);
        setAiProgress(70);
      }

      // Step 3: Generate AI summary if enabled
      if (aiFeatures.summaryGeneration && lectureId) {
        setAiProgressText('Generating AI summary...');
        setAiProgress(80);
        await generateAISummary();
        setAiProcessingSteps(prev => [...prev, '✓ AI summary generated']);
      }

      // Step 4: Complete
      setAiProgressText('AI processing completed!');
      setAiProgress(100);
      setAiProcessingSteps(prev => [...prev, '✓ All AI features processed']);

    } catch (error) {
      console.error('AI processing failed:', error);
      setAiProgressText('AI processing failed');
      setAiProcessingSteps(prev => [...prev, '✗ Processing failed']);
    } finally {
      setTimeout(() => {
        setAiProcessing(false);
        setAiProgress(0);
        setAiProgressText('');
        setAiProcessingSteps([]);
      }, 2000);
    }
  };

  const processAudioTranscription = async () => {
    try {
      // Use the working AI notes processing endpoint
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const response = await fetch(`${apiUrl}/api/ai-notes/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoUrl: streamingUrl,
          lectureId,
          features: {
            audioTranscription: true,
            captionGeneration: true
          }
        })
      });

      const data = await response.json();
      if (data.success && data.data?.segments) {
        // Format captions with proper structure
        const formattedCaptions = data.data.segments.map((segment: any, index: number) => ({
          id: index,
          text: segment.text || segment.content || '',
          start: segment.start || 0,
          end: segment.end || (segment.start + 5), // Default 5 second duration
          language: selectedLanguage,
          translation: segment.translation || null
        }));
        
        console.log('✅ AI Captions loaded:', formattedCaptions);
        setAiCaptions(formattedCaptions);
        
        // Force caption generation feature to be enabled when captions are loaded
        setAiFeatures(prev => ({ ...prev, captionGeneration: true }));
        
        // If translation is enabled, add translated versions
        if (aiFeatures.realTimeTranslation && targetLanguages.length > 0) {
          await translateAiCaptions(formattedCaptions);
        }
      } else {
        console.warn('No caption segments received from AI processing');
      }
    } catch (error) {
      console.error('Audio transcription failed:', error);
    }
  };

  const translateAiCaptions = async (captions: any[]) => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const response = await fetch(`${apiUrl}/api/python-services/translation/translate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          texts: captions.map(cap => cap.text),
          sourceLanguage: selectedLanguage,
          targetLanguage: targetLanguages[0] // Use first target language
        })
      });

      const data = await response.json();
      if (data.success && data.translations) {
        const updatedCaptions = captions.map((caption, index) => ({
          ...caption,
          translation: data.translations[index] || null
        }));
        setAiCaptions(updatedCaptions);
      }
    } catch (error) {
      console.error('Caption translation failed:', error);
    }
  };

  const generateAISummary = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const response = await fetch(`${apiUrl}/api/ai-notes/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lectureId,
          generateSummary: true,
          generateKeyPoints: true
        })
      });

      const data = await response.json();
      if (data.success) {
        console.log('AI Summary generated:', data.analysis);
      }
    } catch (error) {
      console.error('AI summary generation failed:', error);
    }
  };

  const translateCaptions = async (text: string, targetLang: string) => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const response = await fetch(`${apiUrl}/api/python-services/translate/instant`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          targetLanguage: targetLang,
          sourceLanguage: selectedLanguage
        })
      });

      const data = await response.json();
      return data.success ? data.translatedText : text;
    } catch (error) {
      console.error('Translation failed:', error);
      return text;
    }
  };

  const toggleAIFeature = (feature: keyof AIFeatures) => {
    setAiFeatures(prev => ({
      ...prev,
      [feature]: !prev[feature]
    }));
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadedMetadata = () => {
      setDuration(video.duration);
      setIsLoading(false);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleVolumeChange = () => {
      setVolume(video.volume);
      setIsMuted(video.muted);
    };

    const handleError = () => {
      setError('Failed to load video');
      setIsLoading(false);
    };

    const handleLoadStart = () => setIsLoading(true);
    const handleCanPlay = () => setIsLoading(false);

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('volumechange', handleVolumeChange);
    video.addEventListener('error', handleError);
    video.addEventListener('loadstart', handleLoadStart);
    video.addEventListener('canplay', handleCanPlay);

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('volumechange', handleVolumeChange);
      video.removeEventListener('error', handleError);
      video.removeEventListener('loadstart', handleLoadStart);
      video.removeEventListener('canplay', handleCanPlay);
    };
  }, []);

  // Fullscreen event handling
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isActuallyFullscreen = !!(document.fullscreenElement || 
        (document as any).webkitFullscreenElement || 
        (document as any).mozFullScreenElement || 
        (document as any).msFullscreenElement);
      
      setIsFullscreen(isActuallyFullscreen);
    };

    // Add event listeners for fullscreen changes
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, []);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
    } else {
      video.play();
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;

    const newTime = (parseFloat(e.target.value) / 100) * duration;
    video.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;

    const newVolume = parseFloat(e.target.value) / 100;
    video.volume = newVolume;
    setVolume(newVolume);
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = !video.muted;
    setIsMuted(video.muted);
  };

  const toggleFullscreen = async () => {
    const video = videoRef.current;
    if (!video) return;

    try {
      // Check actual fullscreen state from document
      const isActuallyFullscreen = !!(document.fullscreenElement || 
        (document as any).webkitFullscreenElement || 
        (document as any).mozFullScreenElement || 
        (document as any).msFullscreenElement);

      if (!isActuallyFullscreen) {
        // Enter fullscreen
        if (video.requestFullscreen) {
          await video.requestFullscreen();
        } else if ((video as any).webkitRequestFullscreen) {
          await (video as any).webkitRequestFullscreen();
        } else if ((video as any).mozRequestFullScreen) {
          await (video as any).mozRequestFullScreen();
        } else if ((video as any).msRequestFullscreen) {
          await (video as any).msRequestFullscreen();
        }
      } else {
        // Exit fullscreen
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if ((document as any).webkitExitFullscreen) {
          await (document as any).webkitExitFullscreen();
        } else if ((document as any).mozCancelFullScreen) {
          await (document as any).mozCancelFullScreen();
        } else if ((document as any).msExitFullscreen) {
          await (document as any).msExitFullscreen();
        }
      }
    } catch (error) {
      console.warn('Fullscreen operation failed:', error);
      // Reset fullscreen state on error
      setIsFullscreen(false);
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;

  if (error) {
    return (
      <div className={`${className} bg-gray-100 rounded-lg flex items-center justify-center p-4 sm:p-8`}>
        <div className="text-center max-w-md">
          <div className="text-4xl mb-2">⚠️</div>
          <p className="text-red-600 font-medium mb-2">Failed to load video</p>
          <p className="text-sm text-gray-500 mb-3">{error}</p>
          <div className="text-xs text-gray-400 mb-3">
            <p><strong>Video URL:</strong> {videoUrl}</p>
            <p><strong>Streaming URL:</strong> {streamingUrl}</p>
          </div>
          <button 
            onClick={() => {
              setError(null);
              setIsLoading(true);
              if (videoRef.current) {
                videoRef.current.load();
              }
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
          >
            🔄 Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`${className} relative bg-black rounded-lg overflow-hidden group`}>
      {/* Video Element */}
      <video
        ref={videoRef}
        className="w-full h-full object-contain"
        autoPlay={autoPlay}
        muted={muted}
        poster={poster}
        preload="metadata"
        crossOrigin="anonymous"
        onContextMenu={(e) => e.preventDefault()} // Disable right-click context menu
        onLoadStart={() => {
          setIsLoading(true);
          setError(null);
          console.log('Video loading started:', streamingUrl);
        }}
        onLoadedMetadata={handleLoadedMetadata}
        onTimeUpdate={handleTimeUpdate}
        onDurationChange={handleDurationChange}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onVolumeChange={handleVideoVolumeChange}
        onError={handleVideoError}
        onCanPlay={() => {
          setIsLoading(false);
          console.log('Video can play');
        }}
        onWaiting={() => setIsLoading(true)}
        onPlaying={() => {
          setIsLoading(false);
          setError(null);
        }}
      >
        <source src={streamingUrl} type="video/mp4" />
        <p>Your browser does not support the video tag.</p>
        <p>Debug - Video URL: {streamingUrl}</p>
      </video>

      {/* Multi-Language Captions */}
      {enableCaptions && captionsEnabled && (
        <MultiLanguageCaption
          videoRef={videoRef}
          enabled={captionsEnabled}
          sourceLanguage={selectedLanguage}
          targetLanguages={targetLanguages}
          className="absolute bottom-16 left-4 right-4"
        />
      )}

      {/* Enhanced AI Generated Captions Display */}
      {(aiFeatures.captionGeneration || aiFeatures.realTimeTranslation) && aiCaptions.length > 0 && (
        <div className="absolute bottom-20 sm:bottom-24 left-4 right-4 text-center">
          <div className="inline-block bg-black bg-opacity-90 text-white px-4 py-3 rounded-lg text-sm sm:text-base max-w-full backdrop-blur-sm border border-gray-600 shadow-lg">
            {aiCaptions
              .filter(caption => {
                const isActive = currentTime >= caption.start && currentTime <= caption.end;
                if (isActive) {
                  console.log('🎯 Active caption:', caption, 'currentTime:', currentTime);
                }
                return isActive;
              })
              .map((caption, index) => (
                <div key={index} className="leading-relaxed">
                  <div className="font-medium">{caption.text}</div>
                  {caption.translation && (
                    <div className="text-xs mt-2 text-blue-300 bg-blue-900 bg-opacity-50 rounded px-2 py-1 border border-blue-700">
                      🌐 {caption.translation}
                    </div>
                  )}
                </div>
              ))
            }
          </div>
        </div>
      )}

      {/* Caption Debug Panel (Development Only) */}
      {process.env.NODE_ENV === 'development' && aiCaptions.length > 0 && (
        <div className="absolute top-4 right-4 bg-black bg-opacity-75 text-white p-2 rounded text-xs max-w-xs z-50">
          <div className="font-bold mb-1">🔍 AI Captions Debug ({aiCaptions.length})</div>
          <div>Current Time: {currentTime.toFixed(1)}s</div>
          <div className="max-h-32 overflow-y-auto">
            {aiCaptions.slice(0, 3).map((caption, index) => (
              <div key={index} className="border-t border-gray-600 pt-1 mt-1">
                <div className="text-xs">
                  {caption.start.toFixed(1)}-{caption.end.toFixed(1)}s: {caption.text.substring(0, 30)}...
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Enhanced Error Display */}
      {error && (
        <div className="absolute inset-0 bg-black bg-opacity-90 flex items-center justify-center z-40">
          <div className="text-white text-center max-w-md mx-4">
            <div className="text-6xl mb-4">⚠️</div>
            <h3 className="text-xl font-bold mb-2">Video Error</h3>
            <p className="text-gray-300 mb-4">{error}</p>
            <div className="text-xs text-gray-400 space-y-1">
              <p><strong>Original URL:</strong> {videoUrl}</p>
              <p><strong>Streaming URL:</strong> {streamingUrl}</p>
            </div>
            <button
              onClick={() => {
                setError(null);
                setIsLoading(true);
                const video = videoRef.current;
                if (video) {
                  video.load(); // Reload the video
                }
              }}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              🔄 Retry
            </button>
          </div>
        </div>
      )}

      {/* Enhanced Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-black bg-opacity-70 flex items-center justify-center backdrop-blur-sm">
          <div className="text-white text-center p-8 bg-gray-900 bg-opacity-80 rounded-xl border border-gray-700 shadow-2xl">
            <div className="relative mb-6">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-gray-600 border-t-blue-500 mx-auto"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-8 h-8 bg-blue-500 rounded-full animate-pulse"></div>
              </div>
            </div>
            <p className="text-lg font-medium mb-2">Loading video...</p>
            <p className="text-sm text-gray-400">Please wait while we prepare your content</p>
          </div>
        </div>
      )}

      {/* AI Processing Overlay */}
      {aiProcessing && (
        <div className="absolute inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="text-white text-center bg-gray-900 bg-opacity-90 rounded-lg p-6 max-w-md mx-4">
            <div className="mb-4">
              <div className="text-2xl mb-2">🤖</div>
              <h3 className="text-lg font-semibold mb-2">AI Processing</h3>
              <p className="text-sm text-gray-300">{aiProgressText}</p>
            </div>
            
            {/* Progress Bar */}
            <div className="mb-4">
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-purple-500 to-blue-500 h-2 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${aiProgress}%` }}
                ></div>
              </div>
              <div className="text-xs text-gray-400 mt-1">{aiProgress}% complete</div>
            </div>

            {/* Processing Steps */}
            {aiProcessingSteps.length > 0 && (
              <div className="text-left">
                <div className="text-xs text-gray-400 mb-2">Progress:</div>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {aiProcessingSteps.map((step, index) => (
                    <div key={index} className="text-xs text-gray-300 flex items-center">
                      <span className="mr-2">{step}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Custom Controls - Enhanced Design */}
      {controls && !isLoading && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/80 to-transparent p-3 sm:p-6 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all duration-300 ease-in-out">
          {/* Progress Bar - Enhanced */}
          <div className="mb-4 sm:mb-6">
            <input
              type="range"
              min="0"
              max="100"
              value={progressPercentage}
              onChange={handleSeek}
              className="w-full h-2 sm:h-3 bg-gray-600 rounded-lg appearance-none cursor-pointer hover:h-3 sm:hover:h-4 transition-all duration-200"
              style={{
                background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${progressPercentage}%, #374151 ${progressPercentage}%, #374151 100%)`
              }}
            />
            {/* Time stamps on progress bar */}
            <div className="flex justify-between text-xs text-gray-300 mt-1">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Main Control Row */}
          <div className="flex items-center justify-between text-white">
            {/* Left Controls Group */}
            <div className="flex items-center space-x-3 sm:space-x-4">
              {/* Play/Pause Button - Enhanced */}
              <button
                onClick={togglePlay}
                className="group hover:bg-white hover:bg-opacity-20 rounded-full p-2 sm:p-3 transition-all duration-200 transform hover:scale-105"
              >
                {isPlaying ? (
                  <svg className="w-5 h-5 sm:w-7 sm:h-7 transition-transform group-hover:scale-110" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
                  </svg>
                ) : (
                  <svg className="w-5 h-5 sm:w-7 sm:h-7 transition-transform group-hover:scale-110" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z"/>
                  </svg>
                )}
              </button>

              {/* Volume Controls - Enhanced */}
              <div className="hidden sm:flex items-center space-x-3 bg-black bg-opacity-30 rounded-full px-3 py-2">
                <button 
                  onClick={toggleMute} 
                  className="hover:bg-white hover:bg-opacity-20 rounded-full p-2 transition-all duration-200 transform hover:scale-105"
                >
                  {isMuted || volume === 0 ? (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
                    </svg>
                  )}
                </button>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={isMuted ? 0 : volume * 100}
                  onChange={handleVolumeChange}
                  className="w-20 sm:w-24 h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, #ffffff 0%, #ffffff ${isMuted ? 0 : volume * 100}%, #374151 ${isMuted ? 0 : volume * 100}%, #374151 100%)`
                  }}
                />
                <span className="text-xs text-gray-300 min-w-[3rem]">
                  {Math.round((isMuted ? 0 : volume) * 100)}%
                </span>
              </div>
            </div>

            {/* Center Controls Group */}
            <div className="flex items-center space-x-2 sm:space-x-3">
              {/* Mobile Volume Toggle */}
              <button 
                onClick={toggleMute} 
                className="sm:hidden hover:bg-white hover:bg-opacity-20 rounded-full p-2 transition-all duration-200"
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted || volume === 0 ? (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
                  </svg>
                )}
              </button>
            </div>

            {/* Right Controls Group */}
            <div className="flex items-center space-x-2 sm:space-x-3">{/* AI Controls Button - Enhanced */}
              {enableAI && (
                <div className="relative">
                  <button
                    onClick={() => setShowAIControls(!showAIControls)}
                    className={`group hover:bg-white hover:bg-opacity-20 rounded-full p-2 sm:p-3 transition-all duration-200 transform hover:scale-105 ${
                      Object.values(aiFeatures).some(Boolean) ? 'bg-gradient-to-r from-purple-600 to-blue-600' : 'bg-black bg-opacity-30'
                    } ${aiProcessing ? 'animate-pulse' : ''}`}
                    title="AI Features"
                    disabled={aiProcessing}
                  >
                    {aiProcessing ? (
                      <svg className="w-5 h-5 sm:w-6 sm:h-6 animate-spin" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                      </svg>
                    ) : (
                      <span className="text-lg sm:text-xl group-hover:scale-110 transition-transform">🤖</span>
                    )}
                    {aiCaptions.length > 0 && (
                      <span className="absolute -top-1 -right-1 bg-green-500 text-white text-xs rounded-full w-3 h-3 flex items-center justify-center animate-pulse">
                        ✓
                      </span>
                    )}
                  </button>

                  {/* AI Controls Dropdown - Enhanced */}
                  {showAIControls && !aiProcessing && (
                    <div className="absolute bottom-full left-0 mb-3 bg-gray-900 bg-opacity-95 backdrop-blur-sm rounded-xl shadow-2xl border border-gray-700 p-6 min-w-80 z-50 animate-in slide-in-from-bottom-2 duration-300">
                      <div className="flex items-center justify-between mb-5">
                        <h4 className="text-white font-semibold text-lg flex items-center">
                          <span className="mr-3 text-2xl">🤖</span>
                          AI Features
                        </h4>
                        <button
                          onClick={() => setShowAIControls(false)}
                          className="text-gray-400 hover:text-white transition-colors p-1 rounded-full hover:bg-gray-700"
                        >
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </div>
                      
                      <div className="space-y-4">
                        {/* Audio Transcription */}
                        <div className="bg-gray-800 rounded-lg p-4 border border-gray-600 hover:border-gray-500 transition-colors">
                          <label className="flex items-center text-white cursor-pointer">
                            <div className="relative">
                              <input
                                type="checkbox"
                                checked={aiFeatures.audioTranscription}
                                onChange={() => toggleAIFeature('audioTranscription')}
                                className="sr-only"
                              />
                              <div className={`w-5 h-5 rounded border-2 mr-3 flex items-center justify-center transition-all ${
                                aiFeatures.audioTranscription 
                                  ? 'bg-blue-600 border-blue-600' 
                                  : 'border-gray-400 hover:border-blue-400'
                              }`}>
                                {aiFeatures.audioTranscription && (
                                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                )}
                              </div>
                            </div>
                            <div>
                              <div className="flex items-center">
                                <span className="mr-2 text-xl">🎤</span>
                                <span className="font-medium">Audio Transcription</span>
                              </div>
                              <p className="text-xs text-gray-400 mt-1">Convert speech to text with timestamps</p>
                            </div>
                          </label>
                        </div>

                        {/* Real-time Translation */}
                        <div className="bg-gray-800 rounded-lg p-4 border border-gray-600 hover:border-gray-500 transition-colors">
                          <label className="flex items-center text-white cursor-pointer">
                            <div className="relative">
                              <input
                                type="checkbox"
                                checked={aiFeatures.realTimeTranslation}
                                onChange={() => toggleAIFeature('realTimeTranslation')}
                                className="sr-only"
                              />
                              <div className={`w-5 h-5 rounded border-2 mr-3 flex items-center justify-center transition-all ${
                                aiFeatures.realTimeTranslation 
                                  ? 'bg-green-600 border-green-600' 
                                  : 'border-gray-400 hover:border-green-400'
                              }`}>
                                {aiFeatures.realTimeTranslation && (
                                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                )}
                              </div>
                            </div>
                            <div>
                              <div className="flex items-center">
                                <span className="mr-2 text-xl">🌐</span>
                                <span className="font-medium">Real-time Translation</span>
                              </div>
                              <p className="text-xs text-gray-400 mt-1">Translate captions to multiple languages</p>
                            </div>
                          </label>
                        </div>

                        {/* Smart Captions */}
                        <div className="bg-gray-800 rounded-lg p-4 border border-gray-600 hover:border-gray-500 transition-colors">
                          <label className="flex items-center text-white cursor-pointer">
                            <div className="relative">
                              <input
                                type="checkbox"
                                checked={aiFeatures.captionGeneration}
                                onChange={() => toggleAIFeature('captionGeneration')}
                                className="sr-only"
                              />
                              <div className={`w-5 h-5 rounded border-2 mr-3 flex items-center justify-center transition-all ${
                                aiFeatures.captionGeneration 
                                  ? 'bg-purple-600 border-purple-600' 
                                  : 'border-gray-400 hover:border-purple-400'
                              }`}>
                                {aiFeatures.captionGeneration && (
                                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                )}
                              </div>
                            </div>
                            <div>
                              <div className="flex items-center">
                                <span className="mr-2 text-xl">📝</span>
                                <span className="font-medium">Smart Captions</span>
                              </div>
                              <p className="text-xs text-gray-400 mt-1">AI-powered caption generation and formatting</p>
                            </div>
                          </label>
                        </div>

                        {/* AI Summary */}
                        <div className="bg-gray-800 rounded-lg p-4 border border-gray-600 hover:border-gray-500 transition-colors">
                          <label className="flex items-center text-white cursor-pointer">
                            <div className="relative">
                              <input
                                type="checkbox"
                                checked={aiFeatures.summaryGeneration}
                                onChange={() => toggleAIFeature('summaryGeneration')}
                                className="sr-only"
                              />
                              <div className={`w-5 h-5 rounded border-2 mr-3 flex items-center justify-center transition-all ${
                                aiFeatures.summaryGeneration 
                                  ? 'bg-orange-600 border-orange-600' 
                                  : 'border-gray-400 hover:border-orange-400'
                              }`}>
                                {aiFeatures.summaryGeneration && (
                                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                )}
                              </div>
                            </div>
                            <div>
                              <div className="flex items-center">
                                <span className="mr-2 text-xl">📊</span>
                                <span className="font-medium">AI Summary</span>
                              </div>
                              <p className="text-xs text-gray-400 mt-1">Generate intelligent content summaries</p>
                            </div>
                          </label>
                        </div>
                      </div>

                      <div className="border-t border-gray-700 pt-4 mt-6">
                        <button
                          onClick={processVideoWithAI}
                          disabled={aiProcessing || !Object.values(aiFeatures).some(Boolean)}
                          className="w-full px-4 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-medium hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105 disabled:hover:scale-100"
                        >
                          {aiProcessing ? (
                            <span className="flex items-center justify-center">
                              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              Processing...
                            </span>
                          ) : (
                            <span className="flex items-center justify-center">
                              <span className="mr-2">🚀</span>
                              Start AI Processing
                            </span>
                          )}
                        </button>
                        
                        {/* AI Status Indicator */}
                        {aiCaptions.length > 0 && (
                          <div className="mt-3 text-center">
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-green-600 text-white">
                              ✓ AI Captions Ready ({aiCaptions.length} segments)
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Right Side Controls */}
            <div className="flex items-center space-x-1 sm:space-x-2">
              {/* Volume Toggle for Mobile */}
              <button 
                onClick={toggleMute} 
                className="sm:hidden hover:bg-white hover:bg-opacity-20 rounded-full p-1 transition-colors"
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted || volume === 0 ? (
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
                  </svg>
                )}
              </button>

              {/* Language Selector */}
              {(captionsEnabled || aiFeatures.realTimeTranslation || aiFeatures.captionGeneration) && (
                <div className="relative">
                  <button
                    onClick={() => setShowLanguageSelector(!showLanguageSelector)}
                    className={`group hover:bg-white hover:bg-opacity-20 rounded-full p-2 sm:p-3 transition-all duration-200 transform hover:scale-105 ${
                      showLanguageSelector || targetLanguages.length > 0 ? 'bg-blue-600' : 'bg-black bg-opacity-30'
                    }`}
                    title="Language Settings"
                  >
                    <svg className="w-5 h-5 sm:w-6 sm:h-6 group-hover:scale-110 transition-transform" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12.87 15.07l-2.54-2.51.03-.03c1.74-1.94 2.01-4.65.51-6.81L8.87 8l4.24-4.24c1.43-1.43 1.43-3.75 0-5.18L8.87 2.37c-.39-.39-1.02-.39-1.41 0L2.22 7.61c-1.43 1.43-1.43 3.75 0 5.18l4.24 4.24c.39.39 1.02.39 1.41 0l2.54-2.51c1.43-1.43 1.43-3.75 0-5.18z"/>
                    </svg>
                    {targetLanguages.length > 0 && (
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center animate-pulse">
                        {targetLanguages.length}
                      </span>
                    )}
                  </button>

                  {/* Language Dropdown - Enhanced */}
                  {showLanguageSelector && (
                    <div className="absolute bottom-full right-0 mb-3 bg-gray-900 bg-opacity-95 backdrop-blur-sm rounded-xl shadow-2xl border border-gray-700 p-6 min-w-72 sm:min-w-80 z-50 animate-in slide-in-from-bottom-2 duration-300">
                      <div className="flex items-center justify-between mb-5">
                        <h4 className="text-white font-semibold text-lg flex items-center">
                          <span className="mr-3 text-2xl">🌍</span>
                          Languages
                        </h4>
                        <button
                          onClick={() => setShowLanguageSelector(false)}
                          className="text-gray-400 hover:text-white transition-colors p-1 rounded-full hover:bg-gray-700"
                        >
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </div>
                      
                      <div className="space-y-4">
                        {/* Source Language */}
                        <div className="bg-gray-800 rounded-lg p-4 border border-gray-600">
                          <label className="block text-white text-sm font-medium mb-2">
                            🎯 Source Language:
                          </label>
                          <div className="relative">
                            <select
                              value={selectedLanguage}
                              onChange={(e) => setSelectedLanguage(e.target.value)}
                              className="w-full bg-gray-700 text-white rounded-lg p-3 text-sm appearance-none cursor-pointer hover:bg-gray-600 transition-colors border border-gray-600 focus:border-blue-500 focus:outline-none"
                            >
                              {Object.entries(availableLanguages).map(([code, lang]) => (
                                <option key={code} value={code}>
                                  {lang.flag} {lang.name}
                                </option>
                              ))}
                            </select>
                            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                              <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                              </svg>
                            </div>
                          </div>
                        </div>

                        {/* Translation Languages */}
                        <div className="bg-gray-800 rounded-lg p-4 border border-gray-600">
                          <label className="block text-white text-sm font-medium mb-3">
                            🔄 Translation Languages:
                          </label>
                          <div className="max-h-40 overflow-y-auto space-y-2 pr-2">
                            {Object.entries(availableLanguages).map(([code, lang]) => (
                              <label key={code} className="flex items-center text-white text-sm cursor-pointer hover:bg-gray-700 rounded p-2 transition-colors">
                                <div className="relative">
                                  <input
                                    type="checkbox"
                                    checked={targetLanguages.includes(code)}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setTargetLanguages(prev => [...prev, code]);
                                      } else {
                                        setTargetLanguages(prev => prev.filter(lang => lang !== code));
                                      }
                                    }}
                                    className="sr-only"
                                  />
                                  <div className={`w-4 h-4 rounded border-2 mr-3 flex items-center justify-center transition-all ${
                                    targetLanguages.includes(code) 
                                      ? 'bg-blue-600 border-blue-600' 
                                      : 'border-gray-400 hover:border-blue-400'
                                  }`}>
                                    {targetLanguages.includes(code) && (
                                      <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                      </svg>
                                    )}
                                  </div>
                                </div>
                                <span className="flex items-center">
                                  <span className="mr-2 text-base">{lang.flag}</span>
                                  {lang.name}
                                </span>
                              </label>
                            ))}
                          </div>
                          
                          {targetLanguages.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-gray-700">
                              <div className="flex flex-wrap gap-2">
                                {targetLanguages.map(langCode => {
                                  const lang = availableLanguages[langCode as keyof typeof availableLanguages];
                                  return lang ? (
                                    <span key={langCode} className="inline-flex items-center bg-blue-600 text-white text-xs px-2 py-1 rounded-full">
                                      <span className="mr-1">{lang.flag}</span>
                                      {lang.name}
                                      <button
                                        onClick={() => setTargetLanguages(prev => prev.filter(lang => lang !== langCode))}
                                        className="ml-1 hover:bg-blue-700 rounded-full p-0.5 transition-colors"
                                      >
                                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                        </svg>
                                      </button>
                                    </span>
                                  ) : null;
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Caption Toggle Button */}
              <button
                onClick={() => setCaptionsEnabled(!captionsEnabled)}
                className={`group hover:bg-white hover:bg-opacity-20 rounded-full p-2 sm:p-3 transition-all duration-200 transform hover:scale-105 ${
                  captionsEnabled || aiFeatures.captionGeneration ? 'bg-blue-600' : 'bg-black bg-opacity-30'
                }`}
                title={captionsEnabled ? 'Disable Captions' : 'Enable Captions'}
              >
                <svg className="w-5 h-5 sm:w-6 sm:h-6 group-hover:scale-110 transition-transform" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19 4H5C3.9 4 3 4.9 3 6v12c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zM7.5 15H6v-4.5h1.5V15zM13 15h-1.5v-4.5H13V15zM18 15h-1.5v-4.5H18V15z"/>
                </svg>
                {(captionsEnabled || aiFeatures.captionGeneration) && (
                  <span className="absolute -top-1 -right-1 bg-green-500 text-white text-xs rounded-full w-3 h-3 animate-pulse"></span>
                )}
              </button>
              
              {/* Fullscreen Button */}
              <button
                onClick={toggleFullscreen}
                className="group hover:bg-white hover:bg-opacity-20 rounded-full p-2 sm:p-3 transition-all duration-200 transform hover:scale-105 bg-black bg-opacity-30"
                title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
              >
                {isFullscreen ? (
                  <svg className="w-5 h-5 sm:w-6 sm:h-6 group-hover:scale-110 transition-transform" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"/>
                  </svg>
                ) : (
                  <svg className="w-5 h-5 sm:w-6 sm:h-6 group-hover:scale-110 transition-transform" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/>
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Title Overlay */}
      {title && (
        <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black via-black/60 to-transparent p-4 sm:p-6 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all duration-300">
          <h3 className="text-white font-semibold text-lg sm:text-xl truncate flex items-center">
            <span className="mr-3 text-2xl">🎥</span>
            {title}
          </h3>
        </div>
      )}
    </div>
  );
}