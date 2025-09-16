// Translation API endpoint for real-time translation
const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');

// Google Translate API setup (if available)
let translate;
let googleTranslateAvailable = false;

// Comprehensive check for Google Cloud credentials
const hasGoogleCredentials = () => {
  return (
    (process.env.GOOGLE_CLOUD_PROJECT_ID && process.env.GOOGLE_CLOUD_KEY_FILE) ||
    process.env.GOOGLE_APPLICATION_CREDENTIALS ||
    process.env.GCLOUD_PROJECT // Alternative environment variable
  );
};

// Only attempt to initialize Google Translate if proper credentials are available
if (hasGoogleCredentials()) {
  try {
    // Check if the package is installed first
    require.resolve('@google-cloud/translate');
    
    const { Translate } = require('@google-cloud/translate').v2;
    
    // Create translate instance with explicit configuration
    const config = {};
    if (process.env.GOOGLE_CLOUD_PROJECT_ID) {
      config.projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
    }
    if (process.env.GOOGLE_CLOUD_KEY_FILE) {
      config.keyFilename = process.env.GOOGLE_CLOUD_KEY_FILE;
    }
    
    translate = new Translate(config);
    googleTranslateAvailable = true;
    console.log('✅ Google Translate API initialized successfully');
    
    // Test the connection without metadata lookup
    setTimeout(async () => {
      try {
        await translate.getLanguages();
        console.log('🌐 Google Translate connection verified');
      } catch (testError) {
        console.warn('⚠️  Google Translate connection test failed:', testError.message);
        googleTranslateAvailable = false;
      }
    }, 1000);
    
  } catch (error) {
    if (error.code === 'MODULE_NOT_FOUND') {
      console.log('📦 Google Cloud Translate package not found');
      console.log('💡 Install with: npm install @google-cloud/translate');
    } else {
      console.warn('⚠️  Google Translate initialization failed:', error.message);
    }
    console.log('📋 Using free translation services instead');
  }
} else {
  console.log('📋 Google Cloud credentials not configured');
  console.log('💡 To enable premium translation, set environment variables:');
  console.log('   - GOOGLE_CLOUD_PROJECT_ID and GOOGLE_CLOUD_KEY_FILE');
  console.log('   - OR GOOGLE_APPLICATION_CREDENTIALS');
  console.log('📋 Using free translation services: LibreTranslate, MyMemory, Basic Phrases');
}

// Translation cache for performance
const translationCache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Supported languages mapping
const SUPPORTED_LANGUAGES = {
  'en': 'English',
  'hi': 'Hindi',
  'ta': 'Tamil',
  'te': 'Telugu',
  'kn': 'Kannada',
  'ml': 'Malayalam',
  'bn': 'Bengali',
  'gu': 'Gujarati',
  'mr': 'Marathi',
  'pa': 'Punjabi',
  'or': 'Odia',
  'as': 'Assamese',
  'ur': 'Urdu',
  'sa': 'Sanskrit'
};

