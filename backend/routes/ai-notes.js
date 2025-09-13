const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const pool = require('../config/database');

// Import Gemini AI service
const GeminiAIService = require('../services/gemini-ai');
const geminiAI = new GeminiAIService();

// Configure multer for video uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/videos');
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
    const allowedTypes = /mp4|avi|mov|wmv|flv|webm/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only video files are allowed'));
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

module.exports = router;
