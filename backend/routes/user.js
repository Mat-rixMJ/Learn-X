const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const pool = require('../config/database');

// GET /api/user/dashboard - Get dashboard data for authenticated user
router.get('/dashboard', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get user's enrolled classes with instructor info
    const enrolledClassesQuery = `
      SELECT 
        c.id, c.name as title, c.description, c.teacher_id as instructor_id,
        u.username as instructor_name,
        c.scheduled_at as schedule_start, 
        c.scheduled_at + INTERVAL '1 hour' * c.duration_minutes / 60 as schedule_end,
        c.created_at
      FROM classes c
      JOIN class_enrollments e ON c.id = e.class_id
      JOIN users u ON c.teacher_id = u.id
      WHERE e.student_id = $1 AND e.is_active = true
      ORDER BY c.scheduled_at ASC
    `;
    
    // Get upcoming classes (next 7 days)
    const upcomingClassesQuery = `
      SELECT 
        c.id, c.name as title, c.description,
        u.username as instructor_name,
        c.scheduled_at as schedule_start,
        c.scheduled_at + INTERVAL '1 hour' * c.duration_minutes / 60 as schedule_end
      FROM classes c
      JOIN class_enrollments e ON c.id = e.class_id
      JOIN users u ON c.teacher_id = u.id
      WHERE e.student_id = $1 
        AND e.is_active = true
        AND c.scheduled_at > NOW()
        AND c.scheduled_at <= NOW() + INTERVAL '7 days'
      ORDER BY c.scheduled_at ASC
      LIMIT 5
    `;
    
    // Get recent notifications
    const notificationsQuery = `
      SELECT 
        id, title, message, notification_type as type, is_read,
        created_at
      FROM notifications
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT 10
    `;

    // Get recent activities
    const activitiesQuery = `
      SELECT 
        activity_type, activity_title, activity_description, created_at
      FROM activity_log
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT 5
    `;
    
    // Get learning progress stats
    const progressQuery = `
      SELECT 
        COUNT(DISTINCT e.class_id) as total_classes,
        COUNT(DISTINCT rl.id) as total_lectures,
        COUNT(DISTINCT an.id) as total_notes,
        COALESCE(AVG(CAST(sp.performance_metrics->>'score' AS INTEGER)), 0) as avg_score
      FROM class_enrollments e
      LEFT JOIN recorded_lectures rl ON e.class_id = rl.class_id
      LEFT JOIN ai_notes an ON an.user_id = $1
      LEFT JOIN student_progress sp ON sp.student_id = $1 AND sp.class_id = e.class_id
      WHERE e.student_id = $1 AND e.is_active = true
    `;

    const db = pool;
    
    // Execute all queries
    const [enrolledClasses, upcomingClasses, notifications, progress, activities] = await Promise.all([
      db.query(enrolledClassesQuery, [userId]),
      db.query(upcomingClassesQuery, [userId]),
      db.query(notificationsQuery, [userId]),
      db.query(progressQuery, [userId]),
      db.query(activitiesQuery, [userId])
    ]);

    // Format response
    const dashboardData = {
      user: {
        id: req.user.id,
        username: req.user.username,
        email: req.user.email,
        role: req.user.role
      },
      enrolledClasses: enrolledClasses.rows,
      upcomingClasses: upcomingClasses.rows,
      notifications: notifications.rows,
      recentActivities: activities.rows,
      stats: {
        totalClasses: parseInt(progress.rows[0]?.total_classes || 0),
        totalLectures: parseInt(progress.rows[0]?.total_lectures || 0),
        totalNotes: parseInt(progress.rows[0]?.total_notes || 0),
        avgScore: Math.round(parseFloat(progress.rows[0]?.avg_score || 0))
      }
    };

    res.json({
      success: true,
      data: dashboardData
    });

  } catch (error) {
    console.error('Dashboard API error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard data',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// GET /api/user/profile - Get user profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const profileQuery = `
      SELECT id, username, email, full_name, role, created_at, updated_at
      FROM users
      WHERE id = $1
    `;
    
    const db = pool;
    const result = await db.query(profileQuery, [userId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    const user = result.rows[0];
    // Remove sensitive data
    delete user.password;
    
    res.json({
      success: true,
      data: user
    });
    
  } catch (error) {
    console.error('Profile API error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch profile',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// GET /api/user/notifications - Get user notifications
router.get('/notifications', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 20;
    const offset = parseInt(req.query.offset) || 0;
    
    const notificationsQuery = `
      SELECT id, title, message, notification_type as type, is_read, created_at
      FROM notifications
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    `;
    
    const db = pool;
    const result = await db.query(notificationsQuery, [userId, limit, offset]);
    
    res.json({
      success: true,
      data: {
        notifications: result.rows,
        total: result.rows.length,
        limit,
        offset
      }
    });
    
  } catch (error) {
    console.error('Notifications API error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notifications',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// POST /api/user/profile - Update student profile and set profile_complete
router.post('/profile', authenticateToken, async (req, res) => {
  try {
    const { full_name, bio, contact } = req.body;
    await pool.query(
      'UPDATE users SET full_name = $1, profile_complete = true WHERE id = $2',
      [full_name, req.user.id]
    );
    // Optionally save bio/contact to a new table or as JSONB in users
    res.json({ success: true, message: 'Profile updated' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/user/enroll - Enroll student in selected classes
router.post('/enroll', authenticateToken, async (req, res) => {
  try {
    const { classIds } = req.body;
    if (!Array.isArray(classIds)) return res.status(400).json({ success: false, message: 'classIds must be array' });
    for (const classId of classIds) {
      await pool.query(
        'INSERT INTO class_enrollments (class_id, student_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [classId, req.user.id]
      );
    }
    res.json({ success: true, message: 'Enrolled in classes' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/user/class/:classId/students - Teacher: Get students in a class
router.get('/class/:classId/students', authenticateToken, async (req, res) => {
  try {
    const { classId } = req.params;
    // Only allow teacher of the class
    const classRes = await pool.query('SELECT * FROM classes WHERE id = $1', [classId]);
    if (!classRes.rows.length || classRes.rows[0].teacher_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    const students = await pool.query(
      'SELECT u.id, u.username, u.full_name FROM class_enrollments e JOIN users u ON e.student_id = u.id WHERE e.class_id = $1',
      [classId]
    );
    res.json({ success: true, students: students.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/user/class/:classId/add-student - Teacher: Add student to a class
router.post('/class/:classId/add-student', authenticateToken, async (req, res) => {
  try {
    const { classId } = req.params;
    const { studentId } = req.body;
    // Only allow teacher of the class
    const classRes = await pool.query('SELECT * FROM classes WHERE id = $1', [classId]);
    if (!classRes.rows.length || classRes.rows[0].teacher_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    await pool.query(
      'INSERT INTO class_enrollments (class_id, student_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [classId, studentId]
    );
    res.json({ success: true, message: 'Student added to class' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
