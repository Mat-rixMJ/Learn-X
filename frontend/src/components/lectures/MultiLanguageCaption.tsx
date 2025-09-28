'use client';

import React, { useState, useEffect, useRef } from 'react';

// Supported languages for captions
export const SUPPORTED_LANGUAGES = {
  'en-US': 'English (US)',
  'en-GB': 'English (UK)',
  'es-ES': 'Spanish (Spain)',
  'es-MX': 'Spanish (Mexico)',
  'fr-FR': 'French',
  'de-DE': 'German',
  'it-IT': 'Italian',
  'pt-BR': 'Portuguese (Brazil)',
  'ru-RU': 'Russian',
  'ja-JP': 'Japanese',
  'ko-KR': 'Korean',
  'zh-CN': 'Chinese (Simplified)',
  'zh-TW': 'Chinese (Traditional)',
  'hi-IN': 'Hindi',
  'ta-IN': 'Tamil',
  'te-IN': 'Telugu',
  'kn-IN': 'Kannada',
  'ml-IN': 'Malayalam',
  'bn-IN': 'Bengali',
  'gu-IN': 'Gujarati',
  'mr-IN': 'Marathi',
  'pa-IN': 'Punjabi',
  'ur-IN': 'Urdu',
  'ar-SA': 'Arabic'
};

interface Caption {
  id: string;
  text: string;
  originalText: string;
  language: string;
  timestamp: number;
  confidence: number;
  isTranslated: boolean;
}

interface MultiLanguageCaptionProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  enabled: boolean;
  sourceLanguage: string;
  targetLanguages: string[];
  onCaptionGenerated?: (caption: Caption) => void;
  className?: string;
}

// Translation cache for instant switching
const translationCache = new Map<string, string>();

