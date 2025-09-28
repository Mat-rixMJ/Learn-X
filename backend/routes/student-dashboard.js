const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticateToken, requireStudent } = require('../middleware/auth');

// Get comprehensive student dashboard data
router.get('/dashboard', authenticateToken, requireStudent, async (req, res) => {
  const client = await pool.connect();
  
  try {
    const studentId = req.user.id;

    // Get student profile with basic user info
    const profileQuery = `
      SELECT 
        u.id, u.username, u.email, u.full_name, u.role,
        sp.profile_picture, sp.phone, sp.academic_year, 
        COALESCE(sp.student_id, 'STU' || EXTRACT(YEAR FROM CURRENT_DATE) || LPAD(EXTRACT(DOY FROM CURRENT_DATE)::TEXT, 3, '0')) as student_id
      FROM users u
      LEFT JOIN student_profiles sp ON u.id = sp.user_id
      WHERE u.id = $1
    `;
    const profileResult = await client.query(profileQuery, [studentId]);
    const profile = profileResult.rows[0];

    // Get enrolled classes with progress
    const classesQuery = `
      SELECT 
        c.id, c.name as title, c.description, u.full_name as instructor_name,
        cp.progress_percentage, cp.completed_lessons, cp.total_lessons,
        cp.performance_score, cp.time_spent, cp.last_accessed
      FROM class_enrollments ce
      JOIN classes c ON ce.class_id = c.id
      LEFT JOIN users u ON c.teacher_id = u.id
      LEFT JOIN course_progress cp ON c.id = cp.class_id AND cp.user_id = $1
      WHERE ce.student_id = $1 AND ce.is_active = true
      ORDER BY c.name
    `;
    const classesResult = await client.query(classesQuery, [studentId]);
    const enrolledClasses = classesResult.rows;

    // Get overall attendance percentage
    const attendanceQuery = `
      SELECT 
        COUNT(*) as total_sessions,
        COUNT(CASE WHEN status = 'present' OR status = 'late' THEN 1 END) as attended_sessions,
        ROUND(
          (COUNT(CASE WHEN status = 'present' OR status = 'late' THEN 1 END) * 100.0 / 
           NULLIF(COUNT(*), 0)), 2
        ) as attendance_percentage
      FROM attendance 
      WHERE user_id = $1 
        AND attendance_date >= CURRENT_DATE - INTERVAL '30 days'
    `;
    const attendanceResult = await client.query(attendanceQuery, [studentId]);
    const attendanceStats = attendanceResult.rows[0];

    // Get today's scheduled classes
    const todaysClassesQuery = `
      SELECT 
        c.id, c.name as title, u.full_name as instructor_name,
        cs.start_time, cs.end_time, cs.room_number,
        CASE 
          WHEN a.status IS NOT NULL THEN a.status
          ELSE 'pending'
        END as attendance_status
      FROM class_enrollments ce
      JOIN classes c ON ce.class_id = c.id
      LEFT JOIN users u ON c.teacher_id = u.id
      JOIN class_schedules cs ON c.id = cs.class_id
      LEFT JOIN attendance a ON c.id = a.class_id 
        AND a.user_id = $1 
        AND a.attendance_date = CURRENT_DATE
      WHERE ce.student_id = $1 
        AND ce.is_active = true
        AND cs.day_of_week = EXTRACT(DOW FROM CURRENT_DATE)
        AND cs.is_active = true
      ORDER BY cs.start_time
    `;
    const todaysClassesResult = await client.query(todaysClassesQuery, [studentId]);
    const todaysClasses = todaysClassesResult.rows;

    // Get pending assignments
    const assignmentsQuery = `
      SELECT 
        a.id, a.title, a.description, a.due_date, a.total_marks,
        a.assignment_type, c.name as class_title,
        CASE 
          WHEN asub.id IS NOT NULL THEN 'submitted'
          WHEN a.due_date < CURRENT_TIMESTAMP THEN 'overdue'
          ELSE 'pending'
        END as submission_status,
        asub.submitted_at, asub.score, asub.feedback
      FROM assignments a
      JOIN classes c ON a.class_id = c.id
      JOIN class_enrollments ce ON c.id = ce.class_id
      LEFT JOIN assignment_submissions asub ON a.id = asub.assignment_id 
        AND asub.user_id = $1
      WHERE ce.student_id = $1 
        AND ce.is_active = true
        AND a.is_published = true
        AND (asub.id IS NULL OR asub.status != 'submitted')
      ORDER BY a.due_date ASC
      LIMIT 10
    `;
    const assignmentsResult = await client.query(assignmentsQuery, [studentId]);
    const pendingAssignments = assignmentsResult.rows;

    // Get upcoming calendar events
    const calendarQuery = `
      SELECT 
        id, title, description, event_date, event_type,
        is_holiday, color, all_day, start_time, end_time
      FROM calendar_events 
      WHERE event_date >= CURRENT_DATE 
        AND event_date <= CURRENT_DATE + INTERVAL '30 days'
      ORDER BY event_date ASC
      LIMIT 20
    `;
    const calendarResult = await client.query(calendarQuery);
    const upcomingEvents = calendarResult.rows;

    // Get progress recommendations
    const recommendationsQuery = `
      SELECT 
        id, title, description, priority,
        is_active, created_at
      FROM progress_recommendations pr
      WHERE pr.user_id = $1 
        AND pr.is_active = true
      ORDER BY 
        CASE pr.priority 
          WHEN 'urgent' THEN 1
          WHEN 'high' THEN 2
          WHEN 'medium' THEN 3
          ELSE 4
        END,
        pr.created_at DESC
      LIMIT 5
    `;
    const recommendationsResult = await client.query(recommendationsQuery, [studentId]);
    const recommendations = recommendationsResult.rows;

    // Calculate statistics
    const stats = {
      totalClasses: enrolledClasses.length,
      averageProgress: enrolledClasses.length > 0 
        ? Math.round(enrolledClasses.reduce((sum, cls) => sum + (cls.progress_percentage || 0), 0) / enrolledClasses.length)
        : 0,
      attendancePercentage: parseFloat(attendanceStats.attendance_percentage) || 0,
      pendingAssignments: pendingAssignments.filter(a => a.submission_status === 'pending').length,
      overdueAssignments: pendingAssignments.filter(a => a.submission_status === 'overdue').length,
      todaysPendingClasses: todaysClasses.filter(c => c.attendance_status === 'pending').length
    };

    // Recent activity (last 7 days)
    const recentActivityQuery = `
      SELECT 
        'assignment' as activity_type,
        a.title as activity_title,
        'Assignment submitted' as activity_description,
        asub.submitted_at as activity_date,
        c.name as class_name
      FROM assignment_submissions asub
      JOIN assignments a ON asub.assignment_id = a.id
      JOIN classes c ON a.class_id = c.id
      WHERE asub.user_id = $1 
        AND asub.submitted_at >= CURRENT_DATE - INTERVAL '7 days'
      
      UNION ALL
      
      SELECT 
        'attendance' as activity_type,
        'Class Attended: ' || c.name as activity_title,
        'Attended class session' as activity_description,
        att.marked_at as activity_date,
        c.name as class_name
      FROM attendance att
      JOIN classes c ON att.class_id = c.id
      WHERE att.user_id = $1 
        AND att.status IN ('present', 'late')
        AND att.attendance_date >= CURRENT_DATE - INTERVAL '7 days'
      
      ORDER BY activity_date DESC
      LIMIT 10
    `;
    const recentActivityResult = await client.query(recentActivityQuery, [studentId]);
    const recentActivities = recentActivityResult.rows;

    res.json({
      success: true,
      data: {
        profile,
        enrolledClasses,
        todaysClasses,
        pendingAssignments,
        upcomingEvents,
        recommendations,
        stats,
        recentActivities,
        attendance: {
          totalSessions: parseInt(attendanceStats.total_sessions) || 0,
          attendedSessions: parseInt(attendanceStats.attended_sessions) || 0,
          attendancePercentage: parseFloat(attendanceStats.attendance_percentage) || 0
        }
      }
    });

  } catch (error) {
    console.error('Dashboard data fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard data',
      error: error.message
    });
  } finally {
    client.release();
  }
});

