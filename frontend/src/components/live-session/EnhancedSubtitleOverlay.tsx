// Enhanced subtitle overlay with translation and customization
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { LiveCaption, TranslationResult, SubtitleSettings } from '@/types/live-session';

interface SubtitleOverlayProps {
  captions: LiveCaption[];
  translations: TranslationResult[];
  settings: SubtitleSettings;
  onSettingsChange: (settings: SubtitleSettings) => void;
  className?: string;
}

const FONT_SIZES = [
  { label: 'Small', value: 14 },
  { label: 'Medium', value: 18 },
  { label: 'Large', value: 24 },
  { label: 'Extra Large', value: 32 }
];

const POSITIONS = [
  { label: 'Bottom', value: 'bottom' as const },
  { label: 'Top', value: 'top' as const },
  { label: 'Center', value: 'center' as const }
];

const BACKGROUND_COLORS = [
  { label: 'Black (Semi-transparent)', value: 'rgba(0, 0, 0, 0.8)' },
  { label: 'Dark Gray', value: 'rgba(64, 64, 64, 0.9)' },
  { label: 'Blue', value: 'rgba(59, 130, 246, 0.8)' },
  { label: 'Green', value: 'rgba(34, 197, 94, 0.8)' },
  { label: 'None', value: 'transparent' }
];

const TEXT_COLORS = [
  { label: 'White', value: '#ffffff' },
  { label: 'Yellow', value: '#fbbf24' },
  { label: 'Cyan', value: '#06b6d4' },
  { label: 'Green', value: '#10b981' },
  { label: 'Red', value: '#ef4444' }
];

