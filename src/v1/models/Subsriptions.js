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

    // ---------------------------------------------------------
    // BASE PRICES (fallback)
    // ---------------------------------------------------------
    PRICING: {
        freemium: { one_time: 5.00 },
        premium: { one_time: 10.00 }
    },

    // ---------------------------------------------------------
    // DIFFERENT PRICES DEPENDING ON START TIER
    // ---------------------------------------------------------
    UPGRADE_PRICING: {
        free: {
        freemium: 5.00,
        premium: 12.50
        },
        freemium: {
        premium: 10.00
        },
        premium: {}
    },

    // ---------------------------------------------------------
    // Allowed upgrade paths
    // ---------------------------------------------------------
    UPGRADE_PATHS: {
        free: ['freemium', 'premium'],
        freemium: ['premium'],
        premium: [],
    },

    // ---------------------------------------------------------
    // Features per tier
    // ---------------------------------------------------------
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

    // ---------------------------------------------------------
    // Weather providers per tier
    // ---------------------------------------------------------
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

    // ---------------------------------------------------------
    // Create subscription
    // ---------------------------------------------------------
    async createSubscription(userId, tier, paymentMethod, options = {}) {
        const { paymentType = this.PAYMENT_TYPES.ONE_TIME } = options;

        const subscriptionId = generateUUID();
        const createdAt = new Date().toISOString();

        // Lifetime = 100 years
        let expiresAt = new Date();
        expiresAt.setFullYear(expiresAt.getFullYear() + 100);
        expiresAt = expiresAt.toISOString();

        // Base price
        let originalPrice = this.PRICING[tier]?.one_time || 0;

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

    // ---------------------------------------------------------
    // Get latest subscription
    // ---------------------------------------------------------
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

    // ---------------------------------------------------------
    // Update subscription
    // ---------------------------------------------------------
    async updateSubscription(subscriptionId, tier, options = {}) {
        const { paymentType = this.PAYMENT_TYPES.ONE_TIME } = options;

        let expiresAt = new Date();
        expiresAt.setFullYear(expiresAt.getFullYear() + 100);
        expiresAt = expiresAt.toISOString();

        let originalPrice = this.PRICING[tier]?.one_time || 0;

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

    // ---------------------------------------------------------
    // Feature access
    // ---------------------------------------------------------
    async checkFeatureAccess(userId, feature) {
        const subscription = await this.getSubscription(userId);
        const tier = subscription?.tier || this.TIERS.FREE;

        const features = this.FEATURES[tier];
        if (!features) return false;

        switch (feature) {
        case 'push_notifications': return features.pushNotifications;
        case 'map_layers': return features.mapLayers;
        case 'data_export': return features.dataExport;
        case 'multiple_sources': return features.dataSourcesCount > 1;
        default: return false;
        }
    },

    // ---------------------------------------------------------
    // Upgrade logic
    // ---------------------------------------------------------
    getAvailableUpgrades(currentTier) {
        return this.UPGRADE_PATHS[currentTier] || [];
    },

    canUpgrade(fromTier, toTier) {
        return this.getAvailableUpgrades(fromTier).includes(toTier);
    },

    // ---------------------------------------------------------
    // Credit calculation (for time-based subs)
    // ---------------------------------------------------------
    async calculateUpgradeCredit(subscription, targetTier) {
        if (!subscription) {
        return {
            available: false,
            creditAmount: 0,
            description: 'No existing subscription',
        };
        }

        if (subscription.payment_type === this.PAYMENT_TYPES.ONE_TIME) {
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

        const creditAmount = (remainingDays / totalDays) * subscription.original_price;

        return {
        available: true,
        creditAmount: Math.round(creditAmount * 100) / 100,
        remainingDays: Math.floor(remainingDays),
        originalPrice: subscription.original_price,
        description: `Credit for ${Math.floor(remainingDays)} days remaining`,
        };
    },

    // ---------------------------------------------------------
    // Max history days
    // ---------------------------------------------------------
    async getMaxHistoryDays(userId) {
        const subscription = await this.getSubscription(userId);
        const tier = subscription?.tier || this.TIERS.FREE;

        return this.FEATURES[tier]?.maxHistoryDays || this.FEATURES.free.maxHistoryDays;
    },

    // ---------------------------------------------------------
    // FINAL: Upgrade pricing with different prices per start tier
    // ---------------------------------------------------------
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

        // 1. Price depending on START tier
        const basePrice =
        this.UPGRADE_PRICING[currentTier]?.[targetTier] ??
        this.PRICING[targetTier]?.one_time ??
        0;

        // 2. Credit (if subscription is time-based)
        const credit = await this.calculateUpgradeCredit(currentSubscription, targetTier);

        // 3. Final price
        const finalPrice = Math.max(
        0,
        basePrice - (credit.available ? credit.creditAmount : 0)
        );

        return {
        valid: true,
        currentTier,
        targetTier,
        basePrice,
        credit,
        finalPrice: Math.round(finalPrice * 100) / 100,
        };
    },
};

module.exports = Subscription;