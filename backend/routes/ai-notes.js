const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');
const PDFDocument = require('pdfkit');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const pool = require('../config/database');

// Import Gemini AI service
const GeminiAIService = require('../services/gemini-ai');
const geminiAI = new GeminiAIService();

// Configure multer for video and PDF uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let uploadDir;
    if (file.mimetype === 'application/pdf') {
      uploadDir = path.join(__dirname, '../uploads/pdfs');
    } else {
      uploadDir = path.join(__dirname, '../uploads/videos');
    }
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /mp4|avi|mov|wmv|flv|webm|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype) || file.mimetype === 'application/pdf';
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only video files and PDF files are allowed'));
    }
  }
});

// Gemini AI Analysis service - Enhanced for educational content
const analyzeWithGemini = async (content, contentType = 'lecture', title = '', subject = '') => {
  try {
    console.log('🧠 Analyzing content with Gemini AI...');
    
    // Check if Gemini is configured
    if (!geminiAI.isConfigured()) {
      console.warn('⚠️  Gemini API not configured, using fallback analysis');
      return getFallbackAnalysis(content, title, subject);
    }
    
    // Use Gemini for text analysis
    const analysis = await geminiAI.processTextContent(content, title, subject);
    
    console.log('✅ Gemini analysis completed successfully');
    return analysis;
    
  } catch (error) {
    console.error('❌ Gemini analysis failed:', error);
    console.log('🔄 Falling back to local analysis...');
    return getFallbackAnalysis(content, title, subject);
  }
};

// Enhanced fallback analysis for when Gemini is unavailable
const getFallbackAnalysis = (content, title, subject) => {
  const words = content.split(/\s+/);
  const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
  
  return {
    summary: `This ${subject} content covers ${title}. Key concepts and information have been extracted for study purposes. ${sentences[0]?.trim() || 'Content analyzed successfully.'}`,
    key_points: [
      `Introduction to ${title}`,
      `Core concepts in ${subject}`,
      `Important definitions and terminology`,
      `Practical applications and examples`,
      `Key takeaways and conclusions`,
      `Related topics for further study`
    ].slice(0, Math.min(8, Math.max(4, Math.floor(words.length / 50)))),
    
    important_questions: [
      `What are the main concepts covered in ${title}?`,
      `How do these concepts apply to ${subject}?`,
      `What are the key definitions to remember?`,
      `What examples illustrate these concepts?`,
      `How does this relate to other topics in ${subject}?`
    ].slice(0, Math.min(6, Math.max(3, Math.floor(sentences.length / 3)))),
    
    highlights: [
      `${title} fundamentals`,
      `Key ${subject} principles`,
      `Important terminology`,
      `Practical applications`,
      `Critical concepts`
    ].slice(0, Math.min(5, Math.max(3, Math.floor(words.length / 100)))),
    
    topics: [title, subject, "Core Concepts", "Applications", "Key Terms"],
    difficulty_level: words.length > 500 ? "Intermediate" : words.length > 200 ? "Beginner" : "Basic",
    estimated_study_time: `${Math.max(5, Math.ceil(words.length / 200))} minutes`
  };
};

// Extract transcript from video using ffmpeg and speech recognition
const extractTranscriptFromVideo = async (videoPath) => {
  try {
    // Extract audio from video
    const audioPath = videoPath.replace(/\.[^/.]+$/, ".wav");
    await execAsync(`ffmpeg -i "${videoPath}" -ac 1 -ar 16000 "${audioPath}"`);
    
    // Use speech recognition (placeholder - in production use services like Whisper)
    // For now, return a mock transcript
    return "This is a sample transcript extracted from the video content. In a production environment, this would be the actual speech-to-text conversion of the video audio using services like OpenAI Whisper, Google Speech-to-Text, or similar technologies.";
    
  } catch (error) {
    console.error('Transcript extraction failed:', error);
    return "Could not extract transcript from video. Please provide text content manually.";
  }
};

// Download video from URL
const downloadVideoFromUrl = async (videoUrl, filename) => {
  try {
    const videoPath = path.join(__dirname, '../uploads/videos', filename);
    
    if (videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be')) {
      // Use youtube-dl or yt-dlp for YouTube videos
      await execAsync(`yt-dlp -o "${videoPath}" "${videoUrl}"`);
    } else {
      // Download direct video URLs
      await execAsync(`curl -L -o "${videoPath}" "${videoUrl}"`);
    }
    
    return videoPath;
  } catch (error) {
    throw new Error('Failed to download video from URL');
  }
};

