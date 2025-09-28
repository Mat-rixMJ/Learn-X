const express = require('express');
const router = express.Router();
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const pool = require('../config/database');

// Create a new live class session (Teachers only)
router.post('/start', authenticateToken, authorizeRoles('teacher'), async (req, res) => {
  try {
    const teacherId = req.user.id;
    const { class_id, title, description, max_participants } = req.body;

    // Verify teacher owns this class
    const classCheck = await pool.query(
      'SELECT * FROM classes WHERE id = $1 AND teacher_id = $2',
      [class_id, teacherId]
    );

    if (classCheck.rows.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'You can only start live sessions for your own classes'
      });
    }

    // Check if there's already an active session for this class
    const activeSessionCheck = await pool.query(
      'SELECT * FROM live_sessions WHERE class_id = $1 AND status = $2',
      [class_id, 'active']
    );

    if (activeSessionCheck.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'There is already an active live session for this class'
      });
    }

    // Create new live session
    const sessionQuery = await pool.query(
      `INSERT INTO live_sessions 
       (class_id, teacher_id, title, description, max_participants, status, started_at) 
       VALUES ($1, $2, $3, $4, $5, $6, NOW()) 
       RETURNING *`,
      [class_id, teacherId, title, description, max_participants || 50, 'active']
    );

    const session = sessionQuery.rows[0];

    // Initialize live streaming session
    const liveStreamingService = req.app.get('liveStreamingService');
    if (liveStreamingService) {
      await liveStreamingService.startLiveSession(session.id, teacherId, class_id);
    }

    res.json({
      success: true,
      message: 'Live session started successfully',
      data: {
        session: {
          ...session,
          room_id: `live-${session.id}`,
          stream_url: `${process.env.STREAM_BASE_URL || 'http://localhost:5000'}/stream/${session.id}`
        }
      }
    });

  } catch (error) {
    console.error('Start live session error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to start live session'
    });
  }
});

// Join a live class session (Students and Teachers)
router.post('/join/:sessionId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    const sessionId = req.params.sessionId;

    // Get session details
    const sessionQuery = await pool.query(
      `SELECT ls.*, c.name as class_name, c.subject, u.full_name as teacher_name
       FROM live_sessions ls
       JOIN classes c ON ls.class_id = c.id
       JOIN users u ON ls.teacher_id = u.id
       WHERE ls.id = $1`,
      [sessionId]
    );

    if (sessionQuery.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Live session not found'
      });
    }

    const session = sessionQuery.rows[0];

    if (session.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: 'This live session is not active'
      });
    }

    // Check if user has permission to join
    if (userRole === 'student') {
      const enrollmentCheck = await pool.query(
        'SELECT * FROM class_enrollments WHERE student_id = $1 AND class_id = $2 AND is_active = true',
        [userId, session.class_id]
      );

      if (enrollmentCheck.rows.length === 0) {
        return res.status(403).json({
          success: false,
          message: 'You are not enrolled in this class'
        });
      }
    } else if (userRole === 'teacher' && session.teacher_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You can only join your own live sessions as a teacher'
      });
    }

    // Check current participant count
    const participantCount = await pool.query(
      'SELECT COUNT(*) FROM live_session_participants WHERE session_id = $1 AND left_at IS NULL',
      [sessionId]
    );

    if (parseInt(participantCount.rows[0].count) >= session.max_participants && userRole !== 'teacher') {
      return res.status(400).json({
        success: false,
        message: 'This live session is full'
      });
    }

    // Add participant or update join time if already exists
    const existingParticipant = await pool.query(
      'SELECT * FROM live_session_participants WHERE session_id = $1 AND user_id = $2',
      [sessionId, userId]
    );

    if (existingParticipant.rows.length > 0) {
      // Update join time and clear left_at
      await pool.query(
        'UPDATE live_session_participants SET joined_at = NOW(), left_at = NULL WHERE session_id = $1 AND user_id = $2',
        [sessionId, userId]
      );
    } else {
      // Add new participant
      await pool.query(
        'INSERT INTO live_session_participants (session_id, user_id, joined_at) VALUES ($1, $2, NOW())',
        [sessionId, userId]
      );
    }

    res.json({
      success: true,
      message: 'Successfully joined live session',
      data: {
        session: {
          ...session,
          room_id: `live-${session.id}`,
          user_role: userRole,
          is_teacher: userRole === 'teacher' && session.teacher_id === userId
        }
      }
    });

  } catch (error) {
    console.error('Join live session error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to join live session'
    });
  }
});

