const express = require('express');
const router = express.Router();
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
// Reuse shared pool for consistency
const pool = require('../config/database');

// Get teacher dashboard statistics
// NOTE: authorizeRoles expects individual role arguments, not an array.
router.get('/stats', authenticateToken, authorizeRoles('teacher'), async (req, res) => {
  try {
    const teacherId = req.user.id;

    // Get active classes count
    const classesQuery = `
      SELECT COUNT(*) as active_classes 
      FROM classes 
      WHERE teacher_id = $1 AND is_active = true
    `;
    const classesResult = await pool.query(classesQuery, [teacherId]);

    // Get total lectures count (join through classes since recorded_lectures has class_id not teacher_id)
    const lecturesQuery = `
      SELECT COUNT(*) as total_lectures 
      FROM recorded_lectures rl
      INNER JOIN classes c ON rl.class_id = c.id
      WHERE c.teacher_id = $1
    `;
    const lecturesResult = await pool.query(lecturesQuery, [teacherId]);

    // Get total students count across all teacher's classes (using class_enrollments table)
    const studentsQuery = `
      SELECT COUNT(DISTINCT student_id) as total_students
      FROM class_enrollments ce
      INNER JOIN classes c ON ce.class_id = c.id
      WHERE c.teacher_id = $1 AND ce.is_active = true
    `;
    const studentsResult = await pool.query(studentsQuery, [teacherId]);

    // Get average rating (placeholder for now - you can implement ratings later)
    const avgRating = 4.8; // Static value for now

    // Get scheduled classes count
    const scheduledQuery = `
      SELECT COUNT(*) as scheduled_classes 
      FROM scheduled_classes 
      WHERE teacher_id = $1 AND scheduled_at > NOW()
    `;
    const scheduledResult = await pool.query(scheduledQuery, [teacherId]);

    // Get recent activity (join through classes)
    const recentLecturesQuery = `
      SELECT rl.title, rl.recorded_at as created_at 
      FROM recorded_lectures rl
      INNER JOIN classes c ON rl.class_id = c.id
      WHERE c.teacher_id = $1 
      ORDER BY rl.recorded_at DESC 
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
          scheduledClasses: parseInt(scheduledResult.rows[0].scheduled_classes),
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
router.get('/classes', authenticateToken, authorizeRoles('teacher'), async (req, res) => {
  try {
    const teacherId = req.user.id;

    const query = `
      SELECT 
        c.*,
        COUNT(DISTINCT ce.student_id) as enrolled_students,
        COUNT(DISTINCT rl.id) as total_lectures
      FROM classes c
      LEFT JOIN class_enrollments ce ON c.id = ce.class_id AND ce.is_active = true
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
router.get('/students', authenticateToken, authorizeRoles('teacher'), async (req, res) => {
  try {
    const teacherId = req.user.id;

    const query = `
      SELECT DISTINCT
        u.id,
        u.full_name as name,
        u.email,
        c.name as class_name,
        c.subject,
        ce.enrolled_at
      FROM users u
      INNER JOIN class_enrollments ce ON u.id = ce.student_id
      INNER JOIN classes c ON ce.class_id = c.id
      WHERE c.teacher_id = $1 AND ce.is_active = true
      ORDER BY ce.enrolled_at DESC
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

// Get teacher's upcoming scheduled classes
router.get('/scheduled-classes', authenticateToken, authorizeRoles('teacher'), async (req, res) => {
  try {
    const teacherId = req.user.id;

    const query = `
      SELECT 
        sc.*,
        c.name as class_name,
        c.subject,
        COUNT(DISTINCT ce.student_id) as enrolled_participants
      FROM scheduled_classes sc
      INNER JOIN classes c ON sc.class_id = c.id
      LEFT JOIN class_enrollments ce ON c.id = ce.class_id AND ce.is_active = true
      WHERE sc.teacher_id = $1 AND sc.scheduled_at > NOW()
      GROUP BY sc.id, c.name, c.subject
      ORDER BY sc.scheduled_at ASC
      LIMIT 10
    `;

    const result = await pool.query(query, [teacherId]);

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

module.exports = router;
