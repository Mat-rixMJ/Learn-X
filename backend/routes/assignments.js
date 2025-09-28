const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

// Get all assignments for a teacher
router.get('/', authenticateToken, authorizeRoles('teacher', 'admin'), async (req, res) => {
  try {
    const teacherId = req.user.id;
    const { class_id, status } = req.query;

    let query = `
      SELECT 
        a.*,
        c.name as class_name,
        COUNT(DISTINCT g.student_id) as submissions_count,
        COUNT(DISTINCT ce.student_id) as total_students,
        AVG(g.percentage) as average_grade
      FROM assignments a
      LEFT JOIN classes c ON a.class_id = c.id
      LEFT JOIN grades g ON a.id = g.assignment_id
      LEFT JOIN class_enrollments ce ON a.class_id = ce.class_id AND ce.is_active = true
      WHERE a.teacher_id = $1
    `;
    
    const params = [teacherId];
    let paramCount = 1;

    if (class_id) {
      paramCount++;
      query += ` AND a.class_id = $${paramCount}`;
      params.push(class_id);
    }

    if (status === 'published') {
      query += ` AND a.is_published = true`;
    } else if (status === 'draft') {
      query += ` AND a.is_published = false`;
    }

    query += `
      GROUP BY a.id, c.name
      ORDER BY a.created_at DESC
    `;

    const result = await pool.query(query, params);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching assignments:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch assignments'
    });
  }
});

// Get assignment by ID with detailed stats
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Get assignment details
    const assignmentQuery = await pool.query(`
      SELECT 
        a.*,
        c.name as class_name,
        u.full_name as teacher_name
      FROM assignments a
      LEFT JOIN classes c ON a.class_id = c.id
      LEFT JOIN users u ON a.teacher_id = u.id
      WHERE a.id = $1
    `, [id]);

    if (assignmentQuery.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Assignment not found'
      });
    }

    const assignment = assignmentQuery.rows[0];

    // Check if user has access to this assignment
    if (userRole === 'student') {
      // Students can only see published assignments from classes they're enrolled in
      const enrollmentCheck = await pool.query(`
        SELECT 1 FROM class_enrollments ce
        WHERE ce.class_id = $1 AND ce.student_id = $2 AND ce.is_active = true
      `, [assignment.class_id, userId]);

      if (enrollmentCheck.rows.length === 0 || !assignment.is_published) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }
    } else if (userRole === 'teacher' && assignment.teacher_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Get submission stats for teachers
    let submissionStats = null;
    if (userRole === 'teacher' || userRole === 'admin') {
      const statsQuery = await pool.query(`
        SELECT 
          COUNT(DISTINCT g.student_id) as submissions_count,
          COUNT(DISTINCT ce.student_id) as total_students,
          AVG(g.percentage) as average_grade,
          MAX(g.percentage) as highest_grade,
          MIN(g.percentage) as lowest_grade
        FROM assignments a
        LEFT JOIN grades g ON a.id = g.assignment_id
        LEFT JOIN class_enrollments ce ON a.class_id = ce.class_id AND ce.is_active = true
        WHERE a.id = $1
      `, [id]);

      submissionStats = statsQuery.rows[0];
    }

    // Get student's grade if they're a student
    let studentGrade = null;
    if (userRole === 'student') {
      const gradeQuery = await pool.query(`
        SELECT * FROM grades WHERE assignment_id = $1 AND student_id = $2
      `, [id, userId]);

      if (gradeQuery.rows.length > 0) {
        studentGrade = gradeQuery.rows[0];
      }
    }

    res.json({
      success: true,
      data: {
        assignment,
        submissionStats,
        studentGrade
      }
    });
  } catch (error) {
    console.error('Error fetching assignment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch assignment'
    });
  }
});