// Leave a live class session
router.post('/leave/:sessionId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const sessionId = req.params.sessionId;

    // Update participant record
    await pool.query(
      'UPDATE live_session_participants SET left_at = NOW() WHERE session_id = $1 AND user_id = $2 AND left_at IS NULL',
      [sessionId, userId]
    );

    res.json({
      success: true,
      message: 'Successfully left live session'
    });

  } catch (error) {
    console.error('Leave live session error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to leave live session'
    });
  }
});

// End a live class session (Teachers only)
router.post('/end/:sessionId', authenticateToken, authorizeRoles('teacher'), async (req, res) => {
  try {
    const teacherId = req.user.id;
    const sessionId = req.params.sessionId;

    // Verify teacher owns this session
    const sessionCheck = await pool.query(
      'SELECT * FROM live_sessions WHERE id = $1 AND teacher_id = $2',
      [sessionId, teacherId]
    );

    if (sessionCheck.rows.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'You can only end your own live sessions'
      });
    }

    // End the session
    await pool.query(
      'UPDATE live_sessions SET status = $1, ended_at = NOW() WHERE id = $2',
      ['ended', sessionId]
    );

    // Mark all participants as left
    await pool.query(
      'UPDATE live_session_participants SET left_at = NOW() WHERE session_id = $1 AND left_at IS NULL',
      [sessionId]
    );

    res.json({
      success: true,
      message: 'Live session ended successfully'
    });

  } catch (error) {
    console.error('End live session error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to end live session'
    });
  }
});

// Get active live sessions for a user
router.get('/active', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    let query;
    let params;

    if (userRole === 'teacher') {
      // Get teacher's active sessions
      query = `
        SELECT ls.*, c.name as class_name, c.subject,
               COUNT(DISTINCT lsp.user_id) as current_participants
        FROM live_sessions ls
        JOIN classes c ON ls.class_id = c.id
        LEFT JOIN live_session_participants lsp ON ls.id = lsp.session_id AND lsp.left_at IS NULL
        WHERE ls.teacher_id = $1 AND ls.status = 'active'
        GROUP BY ls.id, c.name, c.subject
        ORDER BY ls.started_at DESC
      `;
      params = [userId];
    } else {
      // Get student's available sessions (from enrolled classes)
      query = `
        SELECT DISTINCT ls.*, c.name as class_name, c.subject, u.full_name as teacher_name,
               COUNT(DISTINCT lsp.user_id) as current_participants,
               CASE WHEN lsp2.user_id IS NOT NULL THEN true ELSE false END as is_joined
        FROM live_sessions ls
        JOIN classes c ON ls.class_id = c.id
        JOIN users u ON ls.teacher_id = u.id
        JOIN class_enrollments ce ON c.id = ce.class_id AND ce.is_active = true
        LEFT JOIN live_session_participants lsp ON ls.id = lsp.session_id AND lsp.left_at IS NULL
        LEFT JOIN live_session_participants lsp2 ON ls.id = lsp2.session_id AND lsp2.user_id = $1 AND lsp2.left_at IS NULL
        WHERE ce.student_id = $1 AND ls.status = 'active'
        GROUP BY ls.id, c.name, c.subject, u.full_name, lsp2.user_id
        ORDER BY ls.started_at DESC
      `;
      params = [userId];
    }

    const result = await pool.query(query, params);

    res.json({
      success: true,
      data: {
        sessions: result.rows
      }
    });

  } catch (error) {
    console.error('Get active sessions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch active sessions'
    });
  }
});