// Get detailed calendar data
router.get('/calendar', authenticateToken, requireStudent, async (req, res) => {
  try {
    const { month, year } = req.query;
    const studentId = req.user.id;

    let dateFilter = '';
    const queryParams = [studentId];

    if (month && year) {
      dateFilter = `AND EXTRACT(MONTH FROM event_date) = $2 AND EXTRACT(YEAR FROM event_date) = $3`;
      queryParams.push(month, year);
    } else {
      dateFilter = `AND event_date >= CURRENT_DATE - INTERVAL '30 days' AND event_date <= CURRENT_DATE + INTERVAL '90 days'`;
    }

    const calendarQuery = `
      SELECT 
        id, title, description, event_date, event_type,
        is_holiday, color, all_day, start_time, end_time
      FROM calendar_events 
      WHERE (class_id IS NULL OR class_id IN (
        SELECT class_id FROM class_enrollments WHERE student_id = $1 AND is_active = true
      ))
      ${dateFilter}
      ORDER BY event_date, start_time
    `;

    const result = await pool.query(calendarQuery, queryParams);

    res.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error('Calendar fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch calendar data'
    });
  }
});

// Get all progress
router.get('/progress', authenticateToken, requireStudent, async (req, res) => {
  try {
    const studentId = req.user.id;

    const progressQuery = `
      SELECT 
        c.id, c.name as title, u.full_name as instructor_name,
        cp.progress_percentage, cp.completed_lessons, cp.total_lessons,
        cp.performance_score, cp.time_spent, cp.last_accessed
      FROM course_progress cp
      JOIN classes c ON cp.class_id = c.id
      LEFT JOIN users u ON c.teacher_id = u.id
      WHERE cp.user_id = $1
      ORDER BY cp.last_accessed DESC
    `;

    const progressResult = await pool.query(progressQuery, [studentId]);

    res.json({
      success: true,
      data: progressResult.rows
    });

  } catch (error) {
    console.error('Error fetching progress:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch progress data'
    });
  }
});

