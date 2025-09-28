const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const NotificationService = require('../services/notificationService');

// Initialize notification service
const notificationService = new NotificationService();

// Get user notifications
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    
    const notifications = await notificationService.getUserNotifications(
      req.user.id, 
      parseInt(limit), 
      parseInt(offset)
    );
    
    const unreadCount = await notificationService.getUnreadCount(req.user.id);
    
    res.json({
      success: true,
      data: {
        notifications,
        unreadCount,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          offset: parseInt(offset)
        }
      }
    });
    
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notifications'
    });
  }
});

// Get unread notification count
router.get('/unread-count', authenticateToken, async (req, res) => {
  try {
    const count = await notificationService.getUnreadCount(req.user.id);
    
    res.json({
      success: true,
      data: { count }
    });
    
  } catch (error) {
    console.error('Error fetching unread count:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch unread count'
    });
  }
});

// Mark notification as read
router.put('/:id/read', authenticateToken, async (req, res) => {
  try {
    await notificationService.markAsRead(req.params.id, req.user.id);
    
    res.json({
      success: true,
      message: 'Notification marked as read'
    });
    
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark notification as read'
    });
  }
});

// Mark all notifications as read
router.put('/mark-all-read', authenticateToken, async (req, res) => {
  try {
    await notificationService.markAllAsRead(req.user.id);
    
    res.json({
      success: true,
      message: 'All notifications marked as read'
    });
    
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark all notifications as read'
    });
  }
});

// Send test notification (for testing purposes)
router.post('/test', authenticateToken, async (req, res) => {
  try {
    const { title, message, type = 'test' } = req.body;
    
    await notificationService.sendImmediateNotification(
      req.user.id,
      title || 'Test Notification',
      message || 'This is a test notification from Learn-X system.',
      type,
      { test: true, timestamp: new Date().toISOString() }
    );
    
    res.json({
      success: true,
      message: 'Test notification sent successfully'
    });
    
  } catch (error) {
    console.error('Error sending test notification:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send test notification'
    });
  }
});

// Get today's schedule (for debugging notification timing)
router.get('/debug/schedule', authenticateToken, async (req, res) => {
  try {
    const schedule = await notificationService.getTodaySchedule();
    
    res.json({
      success: true,
      data: {
        date: new Date().toISOString().split('T')[0],
        schedule,
        currentTime: new Date().toISOString(),
        notificationTimes: ['45 minutes before', '5 minutes before']
      }
    });
    
  } catch (error) {
    console.error('Error fetching debug schedule:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch debug schedule'
    });
  }
});

// Get notification statistics by type
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const { Pool } = require('pg');
    const pool = new Pool({
      user: process.env.DB_USER,
      host: process.env.DB_HOST,
      database: process.env.DB_NAME,
      password: process.env.DB_PASSWORD,
      port: process.env.DB_PORT,
    });

    const stats = await pool.query(`
      SELECT 
        type,
        COUNT(*) as total_count,
        COUNT(CASE WHEN is_read = false THEN 1 END) as unread_count,
        COUNT(CASE WHEN created_at > NOW() - INTERVAL '24 hours' THEN 1 END) as last_24h_count
      FROM notifications
      WHERE user_id = $1
      GROUP BY type
      ORDER BY total_count DESC
    `, [req.user.id]);

    const totalStats = await pool.query(`
      SELECT 
        COUNT(*) as total_notifications,
        COUNT(CASE WHEN is_read = false THEN 1 END) as total_unread,
        COUNT(CASE WHEN created_at > NOW() - INTERVAL '1 hour' THEN 1 END) as last_hour_count
      FROM notifications
      WHERE user_id = $1
    `, [req.user.id]);

    await pool.end();

    res.json({
      success: true,
      data: {
        byType: stats.rows,
        totals: totalStats.rows[0],
        notificationIntervals: [
          { type: 'early_reminder', minutes: 45, description: 'Early class reminder' },
          { type: 'final_reminder', minutes: 5, description: 'Final urgent reminder' }
        ]
      }
    });
    
  } catch (error) {
    console.error('Error fetching notification stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notification statistics'
    });
  }
});

// Trigger immediate class notifications (admin only)
router.post('/trigger-class/:scheduleId', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin or teacher
    if (!['admin', 'teacher'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions'
      });
    }
    
    const { scheduleId } = req.params;
    
    // Get class info
    const { Pool } = require('pg');
    const pool = new Pool({
      user: process.env.DB_USER,
      host: process.env.DB_HOST,
      database: process.env.DB_NAME,
      password: process.env.DB_PASSWORD,
      port: process.env.DB_PORT,
    });
    
    const classInfo = await pool.query(`
      SELECT 
        ds.id as schedule_id,
        ds.class_id,
        ds.teacher_id,
        ds.time_slot_id,
        c.name as class_name,
        c.subject,
        u.full_name as teacher_name,
        ts.start_time,
        ts.end_time,
        ts.description as time_slot_description
      FROM daily_schedules ds
      JOIN classes c ON ds.class_id = c.id
      JOIN users u ON ds.teacher_id = u.id
      JOIN time_slots ts ON ds.time_slot_id = ts.id
      WHERE ds.id = $1
    `, [scheduleId]);
    
    if (classInfo.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Schedule not found'
      });
    }
    
    await notificationService.sendClassNotifications(classInfo.rows[0]);
    
    res.json({
      success: true,
      message: 'Class notifications triggered successfully'
    });
    
  } catch (error) {
    console.error('Error triggering class notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to trigger class notifications'
    });
  }
});

module.exports = router;