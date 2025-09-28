/**
 * Local AI Service for Learn-X Platform  
 * Node.js wrapper for Python-based AI microservice
 * Integrates with existing Python microservices infrastructure
 */

const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');

class LocalAIService {
    constructor() {
        this.baseURL = 'http://localhost:8003';
        this.initialized = false;
        this.healthCheckInterval = null;
        
        // Microservice URLs - Updated to match actual service ports
        this.services = {
            aiNotes: 'http://localhost:8003',    // AI Notes service
            captions: 'http://localhost:8004',   // Caption service (moved from 8003)
            translation: 'http://localhost:8002', // Translation service  
            audio: 'http://localhost:8001'       // Audio service
        };
    }

    async initialize() {
        try {
            console.log('🤖 Initializing Local AI Service...');
            
            // Check if AI Notes service is running (with graceful fallback)
            try {
                await this._checkServiceHealth();
                
                // Get service status
                const status = await this._getServiceStatus();
                console.log('📊 AI Service Status:', status);
                
                this.initialized = true;
                
                // Start health monitoring
                this._startHealthMonitoring();
                
                console.log('✅ Local AI Service initialized successfully');
                return true;
            } catch (serviceError) {
                console.warn('⚠️ AI Notes service not available, running in fallback mode');
                console.warn('Service error:', serviceError.message);
                
                // Initialize in fallback mode
                this.initialized = 'fallback';
                console.log('� Local AI Service running in fallback mode');
                return true;
            }
        } catch (error) {
            console.error('❌ Failed to initialize Local AI Service:', error.message);
            console.log('💡 Running in basic fallback mode');
            this.initialized = 'fallback';
            return true; // Don't fail completely
        }
    }

    async processVideoFile(videoPath, options = {}) {
        try {
            if (!this.initialized) {
                await this.initialize();
            }

            console.log(`🎥 Processing video: ${videoPath}`);
            
            // Check if file exists
            if (!fs.existsSync(videoPath)) {
                throw new Error(`Video file not found: ${videoPath}`);
            }

            // If running in fallback mode, use basic processing
            if (this.initialized === 'fallback') {
                return await this._processVideoFallback(videoPath, options);
            }

            const requestData = {
                video_path: videoPath,
                title: options.title || '',
                subject: options.subject || '',
                features: options.features || {
                    transcription: true,
                    summarization: true,
                    questions: true,
                    concepts: true,
                    timeline: true,
                    flashcards: true
                }
            };

            const response = await axios.post(
                `${this.baseURL}/process-video`,
                requestData,
                {
                    timeout: 300000, // 5 minutes
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }
            );

            return this._formatResponse(response.data);

        } catch (error) {
            console.error('❌ Video processing failed:', error.message);
            
            // Fallback to basic processing if AI service fails
            if (error.code === 'ECONNREFUSED' || error.response?.status >= 500) {
                console.log('🔄 Falling back to basic processing...');
                return await this._processVideoFallback(videoPath, options);
            }
            
            if (error.response) {
                console.error('Response data:', error.response.data);
                throw new Error(`AI Service Error: ${error.response.data.error || error.message}`);
            }
            throw error;
        }
    }

    async processTextContent(text, options = {}) {
        try {
            if (!this.initialized) {
                await this.initialize();
            }

            console.log('📝 Processing text content...');
            
            // If running in fallback mode, use basic processing
            if (this.initialized === 'fallback') {
                return await this._processTextFallback(text, options);
            }
            
            const requestData = {
                text: text,
                title: options.title || '',
                subject: options.subject || '',
                features: options.features || {
                    summarization: true,
                    questions: true,
                    concepts: true,
                    timeline: true,
                    flashcards: true
                }
            };

            const response = await axios.post(
                `${this.baseURL}/process-text`,
                requestData,
                {
                    timeout: 120000, // 2 minutes
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }
            );

            return this._formatResponse(response.data);

        } catch (error) {
            console.error('❌ Text processing failed:', error.message);
            
            // Fallback to basic processing if AI service fails
            if (error.code === 'ECONNREFUSED' || error.response?.status >= 500) {
                console.log('🔄 Falling back to basic text processing...');
                return await this._processTextFallback(text, options);
            }
            
            if (error.response) {
                console.error('Response data:', error.response.data);
                throw new Error(`AI Service Error: ${error.response.data.error || error.message}`);
            }
            throw error;
        }
    }