// Get session participants (for teachers)
router.get('/:sessionId/participants', authenticateToken, authorizeRoles('teacher'), async (req, res) => {
  try {
    const teacherId = req.user.id;
    const sessionId = req.params.sessionId;

    // Verify teacher owns this session
    const sessionCheck = await pool.query(
      'SELECT * FROM live_sessions WHERE id = $1 AND teacher_id = $2',
      [sessionId, teacherId]
    );

    if (sessionCheck.rows.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'You can only view participants of your own sessions'
      });
    }

    // Get participants
    const participantsQuery = await pool.query(
      `SELECT lsp.*, u.full_name as name, u.email
       FROM live_session_participants lsp
       JOIN users u ON lsp.user_id = u.id
       WHERE lsp.session_id = $1
       ORDER BY lsp.joined_at DESC`,
      [sessionId]
    );

    res.json({
      success: true,
      data: {
        participants: participantsQuery.rows
      }
    });

  } catch (error) {
    console.error('Get participants error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch participants'
    });
  }
});

// Start recording session (Teachers only)
router.post('/:sessionId/recording/start', authenticateToken, authorizeRoles('teacher'), async (req, res) => {
  try {
    const { sessionId } = req.params;
    const teacherId = req.user.id;

    // Verify teacher owns this session
    const sessionCheck = await pool.query(
      'SELECT * FROM live_sessions WHERE id = $1 AND teacher_id = $2 AND status = $3',
      [sessionId, teacherId, 'active']
    );

    if (sessionCheck.rows.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'Session not found or you are not authorized'
      });
    }

    // Update recording status
    await pool.query(
      'UPDATE live_sessions SET recording_enabled = true, recording_status = $1 WHERE id = $2',
      ['recording', sessionId]
    );

    // Create recording record
    const recordingQuery = await pool.query(
      'INSERT INTO live_session_recordings (session_id, recording_started_at, processing_status) VALUES ($1, NOW(), $2) RETURNING *',
      [sessionId, 'recording']
    );

    res.json({
      success: true,
      message: 'Recording started',
      data: recordingQuery.rows[0]
    });

  } catch (error) {
    console.error('Start recording error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to start recording'
    });
  }
});

// Stop recording session (Teachers only)
router.post('/:sessionId/recording/stop', authenticateToken, authorizeRoles('teacher'), async (req, res) => {
  try {
    const { sessionId } = req.params;
    const teacherId = req.user.id;

    // Verify teacher owns this session
    const sessionCheck = await pool.query(
      'SELECT * FROM live_sessions WHERE id = $1 AND teacher_id = $2',
      [sessionId, teacherId]
    );

    if (sessionCheck.rows.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'Session not found or you are not authorized'
      });
    }

    // Update recording status
    await pool.query(
      'UPDATE live_sessions SET recording_status = $1 WHERE id = $2',
      ['processing', sessionId]
    );

    // Update recording end time
    await pool.query(
      'UPDATE live_session_recordings SET recording_ended_at = NOW(), processing_status = $1 WHERE session_id = $2 AND recording_ended_at IS NULL',
      ['processing', sessionId]
    );

    res.json({
      success: true,
      message: 'Recording stopped and processing'
    });

  } catch (error) {
    console.error('Stop recording error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to stop recording'
    });
  }
});

// Get session recordings
router.get('/:sessionId/recordings', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user.id;

    // Check if user has access to this session (teacher or enrolled student)
    const accessCheck = await pool.query(`
      SELECT ls.* FROM live_sessions ls
      LEFT JOIN class_enrollments ce ON ls.class_id = ce.class_id AND ce.student_id = $1 AND ce.is_active = true
      WHERE ls.id = $2 AND (ls.teacher_id = $1 OR ce.student_id IS NOT NULL)
    `, [userId, sessionId]);

    if (accessCheck.rows.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'You do not have access to this session'
      });
    }

    const recordings = await pool.query(
      'SELECT * FROM live_session_recordings WHERE session_id = $1 ORDER BY recording_started_at DESC',
      [sessionId]
    );

    res.json({
      success: true,
      data: recordings.rows
    });

  } catch (error) {
    console.error('Get recordings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch recordings'
    });
  }
});

// Enable/disable real-time translation (Teachers only)
router.post('/:sessionId/translation', authenticateToken, authorizeRoles('teacher'), async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { enabled, languages } = req.body;
    const teacherId = req.user.id;

    // Verify teacher owns this session
    const sessionCheck = await pool.query(
      'SELECT * FROM live_sessions WHERE id = $1 AND teacher_id = $2 AND status = $3',
      [sessionId, teacherId, 'active']
    );

    if (sessionCheck.rows.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'Session not found or you are not authorized'
      });
    }

    // Update translation settings
    await pool.query(
      'UPDATE live_sessions SET translation_enabled = $1, available_languages = $2 WHERE id = $3',
      [enabled, languages || ['en'], sessionId]
    );

    res.json({
      success: true,
      message: `Translation ${enabled ? 'enabled' : 'disabled'}`,
      data: { enabled, languages }
    });

  } catch (error) {
    console.error('Toggle translation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to toggle translation'
    });
  }
});

