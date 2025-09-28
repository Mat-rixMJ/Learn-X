const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

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
}
      `, [userId]);

      if (profileQuery.rows.length > 0) {
        profileComplete = true;
        profileData = profileQuery.rows[0];
      }
    } else if (userRole === 'teacher') {
      const profileQuery = await pool.query(`
        SELECT tp.*, u.profile_complete
        FROM teacher_profiles tp
        JOIN users u ON tp.user_id = u.id
        WHERE tp.user_id = $1
      `, [userId]);

      if (profileQuery.rows.length > 0) {
        profileComplete = true;
        profileData = profileQuery.rows[0];
      }
    }

    res.json({
      success: true,
      data: {
        profileComplete,
        profileData,
        userRole
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

// Get subjects for a specific class
router.get('/subjects/:classNumber', authenticateToken, async (req, res) => {
  try {
    const { classNumber } = req.params;

    const subjectsQuery = await pool.query(`
      SELECT * FROM class_subjects 
      WHERE class_number = $1 
      ORDER BY is_core DESC, subject_name ASC
    `, [parseInt(classNumber)]);

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

// Complete student profile
router.post('/student/complete', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      student_class,
      roll_number,
      section,
      parent_name,
      parent_phone,
      parent_email,
      address,
      date_of_birth,
      emergency_contact,
      selected_subjects
    } = req.body;

    // Validate required fields
    if (!student_class || !roll_number) {
      return res.status(400).json({
        success: false,
        message: 'Class and roll number are required'
      });
    }

    // Start transaction
    const client = await pool.connect();
    await client.query('BEGIN');

    try {
      // Insert student profile
      const profileQuery = await client.query(`
        INSERT INTO student_profiles (
          user_id, student_class, roll_number, section, parent_name, 
          parent_phone, parent_email, address, date_of_birth, emergency_contact
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (student_class, roll_number, section, academic_year) 
        DO UPDATE SET
          user_id = EXCLUDED.user_id,
          parent_name = EXCLUDED.parent_name,
          parent_phone = EXCLUDED.parent_phone,
          parent_email = EXCLUDED.parent_email,
          address = EXCLUDED.address,
          date_of_birth = EXCLUDED.date_of_birth,
          emergency_contact = EXCLUDED.emergency_contact,
          updated_at = NOW()
        RETURNING id
      `, [
        userId, student_class, roll_number, section || 'A', 
        parent_name, parent_phone, parent_email, address, 
        date_of_birth, emergency_contact
      ]);

      // Enroll student in selected subjects (or all core subjects if none selected)
      let subjectsToEnroll = selected_subjects;
      if (!subjectsToEnroll || subjectsToEnroll.length === 0) {
        // Get all core subjects for the class
        const coreSubjectsQuery = await client.query(`
          SELECT subject_name FROM class_subjects 
          WHERE class_number = $1 AND is_core = true
        `, [student_class]);
        subjectsToEnroll = coreSubjectsQuery.rows.map(row => row.subject_name);
      }

      // Insert subject enrollments
      for (const subject of subjectsToEnroll) {
        await client.query(`
          INSERT INTO student_subject_enrollments (student_id, class_number, subject_name)
          VALUES ($1, $2, $3)
          ON CONFLICT (student_id, subject_name, academic_year) 
          DO UPDATE SET is_active = true, enrollment_date = NOW()
        `, [userId, student_class, subject]);
      }

      // Mark user profile as complete
      await client.query(`
        UPDATE users SET profile_complete = true, updated_at = NOW() 
        WHERE id = $1
      `, [userId]);

      await client.query('COMMIT');

      res.json({
        success: true,
        message: 'Student profile completed successfully',
        data: { profileId: profileQuery.rows[0].id }
      });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Error completing student profile:', error);
    if (error.code === '23505') { // Unique constraint violation
      res.status(400).json({
        success: false,
        message: 'A student with this roll number already exists in this class'
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to complete student profile'
      });
    }
  }
});

// Complete teacher profile
router.post('/teacher/complete', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      employee_id,
      department,
      qualification,
      experience_years,
      phone,
      emergency_contact,
      address,
      date_of_joining,
      specialization,
      class_assignments // Array of { class_number, section, subject_name, is_class_teacher }
    } = req.body;

    // Validate required fields
    if (!employee_id || !class_assignments || class_assignments.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Employee ID and class assignments are required'
      });
    }

    // Start transaction
    const client = await pool.connect();
    await client.query('BEGIN');

    try {
      // Insert teacher profile
      const profileQuery = await client.query(`
        INSERT INTO teacher_profiles (
          user_id, employee_id, department, qualification, experience_years,
          phone, emergency_contact, address, date_of_joining, specialization
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (employee_id) 
        DO UPDATE SET
          user_id = EXCLUDED.user_id,
          department = EXCLUDED.department,
          qualification = EXCLUDED.qualification,
          experience_years = EXCLUDED.experience_years,
          phone = EXCLUDED.phone,
          emergency_contact = EXCLUDED.emergency_contact,
          address = EXCLUDED.address,
          date_of_joining = EXCLUDED.date_of_joining,
          specialization = EXCLUDED.specialization,
          updated_at = NOW()
        RETURNING id
      `, [
        userId, employee_id, department, qualification, experience_years || 0,
        phone, emergency_contact, address, date_of_joining, specialization
      ]);

      // Clear existing class assignments
      await client.query('DELETE FROM teacher_class_assignments WHERE teacher_id = $1', [userId]);

      // Insert new class assignments
      for (const assignment of class_assignments) {
        await client.query(`
          INSERT INTO teacher_class_assignments (
            teacher_id, class_number, section, subject_name, is_class_teacher
          ) VALUES ($1, $2, $3, $4, $5)
        `, [
          userId, 
          assignment.class_number, 
          assignment.section || 'A', 
          assignment.subject_name,
          assignment.is_class_teacher || false
        ]);
      }

      // Mark user profile as complete
      await client.query(`
        UPDATE users SET profile_complete = true, updated_at = NOW() 
        WHERE id = $1
      `, [userId]);

      await client.query('COMMIT');

      res.json({
        success: true,
        message: 'Teacher profile completed successfully',
        data: { profileId: profileQuery.rows[0].id }
      });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Error completing teacher profile:', error);
    if (error.code === '23505') { // Unique constraint violation
      res.status(400).json({
        success: false,
        message: 'A teacher with this employee ID already exists'
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to complete teacher profile'
      });
    }
  }
});

// Get teacher's class assignments
router.get('/teacher/assignments', authenticateToken, async (req, res) => {
  try {
    const teacherId = req.user.id;

    const assignmentsQuery = await pool.query(`
      SELECT 
        tca.*,
        COUNT(sp.id) as student_count
      FROM teacher_class_assignments tca
      LEFT JOIN student_profiles sp ON sp.student_class = tca.class_number
      WHERE tca.teacher_id = $1
      GROUP BY tca.id, tca.class_number, tca.section, tca.subject_name, tca.is_class_teacher
      ORDER BY tca.class_number, tca.section, tca.subject_name
    `, [teacherId]);

    res.json({
      success: true,
      data: assignmentsQuery.rows
    });
  } catch (error) {
    console.error('Error fetching teacher assignments:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch teacher assignments'
    });
  }
});

// Get student's enrolled subjects
router.get('/student/subjects', authenticateToken, async (req, res) => {
  try {
    const studentId = req.user.id;

    const subjectsQuery = await pool.query(`
      SELECT 
        sse.*,
        cs.is_core,
        cs.is_optional,
        u.full_name as teacher_name
      FROM student_subject_enrollments sse
      JOIN class_subjects cs ON sse.subject_name = cs.subject_name AND sse.class_number = cs.class_number
      LEFT JOIN users u ON sse.teacher_id = u.id
      WHERE sse.student_id = $1 AND sse.is_active = true
      ORDER BY cs.is_core DESC, sse.subject_name
    `, [studentId]);

    res.json({
      success: true,
      data: subjectsQuery.rows
    });
  } catch (error) {
    console.error('Error fetching student subjects:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch student subjects'
    });
  }
});

module.exports = router;