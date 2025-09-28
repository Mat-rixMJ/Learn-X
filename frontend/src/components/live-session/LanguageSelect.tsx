// Language selection component for live translation
'use client';

import React, { useState } from 'react';
import { SupportedLanguage } from '@/services/LiveTranslationService';

interface LanguageSelectProps {
  selectedLanguage: string;
  targetLanguages: string[];
  supportedLanguages: SupportedLanguage[];
  onLanguageChange: (language: string) => void;
  onTargetLanguagesChange: (languages: string[]) => void;
  onStartRecognition: () => void;
  onStopRecognition: () => void;
  isRecognizing: boolean;
  className?: string;
}

export default function LanguageSelect({
  selectedLanguage,
  targetLanguages,
  supportedLanguages,
  onLanguageChange,
  onTargetLanguagesChange,
  onStartRecognition,
  onStopRecognition,
  isRecognizing,
  className = ''
}: LanguageSelectProps) {
  const [showTargetLanguages, setShowTargetLanguages] = useState(false);

  const indianLanguages = supportedLanguages.filter(lang => lang.region === 'india');
  const globalLanguages = supportedLanguages.filter(lang => lang.region === 'global');

  const handleTargetLanguageToggle = (languageCode: string) => {
    const updated = targetLanguages.includes(languageCode)
      ? targetLanguages.filter(code => code !== languageCode)
      : [...targetLanguages, languageCode];
    
    onTargetLanguagesChange(updated);
  };

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 ${className}`}>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            🗣️ Live Translation
          </h3>
          <button
            onClick={isRecognizing ? onStopRecognition : onStartRecognition}
            className={`px-4 py-2 rounded-md font-medium transition-all ${
              isRecognizing
                ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse'
                : 'bg-blue-500 hover:bg-blue-600 text-white'
            }`}
          >
            {isRecognizing ? '🛑 Stop' : '🎤 Start'}
          </button>
        </div>

        {/* Source Language Selection */}
        <div>
          <label className="block text-sm font-medium mb-2">
            📢 Speaking Language (Source)
          </label>
          <select
            value={selectedLanguage}
            onChange={(e) => onLanguageChange(e.target.value)}
            className="w-full p-3 border rounded-md dark:bg-gray-700 dark:border-gray-600 focus:ring-2 focus:ring-blue-500"
          >
            <optgroup label="🌏 Global Languages">
              {globalLanguages.map(lang => (
                <option key={lang.code} value={lang.code}>
                  {lang.name} ({lang.nativeName})
                </option>
              ))}
            </optgroup>
            <optgroup label="🇮🇳 Indian Languages">
              {indianLanguages.map(lang => (
                <option key={lang.code} value={lang.code}>
                  {lang.name} ({lang.nativeName})
                </option>
              ))}
            </optgroup>
          </select>
        </div>

        {/* Target Languages Selection */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium">
              🌐 Translate To (Multiple Selection)
            </label>
            <button
              onClick={() => setShowTargetLanguages(!showTargetLanguages)}
              className="text-blue-500 hover:text-blue-600 text-sm"
            >
              {showTargetLanguages ? 'Hide Options' : `${targetLanguages.length} Selected`}
            </button>
          </div>

          {showTargetLanguages && (
            <div className="border rounded-md p-3 max-h-60 overflow-y-auto dark:border-gray-600">
              {/* Indian Languages */}
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  🇮🇳 Indian Languages
                </h4>
                <div className="grid grid-cols-1 gap-2">
                  {indianLanguages.map(lang => (
                    <label key={lang.code} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 p-2 rounded">
                      <input
                        type="checkbox"
                        checked={targetLanguages.includes(lang.code.split('-')[0])}
                        onChange={() => handleTargetLanguageToggle(lang.code.split('-')[0])}
                        className="rounded"
                      />
                      <span className="text-sm">
                        {lang.name} <span className="text-gray-500">({lang.nativeName})</span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Global Languages */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  🌏 Global Languages
                </h4>
                <div className="grid grid-cols-1 gap-2">
                  {globalLanguages.map(lang => (
                    <label key={lang.code} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 p-2 rounded">
                      <input
                        type="checkbox"
                        checked={targetLanguages.includes(lang.code.split('-')[0])}
                        onChange={() => handleTargetLanguageToggle(lang.code.split('-')[0])}
                        className="rounded"
                      />
                      <span className="text-sm">
                        {lang.name}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Selected Target Languages Display */}
          {targetLanguages.length > 0 && (
            <div className="mt-2">
              <div className="flex flex-wrap gap-2">
                {targetLanguages.map(langCode => {
                  const lang = supportedLanguages.find(l => l.code.startsWith(langCode));
                  return (
                    <span
                      key={langCode}
                      className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded-full text-xs flex items-center gap-1"
                    >
                      {lang ? lang.nativeName : langCode}
                      <button
                        onClick={() => handleTargetLanguageToggle(langCode)}
                        className="hover:bg-blue-200 dark:hover:bg-blue-800 rounded-full p-0.5"
                      >
                        ✕
                      </button>
                    </span>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Quick Presets */}
        <div>
          <label className="block text-sm font-medium mb-2">
            ⚡ Quick Presets
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => onTargetLanguagesChange(['hi', 'ta', 'te', 'kn'])}
              className="p-2 text-sm border rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 dark:border-gray-600"
            >
              🇮🇳 Major Indian Languages
            </button>
            <button
              onClick={() => onTargetLanguagesChange(['hi', 'bn', 'te', 'mr', 'ta', 'gu', 'kn', 'ml', 'pa'])}
              className="p-2 text-sm border rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 dark:border-gray-600"
            >
              🇮🇳 All Indian Languages
            </button>
            <button
              onClick={() => onTargetLanguagesChange(['en'])}
              className="p-2 text-sm border rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 dark:border-gray-600"
            >
              🌏 English Only
            </button>
            <button
              onClick={() => onTargetLanguagesChange([])}
              className="p-2 text-sm border rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 dark:border-gray-600 text-red-600"
            >
              🚫 Clear All
            </button>
          </div>
        </div>

        {/* Status Display */}
        {isRecognizing && (
          <div className="bg-green-50 dark:bg-green-900 border border-green-200 dark:border-green-700 rounded-md p-3">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium text-green-800 dark:text-green-200">
                Listening in {supportedLanguages.find(l => l.code === selectedLanguage)?.name}...
              </span>
            </div>
            {targetLanguages.length > 0 && (
              <div className="text-xs text-green-700 dark:text-green-300 mt-1">
                Translating to: {targetLanguages.map(code => 
                  supportedLanguages.find(l => l.code.startsWith(code))?.nativeName || code
                ).join(', ')}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}