// Real-time translation service with Indian language support and minimal latency
import { TranslationResult, SpeechRecognitionResult as CustomSpeechResult, SubtitleSettings } from '@/types/live-session';

// Type definitions for Web Speech API
declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  grammars: SpeechGrammarList;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  serviceURI: string;
  start(): void;
  stop(): void;
  abort(): void;
  onaudioend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onaudiostart: ((this: SpeechRecognition, ev: Event) => any) | null;
  onend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => any) | null;
  onnomatch: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
  onsoundend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onsoundstart: ((this: SpeechRecognition, ev: Event) => any) | null;
  onspeechend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onspeechstart: ((this: SpeechRecognition, ev: Event) => any) | null;
  onstart: ((this: SpeechRecognition, ev: Event) => any) | null;
}

declare var SpeechRecognition: {
  prototype: SpeechRecognition;
  new(): SpeechRecognition;
};

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

interface SpeechRecognitionResultList {
  readonly length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  readonly isFinal: boolean;
  readonly length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  readonly confidence: number;
  readonly transcript: string;
}

interface SpeechGrammarList {
  readonly length: number;
  item(index: number): SpeechGrammar;
  [index: number]: SpeechGrammar;
  addFromURI(src: string, weight?: number): void;
  addFromString(string: string, weight?: number): void;
}

interface SpeechGrammar {
  src: string;
  weight: number;
}

export interface SupportedLanguage {
  code: string;
  name: string;
  nativeName: string;
  region: string;
  speechRecognitionSupported: boolean;
  translationSupported: boolean;
}