// Get detailed course progress
router.get('/progress/:classId', authenticateToken, requireStudent, async (req, res) => {
  try {
    const studentId = req.user.id;
    const { classId } = req.params;

    let classFilter = '';
    const queryParams = [studentId];

    if (classId) {
      classFilter = 'AND c.id = $2';
      queryParams.push(classId);
    }

    const progressQuery = `
      SELECT 
        c.id, c.name as title, c.description, u.full_name as instructor_name,
        cp.progress_percentage, cp.completed_lessons, cp.total_lessons,
        cp.performance_score, cp.time_spent, cp.last_accessed,
        COALESCE(att_stats.attendance_percentage, 0) as attendance_percentage,
        COALESCE(ass_stats.completed_assignments, 0) as completed_assignments,
        COALESCE(ass_stats.total_assignments, 0) as total_assignments,
        COALESCE(ass_stats.average_score, 0) as average_assignment_score
      FROM class_enrollments ce
      JOIN classes c ON ce.class_id = c.id
      LEFT JOIN users u ON c.teacher_id = u.id
      LEFT JOIN course_progress cp ON c.id = cp.class_id AND cp.user_id = $1
      LEFT JOIN (
        SELECT 
          class_id,
          ROUND(
            (COUNT(CASE WHEN status = 'present' OR status = 'late' THEN 1 END) * 100.0 / 
             NULLIF(COUNT(*), 0)), 2
          ) as attendance_percentage
        FROM attendance 
        WHERE user_id = $1
        GROUP BY class_id
      ) att_stats ON c.id = att_stats.class_id
      LEFT JOIN (
        SELECT 
          a.class_id,
          COUNT(a.id) as total_assignments,
          COUNT(asub.id) as completed_assignments,
          ROUND(AVG(asub.score), 2) as average_score
        FROM assignments a
        LEFT JOIN assignment_submissions asub ON a.id = asub.assignment_id AND asub.user_id = $1
        WHERE a.is_published = true
        GROUP BY a.class_id
      ) ass_stats ON c.id = ass_stats.class_id
      WHERE ce.student_id = $1 AND ce.is_active = true ${classFilter}
      ORDER BY c.name
    `;

    const result = await pool.query(progressQuery, queryParams);

    res.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error('Progress fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch progress data'
    });
  }
});

