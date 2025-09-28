'use client';

import React, { useState } from 'react';

interface ControlPanelProps {
  isRecording: boolean;
  subtitlesEnabled: boolean;
  translationEnabled: boolean;
  selectedLanguage: string;
  onToggleRecording: () => void;
  onToggleSubtitles: () => void;
  onToggleTranslation: (enabled: boolean) => void;
  onLanguageChange: (language: string) => void;
}

const AVAILABLE_LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'it', name: 'Italian' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'ru', name: 'Russian' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'zh', name: 'Chinese' },
];

export default function ControlPanel({
  isRecording,
  subtitlesEnabled,
  translationEnabled,
  selectedLanguage,
  onToggleRecording,
  onToggleSubtitles,
  onToggleTranslation,
  onLanguageChange
}: ControlPanelProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
    <div className="bg-white border-t border-gray-200 px-6 py-4">
      {/* Primary Controls */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-4">
          {/* Recording Control */}
          <button
            onClick={onToggleRecording}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              isRecording
                ? 'bg-red-500 hover:bg-red-600 text-white'
                : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
            }`}
          >
            <span className="text-lg">{isRecording ? '⏹️' : '🔴'}</span>
            <span>{isRecording ? 'Stop Recording' : 'Start Recording'}</span>
          </button>

          {/* Recording Status */}
          {isRecording && (
            <div className="flex items-center space-x-2 text-red-600">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium">Recording...</span>
            </div>
          )}
        </div>

        {/* Advanced Controls Toggle */}
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
        >
          {showAdvanced ? 'Hide Advanced' : 'Show Advanced'} ⚙️
        </button>
      </div>

      {/* Advanced Controls */}
      {showAdvanced && (
        <div className="border-t border-gray-200 pt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Subtitles/Captions */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Live Captions
              </label>
              <button
                onClick={onToggleSubtitles}
                className={`w-full flex items-center justify-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  subtitlesEnabled
                    ? 'bg-green-100 text-green-800 border border-green-200'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <span>{subtitlesEnabled ? '📝✅' : '📝'}</span>
                <span>{subtitlesEnabled ? 'Captions On' : 'Enable Captions'}</span>
              </button>
            </div>

            {/* Translation */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Real-time Translation
              </label>
              <button
                onClick={() => onToggleTranslation(!translationEnabled)}
                className={`w-full flex items-center justify-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  translationEnabled
                    ? 'bg-blue-100 text-blue-800 border border-blue-200'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <span>{translationEnabled ? '🌐✅' : '🌐'}</span>
                <span>{translationEnabled ? 'Translation On' : 'Enable Translation'}</span>
              </button>
            </div>

            {/* Language Selection */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Primary Language
              </label>
              <select
                value={selectedLanguage}
                onChange={(e) => onLanguageChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              >
                {AVAILABLE_LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Session Info */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="text-center">
                <div className="font-semibold text-gray-900">Session Status</div>
                <div className="text-green-600">🟢 Live</div>
              </div>
              <div className="text-center">
                <div className="font-semibold text-gray-900">Recording</div>
                <div className={isRecording ? 'text-red-600' : 'text-gray-500'}>
                  {isRecording ? '🔴 Active' : '⚫ Inactive'}
                </div>
              </div>
              <div className="text-center">
                <div className="font-semibold text-gray-900">Captions</div>
                <div className={subtitlesEnabled ? 'text-green-600' : 'text-gray-500'}>
                  {subtitlesEnabled ? '📝 On' : '📝 Off'}
                </div>
              </div>
              <div className="text-center">
                <div className="font-semibold text-gray-900">Translation</div>
                <div className={translationEnabled ? 'text-blue-600' : 'text-gray-500'}>
                  {translationEnabled ? '🌐 On' : '🌐 Off'}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="mt-4 flex items-center justify-center space-x-4 text-xs text-gray-500">
        <div className="flex items-center space-x-1">
          <span>💡</span>
          <span>Tip: Use captions for better accessibility</span>
        </div>
        <div className="flex items-center space-x-1">
          <span>🌐</span>
          <span>Translation supports {AVAILABLE_LANGUAGES.length} languages</span>
        </div>
      </div>
    </div>
  );
}