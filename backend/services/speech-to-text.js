// Safe Google Speech initialization
let speech;
let googleSpeechAvailable = false;

// Check if Google Cloud is available and configured
const hasGoogleCredentials = () => {
  return (
    (process.env.GOOGLE_CLOUD_PROJECT_ID && process.env.GOOGLE_CLOUD_KEY_FILE) ||
    process.env.GOOGLE_APPLICATION_CREDENTIALS
  );
};

// Only try to load if credentials are available
if (hasGoogleCredentials()) {
  try {
    require.resolve('@google-cloud/speech');
    speech = require('@google-cloud/speech');
    googleSpeechAvailable = true;
  } catch (error) {
    console.warn('Google Speech package not available in speech-to-text service');
  }
}

class SpeechToTextService {
  constructor() {
    this.speechClient = null;
    
    // Initialize Google Speech-to-Text client only if available and configured
    if (googleSpeechAvailable && speech) {
      try {
        this.speechClient = new speech.SpeechClient({
          keyFilename: process.env.GOOGLE_CLOUD_KEY_FILE,
          projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
        });
      } catch (error) {
        console.warn('Failed to initialize Google Speech client:', error.message);
      }
    }

    // Default configuration for live streaming
    this.defaultConfig = {
      encoding: 'WEBM_OPUS',
      sampleRateHertz: 48000,
      languageCode: 'en-US',
      enableAutomaticPunctuation: true,
      enableWordTimeOffsets: true,
      model: 'latest_long', // Best for live streaming
      useEnhanced: true,
    };

    // Active transcription streams by session
    this.activeStreams = new Map();
    this.sessionCaptions = new Map();
  }

  async startTranscription(sessionId, config = {}) {
    try {
      // If Google Speech client is not available, return error
      if (!this.speechClient) {
        console.log('Google Speech-to-Text not available');
        return { 
          success: false, 
          error: 'Speech-to-Text service not configured',
          fallback: true
        };
      }

      const finalConfig = { ...this.defaultConfig, ...config };
      
      const request = {
        config: finalConfig,
        interimResults: true, // Get partial results
      };

      // Create a new streaming recognition stream
      const recognizeStream = this.speechClient
        .streamingRecognize(request)
        .on('error', (error) => {
          console.error('Speech recognition error:', error);
          this.handleTranscriptionError(sessionId, error);
        })
        .on('data', (data) => {
          this.handleTranscriptionData(sessionId, data);
        });

      this.activeStreams.set(sessionId, {
        stream: recognizeStream,
        config: finalConfig,
        startTime: Date.now(),
        captionCount: 0
      });

      console.log(`🎤 Started transcription for session ${sessionId}`);
      return { success: true, sessionId };
    } catch (error) {
      console.error('Error starting transcription:', error);
      return { success: false, error: error.message };
    }
  }

  stopTranscription(sessionId) {
    const streamInfo = this.activeStreams.get(sessionId);
    if (streamInfo) {
      streamInfo.stream.end();
      this.activeStreams.delete(sessionId);
      console.log(`🛑 Stopped transcription for session ${sessionId}`);
      return { success: true };
    }
    return { success: false, error: 'No active transcription found' };
  }

  processAudioChunk(sessionId, audioBuffer) {
    const streamInfo = this.activeStreams.get(sessionId);
    if (streamInfo) {
      // Send audio data to the transcription stream
      streamInfo.stream.write({ audioContent: audioBuffer });
      return { success: true };
    }
    return { success: false, error: 'No active transcription stream' };
  }

  handleTranscriptionData(sessionId, data) {
    if (data.results[0] && data.results[0].alternatives[0]) {
      const result = data.results[0];
      const alternative = result.alternatives[0];
      
      const caption = {
        sessionId,
        text: alternative.transcript,
        confidence: alternative.confidence || 0.0,
        isFinal: result.isFinal,
        timestamp: Date.now(),
        words: alternative.words || []
      };

      // Store caption if it's final
      if (result.isFinal) {
        this.storeFinalCaption(sessionId, caption);
      }

      // Emit real-time caption event
      this.emitCaption(sessionId, caption);
    }
  }

  handleTranscriptionError(sessionId, error) {
    console.error(`Transcription error for session ${sessionId}:`, error);
    
    // Emit error event
    this.emitError(sessionId, {
      type: 'transcription_error',
      message: error.message,
      timestamp: Date.now()
    });

    // Try to restart transcription
    setTimeout(() => {
      console.log(`Attempting to restart transcription for session ${sessionId}`);
      this.restartTranscription(sessionId);
    }, 5000);
  }

  async storeFinalCaption(sessionId, caption) {
    try {
      const streamInfo = this.activeStreams.get(sessionId);
      if (!streamInfo) return;

      streamInfo.captionCount++;

      // Calculate relative time from session start
      const relativeTime = (caption.timestamp - streamInfo.startTime) / 1000;

      // Store in database (this would be called from the main service)
      const captionData = {
        sessionId,
        text: caption.text,
        confidence: caption.confidence,
        startTime: relativeTime,
        timestamp: caption.timestamp,
        isFinal: true
      };

      // Add to session captions cache
      if (!this.sessionCaptions.has(sessionId)) {
        this.sessionCaptions.set(sessionId, []);
      }
      this.sessionCaptions.get(sessionId).push(captionData);

      return captionData;
    } catch (error) {
      console.error('Error storing caption:', error);
    }
  }

