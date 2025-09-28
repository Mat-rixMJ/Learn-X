// Gemini AI Service for Learn-X Platform
// Replaces/enhances Ollama integration with Google Gemini API

const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const path = require('path');

class GeminiAIService {
  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    this.model = this.genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
  }

  /**
   * Process video file directly with Gemini
   * @param {string} videoPath - Path to uploaded video file
   * @param {string} title - Video title
   * @param {string} subject - Subject/topic
   * @returns {Object} AI analysis results
   */
  async processVideoFile(videoPath, title, subject) {
    try {
      console.log('🎥 Processing video with Gemini AI...');
      
      // Read video file
      const videoData = fs.readFileSync(videoPath);
      const base64Video = videoData.toString('base64');
      
      // Create video part for Gemini
      const videoPart = {
        inlineData: {
          data: base64Video,
          mimeType: this.getVideoMimeType(videoPath)
        }
      };

      const prompt = this.createVideoAnalysisPrompt(title, subject);
      
      const result = await this.model.generateContent([prompt, videoPart]);
      const response = await result.response;
      const analysisText = response.text();
      
      return this.parseAIResponse(analysisText);
      
    } catch (error) {
      console.error('❌ Gemini video processing error:', error);
      throw new Error('Failed to process video with Gemini AI');
    }
  }

  /**
   * Process audio from video (fallback method)
   * @param {string} audioPath - Path to extracted audio
   * @param {string} title - Content title  
   * @param {string} subject - Subject/topic
   * @returns {Object} AI analysis results
   */
  async processAudioFile(audioPath, title, subject) {
    try {
      console.log('🎵 Processing audio with Gemini AI...');
      
      const audioData = fs.readFileSync(audioPath);
      const base64Audio = audioData.toString('base64');
      
      const audioPart = {
        inlineData: {
          data: base64Audio,
          mimeType: 'audio/wav'
        }
      };

      const prompt = this.createAudioAnalysisPrompt(title, subject);
      
      const result = await this.model.generateContent([prompt, audioPart]);
      const response = await result.response;
      const analysisText = response.text();
      
      return this.parseAIResponse(analysisText);
      
    } catch (error) {
      console.error('❌ Gemini audio processing error:', error);
      throw new Error('Failed to process audio with Gemini AI');
    }
  }

  /**
   * Process text content with Gemini
   * @param {string} textContent - Text to analyze
   * @param {string} title - Content title
   * @param {string} subject - Subject/topic  
   * @returns {Object} AI analysis results
   */
  async processTextContent(textContent, title, subject) {
    try {
      console.log('📝 Processing text with Gemini AI...');
      
      const prompt = this.createTextAnalysisPrompt(textContent, title, subject);
      
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const analysisText = response.text();
      
      return this.parseAIResponse(analysisText);
      
    } catch (error) {
      console.error('❌ Gemini text processing error:', error);
      throw new Error('Failed to process text with Gemini AI');
    }
  }

  /**
   * Create comprehensive video analysis prompt
   */
  createVideoAnalysisPrompt(title, subject) {
    return `
As an expert educational content analyzer, analyze this video lecture and provide a comprehensive study guide.

**Video Title**: ${title}
**Subject**: ${subject}

Please analyze the video content and provide a detailed JSON response with the following structure:

{
  "summary": "A comprehensive 3-4 sentence summary of the main content",
  "key_points": [
    "8-12 most important points from the video",
    "Include specific examples, concepts, and explanations"
  ],
  "important_questions": [
    "5-8 study questions that test understanding",
    "Mix of conceptual and application questions"
  ],
  "highlights": [
    "4-6 critical concepts or terms that are emphasized",
    "Include definitions and explanations"
  ],
  "topics": [
    "Main topics and subtopics covered",
    "Organized hierarchically if possible"
  ],
  "difficulty_level": "Beginner/Intermediate/Advanced",
  "estimated_study_time": "X minutes/hours for review",
  "visual_elements": [
    "Description of important slides, diagrams, or visual content shown"
  ],
  "timestamps": [
    "Key moments in the video with time markers if identifiable"
  ],
  "prerequisites": [
    "Background knowledge needed to understand this content"
  ],
  "follow_up_topics": [
    "Related topics students should study next"
  ]
}

Focus on educational value and creating an effective study guide. Ensure all content is accurate and well-organized.
`;
  }

  /**
   * Create audio analysis prompt
   */
  createAudioAnalysisPrompt(title, subject) {
    return `
As an expert educational content analyzer, analyze this audio lecture and extract key learning content.

**Lecture Title**: ${title}
**Subject**: ${subject}

Please transcribe and analyze the audio content, then provide a detailed JSON response with:

{
  "transcript": "Full or key excerpts of the spoken content",
  "summary": "A comprehensive summary of the main content",
  "key_points": ["Most important points from the lecture"],
  "important_questions": ["Study questions based on the content"],
  "highlights": ["Critical concepts and terms mentioned"],
  "topics": ["Main topics covered"],
  "difficulty_level": "Assessment of content difficulty",
  "estimated_study_time": "Time needed for review",
  "speaker_notes": ["Any important speaker emphasis or repetition"]
}

Focus on educational accuracy and creating effective study materials.
`;
  }

  /**
   * Create text analysis prompt
   */
  createTextAnalysisPrompt(textContent, title, subject) {
    return `
As an expert educational content analyzer, analyze the following text content and create a comprehensive study guide.

**Title**: ${title}
**Subject**: ${subject}

**Content to Analyze**:
${textContent}

Please provide a detailed JSON response with:

{
  "summary": "A comprehensive summary of the main content",
  "key_points": ["8-12 most important points from the text"],
  "important_questions": ["5-8 study questions that test understanding"],
  "highlights": ["4-6 critical concepts or terms"],
  "topics": ["Main topics and subtopics"],
  "difficulty_level": "Beginner/Intermediate/Advanced",
  "estimated_study_time": "Time needed for study",
  "main_concepts": ["Core concepts that students must understand"],
  "examples": ["Important examples or case studies mentioned"],
  "formulas_equations": ["Any mathematical formulas or equations if applicable"]
}

Ensure educational accuracy and create materials that enhance learning.
`;
  }

  /**
   * Parse AI response and ensure proper structure
   */
  parseAIResponse(responseText) {
    try {
      // Extract JSON from response if wrapped in other text
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      const jsonString = jsonMatch ? jsonMatch[0] : responseText;
      
      const parsed = JSON.parse(jsonString);
      
      // Ensure required fields exist with defaults
      return {
        summary: parsed.summary || 'No summary available',
        key_points: Array.isArray(parsed.key_points) ? parsed.key_points : [],
        important_questions: Array.isArray(parsed.important_questions) ? parsed.important_questions : [],
        highlights: Array.isArray(parsed.highlights) ? parsed.highlights : [],
        topics: Array.isArray(parsed.topics) ? parsed.topics : [],
        difficulty_level: parsed.difficulty_level || 'Intermediate',
        estimated_study_time: parsed.estimated_study_time || '15-20 minutes',
        
        // Additional Gemini-specific fields
        visual_elements: parsed.visual_elements || [],
        timestamps: parsed.timestamps || [],
        prerequisites: parsed.prerequisites || [],
        follow_up_topics: parsed.follow_up_topics || [],
        transcript: parsed.transcript || '',
        speaker_notes: parsed.speaker_notes || [],
        main_concepts: parsed.main_concepts || [],
        examples: parsed.examples || [],
        formulas_equations: parsed.formulas_equations || []
      };
      
    } catch (error) {
      console.error('❌ Error parsing Gemini response:', error);
      
      // Return fallback structure
      return {
        summary: 'AI analysis completed, but response formatting needs adjustment.',
        key_points: ['Content was analyzed successfully'],
        important_questions: ['What were the main topics covered?'],
        highlights: ['Review the generated content'],
        topics: ['General content analysis'],
        difficulty_level: 'Intermediate',
        estimated_study_time: '15-20 minutes',
        visual_elements: [],
        timestamps: [],
        prerequisites: [],
        follow_up_topics: [],
        transcript: responseText.substring(0, 500) + '...',
        speaker_notes: [],
        main_concepts: [],
        examples: [],
        formulas_equations: []
      };
    }
  }

  /**
   * Determine video MIME type from file extension
   */
  getVideoMimeType(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes = {
      '.mp4': 'video/mp4',
      '.avi': 'video/x-msvideo',
      '.mov': 'video/quicktime',
      '.wmv': 'video/x-ms-wmv',
      '.webm': 'video/webm',
      '.flv': 'video/x-flv'
    };
    
    return mimeTypes[ext] || 'video/mp4';
  }

  /**
   * Check if Gemini API is configured
   */
  isConfigured() {
    return !!process.env.GEMINI_API_KEY;
  }

  /**
   * Get Gemini API usage info
   */
  getServiceInfo() {
    return {
      provider: 'Google Gemini AI',
      model: 'gemini-1.5-pro',
      capabilities: [
        'Video Analysis',
        'Audio Transcription', 
        'Text Processing',
        'Visual Content Understanding',
        'Multi-modal Processing'
      ],
      configured: this.isConfigured()
    };
  }
}

module.exports = GeminiAIService;
