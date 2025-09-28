// Safe Google Translate initialization
let Translate;
let googleTranslateAvailable = false;

// Check if Google Cloud is available and configured
const hasGoogleCredentials = () => {
  return (
    (process.env.GOOGLE_CLOUD_PROJECT_ID && process.env.GOOGLE_CLOUD_KEY_FILE) ||
    process.env.GOOGLE_APPLICATION_CREDENTIALS ||
    process.env.GOOGLE_TRANSLATE_API_KEY
  );
};

// Only try to load if credentials are available
if (hasGoogleCredentials()) {
  try {
    require.resolve('@google-cloud/translate');
    ({ Translate } = require('@google-cloud/translate').v2);
    googleTranslateAvailable = true;
  } catch (error) {
    console.warn('Google Translate package not available in translation service');
  }
}

class TranslationService {
  constructor() {
    this.translate = null;
    
    // Initialize Google Translate only if available and configured
    if (googleTranslateAvailable && Translate) {
      try {
        const config = {};
        if (process.env.GOOGLE_TRANSLATE_API_KEY) {
          config.key = process.env.GOOGLE_TRANSLATE_API_KEY;
        }
        if (process.env.GOOGLE_CLOUD_PROJECT_ID) {
          config.projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
        }
        if (process.env.GOOGLE_CLOUD_KEY_FILE) {
          config.keyFilename = process.env.GOOGLE_CLOUD_KEY_FILE;
        }
        
        this.translate = new Translate(config);
      } catch (error) {
        console.warn('Failed to initialize Google Translate in TranslationService:', error.message);
      }
    }

    // Supported languages for live translation
    this.supportedLanguages = {
      'en': 'English',
      'es': 'Spanish',
      'fr': 'French',
      'de': 'German',
      'it': 'Italian',
      'pt': 'Portuguese',
      'ru': 'Russian',
      'ja': 'Japanese',
      'ko': 'Korean',
      'zh': 'Chinese (Simplified)',
      'ar': 'Arabic',
      'hi': 'Hindi',
      'tr': 'Turkish',
      'pl': 'Polish',
      'nl': 'Dutch',
      'sv': 'Swedish',
      'da': 'Danish',
      'no': 'Norwegian',
      'fi': 'Finnish'
    };
  }

  async translateText(text, targetLanguage, sourceLanguage = null) {
    try {
      if (!this.supportedLanguages[targetLanguage]) {
        throw new Error(`Unsupported target language: ${targetLanguage}`);
      }

      // If Google Translate is not available, return original text
      if (!this.translate) {
        console.log('Google Translate not available, returning original text');
        return {
          originalText: text,
          translatedText: `[Translation unavailable: ${text}]`,
          sourceLanguage: sourceLanguage || 'unknown',
          targetLanguage,
          confidence: 0.0,
          service: 'fallback'
        };
      }

      const options = {
        to: targetLanguage,
      };

      if (sourceLanguage) {
        options.from = sourceLanguage;
      }

      const [translation] = await this.translate.translate(text, options);

      return {
        originalText: text,
        translatedText: translation,
        sourceLanguage: sourceLanguage || 'auto-detected',
        targetLanguage,
        confidence: 1.0, // Google Translate doesn't provide confidence scores
        service: 'google'
      };
    } catch (error) {
      console.error('Translation error:', error);
      
      // Fallback to original text if translation fails
      return {
        originalText: text,
        translatedText: text,
        sourceLanguage: sourceLanguage || 'unknown',
        targetLanguage,
        confidence: 0.0,
        error: error.message
      };
    }
  }