// Create AI notes table if it doesn't exist
const initializeAINotesTable = async () => {
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS ai_notes (
      id SERIAL PRIMARY KEY,
      lecture_id INTEGER REFERENCES recorded_lectures(id) ON DELETE CASCADE,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      title VARCHAR(255) NOT NULL,
      summary TEXT,
      key_points JSONB DEFAULT '[]',
      important_questions JSONB DEFAULT '[]',
      highlights JSONB DEFAULT '[]',
      tags JSONB DEFAULT '[]',
      difficulty VARCHAR(50) DEFAULT 'beginner',
      estimated_study_time VARCHAR(50),
      processing_status VARCHAR(50) DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(lecture_id, user_id)
    );
    
    CREATE INDEX IF NOT EXISTS idx_ai_notes_user_id ON ai_notes(user_id);
    CREATE INDEX IF NOT EXISTS idx_ai_notes_lecture_id ON ai_notes(lecture_id);
    CREATE INDEX IF NOT EXISTS idx_ai_notes_tags ON ai_notes USING GIN(tags);
  `;
  
  await pool.query(createTableQuery);
};

// Initialize table on module load
initializeAINotesTable().catch(console.error);

// GET /api/ai-notes - Get user's AI notes
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { search, tags, difficulty, limit = 20, offset = 0 } = req.query;
    
    let whereClause = 'WHERE an.user_id = $1';
    const params = [userId];
    let paramCount = 1;
    
    if (search) {
      paramCount++;
      whereClause += ` AND (
        an.title ILIKE $${paramCount} 
        OR an.summary ILIKE $${paramCount}
        OR rl.title ILIKE $${paramCount}
      )`;
      params.push(`%${search}%`);
    }
    
    if (tags) {
      paramCount++;
      whereClause += ` AND an.tags @> $${paramCount}::jsonb`;
      params.push(JSON.stringify([tags]));
    }
    
    if (difficulty) {
      paramCount++;
      whereClause += ` AND an.difficulty = $${paramCount}`;
      params.push(difficulty);
    }
    
    const notesQuery = `
      SELECT 
        an.*,
        rl.title as lecture_title,
        rl.class_name,
        rl.subject,
        rl.video_url,
        rl.created_at as lecture_date,
        u.username as teacher_name
      FROM ai_notes an
      JOIN recorded_lectures rl ON an.lecture_id = rl.id
      JOIN users u ON rl.teacher_id = u.id
      ${whereClause}
      ORDER BY an.updated_at DESC
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;
    
    params.push(parseInt(limit), parseInt(offset));
    const result = await pool.query(notesQuery, params);
    
    res.json({
      success: true,
      data: result.rows,
      total: result.rowCount
    });
  } catch (error) {
    console.error('Error fetching AI notes:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch AI notes' 
    });
  }
});