export const SUPPORTED_LANGUAGES: SupportedLanguage[] = [
  // English
  { code: 'en-US', name: 'English (US)', nativeName: 'English', region: 'global', speechRecognitionSupported: true, translationSupported: true },
  { code: 'en-IN', name: 'English (India)', nativeName: 'English', region: 'india', speechRecognitionSupported: true, translationSupported: true },
  
  // Hindi
  { code: 'hi-IN', name: 'Hindi', nativeName: 'हिन्दी', region: 'india', speechRecognitionSupported: true, translationSupported: true },
  
  // South Indian Languages
  { code: 'ta-IN', name: 'Tamil', nativeName: 'தமிழ்', region: 'india', speechRecognitionSupported: true, translationSupported: true },
  { code: 'te-IN', name: 'Telugu', nativeName: 'తెలుగు', region: 'india', speechRecognitionSupported: true, translationSupported: true },
  { code: 'kn-IN', name: 'Kannada', nativeName: 'ಕನ್ನಡ', region: 'india', speechRecognitionSupported: true, translationSupported: true },
  { code: 'ml-IN', name: 'Malayalam', nativeName: 'മലയാളം', region: 'india', speechRecognitionSupported: true, translationSupported: true },
  
  // North Indian Languages
  { code: 'bn-IN', name: 'Bengali', nativeName: 'বাংলা', region: 'india', speechRecognitionSupported: true, translationSupported: true },
  { code: 'gu-IN', name: 'Gujarati', nativeName: 'ગુજરાતી', region: 'india', speechRecognitionSupported: true, translationSupported: true },
  { code: 'mr-IN', name: 'Marathi', nativeName: 'मराठी', region: 'india', speechRecognitionSupported: true, translationSupported: true },
  { code: 'pa-IN', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ', region: 'india', speechRecognitionSupported: true, translationSupported: true },
  { code: 'or-IN', name: 'Odia', nativeName: 'ଓଡ଼ିଆ', region: 'india', speechRecognitionSupported: true, translationSupported: true },
  { code: 'as-IN', name: 'Assamese', nativeName: 'অসমীয়া', region: 'india', speechRecognitionSupported: true, translationSupported: true },
  { code: 'ur-IN', name: 'Urdu', nativeName: 'اردو', region: 'india', speechRecognitionSupported: true, translationSupported: true },
  
  // Sanskrit
  { code: 'sa-IN', name: 'Sanskrit', nativeName: 'संस्कृत', region: 'india', speechRecognitionSupported: false, translationSupported: true },
];

export class LiveTranslationService {
  private recognition: SpeechRecognition | null = null;
  private isRecognizing = false;
  private translationCache = new Map<string, { [lang: string]: string }>();
  private onTranscriptCallback?: (result: CustomSpeechResult) => void;
  private onTranslationCallback?: (result: TranslationResult) => void;
  private currentLanguage = 'en-US';
  private targetLanguages: string[] = [];
  private socket: any = null;

  constructor() {
    this.initializeSpeechRecognition();
  }

  setSocket(socket: any) {
    this.socket = socket;
  }

  private initializeSpeechRecognition() {
    if (typeof window === 'undefined') return;

    const SpeechRecognition = window.SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      console.warn('Speech recognition not supported in this browser');
      return;
    }

    this.recognition = new SpeechRecognition();
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.maxAlternatives = 1;
    this.recognition.lang = this.currentLanguage;

    this.recognition.onresult = (event) => {
      const results = Array.from(event.results);
      const latestResult = results[results.length - 1];
      
      if (latestResult) {
        const transcript = latestResult[0].transcript;
        const confidence = latestResult[0].confidence || 0.8;
        
        const result: CustomSpeechResult = {
          transcript,
          confidence,
          isFinal: latestResult.isFinal,
          language: this.currentLanguage,
          timestamp: new Date(),
        };

        this.onTranscriptCallback?.(result);

        // Translate if final and target languages are set
        if (latestResult.isFinal && this.targetLanguages.length > 0) {
          this.translateText(transcript, this.currentLanguage.split('-')[0], this.targetLanguages);
        }

        // Emit to socket for real-time sharing
        if (this.socket) {
          this.socket.emit('live-caption', {
            text: transcript,
            language: this.currentLanguage,
            confidence,
            isFinal: latestResult.isFinal,
            timestamp: new Date()
          });
        }
      }
    };

    this.recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      
      // Auto-restart on certain errors
      if (event.error === 'network' || event.error === 'audio-capture') {
        setTimeout(() => {
          if (this.isRecognizing) {
            this.startRecognition();
          }
        }, 1000);
      }
    };

    this.recognition.onend = () => {
      // Auto-restart if we're supposed to be recognizing
      if (this.isRecognizing) {
        setTimeout(() => {
          this.startRecognition();
        }, 100);
      }
    };
  }

  startRecognition(language?: string) {
    if (!this.recognition) {
      console.warn('Speech recognition not available');
      return false;
    }

    if (language && language !== this.currentLanguage) {
      this.currentLanguage = language;
      this.recognition.lang = language;
    }

    try {
      this.recognition.start();
      this.isRecognizing = true;
      return true;
    } catch (error) {
      console.error('Error starting speech recognition:', error);
      return false;
    }
  }

  stopRecognition() {
    if (this.recognition && this.isRecognizing) {
      this.recognition.stop();
      this.isRecognizing = false;
    }
  }

  setLanguage(language: string) {
    const wasRecognizing = this.isRecognizing;
    
    if (wasRecognizing) {
      this.stopRecognition();
    }
    
    this.currentLanguage = language;
    
    if (this.recognition) {
      this.recognition.lang = language;
    }
    
    if (wasRecognizing) {
      setTimeout(() => {
        this.startRecognition();
      }, 100);
    }
  }

  setTargetLanguages(languages: string[]) {
    this.targetLanguages = languages;
  }

  onTranscript(callback: (result: CustomSpeechResult) => void) {
    this.onTranscriptCallback = callback;
  }

  onTranslation(callback: (result: TranslationResult) => void) {
    this.onTranslationCallback = callback;
  }

  private async translateText(text: string, fromLang: string, toLangs: string[]) {
    // Check cache first for performance
    const cacheKey = `${text}_${fromLang}`;
    const cached = this.translationCache.get(cacheKey);
    
    for (const toLang of toLangs) {
      if (cached && cached[toLang]) {
        this.onTranslationCallback?.({
          original: text,
          translated: cached[toLang],
          language: toLang,
          timestamp: new Date(),
          fromLanguage: fromLang,
          toLanguage: toLang,
          confidence: 0.9
        });
        continue;
      }

      try {
        // Use multiple translation services for better reliability
        const translated = await this.translateWithFallback(text, fromLang, toLang);
        
        // Cache the result
        if (!this.translationCache.has(cacheKey)) {
          this.translationCache.set(cacheKey, {});
        }
        this.translationCache.get(cacheKey)![toLang] = translated;

        const result: TranslationResult = {
          original: text,
          translated,
          language: toLang,
          timestamp: new Date(),
          fromLanguage: fromLang,
          toLanguage: toLang,
          confidence: 0.85
        };

        this.onTranslationCallback?.(result);

        // Emit to socket
        if (this.socket) {
          this.socket.emit('live-translation', result);
        }

      } catch (error) {
        console.error(`Translation error for ${toLang}:`, error);
      }
    }
  }

  private async translateWithFallback(text: string, fromLang: string, toLang: string): Promise<string> {
    // Primary: Google Translate API (when available)
    try {
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          from: fromLang,
          to: toLang
        })
      });

      if (response.ok) {
        const data = await response.json();
        return data.translated;
      }
    } catch (error) {
      console.warn('Primary translation service failed, trying fallback');
    }

    // Fallback: LibreTranslate or other free services
    try {
      const response = await fetch('https://libretranslate.de/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          q: text,
          source: fromLang,
          target: toLang,
          format: 'text'
        })
      });

      if (response.ok) {
        const data = await response.json();
        return data.translatedText;
      }
    } catch (error) {
      console.warn('Fallback translation service failed');
    }

    // Last resort: Client-side basic translation (for common phrases)
    return await this.basicTranslation(text, fromLang, toLang);
  }

  private async basicTranslation(text: string, fromLang: string, toLang: string): Promise<string> {
    // Basic phrase translation for common classroom terms
    const phrases: { [key: string]: { [lang: string]: string } } = {
      'hello': {
        'hi': 'नमस्ते',
        'ta': 'வணக்கம்',
        'te': 'హలో',
        'kn': 'ಹಲೋ',
        'ml': 'ഹലോ',
        'bn': 'হ্যালো',
        'gu': 'હેલો',
        'mr': 'हॅलो',
        'pa': 'ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ'
      },
      'thank you': {
        'hi': 'धन्यवाद',
        'ta': 'நன்றி',
        'te': 'ధన్యవాదాలు',
        'kn': 'ಧನ್ಯವಾದಗಳು',
        'ml': 'നന്ദി',
        'bn': 'ধন্যবাদ',
        'gu': 'આભાર',
        'mr': 'धन्यवाद',
        'pa': 'ਧੰਨਵਾਦ'
      }
      // Add more common phrases
    };

    const lowerText = text.toLowerCase().trim();
    if (phrases[lowerText] && phrases[lowerText][toLang]) {
      return phrases[lowerText][toLang];
    }

    // Return original text if no translation available
    return `[${text}]`;
  }

  clearCache() {
    this.translationCache.clear();
  }

  getAvailableLanguages(): SupportedLanguage[] {
    return SUPPORTED_LANGUAGES;
  }

  getIndianLanguages(): SupportedLanguage[] {
    return SUPPORTED_LANGUAGES.filter(lang => lang.region === 'india');
  }

  isLanguageSupported(languageCode: string): boolean {
    return SUPPORTED_LANGUAGES.some(lang => lang.code === languageCode);
  }

  getCurrentLanguage(): string {
    return this.currentLanguage;
  }

  getTargetLanguages(): string[] {
    return this.targetLanguages;
  }

  isRecognizingActive(): boolean {
    return this.isRecognizing;
  }
}

export default LiveTranslationService;