const INDIAN_LANGUAGES = [
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు' },
  { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ' },
  { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা' },
  { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી' },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी' },
  { code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ' },
  { code: 'or', name: 'Odia', nativeName: 'ଓଡ଼ିଆ' },
  { code: 'as', name: 'Assamese', nativeName: 'অসমীয়া' },
  { code: 'ur', name: 'Urdu', nativeName: 'اردو' }
];

export default function SubtitleOverlay({
  captions,
  translations,
  settings,
  onSettingsChange,
  className = ''
}: SubtitleOverlayProps) {
  const [showSettings, setShowSettings] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [currentPosition, setCurrentPosition] = useState({ x: 0, y: 0 });
  const overlayRef = useRef<HTMLDivElement>(null);
  const settingsRef = useRef<HTMLDivElement>(null);

  // Get current caption to display
  const currentCaption = captions.length > 0 ? captions[captions.length - 1] : null;
  const currentTranslation = translations.find(t => 
    t.original === currentCaption?.text && t.language === settings.translationLanguage
  );

  // Auto-hide captions after 5 seconds
  useEffect(() => {
    if (currentCaption) {
      const timer = setTimeout(() => {
        // Remove old captions (keeping only recent ones)
        const cutoffTime = new Date(Date.now() - 5000);
        // This would be handled by parent component
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [currentCaption]);

  // Handle click outside to close settings
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
        setShowSettings(false);
      }
    };

    if (showSettings) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showSettings]);

  const getPositionStyles = () => {
    const baseStyles = {
      fontSize: `${settings.fontSize}px`,
      backgroundColor: settings.backgroundColor,
      color: settings.textColor,
      transform: isDragging ? `translate(${currentPosition.x}px, ${currentPosition.y}px)` : undefined
    };

    switch (settings.position) {
      case 'top':
        return {
          ...baseStyles,
          top: '20px',
          left: '50%',
          transform: `translateX(-50%) ${isDragging ? `translate(${currentPosition.x}px, ${currentPosition.y}px)` : ''}`
        };
      case 'center':
        return {
          ...baseStyles,
          top: '50%',
          left: '50%',
          transform: `translate(-50%, -50%) ${isDragging ? `translate(${currentPosition.x}px, ${currentPosition.y}px)` : ''}`
        };
      case 'bottom':
      default:
        return {
          ...baseStyles,
          bottom: '20px',
          left: '50%',
          transform: `translateX(-50%) ${isDragging ? `translate(${currentPosition.x}px, ${currentPosition.y}px)` : ''}`
        };
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget || (e.target as HTMLElement).classList.contains('subtitle-drag-handle')) {
      setIsDragging(true);
      setCurrentPosition({ x: 0, y: 0 });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setCurrentPosition({
        x: currentPosition.x + e.movementX,
        y: currentPosition.y + e.movementY
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  if (!settings.enabled || (!currentCaption && translations.length === 0)) {
    return null;
  }

  return (
    <div className={`fixed inset-0 pointer-events-none z-50 ${className}`}>
      {/* Subtitle Display */}
      {(currentCaption || currentTranslation) && (
        <div
          ref={overlayRef}
          className="absolute pointer-events-auto cursor-move"
          style={getPositionStyles()}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <div className="subtitle-drag-handle px-4 py-2 rounded-lg shadow-lg max-w-4xl mx-auto">
            {/* Original text */}
            {settings.showOriginal && currentCaption && (
              <div className="text-sm opacity-75 mb-1">
                {currentCaption.text}
              </div>
            )}
            
            {/* Translated text or original */}
            <div className="font-medium leading-relaxed">
              {settings.autoTranslate && currentTranslation 
                ? currentTranslation.translated 
                : currentCaption?.text || ''
              }
            </div>
            
            {/* Language indicator */}
            <div className="text-xs opacity-60 mt-1">
              {settings.autoTranslate && currentTranslation
                ? INDIAN_LANGUAGES.find(l => l.code === currentTranslation.language)?.nativeName || currentTranslation.language
                : 'Original'
              }
            </div>
          </div>
        </div>
      )}

      {/* Settings Panel */}
      <div className="absolute top-4 right-4 pointer-events-auto">
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70 transition-all"
          title="Subtitle Settings"
        >
          ⚙️
        </button>

        {showSettings && (
          <div
            ref={settingsRef}
            className="absolute top-12 right-0 bg-white dark:bg-gray-800 rounded-lg shadow-xl p-4 w-80 max-h-96 overflow-y-auto"
          >
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              🌐
              Subtitle Settings
            </h3>

            {/* Enable/Disable */}
            <div className="mb-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={settings.enabled}
                  onChange={(e) => onSettingsChange({ ...settings, enabled: e.target.checked })}
                  className="rounded"
                />
                <span>Enable Subtitles</span>
              </label>
            </div>

            {/* Auto-translate */}
            <div className="mb-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={settings.autoTranslate}
                  onChange={(e) => onSettingsChange({ ...settings, autoTranslate: e.target.checked })}
                  className="rounded"
                />
                <span>Auto-translate</span>
              </label>
            </div>

            {/* Translation Language */}
            {settings.autoTranslate && (
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Translation Language</label>
                <select
                  value={settings.translationLanguage || 'hi'}
                  onChange={(e) => onSettingsChange({ ...settings, translationLanguage: e.target.value })}
                  className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                >
                  {INDIAN_LANGUAGES.map(lang => (
                    <option key={lang.code} value={lang.code}>
                      {lang.name} ({lang.nativeName})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Show Original */}
            {settings.autoTranslate && (
              <div className="mb-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={settings.showOriginal}
                    onChange={(e) => onSettingsChange({ ...settings, showOriginal: e.target.checked })}
                    className="rounded"
                  />
                  <span>Show original text</span>
                </label>
              </div>
            )}

            {/* Font Size */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2 flex items-center gap-1">
                📝
                Font Size
              </label>
              <select
                value={settings.fontSize}
                onChange={(e) => onSettingsChange({ ...settings, fontSize: parseInt(e.target.value) })}
                className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
              >
                {FONT_SIZES.map(size => (
                  <option key={size.value} value={size.value}>
                    {size.label} ({size.value}px)
                  </option>
                ))}
              </select>
            </div>

            {/* Position */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2 flex items-center gap-1">
                📍
                Position
              </label>
              <select
                value={settings.position}
                onChange={(e) => onSettingsChange({ ...settings, position: e.target.value as any })}
                className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
              >
                {POSITIONS.map(pos => (
                  <option key={pos.value} value={pos.value}>
                    {pos.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Background Color */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2 flex items-center gap-1">
                🎨
                Background
              </label>
              <select
                value={settings.backgroundColor}
                onChange={(e) => onSettingsChange({ ...settings, backgroundColor: e.target.value })}
                className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
              >
                {BACKGROUND_COLORS.map(color => (
                  <option key={color.value} value={color.value}>
                    {color.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Text Color */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Text Color</label>
              <select
                value={settings.textColor}
                onChange={(e) => onSettingsChange({ ...settings, textColor: e.target.value })}
                className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
              >
                {TEXT_COLORS.map(color => (
                  <option key={color.value} value={color.value}>
                    {color.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Preview */}
            <div className="mt-4 p-3 rounded border bg-gray-50 dark:bg-gray-700">
              <div className="text-sm text-gray-600 dark:text-gray-300 mb-2">Preview:</div>
              <div
                style={{
                  fontSize: `${settings.fontSize}px`,
                  backgroundColor: settings.backgroundColor,
                  color: settings.textColor,
                  padding: '8px 12px',
                  borderRadius: '6px',
                  textAlign: 'center'
                }}
              >
                {settings.autoTranslate ? 'यह एक उदाहरण है' : 'This is an example'}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}