// Create new assignment
router.post('/', authenticateToken, authorizeRoles('teacher', 'admin'), async (req, res) => {
  try {
    const teacherId = req.user.id;
    const {
      class_id,
      title,
      description,
      instructions,
      due_date,
      points_possible,
      assignment_type,
      is_published,
      allow_late_submission
    } = req.body;

    // Validate required fields
    if (!class_id || !title) {
      return res.status(400).json({
        success: false,
        message: 'Class ID and title are required'
      });
    }

    // Verify teacher owns the class
    const classCheck = await pool.query(
      'SELECT id FROM classes WHERE id = $1 AND teacher_id = $2',
      [class_id, teacherId]
    );

    if (classCheck.rows.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'You can only create assignments for your own classes'
      });
    }

    const query = `
      INSERT INTO assignments (
        class_id, teacher_id, title, description, instructions,
        due_date, points_possible, assignment_type, is_published, allow_late_submission
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;

    const values = [
      class_id,
      teacherId,
      title,
      description,
      instructions,
      due_date,
      points_possible || 100,
      assignment_type || 'homework',
      is_published || false,
      allow_late_submission !== undefined ? allow_late_submission : true
    ];

    const result = await pool.query(query, values);

    res.status(201).json({
      success: true,
      message: 'Assignment created successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating assignment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create assignment'
    });
  }
});

// Update assignment
router.put('/:id', authenticateToken, authorizeRoles('teacher', 'admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const teacherId = req.user.id;
    const updateData = req.body;

    // Verify assignment exists and belongs to teacher
    const assignmentCheck = await pool.query(
      'SELECT id FROM assignments WHERE id = $1 AND teacher_id = $2',
      [id, teacherId]
    );

    if (assignmentCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Assignment not found or access denied'
      });
    }

    // Build dynamic update query
    const allowedFields = [
      'title', 'description', 'instructions', 'due_date', 
      'points_possible', 'assignment_type', 'is_published', 'allow_late_submission'
    ];
    
    const updates = [];
    const values = [];
    let paramCount = 0;

    for (const [key, value] of Object.entries(updateData)) {
      if (allowedFields.includes(key)) {
        paramCount++;
        updates.push(`${key} = $${paramCount}`);
        values.push(value);
      }
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid fields to update'
      });
    }

    paramCount++;
    values.push(new Date().toISOString());
    updates.push(`updated_at = $${paramCount}`);

    paramCount++;
    values.push(id);

    const query = `
      UPDATE assignments 
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await pool.query(query, values);

    res.json({
      success: true,
      message: 'Assignment updated successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating assignment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update assignment'
    });
  }
});

// Delete assignment
router.delete('/:id', authenticateToken, authorizeRoles('teacher', 'admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const teacherId = req.user.id;

    // Verify assignment exists and belongs to teacher
    const assignmentCheck = await pool.query(
      'SELECT id FROM assignments WHERE id = $1 AND teacher_id = $2',
      [id, teacherId]
    );

    if (assignmentCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Assignment not found or access denied'
      });
    }

    await pool.query('DELETE FROM assignments WHERE id = $1', [id]);

    res.json({
      success: true,
      message: 'Assignment deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting assignment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete assignment'
    });
  }
});

// Get grades for an assignment (teachers only)
router.get('/:id/grades', authenticateToken, authorizeRoles('teacher', 'admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const teacherId = req.user.id;

    // Verify assignment belongs to teacher
    const assignmentCheck = await pool.query(
      'SELECT id FROM assignments WHERE id = $1 AND teacher_id = $2',
      [id, teacherId]
    );

    if (assignmentCheck.rows.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const gradesQuery = await pool.query(`
      SELECT 
        g.*,
        u.full_name as student_name,
        u.email as student_email
      FROM grades g
      JOIN users u ON g.student_id = u.id
      WHERE g.assignment_id = $1
      ORDER BY u.full_name
    `, [id]);

    res.json({
      success: true,
      data: gradesQuery.rows
    });
  } catch (error) {
    console.error('Error fetching grades:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch grades'
    });
  }
});

// Submit/update grade for assignment
router.post('/:id/grade', authenticateToken, authorizeRoles('teacher', 'admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const teacherId = req.user.id;
    const { student_id, points_earned, feedback } = req.body;

    // Verify assignment belongs to teacher
    const assignmentCheck = await pool.query(
      'SELECT points_possible FROM assignments WHERE id = $1 AND teacher_id = $2',
      [id, teacherId]
    );

    if (assignmentCheck.rows.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const maxPoints = assignmentCheck.rows[0].points_possible;
    const percentage = maxPoints > 0 ? ((points_earned / maxPoints) * 100).toFixed(2) : 0;
    
    // Calculate letter grade
    let letterGrade = 'F';
    if (percentage >= 97) letterGrade = 'A+';
    else if (percentage >= 93) letterGrade = 'A';
    else if (percentage >= 90) letterGrade = 'A-';
    else if (percentage >= 87) letterGrade = 'B+';
    else if (percentage >= 83) letterGrade = 'B';
    else if (percentage >= 80) letterGrade = 'B-';
    else if (percentage >= 77) letterGrade = 'C+';
    else if (percentage >= 73) letterGrade = 'C';
    else if (percentage >= 70) letterGrade = 'C-';
    else if (percentage >= 67) letterGrade = 'D+';
    else if (percentage >= 65) letterGrade = 'D';

    // Upsert grade
    const gradeQuery = `
      INSERT INTO grades (assignment_id, student_id, points_earned, max_points, percentage, letter_grade, feedback, graded_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      ON CONFLICT (assignment_id, student_id)
      DO UPDATE SET 
        points_earned = EXCLUDED.points_earned,
        max_points = EXCLUDED.max_points,
        percentage = EXCLUDED.percentage,
        letter_grade = EXCLUDED.letter_grade,
        feedback = EXCLUDED.feedback,
        graded_at = NOW(),
        updated_at = NOW()
      RETURNING *
    `;

    const result = await pool.query(gradeQuery, [
      id, student_id, points_earned, maxPoints, percentage, letterGrade, feedback
    ]);

    res.json({
      success: true,
      message: 'Grade submitted successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error submitting grade:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit grade'
    });
  }
});

module.exports = router;