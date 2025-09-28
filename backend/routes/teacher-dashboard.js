const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticateToken, requireTeacher } = require('../middleware/auth');

// Get comprehensive teacher dashboard data
router.get('/dashboard', authenticateToken, requireTeacher, async (req, res) => {
  const client = await pool.connect();
  
  try {
    const teacherId = req.user.id;

    // Get teacher profile with basic user info
    const profileQuery = `
      SELECT 
        u.id, u.username, u.email, u.full_name, u.role,
        tp.profile_picture, tp.phone, tp.department, tp.designation,
        tp.qualification, tp.experience_years, tp.joining_date,
        tp.specialization, tp.bio, tp.office_location,
        COALESCE(tp.teacher_id, 'TCH' || EXTRACT(YEAR FROM CURRENT_DATE) || LPAD(EXTRACT(DOY FROM CURRENT_DATE)::TEXT, 3, '0')) as teacher_id
      FROM users u
      LEFT JOIN teacher_profiles tp ON u.id = tp.user_id
      WHERE u.id = $1
    `;
    const profileResult = await client.query(profileQuery, [teacherId]);
    const profile = profileResult.rows[0];

    // Get classes taught by the teacher
    const classesQuery = `
      SELECT 
        c.id, c.title, c.description, c.created_at,
        COUNT(DISTINCT uc.user_id) as total_students,
        COUNT(DISTINCT ls.id) as total_sessions,
        AVG(CASE WHEN a.status IN ('present', 'late') THEN 1 ELSE 0 END) * 100 as avg_attendance
      FROM classes c
      LEFT JOIN user_classes uc ON c.id = uc.class_id AND uc.role = 'student'
      LEFT JOIN live_sessions ls ON c.id = ls.class_id
      LEFT JOIN attendance a ON c.id = a.class_id
      WHERE c.instructor_id = $1
      GROUP BY c.id, c.title, c.description, c.created_at
      ORDER BY c.title
    `;
    const classesResult = await client.query(classesQuery, [teacherId]);
    const teachingClasses = classesResult.rows;

    // Get today's scheduled classes
    const todaysClassesQuery = `
      SELECT 
        c.id, c.title, c.description,
        cs.start_time, cs.end_time, cs.room,
        COUNT(DISTINCT uc.user_id) as enrolled_students
      FROM classes c
      JOIN class_schedules cs ON c.id = cs.class_id
      LEFT JOIN user_classes uc ON c.id = uc.class_id AND uc.role = 'student'
      WHERE c.instructor_id = $1 
        AND cs.day_of_week = EXTRACT(DOW FROM CURRENT_DATE)
        AND cs.is_active = true
      GROUP BY c.id, c.title, c.description, cs.start_time, cs.end_time, cs.room
      ORDER BY cs.start_time
    `;
    const todaysClassesResult = await client.query(todaysClassesQuery, [teacherId]);
    const todaysClasses = todaysClassesResult.rows;

    // Get recent assignments and submissions
    const assignmentsQuery = `
      SELECT 
        a.id, a.title, a.due_date, a.assignment_type,
        c.title as class_title,
        COUNT(DISTINCT asub.id) as submissions_count,
        COUNT(DISTINCT uc.user_id) as total_students,
        AVG(asub.marks_obtained) as avg_marks
      FROM assignments a
      JOIN classes c ON a.class_id = c.id
      LEFT JOIN user_classes uc ON c.id = uc.class_id AND uc.role = 'student'
      LEFT JOIN assignment_submissions asub ON a.id = asub.assignment_id
      WHERE c.instructor_id = $1
      GROUP BY a.id, a.title, a.due_date, a.assignment_type, c.title
      ORDER BY a.due_date DESC
      LIMIT 10
    `;
    const assignmentsResult = await client.query(assignmentsQuery, [teacherId]);
    const recentAssignments = assignmentsResult.rows;

    // Get overall statistics
    const statsQuery = `
      SELECT 
        COUNT(DISTINCT c.id) as total_classes,
        COUNT(DISTINCT uc.user_id) as total_students,
        COUNT(DISTINCT a.id) as total_assignments,
        COUNT(DISTINCT ls.id) as total_sessions,
        AVG(CASE WHEN att.status IN ('present', 'late') THEN 1 ELSE 0 END) * 100 as overall_attendance
      FROM classes c
      LEFT JOIN user_classes uc ON c.id = uc.class_id AND uc.role = 'student'
      LEFT JOIN assignments a ON c.id = a.class_id
      LEFT JOIN live_sessions ls ON c.id = ls.class_id
      LEFT JOIN attendance att ON c.id = att.class_id
      WHERE c.instructor_id = $1
    `;
    const statsResult = await client.query(statsQuery, [teacherId]);
    const stats = statsResult.rows[0];

    // Get student performance analytics
    const performanceQuery = `
      SELECT 
        c.title as class_name,
        COUNT(DISTINCT uc.user_id) as student_count,
        AVG(cp.progress_percentage) as avg_progress,
        AVG(cp.performance_score) as avg_performance,
        AVG(CASE WHEN a.status IN ('present', 'late') THEN 1 ELSE 0 END) * 100 as class_attendance
      FROM classes c
      LEFT JOIN user_classes uc ON c.id = uc.class_id AND uc.role = 'student'
      LEFT JOIN course_progress cp ON c.id = cp.class_id
      LEFT JOIN attendance a ON c.id = a.class_id AND a.user_id = uc.user_id
      WHERE c.instructor_id = $1
      GROUP BY c.id, c.title
      ORDER BY c.title
    `;
    const performanceResult = await client.query(performanceQuery, [teacherId]);
    const classPerformance = performanceResult.rows;

    // Get upcoming events from calendar
    const eventsQuery = `
      SELECT 
        ce.id, ce.title, ce.description, ce.event_date, 
        ce.event_type, ce.color, ce.start_time, ce.end_time,
        c.title as class_title
      FROM calendar_events ce
      LEFT JOIN classes c ON ce.class_id = c.id
      WHERE (ce.created_by = $1 OR c.instructor_id = $1)
        AND ce.event_date >= CURRENT_DATE
      ORDER BY ce.event_date, ce.start_time
      LIMIT 10
    `;
    const eventsResult = await client.query(eventsQuery, [teacherId]);
    const upcomingEvents = eventsResult.rows;

    // Prepare response data
    const dashboardData = {
      profile,
      teachingClasses,
      todaysClasses,
      recentAssignments,
      upcomingEvents,
      classPerformance,
      stats: {
        totalClasses: parseInt(stats.total_classes) || 0,
        totalStudents: parseInt(stats.total_students) || 0,
        totalAssignments: parseInt(stats.total_assignments) || 0,
        totalSessions: parseInt(stats.total_sessions) || 0,
        overallAttendance: parseFloat(stats.overall_attendance) || 0
      },
      analytics: {
        classPerformance,
        avgProgress: classPerformance.reduce((sum, c) => sum + (parseFloat(c.avg_progress) || 0), 0) / (classPerformance.length || 1),
        avgPerformance: classPerformance.reduce((sum, c) => sum + (parseFloat(c.avg_performance) || 0), 0) / (classPerformance.length || 1),
        totalEnrollments: classPerformance.reduce((sum, c) => sum + (parseInt(c.student_count) || 0), 0)
      }
    };

    res.json({
      success: true,
      data: dashboardData
    });

  } catch (error) {
    console.error('Error fetching teacher dashboard data:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard data',
      error: error.message
    });
  } finally {
    client.release();
  }
});