// Enable/disable subtitles (Teachers only)
router.post('/:sessionId/subtitles', authenticateToken, authorizeRoles('teacher'), async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { enabled } = req.body;
    const teacherId = req.user.id;

    // Verify teacher owns this session
    const sessionCheck = await pool.query(
      'SELECT * FROM live_sessions WHERE id = $1 AND teacher_id = $2 AND status = $3',
      [sessionId, teacherId, 'active']
    );

    if (sessionCheck.rows.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'Session not found or you are not authorized'
      });
    }

    // Update subtitle settings
    await pool.query(
      'UPDATE live_sessions SET subtitle_enabled = $1 WHERE id = $2',
      [enabled, sessionId]
    );

    res.json({
      success: true,
      message: `Subtitles ${enabled ? 'enabled' : 'disabled'}`,
      data: { enabled }
    });

  } catch (error) {
    console.error('Toggle subtitles error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to toggle subtitles'
    });
  }
});

// Get session chat messages
router.get('/:sessionId/messages', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user.id;
    const { limit = 50, offset = 0 } = req.query;

    // Check if user has access to this session
    const accessCheck = await pool.query(`
      SELECT ls.* FROM live_sessions ls
      LEFT JOIN class_enrollments ce ON ls.class_id = ce.class_id AND ce.student_id = $1 AND ce.is_active = true
      WHERE ls.id = $2 AND (ls.teacher_id = $1 OR ce.student_id IS NOT NULL)
    `, [userId, sessionId]);

    if (accessCheck.rows.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'You do not have access to this session'
      });
    }

    const messages = await pool.query(`
      SELECT lsm.*, u.full_name as user_name, u.role as user_role
      FROM live_session_messages lsm
      JOIN users u ON lsm.user_id = u.id
      WHERE lsm.session_id = $1
      ORDER BY lsm.timestamp DESC
      LIMIT $2 OFFSET $3
    `, [sessionId, limit, offset]);

    res.json({
      success: true,
      data: messages.rows.reverse() // Return in chronological order
    });

  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch messages'
    });
  }
});

// Get session captions/subtitles
router.get('/:sessionId/captions', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user.id;
    const { language = 'en', startTime, endTime } = req.query;

    // Check if user has access to this session
    const accessCheck = await pool.query(`
      SELECT ls.* FROM live_sessions ls
      LEFT JOIN class_enrollments ce ON ls.class_id = ce.class_id AND ce.student_id = $1 AND ce.is_active = true
      WHERE ls.id = $2 AND (ls.teacher_id = $1 OR ce.student_id IS NOT NULL)
    `, [userId, sessionId]);

    if (accessCheck.rows.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'You do not have access to this session'
      });
    }

    let query = `
      SELECT lsc.*, u.full_name as speaker_name
      FROM live_session_captions lsc
      LEFT JOIN users u ON lsc.speaker_id = u.id
      WHERE lsc.session_id = $1 AND lsc.language = $2
    `;
    let params = [sessionId, language];

    if (startTime) {
      query += ' AND lsc.start_time >= $3';
      params.push(startTime);
    }
    if (endTime) {
      query += ` AND lsc.start_time <= $${params.length + 1}`;
      params.push(endTime);
    }

    query += ' ORDER BY lsc.start_time ASC';

    const captions = await pool.query(query, params);

    res.json({
      success: true,
      data: captions.rows
    });

  } catch (error) {
    console.error('Get captions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch captions'
    });
  }
});