// Update student profile
router.put('/profile', authenticateToken, requireStudent, async (req, res) => {
  const client = await pool.connect();
  
  try {
    const studentId = req.user.id;
    const {
      full_name, email, phone, academic_year
    } = req.body;

    await client.query('BEGIN');

    // Update users table
    const updateUserQuery = `
      UPDATE users 
      SET full_name = $1, email = $2, updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
    `;
    await client.query(updateUserQuery, [full_name, email, studentId]);

    // Update or insert student profile
    const updateProfileQuery = `
      INSERT INTO student_profiles (
        user_id, phone, academic_year
      ) VALUES ($1, $2, $3)
      ON CONFLICT (user_id) 
      DO UPDATE SET 
        phone = EXCLUDED.phone,
        academic_year = EXCLUDED.academic_year,
        updated_at = CURRENT_TIMESTAMP
    `;
    
    await client.query(updateProfileQuery, [
      studentId, phone, academic_year
    ]);

    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'Profile updated successfully'
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Profile update error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile'
    });
  } finally {
    client.release();
  }
});

// Mark attendance (for self-check-in)
router.post('/attendance', authenticateToken, requireStudent, async (req, res) => {
  try {
    const studentId = req.user.id;
    const { classId, status = 'present' } = req.body;

    const attendanceQuery = `
      INSERT INTO attendance (user_id, class_id, attendance_date, status, marked_at)
      VALUES ($1, $2, CURRENT_DATE, $3, CURRENT_TIMESTAMP)
      ON CONFLICT (user_id, class_id, attendance_date)
      DO UPDATE SET 
        status = EXCLUDED.status,
        marked_at = CURRENT_TIMESTAMP
    `;

    await pool.query(attendanceQuery, [studentId, classId, status]);

    res.json({
      success: true,
      message: 'Attendance marked successfully'
    });

  } catch (error) {
    console.error('Attendance marking error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark attendance'
    });
  }
});

// Get analytics data for student growth
router.get('/analytics', authenticateToken, requireStudent, async (req, res) => {
  try {
    const studentId = req.user.id;
    const { period = '30' } = req.query; // days

    const analyticsQuery = `
      SELECT 
        'overall_average' as metric_name,
        overall_average as metric_value,
        last_updated as metric_date
      FROM student_analytics sa
      WHERE sa.user_id = $1 
      UNION ALL
      SELECT 
        'completed_courses' as metric_name,
        completed_courses as metric_value,
        last_updated as metric_date
      FROM student_analytics sa
      WHERE sa.user_id = $1 
      UNION ALL
      SELECT 
        'total_study_hours' as metric_name,
        total_study_hours as metric_value,
        last_updated as metric_date
      FROM student_analytics sa
      WHERE sa.user_id = $1 
      ORDER BY metric_date DESC, metric_name
    `;

    const result = await pool.query(analyticsQuery, [studentId]);

    // Group data by metric type
    const analytics = result.rows.reduce((acc, row) => {
      if (!acc[row.metric_name]) {
        acc[row.metric_name] = [];
      }
      acc[row.metric_name].push({
        value: parseFloat(row.metric_value),
        date: row.metric_date,
        class: row.class_title
      });
      return acc;
    }, {});

    res.json({
      success: true,
      data: analytics
    });

  } catch (error) {
    console.error('Analytics fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch analytics data'
    });
  }
});

// Submit assignment
router.post('/assignments/:assignmentId/submit', authenticateToken, requireStudent, async (req, res) => {
  try {
    const studentId = req.user.id;
    const { assignmentId } = req.params;
    const { submissionText, filePath } = req.body;

    // Check if assignment exists and is published
    const assignmentCheck = await pool.query(
      'SELECT due_date FROM assignments WHERE id = $1 AND is_published = true',
      [assignmentId]
    );

    if (assignmentCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Assignment not found or not published'
      });
    }

    const dueDate = new Date(assignmentCheck.rows[0].due_date);
    const isLate = new Date() > dueDate;

    const submitQuery = `
      INSERT INTO assignment_submissions (
        assignment_id, user_id, submission_text, attachment_url, 
        status
      ) VALUES ($1, $2, $3, $4, 'submitted')
      ON CONFLICT (assignment_id, user_id)
      DO UPDATE SET 
        submission_text = EXCLUDED.submission_text,
        attachment_url = EXCLUDED.attachment_url,
        submitted_at = CURRENT_TIMESTAMP,
        status = 'submitted'
    `;

    await pool.query(submitQuery, [
      assignmentId, studentId, submissionText, filePath
    ]);

    res.json({
      success: true,
      message: isLate ? 'Assignment submitted (Late)' : 'Assignment submitted successfully'
    });

  } catch (error) {
    console.error('Assignment submission error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit assignment'
    });
  }
});

module.exports = router;