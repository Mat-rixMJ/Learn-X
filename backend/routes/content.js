const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const pool = require('../config/database');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/content');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    const filename = `${uniqueSuffix}${extension}`;
    cb(null, filename);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow common educational file types
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain',
      'text/csv',
      'image/jpeg',
      'image/png',
      'image/gif',
      'video/mp4',
      'video/avi',
      'video/quicktime',
      'audio/mpeg',
      'audio/wav',
      'application/zip',
      'application/x-zip-compressed'
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${file.mimetype} is not allowed`), false);
    }
  }
});

// Get all content files for a teacher
router.get('/', authenticateToken, authorizeRoles('teacher', 'admin'), async (req, res) => {
  try {
    const teacherId = req.user.id;
    const { class_id, file_type, search } = req.query;

    let query = `
      SELECT 
        cf.*,
        c.name as class_name
      FROM content_files cf
      LEFT JOIN classes c ON cf.class_id = c.id
      WHERE cf.teacher_id = $1
    `;
    
    const params = [teacherId];
    let paramCount = 1;

    if (class_id) {
      paramCount++;
      query += ` AND cf.class_id = $${paramCount}`;
      params.push(class_id);
    }

    if (file_type) {
      paramCount++;
      query += ` AND cf.file_type = $${paramCount}`;
      params.push(file_type);
    }

    if (search) {
      paramCount++;
      query += ` AND (cf.filename ILIKE $${paramCount} OR cf.description ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }

    query += ` ORDER BY cf.uploaded_at DESC`;

    const result = await pool.query(query, params);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching content files:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch content files'
    });
  }
});

// Get shared content files for students
router.get('/shared', authenticateToken, authorizeRoles('student'), async (req, res) => {
  try {
    const studentId = req.user.id;
    const { class_id } = req.query;

    let query = `
      SELECT DISTINCT
        cf.*,
        c.name as class_name,
        u.full_name as teacher_name
      FROM content_files cf
      JOIN classes c ON cf.class_id = c.id
      JOIN class_enrollments ce ON c.id = ce.class_id
      JOIN users u ON cf.teacher_id = u.id
      WHERE ce.student_id = $1 
        AND ce.is_active = true 
        AND cf.is_shared = true
    `;
    
    const params = [studentId];
    let paramCount = 1;

    if (class_id) {
      paramCount++;
      query += ` AND cf.class_id = $${paramCount}`;
      params.push(class_id);
    }

    query += ` ORDER BY cf.uploaded_at DESC`;

    const result = await pool.query(query, params);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching shared content:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch shared content'
    });
  }
});

