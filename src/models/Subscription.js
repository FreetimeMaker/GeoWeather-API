const pool = require('../config/database');
const { v4: uuidv4 } = require('uuid');

const Subscription = {
  TIERS: {
    FREE: 'free',
    PREMIUM: 'premium',
  },

  PRICING: {
    premium: {
      monthly: 9.99,
      yearly: 99.99,
    },
  },

  FEATURES: {
    free: {
      maxFavorites: 5,
      maxHistoryDays: 3,
      dataSourcesCount: 1,
      pushNotifications: false,
      mapLayers: false,
      dataExport: false,
    },
    premium: {
      maxFavorites: 999,
      maxHistoryDays: 7,
      dataSourcesCount: 3,
      pushNotifications: true,
      mapLayers: true,
      dataExport: true,
    },
  },

  async createSubscription(userId, tier, paymentMethod) {
    const subscriptionId = uuidv4();
    const createdAt = new Date();
    const expiresAt = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + 1);

    const query = `
      INSERT INTO subscriptions (
        id, user_id, tier, payment_method, created_at, expires_at, is_active
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *;
    `;

    const result = await pool.query(query, [
      subscriptionId,
      userId,
      tier,
      paymentMethod,
      createdAt,
      expiresAt,
      tier !== this.TIERS.FREE,
    ]);

    // Update user's subscription tier
    await pool.query(
      'UPDATE users SET subscription_tier = $1, updated_at = NOW() WHERE id = $2',
      [tier, userId]
    );

    return result.rows[0];
  },

  async getSubscription(userId) {
    const query = 'SELECT * FROM subscriptions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1';
    const result = await pool.query(query, [userId]);
    return result.rows[0];
  },

  async updateSubscription(subscriptionId, tier) {
    const expiresAt = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + 1);

    const query = `
      UPDATE subscriptions 
      SET tier = $2, expires_at = $3, is_active = true
      WHERE id = $1
      RETURNING *;
    `;

    const result = await pool.query(query, [subscriptionId, tier, expiresAt]);
    return result.rows[0];
  },

  async checkFeatureAccess(userId, feature) {
    const subscription = await this.getSubscription(userId);
    const tier = subscription?.tier || this.TIERS.FREE;

    if (!this.FEATURES[tier]) {
      return false;
    }

    const features = this.FEATURES[tier];

    switch (feature) {
      case 'push_notifications':
        return features.pushNotifications;
      case 'map_layers':
        return features.mapLayers;
      case 'data_export':
        return features.dataExport;
      case 'multiple_sources':
        return features.dataSourcesCount > 1;
      default:
        return false;
    }
  },
};

module.exports = Subscription;
