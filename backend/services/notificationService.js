const { Pool } = require('pg');
const cron = require('node-cron');

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

class NotificationService {
  constructor() {
    this.notifications = new Map();
    this.startScheduler();
  }

  // Start the notification scheduler
  startScheduler() {
    console.log('📢 Starting notification scheduler...');
    
    // Check every minute for upcoming classes
    cron.schedule('* * * * *', async () => {
      await this.checkUpcomingClasses();
    });

    console.log('✅ Notification scheduler started');
  }

  // Check for classes starting in 45 minutes and 5 minutes
  async checkUpcomingClasses() {
    try {
      const now = new Date();
      
      // Check for classes starting in 45 minutes
      await this.checkClassesAtInterval(45, 'early_reminder');
      
      // Check for classes starting in 5 minutes
      await this.checkClassesAtInterval(5, 'final_reminder');

    } catch (error) {
      console.error('Error checking upcoming classes:', error);
    }
  }

  // Check for classes at a specific time interval
  async checkClassesAtInterval(minutesBefore, notificationType) {
    try {
      const now = new Date();
      const notificationTime = new Date(now.getTime() + minutesBefore * 60 * 1000);
      
      // Get today's date
      const today = now.toISOString().split('T')[0];
      
      // Find classes that start at the specified time
      const upcomingClasses = await pool.query(`
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
        WHERE ds.schedule_date = $1
          AND ts.start_time IS NOT NULL
          AND EXTRACT(HOUR FROM ts.start_time) = $2
          AND EXTRACT(MINUTE FROM ts.start_time) = $3
      `, [today, notificationTime.getHours(), notificationTime.getMinutes()]);

      for (const classInfo of upcomingClasses.rows) {
        await this.sendClassNotifications(classInfo, notificationType, minutesBefore);
      }

    } catch (error) {
      console.error(`Error checking classes at ${minutesBefore} minute interval:`, error);
    }
  }

  // Send notifications to all students in a class
  async sendClassNotifications(classInfo, notificationType = 'early_reminder', minutesBefore = 45) {
    try {
      const notificationKey = `${classInfo.schedule_id}-${notificationType}-${new Date().toDateString()}`;
      
      // Prevent duplicate notifications
      if (this.notifications.has(notificationKey)) {
        return;
      }

      // Get all enrolled students
      const students = await pool.query(`
        SELECT 
          u.id,
          u.full_name,
          u.email,
          u.username
        FROM class_enrollments ce
        JOIN users u ON ce.student_id = u.id
        WHERE ce.class_id = $1 AND ce.is_active = true
      `, [classInfo.class_id]);

      console.log(`📢 Sending ${notificationType} notifications for ${classInfo.class_name} starting at ${classInfo.start_time}`);
      console.log(`👥 Notifying ${students.rows.length} students (${minutesBefore} minutes before)`);

      // Customize notification content based on timing
      const notificationContent = this.getNotificationContent(classInfo, notificationType, minutesBefore);

      // Create notification records
      for (const student of students.rows) {
        await this.createNotification({
          userId: student.id,
          title: notificationContent.title,
          message: notificationContent.message,
          type: notificationContent.type,
          classId: classInfo.class_id,
          scheduleId: classInfo.schedule_id,
          metadata: {
            teacher_name: classInfo.teacher_name,
            class_name: classInfo.class_name,
            subject: classInfo.subject,
            start_time: classInfo.start_time,
            time_slot_description: classInfo.time_slot_description,
            notification_type: notificationType,
            minutes_before: minutesBefore
          }
        });
      }

      // Mark as notified
      this.notifications.set(notificationKey, true);

      console.log(`✅ ${notificationType} notifications sent for ${classInfo.class_name}`);

    } catch (error) {
      console.error('Error sending class notifications:', error);
    }
  }

  // Get notification content based on timing
  getNotificationContent(classInfo, notificationType, minutesBefore) {
    const formattedTime = this.formatTime(classInfo.start_time);
    
    switch (notificationType) {
      case 'early_reminder':
        return {
          title: `📚 Class Starting Soon!`,
          message: `Your ${classInfo.subject} class "${classInfo.class_name}" with ${classInfo.teacher_name} starts in ${minutesBefore} minutes at ${formattedTime}. Time to prepare! 📖`,
          type: 'class_early_reminder'
        };
      
      case 'final_reminder':
        return {
          title: `🚨 Class Starting NOW!`,
          message: `⏰ URGENT: Your ${classInfo.subject} class "${classInfo.class_name}" with ${classInfo.teacher_name} starts in ${minutesBefore} minutes at ${formattedTime}. Please join now! 🏃‍♂️`,
          type: 'class_final_reminder'
        };
      
      default:
        return {
          title: `📚 Class Reminder`,
          message: `Your ${classInfo.subject} class "${classInfo.class_name}" with ${classInfo.teacher_name} starts in ${minutesBefore} minutes at ${formattedTime}.`,
          type: 'class_reminder'
        };
    }
  }

