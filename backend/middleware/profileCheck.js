const jwt = require('jsonwebtoken');
const pool = require('../config/database');

// Middleware to check profile completion and redirect if needed
const checkProfileCompletion = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'No token provided',
        redirectTo: '/login'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId;

    // Get user details including role
    const userResult = await pool.query(
      'SELECT id, username, email, role, profile_complete FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({ 
        success: false, 
        message: 'User not found',
        redirectTo: '/login'
      });
    }

    const user = userResult.rows[0];
    req.user = user;

    // Check if profile is already marked as complete
    if (user.profile_complete) {
      return next();
    }

    // Check actual profile completion based on role
    let profileComplete = false;
    
    if (user.role === 'student') {
      const studentProfileResult = await pool.query(
        'SELECT id FROM student_profiles WHERE user_id = $1',
        [userId]
      );
      profileComplete = studentProfileResult.rows.length > 0;
      
      if (!profileComplete) {
        return res.status(200).json({
          success: true,
          profileIncomplete: true,
          redirectTo: '/complete-student-profile',
          message: 'Please complete your student profile'
        });
      }
    } else if (user.role === 'teacher') {
      const teacherProfileResult = await pool.query(
        'SELECT id FROM teacher_profiles WHERE user_id = $1',
        [userId]
      );
      profileComplete = teacherProfileResult.rows.length > 0;
      
      if (!profileComplete) {
        return res.status(200).json({
          success: true,
          profileIncomplete: true,
          redirectTo: '/complete-teacher-profile',
          message: 'Please complete your teacher profile'
        });
      }
    }

    // Update profile_complete flag if profile is actually complete
    if (profileComplete && !user.profile_complete) {
      await pool.query(
        'UPDATE users SET profile_complete = true WHERE id = $1',
        [userId]
      );
      req.user.profile_complete = true;
    }

    next();
  } catch (error) {
    console.error('Profile completion check error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Server error during profile check' 
    });
  }
};

module.exports = { checkProfileCompletion };