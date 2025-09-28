const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

// Public route to get subjects for profile completion (no auth required)
router.get('/public/subjects', async (req, res) => {
  try {
    const subjectsQuery = await pool.query(`
      SELECT DISTINCT name 
      FROM subjects 
      ORDER BY name
    `);

    res.json({
      success: true,
      data: subjectsQuery.rows.map(row => row.name)
    });
  } catch (error) {
    console.error('Error fetching subjects:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch subjects'
    });
  }
});

// Get subjects for a specific class (no auth required)
router.get('/subjects/:classLevel', async (req, res) => {
  try {
    const { classLevel } = req.params;
    
    const subjectsQuery = await pool.query(`
      SELECT id, name, class_level, description, is_active,
        CASE 
          WHEN name IN ('English', 'Mathematics', 'Science') THEN true
          ELSE false
        END as is_core
      FROM subjects 
      WHERE class_level = $1 AND is_active = true
      ORDER BY name
    `, [parseInt(classLevel)]);

    const subjects = subjectsQuery.rows.map(row => ({
      id: row.id,
      subject_name: row.name,
      class_level: row.class_level,
      description: row.description,
      is_core: row.is_core
    }));

    res.json({
      success: true,
      data: subjects
    });
  } catch (error) {
    console.error('Error fetching subjects for class:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch subjects'
    });
  }
});

// Check if roll number is available for a class
router.post('/check-roll-number', authenticateToken, async (req, res) => {
  try {
    const { student_class, roll_number } = req.body;
    
    const existingQuery = await pool.query(`
      SELECT 1 FROM user_profiles 
      WHERE student_class = $1 AND roll_number = $2
    `, [student_class, roll_number]);

    const isAvailable = existingQuery.rows.length === 0;

    res.json({
      success: true,
      data: {
        available: isAvailable,
        message: isAvailable 
          ? 'Roll number is available' 
          : 'Roll number is already taken'
      }
    });
  } catch (error) {
    console.error('Error checking roll number:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check roll number'
    });
  }
});