    async _checkServiceHealth() {
        try {
            const response = await axios.get(`${this.baseURL}/health`, {
                timeout: 5000
            });
            
            if (response.data.status !== 'healthy') {
                throw new Error('AI service is not healthy');
            }
            
            return response.data;
        } catch (error) {
            if (error.code === 'ECONNREFUSED') {
                throw new Error('AI Notes service is not running. Please start it first.');
            }
            throw error;
        }
    }

    async _getServiceStatus() {
        try {
            const response = await axios.get(`${this.baseURL}/status`, {
                timeout: 10000
            });
            return response.data;
        } catch (error) {
            console.warn('Could not get service status:', error.message);
            return { status: 'unknown' };
        }
    }

    _startHealthMonitoring() {
        // Exponential backoff health monitoring for AI Notes + auxiliary services
        const servicesToMonitor = [
            { key: 'aiNotes', url: this.services.aiNotes + '/health' },
            { key: 'audio', url: this.services.audio + '/health' },
            { key: 'translation', url: this.services.translation + '/health' },
            { key: 'captions', url: this.services.captions + '/health' }
        ];
        const state = {};
        servicesToMonitor.forEach(s => state[s.key] = { failures: 0, lastStatus: 'unknown', lastChecked: null });

        const check = async () => {
            for (const svc of servicesToMonitor) {
                try {
                    const resp = await axios.get(svc.url, { timeout: 5000 });
                    const healthy = (resp.status === 200);
                    state[svc.key].lastStatus = healthy ? 'healthy' : 'unhealthy';
                    state[svc.key].lastChecked = Date.now();
                    state[svc.key].failures = healthy ? 0 : state[svc.key].failures + 1;
                } catch (err) {
                    state[svc.key].failures += 1;
                    state[svc.key].lastStatus = 'down';
                    state[svc.key].lastChecked = Date.now();
                    // Only log every few failures to reduce spam
                    if (state[svc.key].failures === 1 || state[svc.key].failures % 5 === 0) {
                        console.warn(`🔄 Service '${svc.key}' health check failed (attempt ${state[svc.key].failures}): ${err.message}`);
                    }
                }
            }
            // Update overall initialized flag based on aiNotes core
            const core = state.aiNotes;
            if (core.lastStatus === 'healthy') {
                if (!this.initialized) console.log('✅ AI Notes service recovered and is healthy.');
                this.initialized = true;
            }
        };

        // Adaptive interval using exponential backoff (base 15s up to 5m)
        let intervalMs = 15000; // 15s initial
        const maxMs = 300000; // 5 minutes

        const scheduleNext = () => {
            // Increase interval if repeated failures across services
            const totalFailures = Object.values(state).reduce((a, s) => a + (s.failures > 0 ? 1 : 0), 0);
            if (totalFailures === 0) {
                intervalMs = 30000; // stable 30s when healthy
            } else {
                intervalMs = Math.min(intervalMs * 2, maxMs);
            }
            this.healthCheckInterval = setTimeout(async () => {
                await check();
                scheduleNext();
            }, intervalMs);
        };

        // Kick off first run (non-blocking)
        check().then(scheduleNext);
    }

    _formatResponse(serviceResponse) {
        if (!serviceResponse.success) {
            throw new Error(serviceResponse.error || 'AI processing failed');
        }

        const data = serviceResponse.data;
        
        return {
            success: true,
            data: {
                transcript: data.transcript || { text: '', segments: [] },
                summary: data.summary || '',
                keyPoints: data.key_points || data.analysis?.key_points || [],
                concepts: data.concepts || data.analysis?.concepts || [],
                questions: data.questions || data.analysis?.questions || [],
                timeline: data.timeline || data.analysis?.timeline || [],
                flashcards: data.flashcards || data.analysis?.flashcards || [],
                metadata: {
                    processingMethod: 'local_ai_microservice',
                    processingTime: serviceResponse.processing_time || 0,
                    modelsUsed: data.metadata?.models_used || [],
                    wordCount: data.metadata?.word_count || 0,
                    language: data.transcript?.language || 'en',
                    duration: data.transcript?.duration || 0,
                    ...data.metadata
                }
            }
        };
    }