// Common classroom phrases for offline translation
const PHRASE_TRANSLATIONS = {
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
  },
  'good morning': {
    'hi': 'सुप्रभात',
    'ta': 'காலை வணக்கம்',
    'te': 'శుభోదయం',
    'kn': 'ಶುಭೋದಯ',
    'ml': 'സുപ്രഭാതം',
    'bn': 'সুপ্রভাত',
    'gu': 'સુપ્રભાત',
    'mr': 'सुप्रभात',
    'pa': 'ਸਤਿ ਸ਼੍ਰੀ ਅਕਾਲ'
  },
  'welcome': {
    'hi': 'स्वागत है',
    'ta': 'வரவேற்கிறோம்',
    'te': 'స్వాగతం',
    'kn': 'ಸ್ವಾಗತ',
    'ml': 'സ്വാഗതം',
    'bn': 'স্বাগতম',
    'gu': 'સ્વાગત છે',
    'mr': 'स्वागत आहे',
    'pa': 'ਜੀ ਆਇਆਂ ਨੂੰ'
  },
  'please': {
    'hi': 'कृपया',
    'ta': 'தயவு செய்து',
    'te': 'దయచేసి',
    'kn': 'ದಯವಿಟ್ಟು',
    'ml': 'ദയവായി',
    'bn': 'অনুগ্রহ করে',
    'gu': 'કૃપા કરીને',
    'mr': 'कृपया',
    'pa': 'ਕਿਰਪਾ ਕਰਕੇ'
  },
  'excuse me': {
    'hi': 'क्षमा करें',
    'ta': 'மன்னிக்கவும்',
    'te': 'క్షమించండి',
    'kn': 'ಕ್ಷಮಿಸಿ',
    'ml': 'ക്ഷമിക്കണം',
    'bn': 'দুঃখিত',
    'gu': 'માફ કરજો',
    'mr': 'माफ करा',
    'pa': 'ਮਾਫ਼ ਕਰਨਾ'
  },
  'yes': {
    'hi': 'हाँ',
    'ta': 'ஆம்',
    'te': 'అవును',
    'kn': 'ಹೌದು',
    'ml': 'അതെ',
    'bn': 'হ্যাঁ',
    'gu': 'હા',
    'mr': 'होय',
    'pa': 'ਹਾਂ'
  },
  'no': {
    'hi': 'नहीं',
    'ta': 'இல்லை',
    'te': 'లేదు',
    'kn': 'ಇಲ್ಲ',
    'ml': 'ഇല്ല',
    'bn': 'না',
    'gu': 'ના',
    'mr': 'नाही',
    'pa': 'ਨਹੀਂ'
  },
  'understand': {
    'hi': 'समझना',
    'ta': 'புரிந்து கொள்ள',
    'te': 'అర్థం చేసుకోవాలి',
    'kn': 'ಅರ್ಥಮಾಡಿಕೊಳ್ಳಿ',
    'ml': 'മനസ്സിലാക്കാൻ',
    'bn': 'বুঝতে',
    'gu': 'સમજવું',
    'mr': 'समजणे',
    'pa': 'ਸਮਝਣਾ'
  },
  'question': {
    'hi': 'प्रश्न',
    'ta': 'கேள்வி',
    'te': 'ప్రశ్న',
    'kn': 'ಪ್ರಶ್ನೆ',
    'ml': 'ചോദ്യം',
    'bn': 'প্রশ্ন',
    'gu': 'પ્રશ્ન',
    'mr': 'प्रश्न',
    'pa': 'ਸਵਾਲ'
  },
  'answer': {
    'hi': 'उत्तर',
    'ta': 'பதில்',
    'te': 'జవాబు',
    'kn': 'ಉತ್ತರ',
    'ml': 'ഉത്തരം',
    'bn': 'উত্তর',
    'gu': 'જવાબ',
    'mr': 'उत्तर',
    'pa': 'ਜਵਾਬ'
  }
};

// Cache helper functions
function getCacheKey(text, from, to) {
  return `${text}_${from}_${to}`;
}

function getCachedTranslation(text, from, to) {
  const key = getCacheKey(text, from, to);
  const cached = translationCache.get(key);
  
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.translation;
  }
  
  return null;
}

function setCachedTranslation(text, from, to, translation) {
  const key = getCacheKey(text, from, to);
  translationCache.set(key, {
    translation,
    timestamp: Date.now()
  });
}

// Translation with multiple fallback methods
async function translateText(text, from, to) {
  // Check cache first
  const cached = getCachedTranslation(text, from, to);
  if (cached) {
    return { success: true, translated: cached, source: 'cache' };
  }

  // Method 1: Google Translate API (if configured and available)
  if (googleTranslateAvailable && translate) {
    try {
      const [translation] = await translate.translate(text, {
        from: from === 'auto' ? undefined : from,
        to: to
      });
      
      setCachedTranslation(text, from, to, translation);
      return { success: true, translated: translation, source: 'google' };
    } catch (error) {
      console.warn('Google Translate API call failed:', error.message);
      // Don't set googleTranslateAvailable to false here as it might be a temporary network issue
    }
  }

  // Method 2: LibreTranslate (free alternative)
  try {
    const response = await fetch('https://libretranslate.de/translate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        q: text,
        source: from === 'auto' ? 'auto' : from,
        target: to,
        format: 'text'
      })
    });

    if (response.ok) {
      const data = await response.json();
      setCachedTranslation(text, from, to, data.translatedText);
      return { success: true, translated: data.translatedText, source: 'libretranslate' };
    }
  } catch (error) {
    console.warn('LibreTranslate failed:', error.message);
  }

  // Method 3: MyMemory (free alternative)
  try {
    const langPair = `${from}|${to}`;
    const response = await fetch(
      `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${langPair}`
    );

    if (response.ok) {
      const data = await response.json();
      if (data.responseStatus === 200) {
        setCachedTranslation(text, from, to, data.responseData.translatedText);
        return { success: true, translated: data.responseData.translatedText, source: 'mymemory' };
      }
    }
  } catch (error) {
    console.warn('MyMemory failed:', error.message);
  }

  // Method 4: Phrase-based translation for common terms
  const lowerText = text.toLowerCase().trim();
  if (PHRASE_TRANSLATIONS[lowerText] && PHRASE_TRANSLATIONS[lowerText][to]) {
    const translation = PHRASE_TRANSLATIONS[lowerText][to];
    setCachedTranslation(text, from, to, translation);
    return { success: true, translated: translation, source: 'phrases' };
  }

  // Method 5: Last resort - return original with indication
  return { success: false, translated: `[${text}]`, source: 'fallback' };
}

