'use client';

import React, { useState, useEffect } from 'react';
import { LiveCaption } from '@/types/live-session';

interface SubtitleOverlayProps {
  captions: LiveCaption[];
  selectedLanguage: string;
  translationEnabled: boolean;
}

export default function SubtitleOverlay({
  captions,
  selectedLanguage,
  translationEnabled
}: SubtitleOverlayProps) {
  const [position, setPosition] = useState<'bottom' | 'top' | 'center'>('bottom');
  const [fontSize, setFontSize] = useState<'small' | 'medium' | 'large'>('medium');
  const [showSettings, setShowSettings] = useState(false);
  const [currentCaption, setCurrentCaption] = useState<LiveCaption | null>(null);

  // Show the most recent caption for a few seconds
  useEffect(() => {
    if (captions.length > 0) {
      const latestCaption = captions[captions.length - 1];
      setCurrentCaption(latestCaption);

      // Hide caption after 5 seconds
      const timer = setTimeout(() => {
        setCurrentCaption(null);
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [captions]);

  const getCaptionText = (caption: LiveCaption) => {
    if (translationEnabled && caption.translations?.[selectedLanguage]) {
      return caption.translations[selectedLanguage];
    }
    return caption.text;
  };

  const getPositionClasses = () => {
    switch (position) {
      case 'top':
        return 'top-4';
      case 'center':
        return 'top-1/2 transform -translate-y-1/2';
      case 'bottom':
      default:
        return 'bottom-20';
    }
  };

  const getFontSizeClasses = () => {
    switch (fontSize) {
      case 'small':
        return 'text-sm';
      case 'large':
        return 'text-xl';
      case 'medium':
      default:
        return 'text-base';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'border-green-500';
    if (confidence >= 0.6) return 'border-yellow-500';
    return 'border-red-500';
  };

  if (!currentCaption) return null;

  return (
    <div className="absolute inset-0 pointer-events-none z-10">
      {/* Settings Button */}
      <div className="absolute top-4 right-4 pointer-events-auto">
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="p-2 bg-black bg-opacity-50 text-white rounded-full hover:bg-opacity-70 transition-all"
          title="Subtitle Settings"
        >
          ⚙️
        </button>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="absolute top-16 right-4 bg-white rounded-lg shadow-lg p-4 pointer-events-auto z-20">
          <h3 className="font-semibold text-gray-900 mb-3">Subtitle Settings</h3>
          
          {/* Position */}
          <div className="mb-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Position
            </label>
            <select
              value={position}
              onChange={(e) => setPosition(e.target.value as 'bottom' | 'top' | 'center')}
              className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
            >
              <option value="bottom">Bottom</option>
              <option value="center">Center</option>
              <option value="top">Top</option>
            </select>
          </div>

          {/* Font Size */}
          <div className="mb-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Font Size
            </label>
            <select
              value={fontSize}
              onChange={(e) => setFontSize(e.target.value as 'small' | 'medium' | 'large')}
              className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
            >
              <option value="small">Small</option>
              <option value="medium">Medium</option>
              <option value="large">Large</option>
            </select>
          </div>

          {/* Language Info */}
          {translationEnabled && (
            <div className="mb-3">
              <div className="text-sm text-gray-600">
                <div className="flex items-center space-x-1">
                  <span>🌐</span>
                  <span>Showing: {selectedLanguage.toUpperCase()}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Caption Display */}
      <div className={`absolute left-1/2 transform -translate-x-1/2 ${getPositionClasses()}`}>
        <div className={`max-w-3xl px-4 py-2 bg-black bg-opacity-80 text-white rounded-lg ${getFontSizeClasses()} ${getConfidenceColor(currentCaption.confidence || 0.8)} border-l-4`}>
          <div className="text-center">
            {getCaptionText(currentCaption)}
          </div>
          
          {/* Confidence Indicator */}
          <div className="flex items-center justify-center mt-1 space-x-2">
            <div className="flex items-center space-x-1">
              <div className={`w-2 h-2 rounded-full ${
                (currentCaption.confidence || 0.8) >= 0.8 ? 'bg-green-500' : 
                (currentCaption.confidence || 0.8) >= 0.6 ? 'bg-yellow-500' : 'bg-red-500'
              }`}></div>
              <span className="text-xs opacity-75">
                {Math.round((currentCaption.confidence || 0.8) * 100)}%
              </span>
            </div>
            
            {translationEnabled && currentCaption.translations?.[selectedLanguage] && (
              <div className="text-xs opacity-75">
                🌐 Translated
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Caption History (Optional) */}
      {captions.length > 1 && (
        <div className="absolute bottom-4 left-4 pointer-events-auto">
          <details className="bg-black bg-opacity-50 text-white rounded-lg text-sm">
            <summary className="p-2 cursor-pointer hover:bg-opacity-70">
              📝 Caption History ({captions.length})
            </summary>
            <div className="max-h-40 overflow-y-auto p-2 space-y-1">
              {captions.slice(-10).reverse().map((caption, index) => (
                <div key={caption.id} className="text-xs opacity-75 border-b border-gray-600 pb-1">
                  {getCaptionText(caption)}
                </div>
              ))}
            </div>
          </details>
        </div>
      )}
    </div>
  );
}