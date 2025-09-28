const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const crypto = require('crypto');

// Get all classes
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM classes');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Create class
router.post('/', async (req, res) => {
  const { name, teacher_id } = req.body;
  const sharable_link = crypto.randomBytes(16).toString('hex');
  try {
    const result = await pool.query(
      'INSERT INTO classes (name, teacher_id, sharable_link) VALUES ($1, $2, $3) RETURNING *',
      [name, teacher_id, sharable_link]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get class by sharable link
router.get('/join/:link', async (req, res) => {
  const { link } = req.params;
  try {
    const result = await pool.query('SELECT * FROM classes WHERE sharable_link = $1', [link]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Class not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