// Fast translation with timeout for real-time captions
async function translateWithService(text, from, to, timeoutMs = 500) {
  return new Promise(async (resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Translation timeout'));
    }, timeoutMs);

    try {
      // Try fastest services first
      
      // Method 1: MyMemory (usually fastest)
      try {
        const langPair = `${from}|${to}`;
        const response = await fetch(
          `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${langPair}`,
          { 
            method: 'GET',
            signal: AbortSignal.timeout(timeoutMs - 100) // Leave 100ms buffer
          }
        );

        if (response.ok) {
          const data = await response.json();
          if (data.responseStatus === 200 && data.responseData?.translatedText) {
            clearTimeout(timeout);
            resolve({
              translatedText: data.responseData.translatedText,
              confidence: data.responseData.match || 0.7,
              source: 'mymemory'
            });
            return;
          }
        }
      } catch (error) {
        // Continue to next service
      }

      // Method 2: Google Translate (if available)
      if (googleTranslateAvailable && translate) {
        try {
          const [translation] = await translate.translate(text, {
            from: from === 'auto' ? undefined : from,
            to: to
          });
          
          clearTimeout(timeout);
          resolve({
            translatedText: translation,
            confidence: 0.9,
            source: 'google'
          });
          return;
        } catch (error) {
          // Continue to next service
        }
      }

      // Method 3: LibreTranslate
      try {
        const response = await fetch('https://libretranslate.de/translate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            q: text,
            source: from === 'auto' ? 'auto' : from,
            target: to,
            format: 'text'
          }),
          signal: AbortSignal.timeout(timeoutMs - 50)
        });

        if (response.ok) {
          const data = await response.json();
          if (data.translatedText) {
            clearTimeout(timeout);
            resolve({
              translatedText: data.translatedText,
              confidence: 0.8,
              source: 'libretranslate'
            });
            return;
          }
        }
      } catch (error) {
        // Continue to fallback
      }

      // Fallback: No translation available
      clearTimeout(timeout);
      reject(new Error('No translation service available'));

    } catch (error) {
      clearTimeout(timeout);
      reject(error);
    }
  });
}