// Get calendar events for teacher
router.get('/calendar', authenticateToken, requireTeacher, async (req, res) => {
  const client = await pool.connect();
  
  try {
    const teacherId = req.user.id;
    const { month, year } = req.query;

    let dateFilter = '';
    const queryParams = [teacherId];
    
    if (month && year) {
      dateFilter = `AND EXTRACT(MONTH FROM ce.event_date) = $2 AND EXTRACT(YEAR FROM ce.event_date) = $3`;
      queryParams.push(month, year);
    }

    const eventsQuery = `
      SELECT 
        ce.id, ce.title, ce.description, ce.event_date, 
        ce.event_type, ce.color, ce.start_time, ce.end_time,
        ce.is_holiday, ce.all_day,
        c.title as class_title
      FROM calendar_events ce
      LEFT JOIN classes c ON ce.class_id = c.id
      WHERE (ce.created_by = $1 OR c.instructor_id = $1)
        ${dateFilter}
      ORDER BY ce.event_date, ce.start_time
    `;

    const eventsResult = await client.query(eventsQuery, queryParams);
    
    res.json({
      success: true,
      data: eventsResult.rows
    });

  } catch (error) {
    console.error('Error fetching calendar events:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch calendar events',
      error: error.message
    });
  } finally {
    client.release();
  }
});

