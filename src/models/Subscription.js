const pool = require('../config/database');
const { v4: uuidv4 } = require('uuid');

const Subscription = {
  TIERS: {
    FREE: 'free',
    PREMIUM: 'premium',
  },

  // ONE-TIME payment types (no recurring)
  PAYMENT_TYPES: {
    ONE_TIME: 'one_time',
  },

  // One-time lifetime pricing (NO monthly/yearly)
  PRICING: {
    premium: {
      one_time: 199.99,
    },
  },

  // Define valid upgrade paths: from -> [allowed upgrades to]
  UPGRADE_PATHS: {
    free: ['premium'],
    premium: [], // Cannot upgrade from premium (top tier)
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

async createSubscription(userId, tier, paymentMethod, options = {}) {
    const { paymentType = this.PAYMENT_TYPES.ONE_TIME } = options;
    
    const subscriptionId = uuidv4();
    const createdAt = new Date();
    
    // One-time lifetime: set to 100 years (essentially permanent)
    let expiresAt = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + 100);

    // Get the price for one-time purchase
    let originalPrice = 0;
    if (this.PRICING[tier]) {
      originalPrice = this.PRICING[tier].one_time;
    }

    const query = `
      INSERT INTO subscriptions (
        id, user_id, tier, payment_method, payment_type,
        original_price, created_at, expires_at, is_active
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *;
    `;

    const result = await pool.query(query, [
      subscriptionId,
      userId,
      tier,
      paymentMethod,
      paymentType,
      originalPrice,
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

async updateSubscription(subscriptionId, tier, options = {}) {
    const { paymentType = this.PAYMENT_TYPES.ONE_TIME } = options;
    
    // One-time lifetime: set to 100 years (essentially permanent)
    let expiresAt = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + 100);

    // Get the price for one-time purchase
    let originalPrice = 0;
    if (this.PRICING[tier]) {
      originalPrice = this.PRICING[tier].one_time;
    }

    const query = `
      UPDATE subscriptions 
      SET tier = $2, payment_type = $3, original_price = $4,
          expires_at = $5, is_active = true
      WHERE id = $1
      RETURNING *;
    `;

    const result = await pool.query(query, [
      subscriptionId, 
      tier, 
      paymentType,
      originalPrice,
      expiresAt
    ]);
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

  /**
   * Get available upgrade paths for current tier
   * @param {string} currentTier - User's current subscription tier
   * @returns {string[]} Array of tiers user can upgrade to
   */
  getAvailableUpgrades(currentTier) {
    return this.UPGRADE_PATHS[currentTier] || [];
  },

  /**
   * Check if upgrade is valid (user can only upgrade to higher tier)
   * @param {string} fromTier - Current tier
   * @param {string} toTier - Target tier
   * @returns {boolean}
   */
  canUpgrade(fromTier, toTier) {
    const availableUpgrades = this.getAvailableUpgrades(fromTier);
    return availableUpgrades.includes(toTier);
  },

  /**
   * Calculate upgrade credit based on remaining subscription time
   * @param {object} subscription - Current subscription object
   * @param {string} targetTier - Target tier to upgrade to
   * @returns {object} Credit breakdown
   */
  async calculateUpgradeCredit(subscription, targetTier) {
    // If no existing subscription, no credit
    if (!subscription) {
      return {
        available: false,
        creditAmount: 0,
        description: 'No existing subscription',
      };
    }

    // Get pricing for current tier
    const currentTier = subscription.tier;
    const originalPrice = subscription.original_price || 0;
    const paymentType = subscription.payment_type;

    // For one-time purchases, no credit (already lifetime)
    if (paymentType === this.PAYMENT_TYPES.ONE_TIME) {
      return {
        available: false,
        creditAmount: 0,
        description: 'One-time lifetime purchase - no credit available',
      };
    }

    // Calculate remaining time value for subscriptions
    const now = new Date();
    const expiresAt = new Date(subscription.expires_at);
    const totalDays = (expiresAt - new Date(subscription.created_at)) / (1000 * 60 * 60 * 24);
    const remainingDays = (expiresAt - now) / (1000 * 60 * 60 * 24);

    // If already expired or no remaining days, no credit
    if (remainingDays <= 0 || totalDays <= 0) {
      return {
        available: false,
        creditAmount: 0,
        description: 'Subscription already expired',
      };
    }

    // Calculate credit as remaining proportion of original price
    const creditAmount = (remainingDays / totalDays) * originalPrice;

    return {
      available: true,
      creditAmount: Math.round(creditAmount * 100) / 100, // Round to 2 decimal places
      remainingDays: Math.floor(remainingDays),
      originalPrice,
      description: `Credit for ${Math.floor(remainingDays)} days remaining`,
    };
  },

/**
   * Get upgrade pricing including credit calculation (ONE-TIME only)
   * @param {string} userId - User ID
   * @param {string} targetTier - Target tier to upgrade to
   * @returns {object} Upgrade pricing details
   */
  async getUpgradePricing(userId, targetTier) {
    const currentSubscription = await this.getSubscription(userId);
    const currentTier = currentSubscription?.tier || this.TIERS.FREE;

    // Check if upgrade is valid
    if (!this.canUpgrade(currentTier, targetTier)) {
      return {
        valid: false,
        message: `Cannot upgrade from ${currentTier} to ${targetTier}`,
        currentTier,
        targetTier,
      };
    }

    // Calculate credit if applicable (only for existing one-time purchases)
    const credit = await this.calculateUpgradeCredit(currentSubscription, targetTier);

    // Get target tier one-time pricing
    const price = this.PRICING[targetTier]?.one_time || 0;

    // Calculate final price with credit applied
    const finalPrice = Math.max(0, price - (credit.available ? credit.creditAmount : 0));

    return {
      valid: true,
      currentTier,
      targetTier,
      credit,
      price,
      finalPrice: Math.round(finalPrice * 100) / 100,
    };
  },
};

module.exports = Subscription;