  // Create a notification record in database
  async createNotification(notificationData) {
    try {
      await pool.query(`
        INSERT INTO notifications (
          user_id, title, message, type, class_id, schedule_id, 
          metadata, is_read, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, false, NOW())
      `, [
        notificationData.userId,
        notificationData.title,
        notificationData.message,
        notificationData.type,
        notificationData.classId,
        notificationData.scheduleId,
        JSON.stringify(notificationData.metadata)
      ]);
    } catch (error) {
      // If notifications table doesn't exist, create it
      if (error.code === '42P01') {
        await this.createNotificationsTable();
        // Retry the insert
        await pool.query(`
          INSERT INTO notifications (
            user_id, title, message, type, class_id, schedule_id, 
            metadata, is_read, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, false, NOW())
        `, [
          notificationData.userId,
          notificationData.title,
          notificationData.message,
          notificationData.type,
          notificationData.classId,
          notificationData.scheduleId,
          JSON.stringify(notificationData.metadata)
        ]);
      } else {
        throw error;
      }
    }
  }

  // Create notifications table if it doesn't exist
  async createNotificationsTable() {
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS notifications (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          title VARCHAR(255) NOT NULL,
          message TEXT NOT NULL,
          type VARCHAR(50) NOT NULL DEFAULT 'general',
          class_id UUID REFERENCES classes(id) ON DELETE SET NULL,
          schedule_id UUID REFERENCES daily_schedules(id) ON DELETE SET NULL,
          metadata JSONB,
          is_read BOOLEAN DEFAULT false,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          read_at TIMESTAMP WITH TIME ZONE,
          INDEX idx_notifications_user_id (user_id),
          INDEX idx_notifications_created_at (created_at),
          INDEX idx_notifications_type (type),
          INDEX idx_notifications_is_read (is_read)
        )
      `);
      console.log('✅ Notifications table created');
    } catch (error) {
      console.error('Error creating notifications table:', error);
    }
  }

  // Get notifications for a user
  async getUserNotifications(userId, limit = 20, offset = 0) {
    try {
      const result = await pool.query(`
        SELECT 
          n.*,
          c.name as class_name,
          c.subject
        FROM notifications n
        LEFT JOIN classes c ON n.class_id = c.id
        WHERE n.user_id = $1
        ORDER BY n.created_at DESC
        LIMIT $2 OFFSET $3
      `, [userId, limit, offset]);

      return result.rows;
    } catch (error) {
      console.error('Error getting user notifications:', error);
      return [];
    }
  }

  // Mark notification as read
  async markAsRead(notificationId, userId) {
    try {
      await pool.query(`
        UPDATE notifications 
        SET is_read = true, read_at = NOW()
        WHERE id = $1 AND user_id = $2
      `, [notificationId, userId]);
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }

  // Mark all notifications as read for a user
  async markAllAsRead(userId) {
    try {
      await pool.query(`
        UPDATE notifications 
        SET is_read = true, read_at = NOW()
        WHERE user_id = $1 AND is_read = false
      `, [userId]);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  }

  // Get unread notification count
  async getUnreadCount(userId) {
    try {
      const result = await pool.query(`
        SELECT COUNT(*) as count
        FROM notifications
        WHERE user_id = $1 AND is_read = false
      `, [userId]);

      return parseInt(result.rows[0].count);
    } catch (error) {
      console.error('Error getting unread count:', error);
      return 0;
    }
  }

  // Send immediate notification (for testing or manual triggers)
  async sendImmediateNotification(userId, title, message, type = 'general', metadata = {}) {
    try {
      await this.createNotification({
        userId,
        title,
        message,
        type,
        classId: null,
        scheduleId: null,
        metadata
      });
      console.log(`📢 Immediate notification sent to user ${userId}`);
    } catch (error) {
      console.error('Error sending immediate notification:', error);
    }
  }

  // Format time for display
  formatTime(timeString) {
    if (!timeString) return 'Unknown Time';
    
    try {
      // Handle different time formats
      let time;
      if (timeString.includes(':')) {
        const [hours, minutes] = timeString.split(':');
        time = new Date();
        time.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      } else {
        time = new Date(timeString);
      }
      
      return time.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    } catch (error) {
      return timeString;
    }
  }

  // Clean up old notifications (run weekly)
  async cleanupOldNotifications() {
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      
      const result = await pool.query(`
        DELETE FROM notifications 
        WHERE created_at < $1
      `, [thirtyDaysAgo]);

      console.log(`🧹 Cleaned up ${result.rowCount} old notifications`);
    } catch (error) {
      console.error('Error cleaning up old notifications:', error);
    }
  }

  // Get today's class schedule for debugging
  async getTodaySchedule() {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const result = await pool.query(`
        SELECT 
          ds.*,
          c.name as class_name,
          c.subject,
          u.full_name as teacher_name,
          ts.start_time,
          ts.end_time,
          ts.description as time_slot_description,
          COUNT(ce.student_id) as student_count
        FROM daily_schedules ds
        JOIN classes c ON ds.class_id = c.id
        JOIN users u ON ds.teacher_id = u.id
        JOIN time_slots ts ON ds.time_slot_id = ts.id
        LEFT JOIN class_enrollments ce ON c.id = ce.class_id AND ce.is_active = true
        WHERE ds.schedule_date = $1
        GROUP BY ds.id, c.name, c.subject, u.full_name, ts.start_time, ts.end_time, ts.description
        ORDER BY ts.start_time
      `, [today]);

      return result.rows;
    } catch (error) {
      console.error('Error getting today schedule:', error);
      return [];
    }
  }
}

// Start cleanup job weekly
cron.schedule('0 0 * * 0', async () => {
  const service = new NotificationService();
  await service.cleanupOldNotifications();
});

module.exports = NotificationService;