// POST /api/ai-notes/generate/:lectureId - Generate AI notes for a lecture
router.post('/generate/:lectureId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const lectureId = req.params.lectureId;
    
    // Check if lecture exists and user has access
    const lectureQuery = `
      SELECT rl.*, u.username as teacher_name
      FROM recorded_lectures rl
      JOIN users u ON rl.teacher_id = u.id
      WHERE rl.id = $1 AND (
        rl.is_public = true 
        OR EXISTS (
          SELECT 1 FROM class_enrollments ce 
          WHERE ce.class_id = rl.class_id 
          AND ce.student_id = $2 
          AND ce.is_active = true
        )
        OR rl.teacher_id = $2
      )
    `;
    
    const lectureResult = await pool.query(lectureQuery, [lectureId, userId]);
    if (lectureResult.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Lecture not found or access denied' 
      });
    }
    
    const lecture = lectureResult.rows[0];
    
    // Check if AI notes already exist
    const existingQuery = 'SELECT id FROM ai_notes WHERE lecture_id = $1 AND user_id = $2';
    const existing = await pool.query(existingQuery, [lectureId, userId]);
    
    if (existing.rows.length > 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'AI notes already exist for this lecture' 
      });
    }
    
    // Create pending AI notes entry
    const insertQuery = `
      INSERT INTO ai_notes (
        lecture_id, user_id, title, processing_status
      ) VALUES ($1, $2, $3, 'processing') 
      RETURNING id
    `;
    
    const insertResult = await pool.query(insertQuery, [
      lectureId, 
      userId, 
      `AI Notes: ${lecture.title}`
    ]);
    
    const noteId = insertResult.rows[0].id;
    
    // Process AI analysis in background
    setTimeout(async () => {
      try {
        const analysis = await analyzeVideo(lecture.video_url, lecture.transcript);
        
        const updateQuery = `
          UPDATE ai_notes 
          SET 
            summary = $1,
            key_points = $2,
            important_questions = $3,
            highlights = $4,
            tags = $5,
            difficulty = $6,
            estimated_study_time = $7,
            processing_status = 'completed',
            updated_at = CURRENT_TIMESTAMP
          WHERE id = $8
        `;
        
        await pool.query(updateQuery, [
          analysis.summary,
          JSON.stringify(analysis.keyPoints),
          JSON.stringify(analysis.importantQuestions),
          JSON.stringify(analysis.highlights),
          JSON.stringify(analysis.tags),
          analysis.difficulty,
          analysis.estimatedStudyTime,
          noteId
        ]);
      } catch (error) {
        console.error('Error processing AI analysis:', error);
        await pool.query(
          'UPDATE ai_notes SET processing_status = $1 WHERE id = $2',
          ['failed', noteId]
        );
      }
    }, 100);
    
    res.json({
      success: true,
      message: 'AI notes generation started',
      data: { id: noteId, status: 'processing' }
    });
    
  } catch (error) {
    console.error('Error generating AI notes:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to generate AI notes' 
    });
  }
});

// GET /api/ai-notes/:id - Get specific AI note
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const noteId = req.params.id;
    
    const query = `
      SELECT 
        an.*,
        rl.title as lecture_title,
        rl.class_name,
        rl.subject,
        rl.video_url,
        rl.duration,
        rl.created_at as lecture_date,
        u.username as teacher_name
      FROM ai_notes an
      JOIN recorded_lectures rl ON an.lecture_id = rl.id
      JOIN users u ON rl.teacher_id = u.id
      WHERE an.id = $1 AND an.user_id = $2
    `;
    
    const result = await pool.query(query, [noteId, userId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'AI note not found' 
      });
    }
    
    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error fetching AI note:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch AI note' 
    });
  }
});

// DELETE /api/ai-notes/:id - Delete AI note
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const noteId = req.params.id;
    
    const result = await pool.query(
      'DELETE FROM ai_notes WHERE id = $1 AND user_id = $2 RETURNING id',
      [noteId, userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'AI note not found' 
      });
    }
    
    res.json({
      success: true,
      message: 'AI note deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting AI note:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to delete AI note' 
    });
  }
});