// Download recording file
router.get('/recording/:recordingId/download', authenticateToken, async (req, res) => {
  try {
    const { recordingId } = req.params;
    const userId = req.user.id;

    // Get recording info and check access
    const recordingQuery = await pool.query(`
      SELECT lsr.*, ls.teacher_id, ls.class_id
      FROM live_session_recordings lsr
      JOIN live_sessions ls ON lsr.session_id = ls.id
      WHERE lsr.id = $1
    `, [recordingId]);

    if (recordingQuery.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Recording not found'
      });
    }

    const recording = recordingQuery.rows[0];

    // Check if user has access (teacher or enrolled student)
    const accessCheck = await pool.query(`
      SELECT 1 FROM live_sessions ls
      LEFT JOIN class_enrollments ce ON ls.class_id = ce.class_id AND ce.student_id = $1 AND ce.is_active = true
      WHERE ls.id = $2 AND (ls.teacher_id = $1 OR ce.student_id IS NOT NULL)
    `, [userId, recording.session_id]);

    if (accessCheck.rows.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'You do not have access to this recording'
      });
    }

    // Get recording service and stream file
    const recordingService = req.app.get('liveStreamingService')?.recordingService;
    if (!recordingService) {
      return res.status(500).json({
        success: false,
        message: 'Recording service not available'
      });
    }

    const streamResult = await recordingService.getRecordingStream(recordingId);
    if (!streamResult.success) {
      return res.status(404).json({
        success: false,
        message: streamResult.error
      });
    }

    // Set headers for file download
    res.setHeader('Content-Type', 'video/mp4');
    res.setHeader('Content-Disposition', `attachment; filename="${streamResult.fileName}"`);
    if (streamResult.fileSize) {
      res.setHeader('Content-Length', streamResult.fileSize);
    }

    // Stream the file
    const fs = require('fs');
    const fileStream = fs.createReadStream(streamResult.filePath);
    
    fileStream.on('error', (error) => {
      console.error('File stream error:', error);
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          message: 'Error streaming file'
        });
      }
    });

    fileStream.pipe(res);

  } catch (error) {
    console.error('Download recording error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to download recording'
    });
  }
});

// Upload PDF file for live session (Teachers only)
router.post('/upload-pdf', authenticateToken, authorizeRoles('teacher'), async (req, res) => {
  const multer = require('multer');
  const path = require('path');
  const fs = require('fs').promises;

  // Configure multer for PDF uploads
  const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
      const uploadPath = path.join(__dirname, '../uploads/pdf');
      await fs.mkdir(uploadPath, { recursive: true });
      cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, `pdf-${uniqueSuffix}${path.extname(file.originalname)}`);
    }
  });

  const upload = multer({
    storage,
    fileFilter: (req, file, cb) => {
      if (file.mimetype === 'application/pdf') {
        cb(null, true);
      } else {
        cb(new Error('Only PDF files are allowed'));
      }
    },
    limits: {
      fileSize: 50 * 1024 * 1024 // 50MB limit
    }
  });

  upload.single('pdf')(req, res, async (err) => {
    try {
      if (err) {
        return res.status(400).json({
          success: false,
          message: err.message
        });
      }

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No PDF file uploaded'
        });
      }

      const { sessionId } = req.body;
      const teacherId = req.user.id;

      // Verify teacher owns this session
      const sessionCheck = await pool.query(
        'SELECT * FROM live_sessions WHERE id = $1 AND teacher_id = $2 AND status = $3',
        [sessionId, teacherId, 'active']
      );

      if (sessionCheck.rows.length === 0) {
        // Clean up uploaded file
        await fs.unlink(req.file.path);
        return res.status(403).json({
          success: false,
          message: 'Session not found or you are not authorized'
        });
      }

      const fileUrl = `${process.env.API_BASE_URL || 'http://localhost:5000'}/uploads/pdf/${req.file.filename}`;

      res.json({
        success: true,
        message: 'PDF uploaded successfully',
        data: {
          fileUrl,
          fileName: req.file.originalname,
          filePath: req.file.path
        }
      });

    } catch (error) {
      console.error('PDF upload error:', error);
      // Clean up uploaded file on error
      if (req.file) {
        try {
          await fs.unlink(req.file.path);
        } catch (unlinkError) {
          console.error('Error cleaning up file:', unlinkError);
        }
      }
      res.status(500).json({
        success: false,
        message: 'Failed to upload PDF'
      });
    }
  });
});