// POST /api/translate - Translate text
router.post('/translate', authenticateToken, async (req, res) => {
  try {
    const { text, from, to } = req.body;

    // Validation
    if (!text || !to) {
      return res.status(400).json({
        success: false,
        message: 'Text and target language are required'
      });
    }

    if (text.length > 5000) {
      return res.status(400).json({
        success: false,
        message: 'Text too long (max 5000 characters)'
      });
    }

    // Auto-detect source language if not provided
    const sourceLanguage = from || 'auto';

    // Translate the text
    const result = await translateText(text, sourceLanguage, to);

    res.json({
      success: result.success,
      original: text,
      translated: result.translated,
      from: sourceLanguage,
      to: to,
      source: result.source,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Translation error:', error);
    res.status(500).json({
      success: false,
      message: 'Translation service error',
      error: error.message
    });
  }
});

// POST /api/translate/instant - Ultra-fast translation for real-time captions
router.post('/instant', authenticateToken, async (req, res) => {
  try {
    const { text, targetLanguage, sourceLanguage = 'en' } = req.body;

    if (!text || !targetLanguage) {
      return res.status(400).json({
        success: false,
        message: 'Text and target language are required'
      });
    }

    // If same language, return original
    if (sourceLanguage === targetLanguage) {
      return res.json({
        success: true,
        translatedText: text,
        originalText: text,
        fromCache: false,
        confidence: 1.0,
        latency: 0
      });
    }

    const startTime = Date.now();

    // Create cache key
    const cacheKey = `${text.toLowerCase().trim()}_${sourceLanguage}_${targetLanguage}`;

    // Check cache first (instant response)
    if (translationCache.has(cacheKey)) {
      const cached = translationCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        return res.json({
          success: true,
          translatedText: cached.text,
          originalText: text,
          fromCache: true,
          confidence: 0.9,
          latency: Date.now() - startTime
        });
      }
    }

    // Check basic phrase translations (instant response)
    const lowerText = text.toLowerCase().trim();
    const phraseTranslation = PHRASE_TRANSLATIONS[lowerText];
    if (phraseTranslation && phraseTranslation[targetLanguage]) {
      const translation = phraseTranslation[targetLanguage];
      
      // Cache the result
      translationCache.set(cacheKey, {
        text: translation,
        timestamp: Date.now()
      });
      
      return res.json({
        success: true,
        translatedText: translation,
        originalText: text,
        fromCache: false,
        confidence: 0.95,
        latency: Date.now() - startTime
      });
    }

    // For longer texts, use fastest available service with timeout
    let translatedText = text; // Fallback to original
    let confidence = 0.5;

    try {
      // Array of translation functions in order of speed preference
      const translationServices = [
        () => translateWithService(text, sourceLanguage, targetLanguage, 300), // 300ms timeout
      ];

      for (const translateFn of translationServices) {
        try {
          const result = await translateFn();
          if (result && result.translatedText && result.translatedText !== text) {
            translatedText = result.translatedText;
            confidence = result.confidence || 0.8;
            
            // Cache successful translation
            translationCache.set(cacheKey, {
              text: translatedText,
              timestamp: Date.now()
            });
            break;
          }
        } catch (serviceError) {
          console.warn('Fast translation service failed:', serviceError.message);
          continue;
        }
      }

    } catch (error) {
      console.error('All instant translation services failed:', error);
      // Return original text as fallback
    }

    res.json({
      success: true,
      translatedText,
      originalText: text,
      fromCache: false,
      confidence,
      latency: Date.now() - startTime
    });

  } catch (error) {
    console.error('Instant translation error:', error);
    res.status(200).json({ // Return 200 to avoid breaking real-time flow
      success: true,
      translatedText: req.body.text || '', // Fallback to original
      originalText: req.body.text || '',
      fromCache: false,
      confidence: 0,
      latency: 0,
      error: 'Translation service temporarily unavailable'
    });
  }
});

// POST /api/translate/batch - Translate to multiple languages
router.post('/translate/batch', authenticateToken, async (req, res) => {
  try {
    const { text, from, languages } = req.body;

    if (!text || !languages || !Array.isArray(languages)) {
      return res.status(400).json({
        success: false,
        message: 'Text and target languages array are required'
      });
    }

    if (languages.length > 10) {
      return res.status(400).json({
        success: false,
        message: 'Too many target languages (max 10)'
      });
    }

    const sourceLanguage = from || 'auto';
    const translations = {};

    // Translate to each target language
    await Promise.all(
      languages.map(async (targetLang) => {
        if (targetLang !== sourceLanguage) {
          const result = await translateText(text, sourceLanguage, targetLang);
          translations[targetLang] = {
            text: result.translated,
            success: result.success,
            source: result.source
          };
        }
      })
    );

    res.json({
      success: true,
      original: text,
      from: sourceLanguage,
      translations: translations,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Batch translation error:', error);
    res.status(500).json({
      success: false,
      message: 'Batch translation service error',
      error: error.message
    });
  }
});

// GET /api/translate/languages - Get supported languages
router.get('/languages', (req, res) => {
  res.json({
    success: true,
    languages: SUPPORTED_LANGUAGES,
    phrases: Object.keys(PHRASE_TRANSLATIONS)
  });
});

// GET /api/translate/health - Check translation service health
router.get('/health', async (req, res) => {
  const health = {
    cache: {
      size: translationCache.size,
      status: 'active'
    },
    services: {
      google: {
        available: googleTranslateAvailable,
        configured: hasGoogleCredentials(),
        status: googleTranslateAvailable ? 'active' : 'unavailable'
      },
      libretranslate: false,
      mymemory: false,
      phrases: true
    },
    fallbackChain: [
      googleTranslateAvailable ? 'Google Translate' : null,
      'LibreTranslate',
      'MyMemory',
      'Basic Phrases'
    ].filter(Boolean)
  };

  // Test LibreTranslate (with timeout)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    
    const response = await fetch('https://libretranslate.de/languages', { 
      method: 'GET',
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    health.services.libretranslate = response.ok;
  } catch (error) {
    health.services.libretranslate = false;
  }

  // Test MyMemory (with timeout)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    
    const response = await fetch('https://api.mymemory.translated.net/get?q=test&langpair=en|hi', { 
      method: 'GET',
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    health.services.mymemory = response.ok;
  } catch (error) {
    health.services.mymemory = false;
  }

  res.json({
    success: true,
    health: health,
    message: health.services.google.available ? 
      'Premium translation service active' : 
      'Using free translation services',
    timestamp: new Date().toISOString()
  });
});

// Clear translation cache (admin only)
router.delete('/cache', authenticateToken, (req, res) => {
  translationCache.clear();
  res.json({
    success: true,
    message: 'Translation cache cleared',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;