  async translateMultiple(texts, targetLanguage, sourceLanguage = null) {
    try {
      const options = {
        to: targetLanguage,
      };

      if (sourceLanguage) {
        options.from = sourceLanguage;
      }

      const [translations] = await this.translate.translate(texts, options);

      return texts.map((text, index) => ({
        originalText: text,
        translatedText: Array.isArray(translations) ? translations[index] : translations,
        sourceLanguage: sourceLanguage || 'auto-detected',
        targetLanguage,
        confidence: 1.0
      }));
    } catch (error) {
      console.error('Batch translation error:', error);
      
      // Return original texts as fallback
      return texts.map(text => ({
        originalText: text,
        translatedText: text,
        sourceLanguage: sourceLanguage || 'unknown',
        targetLanguage,
        confidence: 0.0,
        error: error.message
      }));
    }
  }

  async detectLanguage(text) {
    try {
      const [detection] = await this.translate.detect(text);
      
      return {
        language: detection.language,
        confidence: detection.confidence,
        languageName: this.supportedLanguages[detection.language] || detection.language
      };
    } catch (error) {
      console.error('Language detection error:', error);
      return {
        language: 'en',
        confidence: 0.0,
        languageName: 'English',
        error: error.message
      };
    }
  }

  getSupportedLanguages() {
    return this.supportedLanguages;
  }

  isLanguageSupported(languageCode) {
    return !!this.supportedLanguages[languageCode];
  }

  // Real-time caption translation for live sessions
  async translateCaption(caption, targetLanguages) {
    const translations = {};
    
    // Detect source language if not specified
    const detection = await this.detectLanguage(caption.text_content);
    
    for (const targetLang of targetLanguages) {
      if (targetLang !== detection.language) {
        const translation = await this.translateText(
          caption.text_content, 
          targetLang, 
          detection.language
        );
        translations[targetLang] = translation.translatedText;
      } else {
        translations[targetLang] = caption.text_content; // Original text
      }
    }

    return {
      original: caption.text_content,
      sourceLanguage: detection.language,
      translations,
      confidence: detection.confidence
    };
  }

  // Batch translate chat messages
  async translateChatMessages(messages, targetLanguage) {
    const textToTranslate = messages.map(msg => msg.message);
    const translations = await this.translateMultiple(textToTranslate, targetLanguage);
    
    return messages.map((message, index) => ({
      ...message,
      translatedMessage: translations[index].translatedText,
      translation: translations[index]
    }));
  }
}

// Fallback simple translation service if Google Translate is not available
class SimpleTranslationService {
  constructor() {
    this.supportedLanguages = {
      'en': 'English',
      'es': 'Spanish',
      'fr': 'French',
      'de': 'German'
    };
    
    // Very basic translations for demo purposes
    this.translations = {
      'hello': { 'es': 'hola', 'fr': 'bonjour', 'de': 'hallo' },
      'thank you': { 'es': 'gracias', 'fr': 'merci', 'de': 'danke' },
      'goodbye': { 'es': 'adiós', 'fr': 'au revoir', 'de': 'auf wiedersehen' },
      'yes': { 'es': 'sí', 'fr': 'oui', 'de': 'ja' },
      'no': { 'es': 'no', 'fr': 'non', 'de': 'nein' }
    };
  }

  async translateText(text, targetLanguage, sourceLanguage = 'en') {
    const lowerText = text.toLowerCase().trim();
    
    if (this.translations[lowerText] && this.translations[lowerText][targetLanguage]) {
      return {
        originalText: text,
        translatedText: this.translations[lowerText][targetLanguage],
        sourceLanguage,
        targetLanguage,
        confidence: 0.8
      };
    }

    return {
      originalText: text,
      translatedText: `[${targetLanguage}] ${text}`, // Prefix with language code
      sourceLanguage,
      targetLanguage,
      confidence: 0.3
    };
  }

  async detectLanguage(text) {
    return {
      language: 'en',
      confidence: 0.5,
      languageName: 'English'
    };
  }

  getSupportedLanguages() {
    return this.supportedLanguages;
  }

  isLanguageSupported(languageCode) {
    return !!this.supportedLanguages[languageCode];
  }
}

module.exports = { 
  TranslationService, 
  SimpleTranslationService 
};