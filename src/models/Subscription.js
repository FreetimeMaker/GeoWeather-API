const supabase = require('../config/database');
const { generateUUID } = require('../utils/helpers');

const Subscription = {
  TIERS: {
    FREE: 'free',
    FREEMIUM: 'freemium',
    PREMIUM: 'premium',
  },

  PAYMENT_TYPES: {
    ONE_TIME: 'one_time',
  },

  PRICING: {
    freemium: {
      one_time: 5.00,
    },
    premium: {
      one_time: 10.00,
    }
  },

  UPGRADE_PATHS: {
    free: ['freemium', 'premium'],
    freemium: ['premium'],
    premium: [],
  },

  FEATURES: {
    free: {
      maxLocations: 5,
      maxHistoryDays: 3,
      dataSourcesCount: 1,
      pushNotifications: false,
      mapLayers: false,
      dataExport: true,
    },
    freemium: {
      maxLocations: 10,
      maxHistoryDays: 5,
      dataSourcesCount: 2,
      pushNotifications: true,
      mapLayers: false,
      dataExport: true,
    },
    premium: {
      maxLocations: 15,
      maxHistoryDays: 7,
      dataSourcesCount: 4,
      pushNotifications: true,
      mapLayers: true,
      dataExport: true,
    },
  },

  PROVIDERS_BY_TIER: {
    free: ['openmeteo'],
    freemium: ['openmeteo', 'openweather'],
    premium: ['openmeteo', 'openweather', 'weatherapi', 'qweather'],
  },

  getAvailableProviders(tier) {
    return this.PROVIDERS_BY_TIER[tier] || this.PROVIDERS_BY_TIER.free;
  },

  async getUserTier(userId) {
    const subscription = await this.getSubscription(userId);
    return subscription?.tier || this.TIERS.FREE;
  },

  async getAvailableWeatherProviders(userId) {
    const tier = await this.getUserTier(userId);
    return this.getAvailableProviders(tier);
  },

  async validateRequestedSources(userId, requestedSources) {
    const tier = await this.getUserTier(userId);
    const available = await this.getAvailableWeatherProviders(userId);
    const validSources = requestedSources.filter(source => 
      available.includes(source.toLowerCase())
    );

    if (validSources.length === 0) {
      throw new Error(
        `No valid providers for your tier (${tier}). Available: ${available.join(', ')}. Requested: ${requestedSources.join(', ')}`
      );
    }

    return validSources;
  },

  async createSubscription(userId, tier, paymentMethod, options = {}) {
    const { paymentType = this.PAYMENT_TYPES.ONE_TIME } = options;
    
    const subscriptionId = generateUUID();
    const createdAt = new Date().toISOString();
    
    // One-time lifetime: set to 100 years
    let expiresAt = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + 100);
    expiresAt = expiresAt.toISOString();

    let originalPrice = 0;
    if (this.PRICING[tier]) {
      originalPrice = this.PRICING[tier].one_time;
    }

    const { data, error } = await supabase
      .from('subscriptions')
      .insert({
        id: subscriptionId,
        user_id: userId,
        tier,
        payment_method: paymentMethod,
        payment_type: paymentType,
        original_price: originalPrice,
        created_at: createdAt,
        expires_at: expiresAt,
        is_active: tier !== this.TIERS.FREE
      })
      .select()
      .single();

    if (error) throw error;

    // Update user tier
    const { error: userError } = await supabase
      .from('users')
      .update({ 
        subscription_tier: tier, 
        updated_at: new Date().toISOString() 
      })
      .eq('id', userId);

    if (userError) throw userError;

    return data;
  },

  async getSubscription(userId) {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  async updateSubscription(subscriptionId, tier, options = {}) {
    const { paymentType = this.PAYMENT_TYPES.ONE_TIME } = options;
    
    let expiresAt = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + 100);
    expiresAt = expiresAt.toISOString();

    let originalPrice = 0;
    if (this.PRICING[tier]) {
      originalPrice = this.PRICING[tier].one_time;
    }

    const { data, error } = await supabase
      .from('subscriptions')
      .update({ 
        tier, 
        payment_type: paymentType,
        original_price: originalPrice,
        expires_at: expiresAt,
        is_active: true 
      })
      .eq('id', subscriptionId)
      .select()
      .single();

    if (error) throw error;
    return data;
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

  getAvailableUpgrades(currentTier) {
    return this.UPGRADE_PATHS[currentTier] || [];
  },

  canUpgrade(fromTier, toTier) {
    const availableUpgrades = this.getAvailableUpgrades(fromTier);
    return availableUpgrades.includes(toTier);
  },

  async calculateUpgradeCredit(subscription, targetTier) {
    if (!subscription) {
      return {
        available: false,
        creditAmount: 0,
        description: 'No existing subscription',
      };
    }

    const currentTier = subscription.tier;
    const originalPrice = subscription.original_price || 0;
    const paymentType = subscription.payment_type;

    if (paymentType === this.PAYMENT_TYPES.ONE_TIME) {
      return {
        available: false,
        creditAmount: 0,
        description: 'One-time lifetime purchase - no credit available',
      };
    }

    const now = new Date();
    const expiresAt = new Date(subscription.expires_at);
    const createdAt = new Date(subscription.created_at);
    const totalDays = (expiresAt - createdAt) / (1000 * 60 * 60 * 24);
    const remainingDays = (expiresAt - now) / (1000 * 60 * 60 * 24);

    if (remainingDays <= 0 || totalDays <= 0) {
      return {
        available: false,
        creditAmount: 0,
        description: 'Subscription already expired',
      };
    }

    const creditAmount = (remainingDays / totalDays) * originalPrice;

    return {
      available: true,
      creditAmount: Math.round(creditAmount * 100) / 100,
      remainingDays: Math.floor(remainingDays),
      originalPrice,
      description: `Credit for ${Math.floor(remainingDays)} days remaining`,
    };
  },

  async getMaxHistoryDays(userId) {
    const subscription = await this.getSubscription(userId);
    const tier = subscription?.tier || this.TIERS.FREE;

    if (!this.FEATURES[tier]) {
      return this.FEATURES.free.maxHistoryDays;
    }

    return this.FEATURES[tier].maxHistoryDays;
  },

  async getUpgradePricing(userId, targetTier) {
    const currentSubscription = await this.getSubscription(userId);
    const currentTier = currentSubscription?.tier || this.TIERS.FREE;

    if (!this.canUpgrade(currentTier, targetTier)) {
      return {
        valid: false,
        message: `Cannot upgrade from ${currentTier} to ${targetTier}`,
        currentTier,
        targetTier,
      };
    }

    const credit = await this.calculateUpgradeCredit(currentSubscription, targetTier);

    const price = this.PRICING[targetTier]?.one_time || 0;

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

