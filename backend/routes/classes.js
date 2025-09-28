const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const crypto = require('crypto');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

// Get all classes with teacher info and enrollment counts (visible to all authenticated users)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { search, subject, teacher_id, is_active } = req.query;
    
    let query = `
      SELECT 
        c.id, c.name, c.description, c.subject, c.teacher_id, c.max_students, 
        c.scheduled_at, c.duration_minutes, c.meeting_room_id, c.created_at, c.updated_at,
        u.username as teacher_name, u.full_name as teacher_full_name,
        COUNT(DISTINCT ce.student_id) as enrolled_students,
        COUNT(DISTINCT rl.id) as total_lectures
      FROM classes c
      LEFT JOIN users u ON c.teacher_id = u.id
      LEFT JOIN class_enrollments ce ON c.id = ce.class_id AND ce.is_active = true
      LEFT JOIN recorded_lectures rl ON c.id = rl.class_id
      WHERE 1=1
    `;
    
    const params = [];
    let paramCount = 0;
    
    // Add filters
    if (search) {
      paramCount++;
      query += ` AND (c.name ILIKE ${paramCount} OR c.description ILIKE ${paramCount} OR c.subject ILIKE ${paramCount})`;
      params.push(`%${search}%`);
    }
    
    if (subject) {
      paramCount++;
      query += ` AND c.subject = ${paramCount}`;
      params.push(subject);
    }
    
    if (teacher_id) {
      paramCount++;
      query += ` AND c.teacher_id = ${paramCount}`;
      params.push(teacher_id);
    }
    
    query += `
      GROUP BY c.id, u.username, u.full_name
      ORDER BY c.created_at DESC
    `;
    
    const result = await pool.query(query, params);
    
    res.json({
      success: true,
      data: {
        classes: result.rows,
        total: result.rows.length
      }
    });
  } catch (err) {
    console.error('Get classes error:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
    });
  }
});

// Get class by ID with detailed info
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const query = `
      SELECT 
        c.*, 
        u.username as teacher_name, u.full_name as teacher_full_name, u.email as teacher_email,
        COUNT(DISTINCT ce.student_id) as enrolled_students,
        COUNT(DISTINCT rl.id) as total_lectures,
        COUNT(DISTINCT ls.id) as total_sessions
      FROM classes c
      LEFT JOIN users u ON c.teacher_id = u.id
      LEFT JOIN class_enrollments ce ON c.id = ce.class_id AND ce.is_active = true
      LEFT JOIN recorded_lectures rl ON c.id = rl.class_id
      LEFT JOIN live_sessions ls ON c.id = ls.class_id
      WHERE c.id = $1
      GROUP BY c.id, u.username, u.full_name, u.email
    `;
    
    const result = await pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Class not found' 
      });
    }
    
    // Get enrolled students list
    const studentsQuery = `
      SELECT u.id, u.username, u.full_name, u.email, ce.enrolled_at
      FROM class_enrollments ce
      JOIN users u ON ce.student_id = u.id
      WHERE ce.class_id = $1 AND ce.is_active = true
      ORDER BY ce.enrolled_at DESC
    `;
    
    const studentsResult = await pool.query(studentsQuery, [id]);
    
    const classData = {
      ...result.rows[0],
      students: studentsResult.rows
    };
    
    res.json({
      success: true,
      data: classData
    });
  } catch (err) {
    console.error('Get class by ID error:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
    });
  }
});

// Create class (Teachers and Admins only)
router.post('/', authenticateToken, authorizeRoles('teacher', 'admin'), async (req, res) => {
  try {
    const { name, description, subject, max_participants, scheduled_at, duration_minutes } = req.body;
    const teacher_id = req.user.id;
    const sharable_link = crypto.randomBytes(16).toString('hex');
    
    // Validation
    if (!name || !subject) {
      return res.status(400).json({ 
        success: false, 
        message: 'Name and subject are required' 
      });
    }
    
    const query = `
      INSERT INTO classes (
        name, description, subject, teacher_id, max_students, 
        scheduled_at, duration_minutes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7) 
      RETURNING *
    `;
    
    const values = [
      name, 
      description || null, 
      subject, 
      teacher_id, 
      max_participants || 100,
      scheduled_at || null,
      duration_minutes || 60
    ];
    
    const result = await pool.query(query, values);
    
    // Get the created class with teacher info
    const classWithTeacher = await pool.query(`
      SELECT c.*, u.username as teacher_name, u.full_name as teacher_full_name
      FROM classes c
      JOIN users u ON c.teacher_id = u.id
      WHERE c.id = $1
    `, [result.rows[0].id]);
    
    res.status(201).json({
      success: true,
      message: 'Class created successfully',
      data: classWithTeacher.rows[0]
    });
  } catch (err) {
    console.error('Create class error:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
    });
  }
});