// Video processing route
router.post('/process-video', upload.single('video'), async (req, res) => {
  try {
    console.log('Processing video request...');
    
    const { title, input_type, video_url, text_content } = req.body;
    
    if (!title) {
      return res.status(400).json({ 
        success: false, 
        message: 'Title is required' 
      });
    }

    let videoPath = null;
    let transcript = '';
    let videoInfo = {};

    // Process based on input type
    if (input_type === 'upload' && req.file) {
      console.log('Processing uploaded video...');
      videoPath = req.file.path;
      
      // Extract video info
      try {
        videoInfo = await getVideoInfo(videoPath);
      } catch (error) {
        console.warn('Could not extract video info:', error.message);
      }
      
      // Extract transcript
      try {
        transcript = await extractTranscript(videoPath);
      } catch (error) {
        console.warn('Could not extract transcript:', error.message);
        transcript = 'Transcript extraction failed';
      }
      
    } else if (input_type === 'url' && video_url) {
      console.log('Processing video URL...');
      
      try {
        // Download video from URL
        const downloadPath = path.join(__dirname, '..', 'uploads', `${Date.now()}_downloaded.mp4`);
        await downloadVideoFromURL(video_url, downloadPath);
        videoPath = downloadPath;
        
        // Extract video info
        try {
          videoInfo = await getVideoInfo(videoPath);
        } catch (error) {
          console.warn('Could not extract video info:', error.message);
        }
        
        // Extract transcript
        try {
          transcript = await extractTranscript(videoPath);
        } catch (error) {
          console.warn('Could not extract transcript:', error.message);
          transcript = 'Transcript extraction failed';
        }
        
      } catch (error) {
        console.error('Error downloading video:', error);
        return res.status(400).json({ 
          success: false, 
          message: 'Failed to download video from URL' 
        });
      }
      
    } else if (input_type === 'text' && text_content) {
      console.log('Processing text content...');
      transcript = text_content;
      
    } else {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid input type or missing content' 
      });
    }

    if (!transcript || transcript.trim().length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'No content to analyze' 
      });
    }

    console.log('🧠 Analyzing content with Gemini AI...');
    
    // Analyze with Gemini AI
    const analysis = await analyzeWithGemini(transcript, 'lecture', title, subject || 'General');
    
    // Save to database
    const insertQuery = `
      INSERT INTO ai_notes (title, content, summary, key_points, questions, highlights, topics, difficulty_level, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
      RETURNING *
    `;
    
    const values = [
      title,
      transcript,
      analysis.summary || 'No summary generated',
      JSON.stringify(analysis.key_points || []),
      JSON.stringify(analysis.questions || []),
      JSON.stringify(analysis.highlights || []),
      JSON.stringify(analysis.topics || []),
      analysis.difficulty_level || 'medium'
    ];

    const result = await db.query(insertQuery, values);
    const savedNote = result.rows[0];

    // Clean up uploaded/downloaded files
    if (videoPath && fs.existsSync(videoPath)) {
      try {
        fs.unlinkSync(videoPath);
        console.log('Cleaned up video file:', videoPath);
      } catch (error) {
        console.warn('Could not clean up video file:', error.message);
      }
    }

    // Return success response
    res.json({
      success: true,
      message: 'Video processed successfully',
      note: {
        id: savedNote.id,
        title: savedNote.title,
        content: savedNote.content,
        summary: savedNote.summary,
        key_points: JSON.parse(savedNote.key_points || '[]'),
        questions: JSON.parse(savedNote.questions || '[]'),
        highlights: JSON.parse(savedNote.highlights || '[]'),
        topics: JSON.parse(savedNote.topics || '[]'),
        difficulty_level: savedNote.difficulty_level,
        created_at: savedNote.created_at
      },
      video_info: videoInfo
    });

  } catch (error) {
    console.error('Error processing video:', error);
    
    // Clean up files on error
    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (cleanupError) {
        console.warn('Could not clean up file on error:', cleanupError.message);
      }
    }
    
    res.status(500).json({ 
      success: false, 
      message: 'Failed to process video: ' + error.message 
    });
  }
});

// PDF Processing Helper Functions
const generatePDFSummary = (text, maxSentences = 5) => {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);
  if (sentences.length <= maxSentences) return sentences.join('. ').trim() + '.';
  
  const summary = [
    sentences[0],
    ...sentences.slice(Math.floor(sentences.length * 0.3), Math.floor(sentences.length * 0.7)).slice(0, maxSentences - 2),
    sentences[sentences.length - 1]
  ];
  
  return summary.join('. ').trim() + '.';
};

const extractKeyPoints = (text) => {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 15);
  const keywords = ['important', 'key', 'main', 'primary', 'essential', 'significant', 'crucial'];
  
  const keyPoints = sentences
    .filter(sentence => 
      keywords.some(keyword => sentence.toLowerCase().includes(keyword)) ||
      sentence.length > 50
    )
    .slice(0, 8)
    .map(point => point.trim());
    
  if (keyPoints.length < 3) {
    const generalPoints = sentences.slice(0, 5).map(s => s.trim());
    keyPoints.push(...generalPoints);
  }
  
  return keyPoints.slice(0, 8);
};

const generateStudyQuestions = (text, title) => {
  const questions = [
    `What are the main concepts covered in "${title}"?`,
    `How would you summarize the key points of this document?`,
    `What are the most important takeaways from this material?`,
  ];
  
  const words = text.toLowerCase().split(/\s+/);
  if (words.includes('algorithm') || words.includes('method')) {
    questions.push('What algorithms or methods are discussed?');
  }
  if (words.includes('example') || words.includes('case')) {
    questions.push('What examples are provided to illustrate the concepts?');
  }
  if (words.includes('problem') || words.includes('solution')) {
    questions.push('What problems and solutions are presented?');
  }
  
  return questions.slice(0, 6);
};

