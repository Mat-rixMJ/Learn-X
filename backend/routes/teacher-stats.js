const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

// Database connection
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'remote_classroom',
  password: process.env.DB_PASSWORD || 'password',
  port: process.env.DB_PORT || 5432,
});

// Get teacher dashboard statistics
router.get('/stats', authenticateToken, authorizeRoles(['teacher']), async (req, res) => {
  try {
    const teacherId = req.user.id;

    // Get active classes count
    const classesQuery = `
      SELECT COUNT(*) as active_classes 
      FROM classes 
      WHERE teacher_id = $1 AND is_active = true
    `;
    const classesResult = await pool.query(classesQuery, [teacherId]);

    // Get total lectures count
    const lecturesQuery = `
      SELECT COUNT(*) as total_lectures 
      FROM recorded_lectures 
      WHERE teacher_id = $1
    `;
    const lecturesResult = await pool.query(lecturesQuery, [teacherId]);

    // Get total students count across all teacher's classes
    const studentsQuery = `
      SELECT COUNT(DISTINCT user_id) as total_students
      FROM user_classes uc
      INNER JOIN classes c ON uc.class_id = c.id
      WHERE c.teacher_id = $1
    `;
    const studentsResult = await pool.query(studentsQuery, [teacherId]);

    // Get average rating (placeholder for now - you can implement ratings later)
    const avgRating = 4.8; // Static value for now

    // Get recent activity
    const recentLecturesQuery = `
      SELECT title, created_at 
      FROM recorded_lectures 
      WHERE teacher_id = $1 
      ORDER BY created_at DESC 
      LIMIT 5
    `;
    const recentLecturesResult = await pool.query(recentLecturesQuery, [teacherId]);

    res.json({
      success: true,
      data: {
        stats: {
          activeClasses: parseInt(classesResult.rows[0].active_classes),
          totalLectures: parseInt(lecturesResult.rows[0].total_lectures),
          totalStudents: parseInt(studentsResult.rows[0].total_students),
          avgRating: avgRating
        },
        recentActivity: recentLecturesResult.rows
      }
    });

  } catch (error) {
    console.error('Get teacher stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch teacher statistics'
    });
  }
});

// Get teacher's classes with student counts
router.get('/classes', authenticateToken, authorizeRoles(['teacher']), async (req, res) => {
  try {
    const teacherId = req.user.id;

    const query = `
      SELECT 
        c.*,
        COUNT(DISTINCT uc.user_id) as enrolled_students,
        COUNT(DISTINCT rl.id) as total_lectures
      FROM classes c
      LEFT JOIN user_classes uc ON c.id = uc.class_id
      LEFT JOIN recorded_lectures rl ON c.id = rl.class_id
      WHERE c.teacher_id = $1
      GROUP BY c.id
      ORDER BY c.created_at DESC
    `;

    const result = await pool.query(query, [teacherId]);

    res.json({
      success: true,
      data: {
        classes: result.rows
      }
    });

  } catch (error) {
    console.error('Get teacher classes error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch teacher classes'
    });
  }
});

// Get students enrolled in teacher's classes
router.get('/students', authenticateToken, authorizeRoles(['teacher']), async (req, res) => {
  try {
    const teacherId = req.user.id;

    const query = `
      SELECT DISTINCT
        u.id,
        u.name,
        u.email,
        c.name as class_name,
        c.subject,
        uc.enrolled_at
      FROM users u
      INNER JOIN user_classes uc ON u.id = uc.user_id
      INNER JOIN classes c ON uc.class_id = c.id
      WHERE c.teacher_id = $1
      ORDER BY uc.enrolled_at DESC
    `;

    const result = await pool.query(query, [teacherId]);

    res.json({
      success: true,
      data: {
        students: result.rows
      }
    });

  } catch (error) {
    console.error('Get teacher students error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch teacher students'
    });
  }
});

module.exports = router;
