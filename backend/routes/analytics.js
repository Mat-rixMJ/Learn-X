const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

// Log analytics event
router.post('/event', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { event_type, event_data, class_id, session_id } = req.body;
    const ip_address = req.ip || req.connection.remoteAddress;
    const user_agent = req.get('User-Agent');

    const query = `
      INSERT INTO analytics_events (user_id, class_id, session_id, event_type, event_data, ip_address, user_agent)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id
    `;

    await pool.query(query, [
      userId, 
      class_id || null, 
      session_id || null, 
      event_type, 
      JSON.stringify(event_data || {}),
      ip_address,
      user_agent
    ]);

    res.json({
      success: true,
      message: 'Event logged successfully'
    });
  } catch (error) {
    console.error('Error logging analytics event:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to log event'
    });
  }
});

// Get teacher analytics dashboard
router.get('/dashboard', authenticateToken, authorizeRoles('teacher', 'admin'), async (req, res) => {
  try {
    const teacherId = req.user.id;
    const { period = '30', class_id } = req.query; // Default to 30 days

    const periodDays = parseInt(period);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - periodDays);

    // Base analytics queries
    let classFilter = '';
    let params = [teacherId, startDate];
    let paramCount = 2;

    if (class_id) {
      paramCount++;
      classFilter = ` AND c.id = $${paramCount}`;
      params.push(class_id);
    }

    // Get class performance overview
    const classPerformanceQuery = `
      SELECT 
        c.id,
        c.name as class_name,
        COUNT(DISTINCT ce.student_id) as total_students,
        COUNT(DISTINCT a.id) as total_assignments,
        AVG(g.percentage) as average_grade,
        COUNT(DISTINCT ls.id) as live_sessions_count,
        SUM(ls.participant_count) as total_participation
      FROM classes c
      LEFT JOIN class_enrollments ce ON c.id = ce.class_id AND ce.is_active = true
      LEFT JOIN assignments a ON c.id = a.class_id
      LEFT JOIN grades g ON a.id = g.assignment_id
      LEFT JOIN live_sessions ls ON c.id = ls.class_id 
        AND ls.started_at >= $2
      WHERE c.teacher_id = $1 ${classFilter}
      GROUP BY c.id, c.name
      ORDER BY c.name
    `;

    // Get student engagement metrics
    const engagementQuery = `
      SELECT 
        DATE_TRUNC('day', ae.created_at) as date,
        COUNT(DISTINCT ae.user_id) as active_users,
        COUNT(*) as total_events,
        COUNT(CASE WHEN ae.event_type = 'session_join' THEN 1 END) as session_joins,
        COUNT(CASE WHEN ae.event_type = 'assignment_submit' THEN 1 END) as assignment_submissions,
        COUNT(CASE WHEN ae.event_type = 'content_download' THEN 1 END) as content_downloads
      FROM analytics_events ae
      JOIN classes c ON ae.class_id = c.id
      WHERE c.teacher_id = $1 
        AND ae.created_at >= $2 ${classFilter}
      GROUP BY DATE_TRUNC('day', ae.created_at)
      ORDER BY date DESC
    `;

    // Get assignment completion rates
    const assignmentStatsQuery = `
      SELECT 
        a.id,
        a.title,
        a.due_date,
        COUNT(DISTINCT ce.student_id) as total_students,
        COUNT(DISTINCT g.student_id) as submissions,
        ROUND(
          (COUNT(DISTINCT g.student_id)::decimal / NULLIF(COUNT(DISTINCT ce.student_id), 0)) * 100, 
          2
        ) as completion_rate,
        AVG(g.percentage) as average_grade
      FROM assignments a
      JOIN classes c ON a.class_id = c.id
      LEFT JOIN class_enrollments ce ON c.id = ce.class_id AND ce.is_active = true
      LEFT JOIN grades g ON a.id = g.assignment_id
      WHERE c.teacher_id = $1 
        AND a.created_at >= $2 ${classFilter}
      GROUP BY a.id, a.title, a.due_date
      ORDER BY a.due_date DESC
    `;

    // Get live session statistics
    const sessionStatsQuery = `
      SELECT 
        ls.id,
        ls.title,
        ls.started_at,
        ls.ended_at,
        ls.participant_count,
        EXTRACT(EPOCH FROM (ls.ended_at - ls.started_at))/60 as duration_minutes,
        c.name as class_name
      FROM live_sessions ls
      JOIN classes c ON ls.class_id = c.id
      WHERE c.teacher_id = $1 
        AND ls.started_at >= $2 ${classFilter}
      ORDER BY ls.started_at DESC
    `;

    // Execute all queries
    const [
      classPerformance,
      engagement,
      assignmentStats,
      sessionStats
    ] = await Promise.all([
      pool.query(classPerformanceQuery, params),
      pool.query(engagementQuery, params),
      pool.query(assignmentStatsQuery, params),
      pool.query(sessionStatsQuery, params)
    ]);

    // Calculate summary statistics
    const totalStudents = classPerformance.rows.reduce((sum, row) => sum + parseInt(row.total_students || 0), 0);
    const totalAssignments = classPerformance.rows.reduce((sum, row) => sum + parseInt(row.total_assignments || 0), 0);
    const totalSessions = classPerformance.rows.reduce((sum, row) => sum + parseInt(row.live_sessions_count || 0), 0);
    const overallAverage = classPerformance.rows.length > 0 
      ? classPerformance.rows.reduce((sum, row) => sum + (parseFloat(row.average_grade) || 0), 0) / classPerformance.rows.length
      : 0;

    res.json({
      success: true,
      data: {
        summary: {
          period_days: periodDays,
          total_students: totalStudents,
          total_assignments: totalAssignments,
          total_sessions: totalSessions,
          overall_average_grade: Math.round(overallAverage * 100) / 100
        },
        class_performance: classPerformance.rows,
        engagement_timeline: engagement.rows,
        assignment_stats: assignmentStats.rows,
        session_stats: sessionStats.rows
      }
    });
  } catch (error) {
    console.error('Error fetching analytics dashboard:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch analytics data'
    });
  }
});

