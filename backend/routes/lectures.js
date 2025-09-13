const express = require('express');
const router = express.Router();
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const pool = require('../config/database');

// GET /api/lectures - Get all lectures (with optional search and filters)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { search, limit = 20, offset = 0, class_id } = req.query;
    
    let whereClause = `
      WHERE (
        rl.is_public = true 
        OR EXISTS (
          SELECT 1 FROM class_enrollments ce 
          WHERE ce.class_id = rl.class_id 
          AND ce.student_id = $1 
          AND ce.is_active = true
        )
        OR c.teacher_id = $1
      )
    `;
    
    const params = [userId];
    let paramCount = 1;
    
    // Add search filter
    if (search) {
      paramCount++;
      whereClause += ` AND (
        rl.title ILIKE $${paramCount} 
        OR rl.description ILIKE $${paramCount}
        OR u.username ILIKE $${paramCount}
        OR u.full_name ILIKE $${paramCount}
      )`;
      params.push(`%${search}%`);
    }
    
    // Add class filter
    if (class_id) {
      paramCount++;
      whereClause += ` AND rl.class_id = $${paramCount}`;
      params.push(class_id);
    }
    
    const lecturesQuery = `
      SELECT 
        rl.id,
        rl.title,
        rl.description,
        rl.video_url,
        rl.audio_url,
        rl.slides_url,
        rl.transcript,
        rl.ai_summary,
        rl.duration_seconds,
        rl.file_size_bytes,
        rl.recorded_at,
        rl.is_processed,
        rl.is_public,
        c.name as class_name,
        c.subject,
        u.username as teacher_name,
        u.full_name as teacher_full_name
      FROM recorded_lectures rl
      JOIN classes c ON rl.class_id = c.id
      JOIN users u ON c.teacher_id = u.id
      ${whereClause}
      AND rl.is_processed = true
      ORDER BY rl.recorded_at DESC
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;
    
    params.push(parseInt(limit), parseInt(offset));
    
    const result = await pool.query(lecturesQuery, params);
    
    // Format the response
    const lectures = result.rows.map(lecture => ({
      id: lecture.id,
      title: lecture.title,
      description: lecture.description,
      teacher: lecture.teacher_full_name || lecture.teacher_name,
      className: lecture.class_name,
      subject: lecture.subject,
      date: lecture.recorded_at,
      duration: lecture.duration_seconds ? `${Math.ceil(lecture.duration_seconds / 60)} min` : 'Unknown',
      durationSeconds: lecture.duration_seconds,
      transcript: lecture.transcript,
      summary: lecture.ai_summary,
      downloadUrl: lecture.video_url,
      audioUrl: lecture.audio_url,
      slidesUrl: lecture.slides_url,
      fileSize: lecture.file_size_bytes,
      isPublic: lecture.is_public,
      isProcessed: lecture.is_processed
    }));
    
    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(*) as total
      FROM recorded_lectures rl
      JOIN classes c ON rl.class_id = c.id
      JOIN users u ON c.teacher_id = u.id
      ${whereClause}
      AND rl.is_processed = true
    `;
    
    const countResult = await pool.query(countQuery, params.slice(0, -2)); // Remove limit and offset
    const total = parseInt(countResult.rows[0].total);
    
    res.json({
      success: true,
      data: {
        lectures,
        pagination: {
          total,
          limit: parseInt(limit),
          offset: parseInt(offset),
          hasMore: (parseInt(offset) + parseInt(limit)) < total
        }
      }
    });
    
  } catch (error) {
    console.error('Lectures API error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch lectures',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// GET /api/lectures/:id - Get specific lecture details
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const lectureId = req.params.id;
    
    const lectureQuery = `
      SELECT 
        rl.*,
        c.name as class_name,
        c.subject,
        u.username as teacher_name,
        u.full_name as teacher_full_name,
        (
          rl.is_public = true 
          OR EXISTS (
            SELECT 1 FROM class_enrollments ce 
            WHERE ce.class_id = rl.class_id 
            AND ce.student_id = $1 
            AND ce.is_active = true
          )
          OR c.teacher_id = $1
        ) as has_access
      FROM recorded_lectures rl
      JOIN classes c ON rl.class_id = c.id
      JOIN users u ON c.teacher_id = u.id
      WHERE rl.id = $2
    `;
    
    const result = await pool.query(lectureQuery, [userId, lectureId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Lecture not found'
      });
    }
    
    const lecture = result.rows[0];
    
    if (!lecture.has_access) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You are not enrolled in this class.'
      });
    }
    
    // Format the response
    const formattedLecture = {
      id: lecture.id,
      title: lecture.title,
      description: lecture.description,
      teacher: lecture.teacher_full_name || lecture.teacher_name,
      className: lecture.class_name,
      subject: lecture.subject,
      date: lecture.recorded_at,
      duration: lecture.duration_seconds ? `${Math.ceil(lecture.duration_seconds / 60)} min` : 'Unknown',
      durationSeconds: lecture.duration_seconds,
      transcript: lecture.transcript,
      summary: lecture.ai_summary,
      downloadUrl: lecture.video_url,
      audioUrl: lecture.audio_url,
      slidesUrl: lecture.slides_url,
      fileSize: lecture.file_size_bytes,
      isPublic: lecture.is_public,
      isProcessed: lecture.is_processed
    };
    
    res.json({
      success: true,
      data: formattedLecture
    });
    
  } catch (error) {
    console.error('Lecture details API error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch lecture details',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// GET /api/lectures/:id/download - Download lecture video
router.get('/:id/download', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const lectureId = req.params.id;
    
    // Check access permissions
    const accessQuery = `
      SELECT 
        rl.video_url,
        rl.title,
        (
          rl.is_public = true 
          OR EXISTS (
            SELECT 1 FROM class_enrollments ce 
            WHERE ce.class_id = rl.class_id 
            AND ce.student_id = $1 
            AND ce.is_active = true
          )
          OR c.teacher_id = $1
        ) as has_access
      FROM recorded_lectures rl
      JOIN classes c ON rl.class_id = c.id
      WHERE rl.id = $2
    `;
    
    const result = await pool.query(accessQuery, [userId, lectureId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Lecture not found'
      });
    }
    
    const lecture = result.rows[0];
    
    if (!lecture.has_access) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    
    // In a real implementation, you would serve the file from storage
    // For now, return the download URL
    res.json({
      success: true,
      data: {
        downloadUrl: lecture.video_url,
        title: lecture.title
      }
    });
    
  } catch (error) {
    console.error('Lecture download API error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process download request',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// ======== TEACHER/ADMIN MANAGEMENT ENDPOINTS ========

// POST /api/lectures - Create new lecture (Teachers/Admins only)
router.post('/', authenticateToken, authorizeRoles('teacher', 'admin'), async (req, res) => {
  try {
    const teacherId = req.user.id;
    const {
      class_id,
      title,
      description,
      video_url,
      audio_url,
      slides_url,
      transcript,
      ai_summary,
      duration_seconds,
      file_size_bytes,
      is_public = false
    } = req.body;

    // Validation
    if (!class_id || !title) {
      return res.status(400).json({
        success: false,
        message: 'Class ID and title are required'
      });
    }

    // Check if teacher owns the class or is admin
    if (req.user.role !== 'admin') {
      const classCheck = await pool.query(
        'SELECT teacher_id FROM classes WHERE id = $1',
        [class_id]
      );
      
      if (classCheck.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Class not found'
        });
      }
      
      if (classCheck.rows[0].teacher_id !== teacherId) {
        return res.status(403).json({
          success: false,
          message: 'You can only add lectures to your own classes'
        });
      }
    }

    const insertQuery = `
      INSERT INTO recorded_lectures (
        class_id, title, description, video_url, audio_url, slides_url,
        transcript, ai_summary, duration_seconds, file_size_bytes, 
        is_public, is_processed
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, true)
      RETURNING *
    `;

    const result = await pool.query(insertQuery, [
      class_id, title, description, video_url, audio_url, slides_url,
      transcript, ai_summary, duration_seconds, file_size_bytes, is_public
    ]);

    res.status(201).json({
      success: true,
      message: 'Lecture created successfully',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Create lecture error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create lecture',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// PUT /api/lectures/:id - Update lecture (Teachers/Admins only)
router.put('/:id', authenticateToken, authorizeRoles('teacher', 'admin'), async (req, res) => {
  try {
    const lectureId = req.params.id;
    const teacherId = req.user.id;
    const {
      title,
      description,
      video_url,
      audio_url,
      slides_url,
      transcript,
      ai_summary,
      duration_seconds,
      file_size_bytes,
      is_public
    } = req.body;

    // Check if teacher owns the lecture or is admin
    if (req.user.role !== 'admin') {
      const ownershipCheck = await pool.query(`
        SELECT rl.id 
        FROM recorded_lectures rl
        JOIN classes c ON rl.class_id = c.id
        WHERE rl.id = $1 AND c.teacher_id = $2
      `, [lectureId, teacherId]);
      
      if (ownershipCheck.rows.length === 0) {
        return res.status(403).json({
          success: false,
          message: 'You can only edit your own lectures'
        });
      }
    }

    const updateQuery = `
      UPDATE recorded_lectures 
      SET title = COALESCE($1, title),
          description = COALESCE($2, description),
          video_url = COALESCE($3, video_url),
          audio_url = COALESCE($4, audio_url),
          slides_url = COALESCE($5, slides_url),
          transcript = COALESCE($6, transcript),
          ai_summary = COALESCE($7, ai_summary),
          duration_seconds = COALESCE($8, duration_seconds),
          file_size_bytes = COALESCE($9, file_size_bytes),
          is_public = COALESCE($10, is_public),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $11
      RETURNING *
    `;

    const result = await pool.query(updateQuery, [
      title, description, video_url, audio_url, slides_url,
      transcript, ai_summary, duration_seconds, file_size_bytes, 
      is_public, lectureId
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Lecture not found'
      });
    }

    res.json({
      success: true,
      message: 'Lecture updated successfully',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Update lecture error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update lecture',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// DELETE /api/lectures/:id - Delete lecture (Teachers/Admins only)
router.delete('/:id', authenticateToken, authorizeRoles('teacher', 'admin'), async (req, res) => {
  try {
    const lectureId = req.params.id;
    const teacherId = req.user.id;

    // Check if teacher owns the lecture or is admin
    if (req.user.role !== 'admin') {
      const ownershipCheck = await pool.query(`
        SELECT rl.id 
        FROM recorded_lectures rl
        JOIN classes c ON rl.class_id = c.id
        WHERE rl.id = $1 AND c.teacher_id = $2
      `, [lectureId, teacherId]);
      
      if (ownershipCheck.rows.length === 0) {
        return res.status(403).json({
          success: false,
          message: 'You can only delete your own lectures'
        });
      }
    }

    const result = await pool.query(
      'DELETE FROM recorded_lectures WHERE id = $1 RETURNING id, title',
      [lectureId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Lecture not found'
      });
    }

    res.json({
      success: true,
      message: 'Lecture deleted successfully',
      data: { id: result.rows[0].id, title: result.rows[0].title }
    });

  } catch (error) {
    console.error('Delete lecture error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete lecture',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// GET /api/lectures/my-lectures - Get teacher's own lectures
router.get('/my-lectures', authenticateToken, authorizeRoles('teacher', 'admin'), async (req, res) => {
  try {
    const teacherId = req.user.id;
    
    const lecturesQuery = `
      SELECT 
        rl.*,
        c.name as class_name,
        c.subject,
        (SELECT COUNT(*) FROM class_enrollments WHERE class_id = c.id AND is_active = true) as enrolled_students
      FROM recorded_lectures rl
      JOIN classes c ON rl.class_id = c.id
      WHERE c.teacher_id = $1
      ORDER BY rl.created_at DESC
    `;
    
    const result = await pool.query(lecturesQuery, [teacherId]);
    
    res.json({
      success: true,
      data: {
        lectures: result.rows.map(lecture => ({
          ...lecture,
          duration: lecture.duration_seconds ? `${Math.ceil(lecture.duration_seconds / 60)} min` : 'Unknown'
        }))
      }
    });

  } catch (error) {
    console.error('My lectures API error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch your lectures',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// GET /api/lectures/search - Search lectures (alternative endpoint)
router.get('/search', authenticateToken, async (req, res) => {
  // Redirect to main lectures endpoint with search
  req.url = `/?${new URLSearchParams(req.query).toString()}`;
  return router.handle(req, res);
});

module.exports = router;