// Update class (Teachers can update their own classes, Admins can update any)
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, subject, max_participants, is_active, scheduled_at, duration_minutes } = req.body;
    
    // Check if user can update this class
    const classCheck = await pool.query('SELECT teacher_id FROM classes WHERE id = $1', [id]);
    if (classCheck.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Class not found' });
    }
    
    const isTeacher = classCheck.rows[0].teacher_id === req.user.id;
    const isAdmin = req.user.role === 'admin';
    
    if (!isTeacher && !isAdmin) {
      return res.status(403).json({ 
        success: false, 
        message: 'Not authorized to update this class' 
      });
    }
    
    const query = `
      UPDATE classes SET 
        name = COALESCE($1, name),
        description = COALESCE($2, description),
        subject = COALESCE($3, subject),
        max_students = COALESCE($4, max_students),
        scheduled_at = COALESCE($6, scheduled_at),
        duration_minutes = COALESCE($7, duration_minutes),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $8
      RETURNING *
    `;
    
    const values = [name, description, subject, max_participants, is_active, scheduled_at, duration_minutes, id];
    const result = await pool.query(query, values);
    
    res.json({
      success: true,
      message: 'Class updated successfully',
      data: result.rows[0]
    });
  } catch (err) {
    console.error('Update class error:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
    });
  }
});

// Delete class (Teachers can delete their own classes, Admins can delete any)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if user can delete this class
    const classCheck = await pool.query('SELECT teacher_id FROM classes WHERE id = $1', [id]);
    if (classCheck.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Class not found' });
    }
    
    const isTeacher = classCheck.rows[0].teacher_id === req.user.id;
    const isAdmin = req.user.role === 'admin';
    
    if (!isTeacher && !isAdmin) {
      return res.status(403).json({ 
        success: false, 
        message: 'Not authorized to delete this class' 
      });
    }
    
    await pool.query('DELETE FROM classes WHERE id = $1', [id]);
    
    res.json({
      success: true,
      message: 'Class deleted successfully'
    });
  } catch (err) {
    console.error('Delete class error:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
    });
  }
});

// Enroll in class (Students only)
router.post('/:id/enroll', authenticateToken, authorizeRoles('student'), async (req, res) => {
  try {
    const { id } = req.params;
    const student_id = req.user.id;
    
    // Check if class exists
    const classCheck = await pool.query('SELECT * FROM classes WHERE id = $1', [id]);
    if (classCheck.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Class not found' 
      });
    }
    
    // Check if already enrolled
    const enrollmentCheck = await pool.query(
      'SELECT * FROM class_enrollments WHERE class_id = $1 AND student_id = $2',
      [id, student_id]
    );
    
    if (enrollmentCheck.rows.length > 0) {
      if (enrollmentCheck.rows[0].is_active) {
        return res.status(400).json({ 
          success: false, 
          message: 'Already enrolled in this class' 
        });
      } else {
        // Reactivate enrollment
        await pool.query(
          'UPDATE class_enrollments SET is_active = true, enrolled_at = CURRENT_TIMESTAMP WHERE class_id = $1 AND student_id = $2',
          [id, student_id]
        );
      }
    } else {
      // Create new enrollment
      await pool.query(
        'INSERT INTO class_enrollments (class_id, student_id) VALUES ($1, $2)',
        [id, student_id]
      );
    }
    
    res.json({
      success: true,
      message: 'Successfully enrolled in class'
    });
  } catch (err) {
    console.error('Enroll in class error:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
    });
  }
});

// Unenroll from class (Students only)
router.post('/:id/unenroll', authenticateToken, authorizeRoles('student'), async (req, res) => {
  try {
    const { id } = req.params;
    const student_id = req.user.id;
    
    const result = await pool.query(
      'UPDATE class_enrollments SET is_active = false WHERE class_id = $1 AND student_id = $2 AND is_active = true',
      [id, student_id]
    );
    
    if (result.rowCount === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Not enrolled in this class' 
      });
    }
    
    res.json({
      success: true,
      message: 'Successfully unenrolled from class'
    });
  } catch (err) {
    console.error('Unenroll from class error:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
    });
  }
});