// Simple translation function (in production, use WebAssembly models)
const translateText = async (text: string, targetLang: string): Promise<string> => {
  // Check cache first
  const cacheKey = `${text}_${targetLang}`;
  if (translationCache.has(cacheKey)) {
    return translationCache.get(cacheKey) || text;
  }

  try {
    // Use the instant translation API with authentication
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/translate/instant`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({ 
        text, 
        targetLanguage: targetLang,
        sourceLanguage: 'en-US'
      })
    });

    if (response.ok) {
      const result = await response.json();
      if (result.success && result.translatedText) {
        const translation = result.translatedText;
        
        // Cache the translation
        translationCache.set(cacheKey, translation);
        return translation;
      }
    }
    
    // Fallback to original text
    return text;
  } catch (error) {
    console.warn('Translation failed, using original text:', error);
    return text;
  }
};

export default function MultiLanguageCaption({
  videoRef,
  enabled,
  sourceLanguage,
  targetLanguages,
  onCaptionGenerated,
  className = ''
}: MultiLanguageCaptionProps) {
  const [captions, setCaptions] = useState<Caption[]>([]);
  const [activeCaptions, setActiveCaptions] = useState<Map<string, Caption>>(new Map());
  const [isListening, setIsListening] = useState(false);
  const [selectedDisplayLanguage, setSelectedDisplayLanguage] = useState(targetLanguages[0] || sourceLanguage);
  const [recognition, setRecognition] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Audio context for capturing video audio
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);

  useEffect(() => {
    initializeSpeechRecognition();
    return () => {
      cleanup();
    };
  }, []);

  useEffect(() => {
    if (enabled && recognition) {
      startListening();
    } else {
      stopListening();
    }
  }, [enabled, recognition]);

  const initializeSpeechRecognition = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      setError('Speech recognition not supported in this browser');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognitionInstance = new SpeechRecognition();

    recognitionInstance.continuous = true;
    recognitionInstance.interimResults = true;
    recognitionInstance.lang = sourceLanguage;
    recognitionInstance.maxAlternatives = 1;

    recognitionInstance.onstart = () => {
      setIsListening(true);
      setError(null);
    };

    recognitionInstance.onresult = async (event) => {
      const lastResultIndex = event.results.length - 1;
      const lastResult = event.results[lastResultIndex];
      
      if (lastResult.isFinal) {
        const transcript = lastResult[0].transcript.trim();
        const confidence = lastResult[0].confidence;
        
        if (transcript) {
          const captionId = `caption_${Date.now()}`;
          const timestamp = videoRef.current?.currentTime || 0;
          
          // Create original caption
          const originalCaption: Caption = {
            id: captionId,
            text: transcript,
            originalText: transcript,
            language: sourceLanguage,
            timestamp,
            confidence,
            isTranslated: false
          };

          // Generate translations for all target languages instantly
          const translationPromises = targetLanguages.map(async (lang) => {
            if (lang === sourceLanguage) return originalCaption;
            
            const translatedText = await translateText(transcript, lang);
            return {
              ...originalCaption,
              id: `${captionId}_${lang}`,
              text: translatedText,
              language: lang,
              isTranslated: true
            };
          });

          const translatedCaptions = await Promise.all(translationPromises);
          
          // Update captions state
          setCaptions(prev => [...prev, ...translatedCaptions]);
          
          // Update active captions map for instant language switching
          const newActiveCaptions = new Map();
          translatedCaptions.forEach(caption => {
            newActiveCaptions.set(caption.language, caption);
          });
          setActiveCaptions(newActiveCaptions);

          // Notify parent component
          if (onCaptionGenerated) {
            translatedCaptions.forEach(caption => onCaptionGenerated(caption));
          }
        }
      }
    };

    recognitionInstance.onerror = (event) => {
      // Only log non-critical errors, don't show to user
      if (event.error === 'aborted' || event.error === 'no-speech') {
        console.debug('Speech recognition stopped:', event.error);
      } else {
        console.error('Speech recognition error:', event.error);
        setError(`Speech recognition error: ${event.error}`);
      }
      setIsListening(false);
    };

    recognitionInstance.onend = () => {
      setIsListening(false);
      // Auto-restart if still enabled
      if (enabled) {
        setTimeout(() => startListening(), 100);
      }
    };

    setRecognition(recognitionInstance);
  };

  const startListening = () => {
    if (recognition && !isListening) {
      try {
        recognition.start();
      } catch (error) {
        console.error('Failed to start speech recognition:', error);
        setError('Failed to start speech recognition');
      }
    }
  };

  const stopListening = () => {
    if (recognition && isListening) {
      recognition.stop();
      setIsListening(false);
    }
  };

  const cleanup = () => {
    stopListening();
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
  };

  // Get current caption for selected language
  const getCurrentCaption = () => {
    return activeCaptions.get(selectedDisplayLanguage);
  };

  const currentCaption = getCurrentCaption();

  // Auto-hide captions after 3 seconds
  useEffect(() => {
    if (currentCaption) {
      const timer = setTimeout(() => {
        setActiveCaptions(prev => {
          const newMap = new Map(prev);
          newMap.delete(selectedDisplayLanguage);
          return newMap;
        });
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [currentCaption, selectedDisplayLanguage]);

  if (!enabled) return null;

  return (
    <div className={`absolute bottom-20 left-0 right-0 flex flex-col items-center space-y-4 ${className}`}>
      {/* Language Selector */}
      <div className="flex items-center space-x-2 bg-black bg-opacity-60 rounded-full px-4 py-2">
        <span className="text-white text-sm">Captions:</span>
        <select
          value={selectedDisplayLanguage}
          onChange={(e) => setSelectedDisplayLanguage(e.target.value)}
          className="bg-transparent text-white text-sm border-none outline-none"
        >
          <option value={sourceLanguage} className="bg-black">
            {SUPPORTED_LANGUAGES[sourceLanguage as keyof typeof SUPPORTED_LANGUAGES]} (Original)
          </option>
          {targetLanguages
            .filter(lang => lang !== sourceLanguage)
            .map(lang => (
              <option key={lang} value={lang} className="bg-black">
                {SUPPORTED_LANGUAGES[lang as keyof typeof SUPPORTED_LANGUAGES]}
              </option>
            ))}
        </select>
        
        {/* Status Indicator */}
        <div className={`w-2 h-2 rounded-full ${isListening ? 'bg-red-500 animate-pulse' : 'bg-gray-500'}`} />
      </div>

      {/* Caption Display */}
      {currentCaption && (
        <div className="bg-black bg-opacity-80 text-white px-6 py-3 rounded-lg max-w-4xl text-center">
          <p className="text-lg leading-relaxed">{currentCaption.text}</p>
          
          {/* Caption Metadata */}
          <div className="flex justify-between items-center mt-2 text-xs text-gray-300">
            <span>
              {currentCaption.isTranslated ? '🌐 Translated' : '🎤 Live'} • 
              {SUPPORTED_LANGUAGES[currentCaption.language as keyof typeof SUPPORTED_LANGUAGES]}
            </span>
            <span>
              Confidence: {Math.round(currentCaption.confidence * 100)}%
            </span>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="bg-red-600 bg-opacity-90 text-white px-4 py-2 rounded-lg text-sm">
          ⚠️ {error}
        </div>
      )}

      {/* Caption History (Optional) */}
      {captions.length > 0 && (
        <div className="max-w-md w-full bg-black bg-opacity-40 rounded-lg p-3 max-h-32 overflow-y-auto">
          <div className="text-white text-xs space-y-1">
            {captions
              .filter(caption => caption.language === selectedDisplayLanguage)
              .slice(-5) // Show last 5 captions
              .map(caption => (
                <div key={caption.id} className="opacity-60">
                  {caption.text}
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}