// Get detailed class analytics
router.get('/class/:id', authenticateToken, authorizeRoles('teacher', 'admin'), async (req, res) => {
  try {
    const { id: classId } = req.params;
    const teacherId = req.user.id;
    const { period = '30' } = req.query;

    // Verify teacher owns the class
    const classCheck = await pool.query(
      'SELECT name FROM classes WHERE id = $1 AND teacher_id = $2',
      [classId, teacherId]
    );

    if (classCheck.rows.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const periodDays = parseInt(period);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - periodDays);

    // Get student activity breakdown
    const studentActivityQuery = `
      SELECT 
        u.id,
        u.full_name,
        u.email,
        COUNT(ae.id) as total_events,
        COUNT(CASE WHEN ae.event_type = 'session_join' THEN 1 END) as session_joins,
        COUNT(CASE WHEN ae.event_type = 'assignment_submit' THEN 1 END) as assignment_submissions,
        AVG(g.percentage) as average_grade,
        COUNT(DISTINCT g.assignment_id) as completed_assignments,
        MAX(ae.created_at) as last_activity
      FROM users u
      JOIN class_enrollments ce ON u.id = ce.student_id
      LEFT JOIN analytics_events ae ON u.id = ae.user_id 
        AND ae.class_id = $1 
        AND ae.created_at >= $2
      LEFT JOIN grades g ON u.id = g.student_id 
        AND g.assignment_id IN (SELECT id FROM assignments WHERE class_id = $1)
      WHERE ce.class_id = $1 AND ce.is_active = true
      GROUP BY u.id, u.full_name, u.email
      ORDER BY total_events DESC, u.full_name
    `;

    // Get assignment performance breakdown
    const assignmentPerformanceQuery = `
      SELECT 
        a.id,
        a.title,
        a.points_possible,
        a.due_date,
        COUNT(g.id) as submissions,
        AVG(g.percentage) as average_percentage,
        MIN(g.percentage) as min_percentage,
        MAX(g.percentage) as max_percentage,
        COUNT(CASE WHEN g.percentage >= 90 THEN 1 END) as a_grades,
        COUNT(CASE WHEN g.percentage >= 80 AND g.percentage < 90 THEN 1 END) as b_grades,
        COUNT(CASE WHEN g.percentage >= 70 AND g.percentage < 80 THEN 1 END) as c_grades,
        COUNT(CASE WHEN g.percentage >= 60 AND g.percentage < 70 THEN 1 END) as d_grades,
        COUNT(CASE WHEN g.percentage < 60 THEN 1 END) as f_grades
      FROM assignments a
      LEFT JOIN grades g ON a.id = g.assignment_id
      WHERE a.class_id = $1 AND a.created_at >= $2
      GROUP BY a.id, a.title, a.points_possible, a.due_date
      ORDER BY a.due_date DESC
    `;

    // Get session attendance patterns
    const attendanceQuery = `
      SELECT 
        ls.id,
        ls.title,
        ls.started_at,
        ls.participant_count,
        COUNT(sp.user_id) as registered_participants,
        AVG(EXTRACT(EPOCH FROM (sp.left_at - sp.joined_at))/60) as avg_session_duration
      FROM live_sessions ls
      LEFT JOIN session_participants sp ON ls.id = sp.session_id
      WHERE ls.class_id = $1 AND ls.started_at >= $2
      GROUP BY ls.id, ls.title, ls.started_at, ls.participant_count
      ORDER BY ls.started_at DESC
    `;

    const [studentActivity, assignmentPerformance, attendance] = await Promise.all([
      pool.query(studentActivityQuery, [classId, startDate]),
      pool.query(assignmentPerformanceQuery, [classId, startDate]),
      pool.query(attendanceQuery, [classId, startDate])
    ]);

    res.json({
      success: true,
      data: {
        class_name: classCheck.rows[0].name,
        period_days: periodDays,
        student_activity: studentActivity.rows,
        assignment_performance: assignmentPerformance.rows,
        session_attendance: attendance.rows
      }
    });
  } catch (error) {
    console.error('Error fetching class analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch class analytics'
    });
  }
});

