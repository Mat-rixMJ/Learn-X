const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

// Get daily schedule for a specific date
router.get('/daily/:date', authenticateToken, async (req, res) => {
  try {
    const { date } = req.params;
    
    const result = await pool.query(`
      SELECT 
        ds.*,
        c.name as class_name,
        c.subject,
        u.full_name as teacher_name,
        orig_u.full_name as original_teacher_name,
        ts.description as time_slot_description,
        COUNT(ce.student_id) as enrolled_students
      FROM daily_schedules ds
      JOIN classes c ON ds.class_id = c.id
      JOIN users u ON ds.teacher_id = u.id
      LEFT JOIN users orig_u ON ds.original_teacher_id = orig_u.id
      JOIN time_slots ts ON ds.time_slot_id = ts.id
      LEFT JOIN class_enrollments ce ON c.id = ce.class_id AND ce.is_active = true
      WHERE ds.schedule_date = $1
      GROUP BY ds.id, c.name, c.subject, u.full_name, orig_u.full_name, ts.description
      ORDER BY ds.time_slot_id
    `, [date]);
    
    // Get time slots for reference
    const timeSlotsResult = await pool.query(`
      SELECT * FROM time_slots ORDER BY id
    `);
    
    res.json({
      success: true,
      data: {
        date,
        schedule: result.rows,
        timeSlots: timeSlotsResult.rows
      }
    });
    
  } catch (error) {
    console.error('Error fetching daily schedule:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch daily schedule'
    });
  }
});

// Get teacher's schedule for a date range
router.get('/teacher/:teacherId', authenticateToken, async (req, res) => {
  try {
    const { teacherId } = req.params;
    const { startDate, endDate } = req.query;
    
    const result = await pool.query(`
      SELECT 
        ds.*,
        c.name as class_name,
        c.subject,
        ts.description as time_slot_description,
        COUNT(ce.student_id) as enrolled_students
      FROM daily_schedules ds
      JOIN classes c ON ds.class_id = c.id
      JOIN time_slots ts ON ds.time_slot_id = ts.id
      LEFT JOIN class_enrollments ce ON c.id = ce.class_id AND ce.is_active = true
      WHERE ds.teacher_id = $1 
        AND ds.schedule_date BETWEEN $2 AND $3
      GROUP BY ds.id, c.name, c.subject, ts.description
      ORDER BY ds.schedule_date, ds.time_slot_id
    `, [teacherId, startDate || new Date().toISOString().split('T')[0], 
         endDate || new Date(Date.now() + 7*24*60*60*1000).toISOString().split('T')[0]]);
    
    res.json({
      success: true,
      data: result.rows
    });
    
  } catch (error) {
    console.error('Error fetching teacher schedule:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch teacher schedule'
    });
  }
});

// Get student's schedule for a date range
router.get('/student/:studentId', authenticateToken, async (req, res) => {
  try {
    const { studentId } = req.params;
    const { startDate, endDate } = req.query;
    
    const result = await pool.query(`
      SELECT 
        ds.*,
        c.name as class_name,
        c.subject,
        u.full_name as teacher_name,
        ts.description as time_slot_description
      FROM daily_schedules ds
      JOIN classes c ON ds.class_id = c.id
      JOIN users u ON ds.teacher_id = u.id
      JOIN time_slots ts ON ds.time_slot_id = ts.id
      JOIN class_enrollments ce ON c.id = ce.class_id AND ce.student_id = $1 AND ce.is_active = true
      WHERE ds.schedule_date BETWEEN $2 AND $3
      ORDER BY ds.schedule_date, ds.time_slot_id
    `, [studentId, startDate || new Date().toISOString().split('T')[0], 
         endDate || new Date(Date.now() + 7*24*60*60*1000).toISOString().split('T')[0]]);
    
    res.json({
      success: true,
      data: result.rows
    });
    
  } catch (error) {
    console.error('Error fetching student schedule:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch student schedule'
    });
  }
});

// Generate new schedule (Admin/Teacher only)
router.post('/generate', authenticateToken, authorizeRoles(['admin', 'teacher']), async (req, res) => {
  try {
    const { startDate, days = 5 } = req.body;
    
    // Import scheduling algorithm
    const { runSchedulingSystem } = require('../database/scheduling-algorithm');
    
    // Run the scheduling algorithm
    const schedules = await runSchedulingSystem();
    
    res.json({
      success: true,
      message: 'Schedule generated successfully',
      data: schedules
    });
    
  } catch (error) {
    console.error('Error generating schedule:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate schedule',
      error: error.message
    });
  }
});