  getSessionCaptions(sessionId) {
    return this.sessionCaptions.get(sessionId) || [];
  }

  clearSessionCaptions(sessionId) {
    this.sessionCaptions.delete(sessionId);
  }

  // Event emission methods (to be overridden by parent service)
  emitCaption(sessionId, caption) {
    // This will be overridden by the LiveStreamingService
    console.log(`Caption for session ${sessionId}:`, caption.text);
  }

  emitError(sessionId, error) {
    // This will be overridden by the LiveStreamingService
    console.error(`Error for session ${sessionId}:`, error);
  }

  restartTranscription(sessionId) {
    const streamInfo = this.activeStreams.get(sessionId);
    if (streamInfo) {
      this.stopTranscription(sessionId);
      setTimeout(() => {
        this.startTranscription(sessionId, streamInfo.config);
      }, 1000);
    }
  }

  // Get supported languages
  getSupportedLanguages() {
    return {
      'en-US': 'English (US)',
      'en-GB': 'English (UK)',
      'es-ES': 'Spanish (Spain)',
      'es-US': 'Spanish (US)',
      'fr-FR': 'French',
      'de-DE': 'German',
      'it-IT': 'Italian',
      'pt-PT': 'Portuguese',
      'ru-RU': 'Russian',
      'ja-JP': 'Japanese',
      'ko-KR': 'Korean',
      'zh-CN': 'Chinese (Simplified)',
      'ar-XA': 'Arabic',
      'hi-IN': 'Hindi',
      'tr-TR': 'Turkish',
      'pl-PL': 'Polish',
      'nl-NL': 'Dutch',
      'sv-SE': 'Swedish',
      'da-DK': 'Danish',
      'no-NO': 'Norwegian',
      'fi-FI': 'Finnish'
    };
  }

  isLanguageSupported(languageCode) {
    return !!this.getSupportedLanguages()[languageCode];
  }
}

// Fallback simple speech-to-text service for development
class SimpleSpeechToTextService {
  constructor() {
    this.activeStreams = new Map();
    this.sessionCaptions = new Map();
  }

  async startTranscription(sessionId, config = {}) {
    // Simulate transcription with dummy data
    const streamInfo = {
      startTime: Date.now(),
      captionCount: 0,
      interval: null
    };

    // Generate dummy captions every 3 seconds
    streamInfo.interval = setInterval(() => {
      const dummyCaptions = [
        "Welcome to today's live session.",
        "Let's start with the basics.",
        "Can everyone hear me clearly?",
        "Please turn on your cameras.",
        "We'll be covering important topics today.",
        "Feel free to ask questions in the chat."
      ];
      
      const randomCaption = dummyCaptions[Math.floor(Math.random() * dummyCaptions.length)];
      
      const caption = {
        sessionId,
        text: randomCaption,
        confidence: 0.95,
        isFinal: true,
        timestamp: Date.now()
      };

      this.storeFinalCaption(sessionId, caption);
      this.emitCaption(sessionId, caption);
    }, 5000);

    this.activeStreams.set(sessionId, streamInfo);
    console.log(`🎤 Started dummy transcription for session ${sessionId}`);
    return { success: true, sessionId };
  }

  stopTranscription(sessionId) {
    const streamInfo = this.activeStreams.get(sessionId);
    if (streamInfo && streamInfo.interval) {
      clearInterval(streamInfo.interval);
      this.activeStreams.delete(sessionId);
      console.log(`🛑 Stopped dummy transcription for session ${sessionId}`);
      return { success: true };
    }
    return { success: false, error: 'No active transcription found' };
  }

  processAudioChunk(sessionId, audioBuffer) {
    // Just acknowledge the audio chunk
    return { success: true };
  }

  async storeFinalCaption(sessionId, caption) {
    const streamInfo = this.activeStreams.get(sessionId);
    if (!streamInfo) return;

    streamInfo.captionCount++;

    const relativeTime = (caption.timestamp - streamInfo.startTime) / 1000;

    const captionData = {
      sessionId,
      text: caption.text,
      confidence: caption.confidence,
      startTime: relativeTime,
      timestamp: caption.timestamp,
      isFinal: true
    };

    if (!this.sessionCaptions.has(sessionId)) {
      this.sessionCaptions.set(sessionId, []);
    }
    this.sessionCaptions.get(sessionId).push(captionData);

    return captionData;
  }

  getSessionCaptions(sessionId) {
    return this.sessionCaptions.get(sessionId) || [];
  }

  clearSessionCaptions(sessionId) {
    this.sessionCaptions.delete(sessionId);
  }

  emitCaption(sessionId, caption) {
    console.log(`Dummy caption for session ${sessionId}:`, caption.text);
  }

  emitError(sessionId, error) {
    console.error(`Dummy error for session ${sessionId}:`, error);
  }

  getSupportedLanguages() {
    return {
      'en-US': 'English (US)',
      'es-ES': 'Spanish',
      'fr-FR': 'French',
      'de-DE': 'German'
    };
  }

  isLanguageSupported(languageCode) {
    return !!this.getSupportedLanguages()[languageCode];
  }
}

module.exports = { 
  SpeechToTextService, 
  SimpleSpeechToTextService 
};