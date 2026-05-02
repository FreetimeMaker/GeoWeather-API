const pool = require('../config/database');
const { generateUUID } = require('../utils/helpers');

const PushNotificationService = {
  async sendWeatherAlert(userId, latitude, longitude, alertType, message) {
    try {
      const query = `
        INSERT INTO push_notifications (
          id, user_id, title, message, event_type, latitude, longitude, created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *;
      `;

const notificationId = generateUUID();

      const result = await pool.query(query, [
        notificationId,
        userId,
        this.getTitleForAlertType(alertType),
        message,
        alertType,
        latitude,
        longitude,
        new Date(),
      ]);

      // TODO: Integration mit Firebase Cloud Messaging oder anderen Push-Diensten
      await this.deliverPushNotification(userId, result.rows[0]);

      return result.rows[0];
    } catch (error) {
      console.error('Push Notification Error:', error);
      throw error;
    }
  },

  getTitleForAlertType(alertType) {
    const titles = {
      storm: '⚡ Unwetter-Warnung',
      heat: '🔥 Hitzewelle',
      cold: '❄️ Kältewarnung',
      rain: '🌧️ Starkregen',
      wind: '💨 Sturmwarnung',
      snow: '❄️ Schneefall',
    };
    return titles[alertType] || 'Wetter-Warnung';
  },

  async deliverPushNotification(userId, notification) {
    // Integration mit Firebase Cloud Messaging
    // oder anderen Push-Notification-Services
    if (process.env.PUSH_NOTIFICATION_SERVICE === 'firebase') {
      // TODO: Firebase Admin SDK Integration
      // admin.messaging().send({
      //   notification: { title: notification.title, body: notification.message },
      //   topic: `user_${userId}`
      // });
    }
  },

  async getUserNotifications(userId, unreadOnly = false) {
    let query = 'SELECT * FROM push_notifications WHERE user_id = $1';

    if (unreadOnly) {
      query += ' AND read = false';
    }

    query += ' ORDER BY created_at DESC LIMIT 50';

    const result = await pool.query(query, [userId]);
    return result.rows;
  },

  async markAsRead(notificationId, userId) {
    const query = `
      UPDATE push_notifications 
      SET read = true 
      WHERE id = $1 AND user_id = $2 
      RETURNING *;
    `;

    const result = await pool.query(query, [notificationId, userId]);
    return result.rows[0];
  },
};

module.exports = PushNotificationService;