// Upload PowerPoint file for live session (Teachers only)
router.post('/upload-ppt', authenticateToken, authorizeRoles('teacher'), async (req, res) => {
  const multer = require('multer');
  const path = require('path');
  const fs = require('fs').promises;

  // Configure multer for PowerPoint uploads
  const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
      const uploadPath = path.join(__dirname, '../uploads/presentations');
      await fs.mkdir(uploadPath, { recursive: true });
      cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, `ppt-${uniqueSuffix}${path.extname(file.originalname)}`);
    }
  });

  const upload = multer({
    storage,
    fileFilter: (req, file, cb) => {
      const allowedMimeTypes = [
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation'
      ];
      if (allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Only PowerPoint files (.ppt, .pptx) are allowed'));
      }
    },
    limits: {
      fileSize: 100 * 1024 * 1024 // 100MB limit
    }
  });

  upload.single('ppt')(req, res, async (err) => {
    try {
      if (err) {
        return res.status(400).json({
          success: false,
          message: err.message
        });
      }

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No PowerPoint file uploaded'
        });
      }

      const { sessionId } = req.body;
      const teacherId = req.user.id;

      // Verify teacher owns this session
      const sessionCheck = await pool.query(
        'SELECT * FROM live_sessions WHERE id = $1 AND teacher_id = $2 AND status = $3',
        [sessionId, teacherId, 'active']
      );

      if (sessionCheck.rows.length === 0) {
        // Clean up uploaded file
        await fs.unlink(req.file.path);
        return res.status(403).json({
          success: false,
          message: 'Session not found or you are not authorized'
        });
      }

      // For now, return basic file info
      // In a production environment, you would convert PPT to images here
      const fileUrl = `${process.env.API_BASE_URL || 'http://localhost:5000'}/uploads/presentations/${req.file.filename}`;
      
      // Mock slide conversion (in production, use a library like office-to-pdf + pdf2pic)
      const mockSlides = [
        `${process.env.API_BASE_URL || 'http://localhost:5000'}/api/placeholder/slide/1`,
        `${process.env.API_BASE_URL || 'http://localhost:5000'}/api/placeholder/slide/2`,
        `${process.env.API_BASE_URL || 'http://localhost:5000'}/api/placeholder/slide/3`
      ];

      res.json({
        success: true,
        message: 'PowerPoint uploaded successfully',
        data: {
          fileUrl,
          fileName: req.file.originalname,
          filePath: req.file.path,
          slides: mockSlides // In production, this would be actual converted slides
        }
      });

    } catch (error) {
      console.error('PowerPoint upload error:', error);
      // Clean up uploaded file on error
      if (req.file) {
        try {
          await fs.unlink(req.file.path);
        } catch (unlinkError) {
          console.error('Error cleaning up file:', unlinkError);
        }
      }
      res.status(500).json({
        success: false,
        message: 'Failed to upload PowerPoint'
      });
    }
  });
});

// Serve uploaded PDF files
router.get('/pdf/:filename', (req, res) => {
  const path = require('path');
  const fs = require('fs');
  
  const filename = req.params.filename;
  const filepath = path.join(__dirname, '../uploads/pdf', filename);
  
  if (fs.existsSync(filepath)) {
    res.setHeader('Content-Type', 'application/pdf');
    res.sendFile(filepath);
  } else {
    res.status(404).json({
      success: false,
      message: 'File not found'
    });
  }
});

// Serve placeholder slides (for demo purposes)
router.get('/placeholder/slide/:slideNumber', (req, res) => {
  const slideNumber = req.params.slideNumber;
  
  // Return a simple SVG placeholder
  const svg = `
    <svg width="800" height="600" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#f8f9fa"/>
      <rect x="50" y="50" width="700" height="500" fill="white" stroke="#dee2e6" stroke-width="2"/>
      <text x="400" y="200" font-family="Arial, sans-serif" font-size="48" text-anchor="middle" fill="#6c757d">
        Slide ${slideNumber}
      </text>
      <text x="400" y="280" font-family="Arial, sans-serif" font-size="24" text-anchor="middle" fill="#6c757d">
        PowerPoint Slide Placeholder
      </text>
      <text x="400" y="350" font-family="Arial, sans-serif" font-size="16" text-anchor="middle" fill="#6c757d">
        In production, this would be converted from actual PPT slides
      </text>
    </svg>
  `;
  
  res.setHeader('Content-Type', 'image/svg+xml');
  res.send(svg);
});

module.exports = router;
