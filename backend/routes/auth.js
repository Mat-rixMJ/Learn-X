const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');

const jwtSecret = process.env.JWT_SECRET || 'your_jwt_secret';

// Register user
router.post('/register', async (req, res) => {
  const { username, email, fullName, password, role } = req.body;
  
  // Validation
  if (!username || !password || !role) {
    return res.status(400).json({ 
      success: false,
      message: 'Please provide username, password, and role' 
    });
  }

  if (!email) {
    return res.status(400).json({ 
      success: false,
      message: 'Please provide email address' 
    });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const result = await pool.query(
      'INSERT INTO users (username, email, full_name, password_hash, role, is_active) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, username, email, full_name, role',
      [username, email, fullName || username, hashedPassword, role, true]
    );
    
    res.status(201).json({ 
      success: true,
      message: 'Account created successfully',
      user: result.rows[0] 
    });
  } catch (err) {
    console.error('Registration error:', err);
    
    if (err.code === '23505') { // unique_violation
      // Check which field caused the conflict
      if (err.constraint && err.constraint.includes('username')) {
        res.status(409).json({ 
          success: false,
          message: 'Username already exists' 
        });
      } else if (err.constraint && err.constraint.includes('email')) {
        res.status(409).json({ 
          success: false,
          message: 'Email address already exists' 
        });
      } else {
        res.status(409).json({ 
          success: false,
          message: 'User already exists' 
        });
      }
    } else {
      res.status(500).json({ 
        success: false,
        message: 'Server error',
        error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
      });
    }
  }
});

// Login user
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ 
      success: false,
      message: 'Please provide username and password' 
    });
  }
  
  try {
    const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    
    if (result.rows.length === 0) {
      return res.status(401).json({ 
        success: false,
        message: 'Invalid credentials' 
      });
    }
    
    const user = result.rows[0];
    
    if (!user.is_active) {
      return res.status(401).json({ 
        success: false,
        message: 'Account is deactivated. Please contact support.' 
      });
    }
    
    const isMatch = await bcrypt.compare(password, user.password_hash);
    
    if (!isMatch) {
      return res.status(401).json({ 
        success: false,
        message: 'Invalid credentials' 
      });
    }
    
    const token = jwt.sign(
      { 
        id: user.id, 
        username: user.username,
        email: user.email,
        role: user.role 
      }, 
      jwtSecret, 
      { expiresIn: '1d' }
    );
    
    res.json({ 
      success: true,
      message: 'Login successful',
      token, 
      user: { 
        id: user.id, 
        username: user.username, 
        email: user.email,
        fullName: user.full_name,
        role: user.role 
      } 
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ 
      success: false,
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
    });
  }
});

module.exports = router;