// Update teacher profile
router.put('/profile', authenticateToken, requireTeacher, async (req, res) => {
  const client = await pool.connect();
  
  try {
    const teacherId = req.user.id;
    const {
      full_name,
      email,
      phone,
      department,
      designation,
      qualification,
      experience_years,
      specialization,
      bio,
      office_location,
      profile_picture
    } = req.body;

    await client.query('BEGIN');

    // Update users table
    await client.query(
      'UPDATE users SET full_name = $1, email = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
      [full_name, email, teacherId]
    );

    // Upsert teacher profile
    const profileQuery = `
      INSERT INTO teacher_profiles (
        user_id, phone, department, designation, qualification, 
        experience_years, specialization, bio, office_location, 
        profile_picture, full_name, email, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, CURRENT_TIMESTAMP)
      ON CONFLICT (user_id) 
      DO UPDATE SET 
        phone = EXCLUDED.phone,
        department = EXCLUDED.department,
        designation = EXCLUDED.designation,
        qualification = EXCLUDED.qualification,
        experience_years = EXCLUDED.experience_years,
        specialization = EXCLUDED.specialization,
        bio = EXCLUDED.bio,
        office_location = EXCLUDED.office_location,
        profile_picture = EXCLUDED.profile_picture,
        full_name = EXCLUDED.full_name,
        email = EXCLUDED.email,
        updated_at = CURRENT_TIMESTAMP
    `;

    await client.query(profileQuery, [
      teacherId, phone, department, designation, qualification,
      experience_years, specialization, bio, office_location,
      profile_picture, full_name, email
    ]);

    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'Profile updated successfully'
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating teacher profile:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile',
      error: error.message
    });
  } finally {
    client.release();
  }
});

// Get class analytics for a specific class
router.get('/class/:classId/analytics', authenticateToken, requireTeacher, async (req, res) => {
  const client = await pool.connect();
  
  try {
    const teacherId = req.user.id;
    const { classId } = req.params;

    // Verify teacher owns this class
    const classCheck = await client.query(
      'SELECT id FROM classes WHERE id = $1 AND instructor_id = $2',
      [classId, teacherId]
    );

    if (classCheck.rows.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'Access denied or class not found'
      });
    }

    // Get detailed class analytics
    const analyticsQuery = `
      SELECT 
        u.username, u.full_name,
        cp.progress_percentage, cp.performance_score, cp.time_spent,
        COUNT(DISTINCT a.id) FILTER (WHERE a.status IN ('present', 'late')) as classes_attended,
        COUNT(DISTINCT a.id) as total_classes,
        AVG(asub.marks_obtained) as avg_assignment_score,
        COUNT(DISTINCT asub.id) as assignments_submitted
      FROM user_classes uc
      JOIN users u ON uc.user_id = u.id
      LEFT JOIN course_progress cp ON uc.class_id = cp.class_id AND uc.user_id = cp.user_id
      LEFT JOIN attendance a ON uc.class_id = a.class_id AND uc.user_id = a.user_id
      LEFT JOIN assignments ass ON uc.class_id = ass.class_id
      LEFT JOIN assignment_submissions asub ON ass.id = asub.assignment_id AND uc.user_id = asub.user_id
      WHERE uc.class_id = $1 AND uc.role = 'student'
      GROUP BY u.id, u.username, u.full_name, cp.progress_percentage, cp.performance_score, cp.time_spent
      ORDER BY cp.performance_score DESC NULLS LAST
    `;

    const analyticsResult = await client.query(analyticsQuery, [classId]);
    
    res.json({
      success: true,
      data: analyticsResult.rows
    });

  } catch (error) {
    console.error('Error fetching class analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch analytics',
      error: error.message
    });
  } finally {
    client.release();
  }
});

module.exports = router;