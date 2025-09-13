const express = require('express');
const router = express.Router();
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const pool = require('../config/database');

// Create a scheduled class (Teachers only)
router.post('/schedule', authenticateToken, authorizeRoles('teacher'), async (req, res) => {
  try {
    const teacherId = req.user.id;
    console.log('Schedule class request from teacher:', teacherId);
    console.log('Request body:', req.body);
    
    const { 
      class_id, 
      title, 
      description, 
      scheduled_at,  // Changed from scheduled_date/scheduled_time
      duration_minutes,
      max_participants,
      send_reminders
    } = req.body;

    console.log('Parsed values:', { class_id, title, scheduled_at, duration_minutes });

    // Verify teacher owns this class
    const classCheck = await pool.query(
      'SELECT * FROM classes WHERE id = $1 AND teacher_id = $2',
      [class_id, teacherId]
    );
    
    console.log('Class check result:', classCheck.rows.length);

    if (classCheck.rows.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'You can only schedule sessions for your own classes'
      });
    }

    // Parse the scheduled_at timestamp
    const scheduledAt = new Date(scheduled_at);
    console.log('Parsed scheduledAt:', scheduledAt);
    
    // Validate future date
    if (scheduledAt <= new Date()) {
      console.log('Date validation failed: scheduledAt is not in future');
      return res.status(400).json({
        success: false,
        message: 'Scheduled time must be in the future'
      });
    }

    // Create scheduled session
    const sessionQuery = await pool.query(
      `INSERT INTO scheduled_classes 
       (class_id, teacher_id, title, description, scheduled_at, duration_minutes, max_participants, send_reminders, status) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
       RETURNING *`,
      [class_id, teacherId, title, description, scheduledAt, duration_minutes || 60, max_participants || 50, send_reminders || true, 'scheduled']
    );

    const scheduledClass = sessionQuery.rows[0];

    // If reminders are enabled, create reminder notifications
    if (send_reminders) {
      // TODO: Implement notifications table first
      console.log('Reminders requested for class:', class_id);
      
      /*
      // Get all students enrolled in this class
      const studentsQuery = await pool.query(
        `SELECT ce.student_id as user_id, u.email, u.full_name 
         FROM class_enrollments ce 
         JOIN users u ON ce.student_id = u.id 
         WHERE ce.class_id = $1 AND ce.is_active = true`,
        [class_id]
      );

      // Create reminder notifications (24h before, 1h before)
      const reminderTimes = [
        { hours: 24, message: '24 hours before' },
        { hours: 1, message: '1 hour before' }
      ];

      for (const student of studentsQuery.rows) {
        for (const reminder of reminderTimes) {
          const reminderTime = new Date(scheduledAt);
          reminderTime.setHours(reminderTime.getHours() - reminder.hours);

          if (reminderTime > new Date()) {
            await pool.query(
              `INSERT INTO notifications (user_id, type, title, message, scheduled_for, data)
               VALUES ($1, $2, $3, $4, $5, $6)`,
              [
                student.user_id,
                'scheduled_class_reminder',
                `Upcoming Class: ${title}`,
                `Your class "${title}" is scheduled to start in ${reminder.message}. Don't forget to join!`,
                reminderTime,
                JSON.stringify({
                  scheduled_class_id: scheduledClass.id,
                  class_id: class_id,
                  scheduled_at: scheduledAt
                })
              ]
            );
          }
        }
      }
      */
    }

    res.json({
      success: true,
      message: 'Class scheduled successfully',
      data: {
        scheduledClass: {
          ...scheduledClass,
          join_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/live-class?scheduled=${scheduledClass.id}`
        }
      }
    });

  } catch (error) {
    console.error('Schedule class error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to schedule class'
    });
  }
});

// Get scheduled classes for a teacher
router.get('/my-scheduled', authenticateToken, authorizeRoles('teacher'), async (req, res) => {
  try {
    const teacherId = req.user.id;
    const { status = 'scheduled', limit = 20, offset = 0 } = req.query;

    const query = `
      SELECT sc.*, c.name as class_name, c.subject,
             COUNT(DISTINCT ce.student_id) as enrolled_students
      FROM scheduled_classes sc
      JOIN classes c ON sc.class_id = c.id
      LEFT JOIN class_enrollments ce ON c.id = ce.class_id AND ce.is_active = true
      WHERE sc.teacher_id = $1 AND sc.status = $2
      GROUP BY sc.id, c.name, c.subject
      ORDER BY sc.scheduled_at ASC
      LIMIT $3 OFFSET $4
    `;

    const result = await pool.query(query, [teacherId, status, limit, offset]);

    res.json({
      success: true,
      data: {
        scheduledClasses: result.rows
      }
    });

  } catch (error) {
    console.error('Get scheduled classes error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch scheduled classes'
    });
  }
});

// Get upcoming scheduled classes for a student
router.get('/upcoming', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    let query;
    let params;

    if (userRole === 'student') {
      // Get student's upcoming scheduled classes
      query = `
        SELECT DISTINCT sc.*, c.name as class_name, c.subject, u.full_name as teacher_name,
               COUNT(DISTINCT ce.student_id) as enrolled_students
        FROM scheduled_classes sc
        JOIN classes c ON sc.class_id = c.id
        JOIN users u ON sc.teacher_id = u.id
        JOIN class_enrollments ce ON c.id = ce.class_id AND ce.student_id = $1 AND ce.is_active = true
        LEFT JOIN class_enrollments ce2 ON c.id = ce2.class_id AND ce2.is_active = true
        WHERE sc.status = 'scheduled' AND sc.scheduled_at > NOW()
        GROUP BY sc.id, c.name, c.subject, u.full_name
        ORDER BY sc.scheduled_at ASC
        LIMIT 10
      `;
      params = [userId];
    } else {
      // Teachers see their own scheduled classes
      query = `
        SELECT sc.*, c.name as class_name, c.subject,
               COUNT(DISTINCT ce.student_id) as enrolled_students
        FROM scheduled_classes sc
        JOIN classes c ON sc.class_id = c.id
        LEFT JOIN class_enrollments ce ON c.id = ce.class_id AND ce.is_active = true
        WHERE sc.teacher_id = $1 AND sc.status = 'scheduled' AND sc.scheduled_at > NOW()
        GROUP BY sc.id, c.name, c.subject
        ORDER BY sc.scheduled_at ASC
        LIMIT 10
      `;
      params = [userId];
    }

    const result = await pool.query(query, params);

    res.json({
      success: true,
      data: {
        upcomingClasses: result.rows
      }
    });

  } catch (error) {
    console.error('Get upcoming classes error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch upcoming classes'
    });
  }
});

// Start a scheduled class (convert to live session)
router.post('/start/:scheduledId', authenticateToken, authorizeRoles('teacher'), async (req, res) => {
  try {
    const teacherId = req.user.id;
    const scheduledId = req.params.scheduledId;

    // Get scheduled class details
    const scheduledQuery = await pool.query(
      'SELECT * FROM scheduled_classes WHERE id = $1 AND teacher_id = $2 AND status = $3',
      [scheduledId, teacherId, 'scheduled']
    );

    if (scheduledQuery.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Scheduled class not found or already started'
      });
    }

    const scheduledClass = scheduledQuery.rows[0];

    // Check if there's already an active live session for this class
    const activeSessionCheck = await pool.query(
      'SELECT * FROM live_sessions WHERE class_id = $1 AND status = $2',
      [scheduledClass.class_id, 'active']
    );

    if (activeSessionCheck.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'There is already an active live session for this class'
      });
    }

    // Create live session from scheduled class
    const liveSessionQuery = await pool.query(
      `INSERT INTO live_sessions 
       (class_id, teacher_id, title, description, max_participants, status, started_at) 
       VALUES ($1, $2, $3, $4, $5, $6, NOW()) 
       RETURNING *`,
      [
        scheduledClass.class_id,
        teacherId,
        scheduledClass.title,
        scheduledClass.description,
        scheduledClass.max_participants,
        'active'
      ]
    );

    const liveSession = liveSessionQuery.rows[0];

    // Update scheduled class status
    await pool.query(
      'UPDATE scheduled_classes SET status = $1, started_at = NOW() WHERE id = $2',
      ['started', scheduledId]
    );

    // Send notifications to enrolled students
    const studentsQuery = await pool.query(
      `SELECT uc.user_id, u.email, u.full_name 
       FROM user_classes uc 
       JOIN users u ON uc.user_id = u.id 
       WHERE uc.class_id = $1`,
      [scheduledClass.class_id]
    );

    for (const student of studentsQuery.rows) {
      await pool.query(
        `INSERT INTO notifications (user_id, type, title, message, data)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          student.user_id,
          'class_started',
          `Class Started: ${scheduledClass.title}`,
          `Your scheduled class "${scheduledClass.title}" has started! Join now.`,
          JSON.stringify({
            live_session_id: liveSession.id,
            scheduled_class_id: scheduledId,
            join_url: `/live-class?session=${liveSession.id}`
          })
        ]
      );
    }

    res.json({
      success: true,
      message: 'Scheduled class started successfully',
      data: {
        liveSession: {
          ...liveSession,
          room_id: `live-${liveSession.id}`,
          join_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/live-class?session=${liveSession.id}`
        }
      }
    });

  } catch (error) {
    console.error('Start scheduled class error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to start scheduled class'
    });
  }
});

// Cancel a scheduled class
router.delete('/:scheduledId', authenticateToken, authorizeRoles('teacher'), async (req, res) => {
  try {
    const teacherId = req.user.id;
    const scheduledId = req.params.scheduledId;

    // Verify ownership and get class details
    const scheduledQuery = await pool.query(
      'SELECT * FROM scheduled_classes WHERE id = $1 AND teacher_id = $2',
      [scheduledId, teacherId]
    );

    if (scheduledQuery.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Scheduled class not found'
      });
    }

    const scheduledClass = scheduledQuery.rows[0];

    // Update status to cancelled
    await pool.query(
      'UPDATE scheduled_classes SET status = $1, updated_at = NOW() WHERE id = $2',
      ['cancelled', scheduledId]
    );

    // Send cancellation notifications to enrolled students
    const studentsQuery = await pool.query(
      `SELECT uc.user_id, u.email, u.full_name 
       FROM user_classes uc 
       JOIN users u ON uc.user_id = u.id 
       WHERE uc.class_id = $1`,
      [scheduledClass.class_id]
    );

    for (const student of studentsQuery.rows) {
      await pool.query(
        `INSERT INTO notifications (user_id, type, title, message, data)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          student.user_id,
          'class_cancelled',
          `Class Cancelled: ${scheduledClass.title}`,
          `The scheduled class "${scheduledClass.title}" on ${new Date(scheduledClass.scheduled_at).toLocaleString()} has been cancelled.`,
          JSON.stringify({
            scheduled_class_id: scheduledId,
            cancelled_at: new Date()
          })
        ]
      );
    }

    res.json({
      success: true,
      message: 'Scheduled class cancelled successfully'
    });

  } catch (error) {
    console.error('Cancel scheduled class error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel scheduled class'
    });
  }
});

module.exports = router;
