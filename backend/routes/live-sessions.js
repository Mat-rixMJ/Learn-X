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
      `SELECT ls.*, c.name as class_name, c.subject, u.name as teacher_name
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
        'SELECT * FROM user_classes WHERE user_id = $1 AND class_id = $2',
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
        SELECT DISTINCT ls.*, c.name as class_name, c.subject, u.name as teacher_name,
               COUNT(DISTINCT lsp.user_id) as current_participants,
               CASE WHEN lsp2.user_id IS NOT NULL THEN true ELSE false END as is_joined
        FROM live_sessions ls
        JOIN classes c ON ls.class_id = c.id
        JOIN users u ON ls.teacher_id = u.id
        JOIN user_classes uc ON c.id = uc.class_id
        LEFT JOIN live_session_participants lsp ON ls.id = lsp.session_id AND lsp.left_at IS NULL
        LEFT JOIN live_session_participants lsp2 ON ls.id = lsp2.session_id AND lsp2.user_id = $1 AND lsp2.left_at IS NULL
        WHERE uc.user_id = $1 AND ls.status = 'active'
        GROUP BY ls.id, c.name, c.subject, u.name, lsp2.user_id
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
      `SELECT lsp.*, u.name, u.email
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

module.exports = router;