    // Integration with existing microservices
    async getCaptions(videoPath, language = 'en') {
        try {
            const response = await axios.post(`${this.services.captions}/generate-captions`, {
                video_path: videoPath,
                language: language,
                format: 'srt'
            });
            return response.data;
        } catch (error) {
            console.warn('Caption service unavailable:', error.message);
            return null;
        }
    }

    async getTranslation(text, targetLanguage = 'es') {
        try {
            const response = await axios.post(`${this.services.translation}/translate`, {
                text: text,
                target_language: targetLanguage
            });
            return response.data;
        } catch (error) {
            console.warn('Translation service unavailable:', error.message);
            return null;
        }
    }

    async getAudioAnalysis(audioPath) {
        try {
            const response = await axios.post(`${this.services.audio}/analyze-audio`, {
                audio_path: audioPath
            });
            return response.data;
        } catch (error) {
            console.warn('Audio service unavailable:', error.message);
            return null;
        }
    }

    // Enhanced processing with microservice integration
    async processVideoWithEnhancedFeatures(videoPath, options = {}) {
        try {
            console.log('🚀 Processing video with enhanced features...');
            
            // Main AI processing
            const aiResult = await this.processVideoFile(videoPath, options);
            
            // Parallel processing with microservices
            const enhancedResults = await Promise.allSettled([
                this.getCaptions(videoPath, options.captionLanguage),
                this.getTranslation(aiResult.data.summary, options.translateTo),
                this.getAudioAnalysis(videoPath)
            ]);
            
            // Combine results
            const result = {
                ...aiResult.data,
                enhanced: {
                    captions: enhancedResults[0].status === 'fulfilled' ? enhancedResults[0].value : null,
                    translation: enhancedResults[1].status === 'fulfilled' ? enhancedResults[1].value : null,
                    audioAnalysis: enhancedResults[2].status === 'fulfilled' ? enhancedResults[2].value : null
                }
            };
            
            return {
                success: true,
                data: result
            };
            
        } catch (error) {
            console.error('Enhanced video processing failed:', error.message);
            throw error;
        }
    }