// Get user profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const profileQuery = await pool.query(`
      SELECT 
        u.id, u.username, u.email, u.full_name, u.role, u.profile_complete,
        up.*
      FROM users u
      LEFT JOIN user_profiles up ON u.id = up.user_id
      WHERE u.id = $1
    `, [userId]);

    if (profileQuery.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const profile = profileQuery.rows[0];

    res.json({
      success: true,
      data: profile
    });
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch profile'
    });
  }
});

// Complete/Update user profile
router.post('/complete-profile', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    const profileData = req.body;

    // Validate required fields based on role
    if (userRole === 'student') {
      const { student_class, roll_number, parent_name, parent_phone } = profileData;
      if (!student_class || !roll_number || !parent_name || !parent_phone) {
        return res.status(400).json({
          success: false,
          message: 'Student class, roll number, parent name, and parent phone are required for students'
        });
      }
    } else if (userRole === 'teacher') {
      const { teaching_classes, teaching_subjects, qualification } = profileData;
      if (!teaching_classes || !teaching_subjects || !qualification || 
          teaching_classes.length === 0 || teaching_subjects.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Teaching classes, subjects, and qualification are required for teachers'
        });
      }
    }

    // Upsert profile
    const profileQuery = `
      INSERT INTO user_profiles (
        user_id, phone, address, date_of_birth, gender, emergency_contact, emergency_phone,
        student_class, roll_number, parent_name, parent_phone, previous_school,
        teaching_classes, teaching_subjects, qualification, experience_years, specialization,
        is_profile_complete, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, true, NOW()
      )
      ON CONFLICT (user_id) 
      DO UPDATE SET
        phone = EXCLUDED.phone,
        address = EXCLUDED.address,
        date_of_birth = EXCLUDED.date_of_birth,
        gender = EXCLUDED.gender,
        emergency_contact = EXCLUDED.emergency_contact,
        emergency_phone = EXCLUDED.emergency_phone,
        student_class = EXCLUDED.student_class,
        roll_number = EXCLUDED.roll_number,
        parent_name = EXCLUDED.parent_name,
        parent_phone = EXCLUDED.parent_phone,
        previous_school = EXCLUDED.previous_school,
        teaching_classes = EXCLUDED.teaching_classes,
        teaching_subjects = EXCLUDED.teaching_subjects,
        qualification = EXCLUDED.qualification,
        experience_years = EXCLUDED.experience_years,
        specialization = EXCLUDED.specialization,
        is_profile_complete = true,
        updated_at = NOW()
      RETURNING *
    `;

    const values = [
      userId,
      profileData.phone || null,
      profileData.address || null,
      profileData.date_of_birth || null,
      profileData.gender || null,
      profileData.emergency_contact || null,
      profileData.emergency_phone || null,
      // Student fields
      profileData.student_class || null,
      profileData.roll_number || null,
      profileData.parent_name || null,
      profileData.parent_phone || null,
      profileData.previous_school || null,
      // Teacher fields
      profileData.teaching_classes || null,
      profileData.teaching_subjects || null,
      profileData.qualification || null,
      profileData.experience_years || null,
      profileData.specialization || null
    ];

    const result = await pool.query(profileQuery, values);

    // Update users table profile_complete flag
    await pool.query(
      'UPDATE users SET profile_complete = true WHERE id = $1',
      [userId]
    );

    // If student, auto-enroll in classes based on their class level
    if (userRole === 'student' && profileData.student_class) {
      const classQuery = await pool.query(`
        SELECT id FROM classes 
        WHERE name ILIKE $1 OR name ILIKE $2 OR description ILIKE $3
      `, [
        `%Class ${profileData.student_class}%`,
        `%Grade ${profileData.student_class}%`,
        `%${profileData.student_class}%`
      ]);

      for (const classRow of classQuery.rows) {
        await pool.query(`
          INSERT INTO class_enrollments (class_id, student_id, is_active)
          VALUES ($1, $2, true)
          ON CONFLICT (class_id, student_id) DO UPDATE SET is_active = true
        `, [classRow.id, userId]);
      }
    }

    res.json({
      success: true,
      message: 'Profile completed successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error completing profile:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to complete profile'
    });
  }
});

// Get subjects by class level
router.get('/subjects/:classLevel', authenticateToken, async (req, res) => {
  try {
    const { classLevel } = req.params;

    const subjectsQuery = await pool.query(`
      SELECT id, name, description
      FROM subjects 
      WHERE class_level = $1 AND is_active = true
      ORDER BY name
    `, [parseInt(classLevel)]);

    res.json({
      success: true,
      data: subjectsQuery.rows
    });
  } catch (error) {
    console.error('Error fetching subjects:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch subjects'
    });
  }
});

// Get all subjects (for teachers who might teach multiple classes)
router.get('/subjects', authenticateToken, async (req, res) => {
  try {
    const subjectsQuery = await pool.query(`
      SELECT DISTINCT name
      FROM subjects 
      WHERE is_active = true
      ORDER BY name
    `);

    res.json({
      success: true,
      data: subjectsQuery.rows
    });
  } catch (error) {
    console.error('Error fetching all subjects:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch subjects'
    });
  }
});

// Check if roll number is unique in a class
router.post('/check-roll-number', authenticateToken, async (req, res) => {
  try {
    const { student_class, roll_number } = req.body;
    const userId = req.user.id;

    const existingQuery = await pool.query(`
      SELECT u.full_name 
      FROM user_profiles up
      JOIN users u ON up.user_id = u.id
      WHERE up.student_class = $1 AND up.roll_number = $2 AND up.user_id != $3
    `, [student_class, roll_number, userId]);

    if (existingQuery.rows.length > 0) {
      return res.json({
        success: false,
        message: `Roll number ${roll_number} is already taken by ${existingQuery.rows[0].full_name} in Class ${student_class}`,
        available: false
      });
    }

    res.json({
      success: true,
      message: 'Roll number is available',
      available: true
    });
  } catch (error) {
    console.error('Error checking roll number:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check roll number'
    });
  }
});

// Get profile completion status
router.get('/profile-status', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const statusQuery = await pool.query(`
      SELECT 
        u.profile_complete,
        up.is_profile_complete
      FROM users u
      LEFT JOIN user_profiles up ON u.id = up.user_id
      WHERE u.id = $1
    `, [userId]);

    const isComplete = statusQuery.rows[0]?.profile_complete || 
                      statusQuery.rows[0]?.is_profile_complete || 
                      false;

    res.json({
      success: true,
      data: {
        isProfileComplete: isComplete,
        requiresCompletion: !isComplete
      }
    });
  } catch (error) {
    console.error('Error checking profile status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check profile status'
    });
  }
});

module.exports = router;