const generateQuickQuiz = (text, title) => {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 20);
  const words = text.toLowerCase().split(/\s+/);
  
  const quiz = [];
  
  quiz.push({
    question: `What is the main topic of "${title}"?`,
    options: [
      title.split(' ')[0] || 'Main concept',
      'Secondary topic',
      'Related subject',
      'Different topic'
    ],
    correct: 0,
    explanation: 'This document focuses on ' + title
  });
  
  if (sentences.length > 2) {
    const firstSentence = sentences[0].trim();
    quiz.push({
      question: 'According to the document, what is mentioned first?',
      options: [
        firstSentence.substring(0, 50) + '...',
        'Different concept',
        'Alternative topic',
        'Unrelated information'
      ],
      correct: 0,
      explanation: 'The document begins by discussing: ' + firstSentence.substring(0, 100) + '...'
    });
  }
  
  const conceptWords = words.filter(w => w.length > 6);
  if (conceptWords.length > 5) {
    const concept = conceptWords[Math.floor(conceptWords.length / 2)];
    quiz.push({
      question: `Which concept is discussed in this document?`,
      options: [
        concept.charAt(0).toUpperCase() + concept.slice(1),
        'Unrelated concept A',
        'Unrelated concept B',
        'Different topic entirely'
      ],
      correct: 0,
      explanation: `The document discusses ${concept} among other topics.`
    });
  }
  
  return quiz.slice(0, 3);
};

const generateSamplePDF = async (title = 'Sample Study Material', content = null) => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument();
    const filename = `sample-${Date.now()}.pdf`;
    const filepath = path.join(__dirname, '../uploads/pdfs', filename);
    
    const uploadDir = path.dirname(filepath);
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    const stream = fs.createWriteStream(filepath);
    doc.pipe(stream);
    
    doc.fontSize(20).text(title, 100, 100);
    doc.moveDown();
    
    const sampleContent = content || `
This is a sample educational document about ${title}.

Key Concepts:
- Understanding the fundamental principles
- Exploring practical applications
- Analyzing real-world examples
- Developing problem-solving skills

Important Points:
The main objective is to provide comprehensive coverage of the topic. 
Students should focus on understanding the core concepts rather than memorizing details.
Practice exercises are essential for mastering the material.

Applications:
This knowledge can be applied in various scenarios including academic research, 
professional development, and practical problem-solving situations.

Conclusion:
Mastery of these concepts requires consistent practice and application. 
The key to success is understanding the underlying principles and being able to 
apply them in different contexts.
    `;
    
    doc.fontSize(12).text(sampleContent, 100, 150, { width: 400 });
    doc.end();
    
    stream.on('finish', () => {
      console.log('PDF generation completed:', filepath);
      resolve(filepath);
    });
    stream.on('error', reject);
  });
};

