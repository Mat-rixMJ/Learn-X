'use client';

import React, { useState } from 'react';
import VideoPlayer from '@/components/lectures/VideoPlayer';

export default function VideoWithCaptionsDemo() {
  const [selectedVideo, setSelectedVideo] = useState('');
  const [captionLanguages, setCaptionLanguages] = useState(['en-US', 'hi-IN', 'ta-IN', 'es-ES']);
  const [enableCaptions, setEnableCaptions] = useState(true);

  // Demo videos (you can replace these with actual video URLs)
  const demoVideos = [
    {
      id: 'demo1',
      title: 'Mathematics Lecture - Introduction to Calculus',
      url: '/uploads/videos/demo-math-lecture.mp4',
      description: 'A comprehensive introduction to calculus concepts'
    },
    {
      id: 'demo2', 
      title: 'Physics Lecture - Quantum Mechanics',
      url: '/uploads/videos/demo-physics-lecture.mp4',
      description: 'Fundamentals of quantum mechanics explained'
    },
    {
      id: 'demo3',
      title: 'English Lecture - Shakespeare Analysis',
      url: '/uploads/videos/demo-english-lecture.mp4', 
      description: 'Literary analysis of Shakespearean works'
    }
  ];

  const availableLanguages = {
    'en-US': 'English (US)',
    'hi-IN': 'Hindi',
    'ta-IN': 'Tamil',
    'te-IN': 'Telugu',
    'kn-IN': 'Kannada',
    'ml-IN': 'Malayalam',
    'bn-IN': 'Bengali',
    'gu-IN': 'Gujarati',
    'mr-IN': 'Marathi',
    'pa-IN': 'Punjabi',
    'es-ES': 'Spanish',
    'fr-FR': 'French',
    'de-DE': 'German',
    'it-IT': 'Italian',
    'pt-BR': 'Portuguese',
    'ja-JP': 'Japanese',
    'ko-KR': 'Korean',
    'zh-CN': 'Chinese',
    'ar-SA': 'Arabic',
    'ru-RU': 'Russian'
  };

  const handleLanguageToggle = (langCode: string) => {
    setCaptionLanguages(prev => {
      if (prev.includes(langCode)) {
        return prev.filter(lang => lang !== langCode);
      } else {
        return [...prev, langCode];
      }
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Multi-Language Video Captions Demo
          </h1>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            Experience real-time speech recognition and instant translation across 20+ languages. 
            Perfect for multilingual classrooms and global education.
          </p>
        </div>

        {/* Features Highlights */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z"/>
              </svg>
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Real-time Speech Recognition</h3>
            <p className="text-gray-600">Instant speech-to-text conversion using advanced Web Speech API</p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12.87 15.07l-2.54-2.51.03-.03c1.74-1.94 2.01-4.65.51-6.81L8.87 8l.66.66.03-.03c1.74-1.94 2.01-4.65.51-6.81L8.87 2l-4.24 4.24c-1.43 1.43-1.43 3.75 0 5.18L8.87 15.66c.39.39 1.02.39 1.41 0l2.54-2.51-.03-.03zm8.46-8.46L17.09 2.37c-.39-.39-1.02-.39-1.41 0L13.14 4.9c-1.43 1.43-1.43 3.75 0 5.18l4.24 4.24c.39.39 1.02.39 1.41 0l2.54-2.51c1.43-1.43 1.43-3.75 0-5.18z"/>
              </svg>
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Zero-Latency Translation</h3>
            <p className="text-gray-600">Instant translation with smart caching for seamless experience</p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-purple-600" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">20+ Languages Support</h3>
            <p className="text-gray-600">Comprehensive support for Indian and international languages</p>
          </div>
        </div>

        {/* Video Selection */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Select Demo Video</h2>
          <div className="grid md:grid-cols-3 gap-4">
            {demoVideos.map((video) => (
              <button
                key={video.id}
                onClick={() => setSelectedVideo(video.url)}
                className={`p-4 rounded-lg border-2 transition-all text-left ${
                  selectedVideo === video.url
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <h3 className="font-medium text-gray-900 mb-2">{video.title}</h3>
                <p className="text-sm text-gray-600">{video.description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Caption Settings */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Caption Settings</h2>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={enableCaptions}
                onChange={(e) => setEnableCaptions(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-gray-700">Enable Captions</span>
            </label>
          </div>

          <div>
            <h3 className="font-medium text-gray-900 mb-3">
              Caption Languages ({captionLanguages.length} selected)
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {Object.entries(availableLanguages).map(([code, name]) => (
                <label
                  key={code}
                  className={`flex items-center p-3 rounded-lg border cursor-pointer transition-all ${
                    captionLanguages.includes(code)
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={captionLanguages.includes(code)}
                    onChange={() => handleLanguageToggle(code)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-2"
                  />
                  <span className="text-sm font-medium">{name}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Video Player */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Video Player with Live Captions</h2>
          
          {selectedVideo ? (
            <div className="aspect-video bg-black rounded-lg overflow-hidden">
              <VideoPlayer
                videoUrl={selectedVideo}
                title={demoVideos.find(v => v.url === selectedVideo)?.title}
                enableCaptions={enableCaptions}
                captionLanguages={captionLanguages}
                controls={true}
                className="w-full h-full"
              />
            </div>
          ) : (
            <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center">
              <div className="text-center">
                <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18 3v2h-2V3H8v2H6V3H4v18h2v-2h2v2h8v-2h2v2h2V3h-2zM8 17H6v-2h2v2zm0-4H6v-2h2v2zm0-4H6V7h2v2zm10 8h-2v-2h2v2zm0-4h-2v-2h2v2zm0-4h-2V7h2v2z"/>
                </svg>
                <p className="text-gray-500 font-medium">Select a demo video to start</p>
                <p className="text-gray-400 text-sm mt-2">Choose from the videos above to see live captions in action</p>
              </div>
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="mt-8 bg-blue-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">How to Use</h3>
          <ol className="list-decimal list-inside space-y-2 text-blue-800">
            <li>Select a demo video from the options above</li>
            <li>Choose your preferred caption languages</li>
            <li>Click the play button to start the video</li>
            <li>Enable captions using the caption button in the video controls</li>
            <li>Speak or play audio - captions will appear in real-time</li>
            <li>Use the language selector in the caption overlay to switch between languages instantly</li>
          </ol>
        </div>

        {/* Technical Notes */}
        <div className="mt-6 bg-gray-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Technical Features</h3>
          <ul className="list-disc list-inside space-y-1 text-gray-700">
            <li><strong>Real-time Speech Recognition:</strong> Uses browser's Web Speech API for instant transcription</li>
            <li><strong>Smart Translation:</strong> Combines multiple translation services with intelligent fallback</li>
            <li><strong>Performance Optimized:</strong> Translation caching and 500ms timeout for zero-latency experience</li>
            <li><strong>Indian Language Support:</strong> Native support for Hindi, Tamil, Telugu, Kannada, Malayalam, Bengali, and more</li>
            <li><strong>Accessibility:</strong> Full keyboard navigation and screen reader support</li>
          </ul>
        </div>
      </div>
    </div>
  );
}