// Update teacher availability
router.post('/availability/:teacherId', authenticateToken, authorizeRoles(['admin', 'teacher']), async (req, res) => {
  try {
    const { teacherId } = req.params;
    const { date, isAvailable, reason, unavailableSlots, maxPeriods } = req.body;
    
    await pool.query(`
      INSERT INTO teacher_availability (
        teacher_id, date, is_available, reason, unavailable_slots, max_periods
      ) VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (teacher_id, date) 
      DO UPDATE SET 
        is_available = EXCLUDED.is_available,
        reason = EXCLUDED.reason,
        unavailable_slots = EXCLUDED.unavailable_slots,
        max_periods = EXCLUDED.max_periods,
        updated_at = NOW()
    `, [teacherId, date, isAvailable, reason, unavailableSlots, maxPeriods]);
    
    res.json({
      success: true,
      message: 'Teacher availability updated successfully'
    });
    
  } catch (error) {
    console.error('Error updating teacher availability:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update teacher availability'
    });
  }
});

// Get scheduling statistics
router.get('/stats', authenticateToken, authorizeRoles(['admin', 'teacher']), async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    // Total scheduled classes
    const totalClasses = await pool.query(`
      SELECT COUNT(*) as total 
      FROM daily_schedules 
      WHERE schedule_date BETWEEN $1 AND $2
    `, [startDate || new Date().toISOString().split('T')[0], 
         endDate || new Date(Date.now() + 7*24*60*60*1000).toISOString().split('T')[0]]);
    
    // Substitutions count
    const substitutions = await pool.query(`
      SELECT COUNT(*) as total 
      FROM daily_schedules 
      WHERE is_substitute = true 
        AND schedule_date BETWEEN $1 AND $2
    `, [startDate || new Date().toISOString().split('T')[0], 
         endDate || new Date(Date.now() + 7*24*60*60*1000).toISOString().split('T')[0]]);
    
    // Teacher workload
    const teacherWorkload = await pool.query(`
      SELECT 
        u.full_name,
        COUNT(*) as classes_assigned,
        COUNT(CASE WHEN ds.is_substitute THEN 1 END) as substitute_classes
      FROM daily_schedules ds
      JOIN users u ON ds.teacher_id = u.id
      WHERE ds.schedule_date BETWEEN $1 AND $2
      GROUP BY u.id, u.full_name
      ORDER BY classes_assigned DESC
      LIMIT 10
    `, [startDate || new Date().toISOString().split('T')[0], 
         endDate || new Date(Date.now() + 7*24*60*60*1000).toISOString().split('T')[0]]);
    
    // Subject distribution
    const subjectDistribution = await pool.query(`
      SELECT 
        subject,
        COUNT(*) as classes_count
      FROM daily_schedules
      WHERE schedule_date BETWEEN $1 AND $2
      GROUP BY subject
      ORDER BY classes_count DESC
    `, [startDate || new Date().toISOString().split('T')[0], 
         endDate || new Date(Date.now() + 7*24*60*60*1000).toISOString().split('T')[0]]);
    
    res.json({
      success: true,
      data: {
        totalClasses: totalClasses.rows[0].total,
        totalSubstitutions: substitutions.rows[0].total,
        teacherWorkload: teacherWorkload.rows,
        subjectDistribution: subjectDistribution.rows
      }
    });
    
  } catch (error) {
    console.error('Error fetching scheduling stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch scheduling statistics'
    });
  }
});

// Get schedule conflicts
router.get('/conflicts', authenticateToken, authorizeRoles(['admin', 'teacher']), async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const result = await pool.query(`
      SELECT 
        sc.*,
        c.name as class_name,
        u.full_name as teacher_name
      FROM schedule_conflicts sc
      LEFT JOIN classes c ON sc.class_id = c.id
      LEFT JOIN users u ON sc.teacher_id = u.id
      WHERE sc.schedule_date BETWEEN $1 AND $2
        AND sc.resolution_status = 'unresolved'
      ORDER BY sc.created_at DESC
    `, [startDate || new Date().toISOString().split('T')[0], 
         endDate || new Date(Date.now() + 7*24*60*60*1000).toISOString().split('T')[0]]);
    
    res.json({
      success: true,
      data: result.rows
    });
    
  } catch (error) {
    console.error('Error fetching schedule conflicts:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch schedule conflicts'
    });
  }
});

// Resolve schedule conflict
router.put('/conflicts/:conflictId', authenticateToken, authorizeRoles(['admin', 'teacher']), async (req, res) => {
  try {
    const { conflictId } = req.params;
    const { resolutionStatus, resolutionNotes } = req.body;
    
    await pool.query(`
      UPDATE schedule_conflicts 
      SET resolution_status = $1, resolution_notes = $2
      WHERE id = $3
    `, [resolutionStatus, resolutionNotes, conflictId]);
    
    res.json({
      success: true,
      message: 'Conflict resolution updated successfully'
    });
    
  } catch (error) {
    console.error('Error resolving conflict:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to resolve conflict'
    });
  }
});

module.exports = router;