// Upload content file
router.post('/upload', authenticateToken, authorizeRoles('teacher', 'admin'), upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const teacherId = req.user.id;
    const { class_id, description, is_shared } = req.body;

    // If class_id provided, verify teacher owns the class
    if (class_id) {
      const classCheck = await pool.query(
        'SELECT id FROM classes WHERE id = $1 AND teacher_id = $2',
        [class_id, teacherId]
      );

      if (classCheck.rows.length === 0) {
        // Delete uploaded file if class verification fails
        await fs.unlink(req.file.path);
        return res.status(403).json({
          success: false,
          message: 'You can only upload content to your own classes'
        });
      }
    }

    const query = `
      INSERT INTO content_files (
        teacher_id, class_id, filename, original_filename, file_path,
        file_type, file_size, mime_type, description, is_shared
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;

    const fileExtension = path.extname(req.file.originalname).toLowerCase();
    const fileType = getFileTypeFromExtension(fileExtension);

    const values = [
      teacherId,
      class_id || null,
      req.file.filename,
      req.file.originalname,
      req.file.path,
      fileType,
      req.file.size,
      req.file.mimetype,
      description || null,
      is_shared === 'true' || is_shared === true
    ];

    const result = await pool.query(query, values);

    res.status(201).json({
      success: true,
      message: 'File uploaded successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    
    // Clean up uploaded file on error
    if (req.file) {
      try {
        await fs.unlink(req.file.path);
      } catch (unlinkError) {
        console.error('Error cleaning up file:', unlinkError);
      }
    }

    res.status(500).json({
      success: false,
      message: 'Failed to upload file'
    });
  }
});

// Download/view file
router.get('/:id/download', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Get file info
    const fileQuery = await pool.query(`
      SELECT cf.*, c.teacher_id as class_teacher_id
      FROM content_files cf
      LEFT JOIN classes c ON cf.class_id = c.id
      WHERE cf.id = $1
    `, [id]);

    if (fileQuery.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }

    const file = fileQuery.rows[0];

    // Check access permissions
    let hasAccess = false;

    if (userRole === 'admin') {
      hasAccess = true;
    } else if (userRole === 'teacher' && file.teacher_id === userId) {
      hasAccess = true;
    } else if (userRole === 'student' && file.is_shared) {
      // Check if student is enrolled in the class
      if (file.class_id) {
        const enrollmentCheck = await pool.query(`
          SELECT 1 FROM class_enrollments 
          WHERE class_id = $1 AND student_id = $2 AND is_active = true
        `, [file.class_id, userId]);
        
        hasAccess = enrollmentCheck.rows.length > 0;
      }
    }

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Check if file exists
    try {
      await fs.access(file.file_path);
    } catch (error) {
      return res.status(404).json({
        success: false,
        message: 'File not found on server'
      });
    }

    // Increment download count
    await pool.query(
      'UPDATE content_files SET download_count = download_count + 1 WHERE id = $1',
      [id]
    );

    // Send file
    res.download(file.file_path, file.original_filename);
  } catch (error) {
    console.error('Error downloading file:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to download file'
    });
  }
});

// Update file metadata
router.put('/:id', authenticateToken, authorizeRoles('teacher', 'admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const teacherId = req.user.id;
    const { description, is_shared } = req.body;

    // Verify file belongs to teacher
    const fileCheck = await pool.query(
      'SELECT id FROM content_files WHERE id = $1 AND teacher_id = $2',
      [id, teacherId]
    );

    if (fileCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'File not found or access denied'
      });
    }

    const query = `
      UPDATE content_files 
      SET description = $1, is_shared = $2, updated_at = NOW()
      WHERE id = $3
      RETURNING *
    `;

    const result = await pool.query(query, [description, is_shared, id]);

    res.json({
      success: true,
      message: 'File updated successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating file:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update file'
    });
  }
});

// Delete file
router.delete('/:id', authenticateToken, authorizeRoles('teacher', 'admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const teacherId = req.user.id;

    // Get file info
    const fileQuery = await pool.query(
      'SELECT file_path FROM content_files WHERE id = $1 AND teacher_id = $2',
      [id, teacherId]
    );

    if (fileQuery.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'File not found or access denied'
      });
    }

    const filePath = fileQuery.rows[0].file_path;

    // Delete from database
    await pool.query('DELETE FROM content_files WHERE id = $1', [id]);

    // Delete physical file
    try {
      await fs.unlink(filePath);
    } catch (error) {
      console.error('Error deleting physical file:', error);
      // Don't fail the request if physical file deletion fails
    }

    res.json({
      success: true,
      message: 'File deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting file:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete file'
    });
  }
});

// Helper function to determine file type from extension
function getFileTypeFromExtension(extension) {
  const typeMap = {
    '.pdf': 'document',
    '.doc': 'document',
    '.docx': 'document',
    '.xls': 'spreadsheet',
    '.xlsx': 'spreadsheet',
    '.ppt': 'presentation',
    '.pptx': 'presentation',
    '.txt': 'text',
    '.csv': 'data',
    '.jpg': 'image',
    '.jpeg': 'image',
    '.png': 'image',
    '.gif': 'image',
    '.mp4': 'video',
    '.avi': 'video',
    '.mov': 'video',
    '.mp3': 'audio',
    '.wav': 'audio',
    '.zip': 'archive'
  };
  
  return typeMap[extension] || 'other';
}

module.exports = router;