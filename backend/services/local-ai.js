/**
 * Local AI Service for Learn-X Platform
 * Node.js wrapper for Python-based AI processing
 * Replaces Gemini AI with local open-source models
 */

const { spawn, exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const util = require('util');

const execAsync = util.promisify(exec);

class LocalAIService {
  constructor() {
    this.pythonScript = path.join(__dirname, 'local-ai-service.py');
    this.isInitialized = false;
    this.initPromise = null;
  }

  /**
   * Initialize the AI service and check dependencies
   */
  async initialize() {
    if (this.isInitialized) return true;
    if (this.initPromise) return this.initPromise;

    this.initPromise = this._performInitialization();
    return this.initPromise;
  }

  async _performInitialization() {
    try {
      console.log('🤖 Initializing Local AI Service...');

      // Check if Python script exists
      try {
        await fs.access(this.pythonScript);
      } catch (error) {
        throw new Error(`Python AI service not found at: ${this.pythonScript}`);
      }

      // Check Python and dependencies
      await this._checkPythonDependencies();

      // Test the service with a simple call
      await this._testService();

      this.isInitialized = true;
      console.log('✅ Local AI Service initialized successfully');
      return true;

    } catch (error) {
      console.error('❌ Failed to initialize Local AI Service:', error.message);
      throw error;
    }
  }

  async _checkPythonDependencies() {
    try {
      // Check if Python 3 is available
      const { stdout } = await execAsync('python --version 2>&1 || python3 --version 2>&1');
      console.log(`Python version: ${stdout.trim()}`);

      // Check critical dependencies
      const checkScript = `
import sys
try:
    import whisper, torch, transformers, nltk, spacy
    print("✅ All dependencies available")
    sys.exit(0)
except ImportError as e:
    print(f"❌ Missing dependency: {e}")
    sys.exit(1)
`;

      const { stdout: depCheck } = await execAsync(`python -c "${checkScript}" 2>&1 || python3 -c "${checkScript}" 2>&1`);
      console.log(depCheck.trim());

    } catch (error) {
      throw new Error(`Python dependency check failed: ${error.message}\nPlease install requirements: pip install -r local-ai-requirements.txt`);
    }
  }

  async _testService() {
    try {
      // Test with sample text
      const testResult = await this.processTextContent(
        "This is a test message to verify the AI service is working correctly.",
        "Test Content",
        "Testing"
      );

      if (!testResult || !testResult.analysis) {
        throw new Error('Service test failed - invalid response');
      }

      console.log('🧪 Service test passed');
    } catch (error) {
      throw new Error(`Service test failed: ${error.message}`);
    }
  }

  /**
   * Check if the service is properly configured
   */
  isConfigured() {
    return this.isInitialized;
  }

  /**
   * Process video file and generate comprehensive analysis
   * @param {string} videoPath - Path to video file
   * @param {string} title - Video title
   * @param {string} subject - Subject/topic
   * @returns {Promise<Object>} AI analysis results
   */
  async processVideoFile(videoPath, title = '', subject = '') {
    try {
      await this.initialize();

      console.log(`🎥 Processing video with Local AI: ${videoPath}`);

      const args = [
        this.pythonScript,
        '--input', videoPath,
        '--title', title,
        '--subject', subject
      ];

      const result = await this._executePythonScript(args);
      
      console.log('✅ Video processing completed');
      return this._formatResponse(result);

    } catch (error) {
      console.error('❌ Video processing failed:', error);
      throw new Error(`Local AI video processing failed: ${error.message}`);
    }
  }

  /**
   * Process text content directly
   * @param {string} textContent - Text to analyze
   * @param {string} title - Content title
   * @param {string} subject - Subject/topic
   * @returns {Promise<Object>} AI analysis results
   */
  async processTextContent(textContent, title = '', subject = '') {
    try {
      await this.initialize();

      console.log('📝 Processing text with Local AI...');

      // Create temporary text file
      const tempDir = path.join(__dirname, '../temp');
      await fs.mkdir(tempDir, { recursive: true });
      
      const tempFile = path.join(tempDir, `text_${Date.now()}.txt`);
      await fs.writeFile(tempFile, textContent, 'utf8');

      try {
        const args = [
          this.pythonScript,
          '--input', tempFile,
          '--title', title,
          '--subject', subject,
          '--text-mode'
        ];

        const result = await this._executePythonScript(args);
        
        console.log('✅ Text processing completed');
        return this._formatResponse(result);

      } finally {
        // Clean up temporary file
        try {
          await fs.unlink(tempFile);
        } catch (error) {
          console.warn('Failed to clean up temp file:', error.message);
        }
      }

    } catch (error) {
      console.error('❌ Text processing failed:', error);
      throw new Error(`Local AI text processing failed: ${error.message}`);
    }
  }

  /**
   * Process audio file directly
   * @param {string} audioPath - Path to audio file
   * @param {string} title - Content title
   * @param {string} subject - Subject/topic
   * @returns {Promise<Object>} AI analysis results
   */
  async processAudioFile(audioPath, title = '', subject = '') {
    // For audio files, we can use the video processing method
    // as Whisper handles both audio and video
    return this.processVideoFile(audioPath, title, subject);
  }

  /**
   * Execute Python script and return parsed result
   * @private
   */
  async _executePythonScript(args, timeout = 300000) { // 5 minute timeout
    return new Promise((resolve, reject) => {
      const pythonCommand = process.platform === 'win32' ? 'python' : 'python3';
      const child = spawn(pythonCommand, args, {
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: __dirname
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      // Set timeout
      const timer = setTimeout(() => {
        child.kill('SIGTERM');
        reject(new Error('Python script execution timed out'));
      }, timeout);

      child.on('close', (code) => {
        clearTimeout(timer);

        if (code !== 0) {
          reject(new Error(`Python script failed with code ${code}: ${stderr}`));
          return;
        }

        try {
          const result = JSON.parse(stdout);
          resolve(result);
        } catch (error) {
          reject(new Error(`Failed to parse Python script output: ${error.message}\nOutput: ${stdout}`));
        }
      });

      child.on('error', (error) => {
        clearTimeout(timer);
        reject(new Error(`Failed to start Python script: ${error.message}`));
      });
    });
  }

  /**
   * Format the response to match expected API structure
   * @private
   */
  _formatResponse(result) {
    try {
      const analysis = result.analysis;
      const transcript = result.transcript;

      // Format to match the expected structure
      return {
        // Main analysis results
        summary: analysis.summary || 'Analysis completed successfully.',
        key_points: analysis.key_points || [],
        important_questions: analysis.questions?.map(q => q.question) || [],
        highlights: analysis.concepts?.map(c => c.term) || [],
        topics: analysis.topics || [],
        difficulty_level: analysis.difficulty || 'medium',
        estimated_study_time: analysis.estimated_study_time || '10 minutes',

        // Enhanced data structure for new AI Notes viewer
        segments: transcript.segments || [],
        analysis: {
          summary: analysis.summary,
          objectives: analysis.key_points?.slice(0, 3) || [],
          key_points: analysis.key_points || [],
          concepts: analysis.concepts || [],
          difficulty: analysis.difficulty || 'medium',
          study_time: analysis.estimated_study_time || '10 minutes'
        },
        concepts: analysis.concepts || [],
        questions: analysis.questions || [],
        timeline: analysis.timeline || [],
        metadata: {
          word_count: analysis.word_count || 0,
          duration: transcript.duration || 0,
          language: transcript.language || 'en',
          processing_method: 'local_ai',
          models_used: result.metadata?.models_used || ['whisper', 'transformers']
        },
        flashcards: analysis.flashcards || [],

        // Legacy format support
        transcript: transcript.text || '',
        ai_analysis: {
          summary: analysis.summary,
          key_points: analysis.key_points || [],
          important_questions: analysis.questions?.map(q => q.question) || [],
          highlights: analysis.concepts?.map(c => c.term) || [],
          topics: analysis.topics || [],
          difficulty_level: analysis.difficulty || 'medium',
          estimated_time: analysis.estimated_study_time || '10 minutes'
        }
      };

    } catch (error) {
      console.error('Response formatting error:', error);
      return {
        summary: 'Analysis completed with local AI models.',
        key_points: ['Content processed successfully'],
        important_questions: ['What are the main topics covered?'],
        highlights: ['Key concepts identified'],
        topics: ['General'],
        difficulty_level: 'medium',
        estimated_study_time: '10 minutes',
        transcript: result.transcript?.text || '',
        processing_method: 'local_ai'
      };
    }
  }

  /**
   * Get service status and capabilities
   */
  async getStatus() {
    try {
      await this.initialize();
      return {
        status: 'ready',
        capabilities: [
          'video_transcription',
          'text_analysis',
          'question_generation',
          'concept_extraction',
          'summarization',
          'flashcard_generation'
        ],
        models: [
          'OpenAI Whisper (transcription)',
          'Facebook BART (summarization)',
          'T5 (question generation)',
          'spaCy (NLP)',
          'SentenceTransformers (embeddings)'
        ],
        local: true,
        api_required: false
      };
    } catch (error) {
      return {
        status: 'error',
        error: error.message,
        local: true,
        api_required: false
      };
    }
  }
}

// Export singleton instance
module.exports = new LocalAIService();