// Get class by sharable link (for joining)
router.get('/join/:link', async (req, res) => {
  try {
    const { link } = req.params;
    
    const query = `
      SELECT 
        c.*, 
        u.username as teacher_name, u.full_name as teacher_full_name,
        COUNT(DISTINCT ce.student_id) as enrolled_students
      FROM classes c
      LEFT JOIN users u ON c.teacher_id = u.id
      LEFT JOIN class_enrollments ce ON c.id = ce.class_id AND ce.is_active = true
      WHERE c.sharable_link = $1 AND c.is_active = true
      GROUP BY c.id, u.username, u.full_name
    `;
    
    const result = await pool.query(query, [link]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Class not found or inactive' 
      });
    }
    
    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (err) {
    console.error('Get class by link error:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
    });
  }
});

// Get all students (for teachers and admins to add to classes)
router.get('/students/all', authenticateToken, authorizeRoles('teacher', 'admin'), async (req, res) => {
  try {
    const { search, limit = 50, offset = 0 } = req.query;
    
    let query = `
      SELECT id, username, full_name, email, created_at
      FROM users 
      WHERE role = 'student' AND is_active = true
    `;
    
    const params = [];
    let paramCount = 0;
    
    if (search) {
      paramCount++;
      query += ` AND (username ILIKE ${paramCount} OR full_name ILIKE ${paramCount} OR email ILIKE ${paramCount})`;
      params.push(`%${search}%`);
    }
    
    query += ` ORDER BY full_name ASC LIMIT ${paramCount + 1} OFFSET ${paramCount + 2}`;
    params.push(parseInt(limit), parseInt(offset));
    
    const result = await pool.query(query, params);
    
    res.json({
      success: true,
      data: {
        students: result.rows,
        total: result.rows.length,
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });
  } catch (err) {
    console.error('Get all students error:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
    });
  }
});

// Add student to class (Teachers and Admins only)
router.post('/:id/add-student', authenticateToken, authorizeRoles('teacher', 'admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { student_id } = req.body;
    
    if (!student_id) {
      return res.status(400).json({ 
        success: false, 
        message: 'Student ID is required' 
      });
    }
    
    // Check if user can add students to this class
    if (req.user.role === 'teacher') {
      const classCheck = await pool.query('SELECT teacher_id FROM classes WHERE id = $1', [id]);
      if (classCheck.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Class not found' });
      }
      
      if (classCheck.rows[0].teacher_id !== req.user.id) {
        return res.status(403).json({ 
          success: false, 
          message: 'Not authorized to add students to this class' 
        });
      }
    }
    
    // Check if student exists
    const studentCheck = await pool.query('SELECT id FROM users WHERE id = $1 AND role = $2', [student_id, 'student']);
    if (studentCheck.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Student not found' 
      });
    }
    
    // Check if already enrolled
    const enrollmentCheck = await pool.query(
      'SELECT * FROM class_enrollments WHERE class_id = $1 AND student_id = $2',
      [id, student_id]
    );
    
    if (enrollmentCheck.rows.length > 0) {
      if (enrollmentCheck.rows[0].is_active) {
        return res.status(400).json({ 
          success: false, 
          message: 'Student is already enrolled in this class' 
        });
      } else {
        // Reactivate enrollment
        await pool.query(
          'UPDATE class_enrollments SET is_active = true, enrolled_at = CURRENT_TIMESTAMP WHERE class_id = $1 AND student_id = $2',
          [id, student_id]
        );
      }
    } else {
      // Create new enrollment
      await pool.query(
        'INSERT INTO class_enrollments (class_id, student_id) VALUES ($1, $2)',
        [id, student_id]
      );
    }
    
    res.json({
      success: true,
      message: 'Student added to class successfully'
    });
  } catch (err) {
    console.error('Add student to class error:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
    });
  }
});

// Remove student from class (Teachers and Admins only)
router.post('/:id/remove-student', authenticateToken, authorizeRoles('teacher', 'admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { student_id } = req.body;
    
    if (!student_id) {
      return res.status(400).json({ 
        success: false, 
        message: 'Student ID is required' 
      });
    }
    
    // Check if user can remove students from this class
    if (req.user.role === 'teacher') {
      const classCheck = await pool.query('SELECT teacher_id FROM classes WHERE id = $1', [id]);
      if (classCheck.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Class not found' });
      }
      
      if (classCheck.rows[0].teacher_id !== req.user.id) {
        return res.status(403).json({ 
          success: false, 
          message: 'Not authorized to remove students from this class' 
        });
      }
    }
    
    const result = await pool.query(
      'UPDATE class_enrollments SET is_active = false WHERE class_id = $1 AND student_id = $2 AND is_active = true',
      [id, student_id]
    );
    
    if (result.rowCount === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Student is not enrolled in this class' 
      });
    }
    
    res.json({
      success: true,
      message: 'Student removed from class successfully'
    });
  } catch (err) {
    console.error('Remove student from class error:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
    });
  }
});

module.exports = router;