    async shutdown() {
        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
        }
        this.initialized = false;
        console.log('🔄 Local AI Service shutdown complete');
    }

    // Fallback processing methods
    async _processVideoFallback(videoPath, options = {}) {
        console.log('🔄 Using fallback video processing...');
        
        const fileName = require('path').basename(videoPath, require('path').extname(videoPath));
        const title = options.title || fileName;
        const subject = options.subject || 'General';
        
        // Generate basic AI notes structure
        const fallbackData = {
            transcript: {
                text: `This is a fallback transcript for ${title}. AI processing is currently unavailable.`,
                language: 'en',
                segments: [
                    {
                        start: 0,
                        end: 30,
                        text: `Introduction to ${title}`,
                        confidence: 0.8
                    },
                    {
                        start: 30,
                        end: 60,
                        text: `Main content and key concepts discussion`,
                        confidence: 0.8
                    }
                ],
                duration: 60
            },
            analysis: {
                summary: `This video covers ${title} in the context of ${subject}. Full AI analysis will be available when the AI service is running.`,
                key_points: [
                    `Introduction to ${title}`,
                    `Key concepts and principles`,
                    `Practical applications and examples`
                ],
                concepts: [
                    {
                        term: title,
                        definition: `Main topic: ${title}`,
                        category: 'main_topic',
                        importance: 'high'
                    },
                    {
                        term: subject,
                        definition: `Subject area: ${subject}`,
                        category: 'subject',
                        importance: 'medium'
                    }
                ],
                questions: [
                    {
                        question: `What is the main focus of ${title}?`,
                        answer: `The main focus is on understanding and applying concepts related to ${title}.`,
                        difficulty: 'easy',
                        type: 'overview',
                        topic: subject
                    },
                    {
                        question: `How does ${title} relate to ${subject}?`,
                        answer: `${title} is an important aspect of ${subject} that provides foundational understanding.`,
                        difficulty: 'medium',
                        type: 'conceptual',
                        topic: subject
                    }
                ],
                timeline: [
                    {
                        timestamp: '0:00',
                        title: 'Introduction',
                        description: `Introduction to ${title}`,
                        chapter: 1
                    },
                    {
                        timestamp: '2:00',
                        title: 'Main Content',
                        description: 'Key concepts and discussions',
                        chapter: 2
                    }
                ],
                flashcards: [
                    {
                        front: `What is ${title}?`,
                        back: `${title} is the main topic covered in this educational content.`,
                        category: 'definition',
                        difficulty: 'easy'
                    }
                ],
                metadata: {
                    overallDifficulty: 'beginner',
                    estimatedStudyTime: '10 minutes',
                    academicLevel: 'General',
                    prerequisites: [],
                    targetAudience: 'General learners',
                    tags: [subject, title],
                    language: 'en'
                }
            }
        };

        return {
            success: true,
            data: {
                transcript: fallbackData.transcript,
                summary: fallbackData.analysis.summary,
                keyPoints: fallbackData.analysis.key_points,
                concepts: fallbackData.analysis.concepts,
                questions: fallbackData.analysis.questions,
                timeline: fallbackData.analysis.timeline,
                flashcards: fallbackData.analysis.flashcards,
                metadata: {
                    processingMethod: 'fallback_basic',
                    processingTime: 0.5,
                    modelsUsed: ['fallback_processor'],
                    wordCount: fallbackData.transcript.text.split(' ').length,
                    language: 'en',
                    duration: fallbackData.transcript.duration,
                    fallbackMode: true,
                    ...fallbackData.analysis.metadata
                }
            }
        };
    }

    async _processTextFallback(text, options = {}) {
        console.log('🔄 Using fallback text processing...');
        
        const title = options.title || 'Text Content';
        const subject = options.subject || 'General';
        
        // Basic text analysis
        const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
        const words = text.split(/\s+/).filter(w => w.length > 0);
        
        const fallbackData = {
            analysis: {
                summary: sentences.slice(0, 3).join('. ') + '.',
                key_points: sentences.slice(0, 5).map(s => s.trim()),
                concepts: [
                    {
                        term: title,
                        definition: `Main topic: ${title}`,
                        category: 'main_topic',
                        importance: 'high'
                    }
                ],
                questions: [
                    {
                        question: `What is the main topic discussed?`,
                        answer: `The main topic is ${title}.`,
                        difficulty: 'easy',
                        type: 'overview',
                        topic: subject
                    }
                ],
                timeline: [
                    {
                        timestamp: '0:00',
                        title: 'Content Overview',
                        description: sentences[0] || 'Content analysis',
                        chapter: 1
                    }
                ],
                flashcards: [
                    {
                        front: `What is ${title}?`,
                        back: sentences[0] || 'Main content topic',
                        category: 'definition',
                        difficulty: 'easy'
                    }
                ],
                metadata: {
                    overallDifficulty: words.length > 500 ? 'intermediate' : 'beginner',
                    estimatedStudyTime: `${Math.max(5, Math.floor(words.length / 100))} minutes`,
                    academicLevel: 'General',
                    prerequisites: [],
                    word_count: words.length,
                    sentence_count: sentences.length
                }
            }
        };

        return {
            success: true,
            data: {
                transcript: {
                    text: text,
                    language: 'en',
                    segments: [],
                    duration: 0
                },
                summary: fallbackData.analysis.summary,
                keyPoints: fallbackData.analysis.key_points,
                concepts: fallbackData.analysis.concepts,
                questions: fallbackData.analysis.questions,
                timeline: fallbackData.analysis.timeline,
                flashcards: fallbackData.analysis.flashcards,
                metadata: {
                    processingMethod: 'fallback_text_basic',
                    processingTime: 0.2,
                    modelsUsed: ['basic_text_processor'],
                    fallbackMode: true,
                    ...fallbackData.analysis.metadata
                }
            }
        };
    }
}

module.exports = new LocalAIService();