const generateStudyGuidePDF = async (title, analysis, quiz, textLength, pdfInfo) => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const filename = `study-guide-${Date.now()}.pdf`;
    const filepath = path.join(__dirname, '../uploads/pdfs', filename);
    
    const uploadDir = path.dirname(filepath);
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    const stream = fs.createWriteStream(filepath);
    doc.pipe(stream);
    
    // Title Page
    doc.fontSize(24).fillColor('#2563eb').text('📚 Study Guide', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(18).fillColor('#000000').text(title, { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(12).fillColor('#666666').text(`Generated on ${new Date().toLocaleDateString()}`, { align: 'center' });
    doc.moveDown(1);
    
    // Document Info
    doc.fontSize(14).fillColor('#059669').text('📄 Document Information', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(11).fillColor('#000000')
      .text(`Original File: ${pdfInfo.filename}`)
      .text(`File Size: ${Math.round(pdfInfo.size_bytes / 1024)} KB`)
      .text(`Content Length: ${textLength.toLocaleString()} characters`)
      .text(`Estimated Study Time: ${analysis.estimated_study_time || '15-20 minutes'}`)
      .text(`Difficulty Level: ${analysis.difficulty_level || 'Intermediate'}`);
    doc.moveDown(1);
    
    // Summary Section
    doc.fontSize(14).fillColor('#059669').text('📋 Summary', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(11).fillColor('#000000').text(analysis.summary || 'No summary available', { 
      width: 500, 
      align: 'justify' 
    });
    doc.moveDown(1);
    
    // Key Points Section
    if (analysis.key_points && analysis.key_points.length > 0) {
      doc.fontSize(14).fillColor('#059669').text('🔑 Key Points', { underline: true });
      doc.moveDown(0.5);
      analysis.key_points.forEach((point, index) => {
        doc.fontSize(11).fillColor('#000000').text(`${index + 1}. ${point}`, { 
          width: 500, 
          align: 'justify' 
        });
        doc.moveDown(0.3);
      });
      doc.moveDown(0.7);
    }
    
    // Important Questions Section
    if (analysis.important_questions && analysis.important_questions.length > 0) {
      doc.fontSize(14).fillColor('#059669').text('❓ Study Questions', { underline: true });
      doc.moveDown(0.5);
      analysis.important_questions.forEach((question, index) => {
        doc.fontSize(11).fillColor('#000000').text(`${index + 1}. ${question}`, { 
          width: 500, 
          align: 'justify' 
        });
        doc.moveDown(0.3);
      });
      doc.moveDown(0.7);
    }
    
    // Highlights Section
    if (analysis.highlights && analysis.highlights.length > 0) {
      doc.fontSize(14).fillColor('#059669').text('✨ Key Highlights', { underline: true });
      doc.moveDown(0.5);
      analysis.highlights.forEach((highlight, index) => {
        doc.fontSize(11).fillColor('#000000').text(`• ${highlight}`, { 
          width: 500, 
          align: 'justify' 
        });
        doc.moveDown(0.3);
      });
      doc.moveDown(0.7);
    }
    
    // Start new page for quiz if content is getting long
    if (doc.y > 650) {
      doc.addPage();
    }
    
    // Quiz Section
    if (quiz && quiz.length > 0) {
      doc.fontSize(14).fillColor('#059669').text('🎯 Quick Quiz', { underline: true });
      doc.moveDown(0.5);
      
      quiz.forEach((q, index) => {
        // Question
        doc.fontSize(12).fillColor('#1f2937').text(`Question ${index + 1}: ${q.question}`, { 
          width: 500 
        });
        doc.moveDown(0.3);
        
        // Options
        ['A', 'B', 'C', 'D'].forEach((letter, optIndex) => {
          const isCorrect = optIndex === q.correct;
          const prefix = isCorrect ? '✅' : '   ';
          doc.fontSize(10).fillColor(isCorrect ? '#059669' : '#374151')
            .text(`${prefix} ${letter}. ${q.options[optIndex]}`, { 
              width: 480,
              indent: 20
            });
          doc.moveDown(0.2);
        });
        
        // Explanation
        doc.fontSize(10).fillColor('#6b7280').text(`💡 ${q.explanation}`, { 
          width: 480,
          indent: 20
        });
        doc.moveDown(0.5);
        
        // Add page break if needed
        if (doc.y > 680 && index < quiz.length - 1) {
          doc.addPage();
        }
      });
    }
    
    // Footer
    doc.fontSize(8).fillColor('#9ca3af').text(
      `Generated by Learn-X AI Assistant • ${new Date().toISOString()}`,
      50,
      doc.page.height - 50,
      { align: 'center' }
    );
    
    doc.end();
    
    stream.on('finish', () => {
      console.log('📄 Study guide PDF generated:', filepath);
      resolve({ filepath, filename });
    });
    stream.on('error', reject);
  });
};

// POST /api/ai-notes/process-pdf - Process PDF for AI analysis
router.post('/process-pdf', upload.single('pdf'), async (req, res) => {
  try {
    console.log('📄 Processing PDF request...');
    console.log('Request body:', req.body);
    console.log('Request file:', req.file);
    
    const { title, subject, generate_sample } = req.body;
    const pdfSubject = (subject && String(subject).trim()) || 'General';
    
    if (!title) {
      return res.status(400).json({ 
        success: false, 
        message: 'Title is required' 
      });
    }

    let pdfPath = null;
    let extractedText = '';

    if (generate_sample === 'true' || generate_sample === true) {
      console.log('📋 Generating sample PDF...');
      try {
        pdfPath = await generateSamplePDF(title);
        console.log('✅ Sample PDF generated:', pdfPath);
      } catch (error) {
        console.error('❌ Failed to generate sample PDF:', error);
        return res.status(500).json({
          success: false,
          message: 'Failed to generate sample PDF: ' + error.message
        });
      }
    } else if (req.file) {
      console.log('📎 Processing uploaded PDF...');
      console.log('📂 File info:', {
        originalname: req.file.originalname,
        filename: req.file.filename,
        path: req.file.path,
        size: req.file.size,
        mimetype: req.file.mimetype
      });
      pdfPath = req.file.path;
      console.log('📍 Using PDF path:', pdfPath);
      
      // Verify file exists
      if (!fs.existsSync(pdfPath)) {
        console.error('❌ Uploaded file not found at:', pdfPath);
        return res.status(500).json({
          success: false,
          message: `Uploaded file not found at: ${pdfPath}`
        });
      }
      console.log('✅ File exists, size:', fs.statSync(pdfPath).size, 'bytes');
    } else {
      return res.status(400).json({ 
        success: false, 
        message: 'Please upload a PDF file or set generate_sample=true' 
      });
    }

    try {
      console.log('🔍 Extracting text from PDF...');
      const pdfBuffer = fs.readFileSync(pdfPath);
      const pdfData = await pdfParse(pdfBuffer);
      extractedText = pdfData.text.trim();
      
      if (!extractedText || extractedText.length < 10) {
        throw new Error('No readable text found in PDF');
      }
      
      console.log(`✅ Extracted ${extractedText.length} characters from PDF`);
    } catch (error) {
      console.error('❌ PDF text extraction failed:', error);
      return res.status(400).json({
        success: false,
        message: 'Failed to extract text from PDF: ' + error.message
      });
    }

    console.log('🧠 Analyzing PDF content...');
    
    const analysis = {
      summary: generatePDFSummary(extractedText),
      key_points: extractKeyPoints(extractedText),
      important_questions: generateStudyQuestions(extractedText, title),
      highlights: extractKeyPoints(extractedText).slice(0, 5),
      topics: [title, pdfSubject, 'Key Concepts', 'Study Material'],
      difficulty_level: extractedText.length > 2000 ? 'intermediate' : 'beginner',
      estimated_study_time: `${Math.max(5, Math.ceil(extractedText.length / 300))} minutes`
    };

    console.log('Analysis generated:', {
      summary_length: analysis.summary.length,
      key_points_count: analysis.key_points.length,
      key_points_sample: analysis.key_points[0]
    });

    const quiz = generateQuickQuiz(extractedText, title);

    // Create or get special lecture record for PDF processing
    let lectureId;
    try {
      const pdfLectureQuery = `
        INSERT INTO recorded_lectures (
          title, description, class_id, teacher_id, video_url, is_public
        ) VALUES ($1, $2, NULL, NULL, $3, true)
        ON CONFLICT DO NOTHING
        RETURNING id
      `;
      
      let lectureResult = await pool.query(pdfLectureQuery, [
        `PDF Processing: ${title}`,
        `Auto-generated lecture for PDF: ${title}`,
        pdfPath
      ]);
      
      if (lectureResult.rows.length === 0) {
        // If conflict occurred, find existing
        const findQuery = `
          SELECT id FROM recorded_lectures 
          WHERE title = $1 AND video_url = $2
        `;
        lectureResult = await pool.query(findQuery, [
          `PDF Processing: ${title}`,
          pdfPath
        ]);
      }
      
      lectureId = lectureResult.rows[0].id;
    } catch (error) {
      console.warn('Could not create lecture record, using fallback approach:', error.message);
      // Fallback: find any existing lecture or create minimal one
      try {
        const fallbackQuery = `
          SELECT id FROM recorded_lectures LIMIT 1
        `;
        const fallbackResult = await pool.query(fallbackQuery);
        if (fallbackResult.rows.length > 0) {
          lectureId = fallbackResult.rows[0].id;
        } else {
          throw new Error('No lectures exist in database');
        }
      } catch (fallbackError) {
        return res.status(500).json({
          success: false,
          message: 'Cannot process PDF: No lecture context available'
        });
      }
    }

    const insertQuery = `
      INSERT INTO ai_notes (
        lecture_id, user_id, title, content, summary, key_points, tags, confidence_score, generated_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW())
      RETURNING *
    `;

    const values = [
      lectureId,
      null, // user_id - null for now (would need authentication)
      `PDF: ${title}`,
      extractedText.substring(0, 5000), // content - truncated text
      analysis.summary || 'PDF content analyzed',
      JSON.stringify(analysis.key_points || []), // JSONB expects string
      analysis.topics || [], // TEXT[] for tags
      0.95 // confidence_score
    ];

    const result = await pool.query(insertQuery, values);
    const savedNote = result.rows[0];

    // Get file info before cleanup
    const pdfInfo = {
      filename: path.basename(pdfPath),
      generated: generate_sample === 'true' || generate_sample === true,
      size_bytes: fs.existsSync(pdfPath) ? fs.statSync(pdfPath).size : 0
    };

    // Optionally generate study guide PDF
    let studyGuideInfo = null;
    const generateStudyGuide = req.body.generate_study_guide || req.query.generate_study_guide;
    
    if (generateStudyGuide === 'true' || generateStudyGuide === true) {
      try {
        console.log('📄 Generating study guide PDF...');
        const studyGuideResult = await generateStudyGuidePDF(
          `PDF: ${title}`,
          analysis,
          quiz,
          extractedText.length,
          pdfInfo
        );
        studyGuideInfo = {
          filename: studyGuideResult.filename,
          filepath: studyGuideResult.filepath,
          download_url: `/api/ai-notes/download-study-guide/${studyGuideResult.filename}`
        };
        console.log('✅ Study guide PDF generated successfully');
      } catch (studyGuideError) {
        console.warn('⚠️ Failed to generate study guide PDF:', studyGuideError.message);
      }
    }

    if (pdfPath && req.file && fs.existsSync(pdfPath)) {
      try {
        fs.unlinkSync(pdfPath);
        console.log('🧹 Cleaned up uploaded PDF file');
      } catch (error) {
        console.warn('⚠️ Could not clean up PDF file:', error.message);
      }
    }

    res.json({
      success: true,
      message: 'PDF processed successfully',
      data: {
        note: {
          id: savedNote.id,
          title: savedNote.title,
          content: savedNote.content,
          summary: savedNote.summary,
          key_points: typeof savedNote.key_points === 'string' ? JSON.parse(savedNote.key_points) : savedNote.key_points,
          tags: Array.isArray(savedNote.tags) ? savedNote.tags : [],
          confidence_score: savedNote.confidence_score,
          generated_at: savedNote.generated_at
        },
        // Include analysis data that's not stored in DB
        important_questions: analysis.important_questions,
        highlights: analysis.highlights,
        difficulty: analysis.difficulty_level,
        estimated_study_time: analysis.estimated_study_time,
        quiz: quiz,
        text_length: extractedText.length,
        processing_method: 'heuristic_analysis',
        pdf_info: pdfInfo,
        study_guide: studyGuideInfo
      }
    });

  } catch (error) {
    console.error('❌ Error processing PDF:', error);
    
    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (cleanupError) {
        console.warn('⚠️ Could not clean up file on error:', cleanupError.message);
      }
    }
    
    res.status(500).json({ 
      success: false, 
      message: 'Failed to process PDF: ' + error.message 
    });
  }
});

// GET /api/ai-notes/download-study-guide/:filename - Download generated study guide PDF
router.get('/download-study-guide/:filename', (req, res) => {
  try {
    const filename = req.params.filename;
    
    // Validate filename to prevent directory traversal
    if (!filename || filename.includes('..') || !filename.endsWith('.pdf')) {
      return res.status(400).json({
        success: false,
        message: 'Invalid filename'
      });
    }
    
    const filepath = path.join(__dirname, '../uploads/pdfs', filename);
    
    // Check if file exists
    if (!fs.existsSync(filepath)) {
      return res.status(404).json({
        success: false,
        message: 'Study guide not found'
      });
    }
    
    // Set headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
    // Stream the file
    const fileStream = fs.createReadStream(filepath);
    fileStream.pipe(res);
    
    fileStream.on('error', (error) => {
      console.error('Error streaming study guide PDF:', error);
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          message: 'Error downloading study guide'
        });
      }
    });
    
  } catch (error) {
    console.error('Error in download study guide:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to download study guide'
    });
  }
});

module.exports = router;