// Get student progress report
router.get('/student/:studentId', authenticateToken, authorizeRoles('teacher', 'admin'), async (req, res) => {
  try {
    const { studentId } = req.params;
    const teacherId = req.user.id;
    const { class_id } = req.query;

    // Verify student is in teacher's class
    const enrollmentCheck = await pool.query(`
      SELECT c.name as class_name, u.full_name as student_name
      FROM class_enrollments ce
      JOIN classes c ON ce.class_id = c.id
      JOIN users u ON ce.student_id = u.id
      WHERE ce.student_id = $1 
        AND c.teacher_id = $2 
        AND ce.is_active = true
        ${class_id ? 'AND c.id = $3' : ''}
    `, class_id ? [studentId, teacherId, class_id] : [studentId, teacherId]);

    if (enrollmentCheck.rows.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'Student not found in your classes'
      });
    }

    // Get student's assignment performance
    const assignmentQuery = `
      SELECT 
        a.title,
        a.points_possible,
        a.due_date,
        g.points_earned,
        g.percentage,
        g.letter_grade,
        g.submitted_at,
        g.is_late,
        c.name as class_name
      FROM assignments a
      JOIN classes c ON a.class_id = c.id
      LEFT JOIN grades g ON a.id = g.assignment_id AND g.student_id = $1
      WHERE c.teacher_id = $2
        ${class_id ? 'AND c.id = $3' : ''}
      ORDER BY a.due_date DESC
    `;

    // Get session attendance
    const attendanceQuery = `
      SELECT 
        ls.title,
        ls.started_at,
        ls.ended_at,
        sp.joined_at,
        sp.left_at,
        CASE WHEN sp.user_id IS NOT NULL THEN true ELSE false END as attended,
        c.name as class_name
      FROM live_sessions ls
      JOIN classes c ON ls.class_id = c.id
      LEFT JOIN session_participants sp ON ls.id = sp.session_id AND sp.user_id = $1
      WHERE c.teacher_id = $2
        ${class_id ? 'AND c.id = $3' : ''}
      ORDER BY ls.started_at DESC
    `;

    const [assignments, attendance] = await Promise.all([
      pool.query(assignmentQuery, class_id ? [studentId, teacherId, class_id] : [studentId, teacherId]),
      pool.query(attendanceQuery, class_id ? [studentId, teacherId, class_id] : [studentId, teacherId])
    ]);

    // Calculate summary stats
    const completedAssignments = assignments.rows.filter(a => a.submitted_at).length;
    const totalAssignments = assignments.rows.length;
    const averageGrade = assignments.rows.length > 0 
      ? assignments.rows.reduce((sum, a) => sum + (a.percentage || 0), 0) / assignments.rows.length
      : 0;
    const attendedSessions = attendance.rows.filter(s => s.attended).length;
    const totalSessions = attendance.rows.length;

    res.json({
      success: true,
      data: {
        student_info: {
          name: enrollmentCheck.rows[0].student_name,
          class_name: enrollmentCheck.rows[0].class_name
        },
        summary: {
          completed_assignments: completedAssignments,
          total_assignments: totalAssignments,
          completion_rate: totalAssignments > 0 ? Math.round((completedAssignments / totalAssignments) * 100) : 0,
          average_grade: Math.round(averageGrade * 100) / 100,
          attended_sessions: attendedSessions,
          total_sessions: totalSessions,
          attendance_rate: totalSessions > 0 ? Math.round((attendedSessions / totalSessions) * 100) : 0
        },
        assignments: assignments.rows,
        session_attendance: attendance.rows
      }
    });
  } catch (error) {
    console.error('Error fetching student progress:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch student progress'
    });
  }
});

module.exports = router;