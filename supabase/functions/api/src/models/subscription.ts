// ---------------------------------------------------------
// Subscription Model (Deno + Supabase Edge Functions)
// ---------------------------------------------------------

export const SubscriptionModel = {
  // -------------------------------------------------------
  // CONSTANTS
  // -------------------------------------------------------
  TIERS: {
    FREE: "free",
    FREEMIUM: "freemium",
    PREMIUM: "premium"
  },

  PAYMENT_TYPES: {
    ONE_TIME: "one_time"
  },

  PRICING: {
    freemium: { one_time: 5.0 },
    premium: { one_time: 10.0 }
  },

  UPGRADE_PRICING: {
    free: {
      freemium: 5.0,
      premium: 12.5
    },
    freemium: {
      premium: 10.0
    },
    premium: {}
  },

  UPGRADE_PATHS: {
    free: ["freemium", "premium"],
    freemium: ["premium"],
    premium: []
  },

  FEATURES: {
    free: {
      maxLocations: 5,
      maxHistoryDays: 3,
      dataSourcesCount: 1,
      pushNotifications: false,
      mapLayers: false,
      dataExport: true
    },
    freemium: {
      maxLocations: 10,
      maxHistoryDays: 5,
      dataSourcesCount: 2,
      pushNotifications: true,
      mapLayers: false,
      dataExport: true
    },
    premium: {
      maxLocations: 15,
      maxHistoryDays: 7,
      dataSourcesCount: 4,
      pushNotifications: true,
      mapLayers: true,
      dataExport: true
    }
  },

  PROVIDERS_BY_TIER: {
    free: ["openmeteo"],
    freemium: ["openmeteo", "openweather"],
    premium: ["openmeteo", "openweather", "weatherapi", "qweather"]
  },

  getAvailableProviders(tier: string) {
    return this.PROVIDERS_BY_TIER[tier] ?? this.PROVIDERS_BY_TIER.free;
  },

  // -------------------------------------------------------
  // USER TIER
  // -------------------------------------------------------
  async getUserTier(db: any, userId: string) {
    const sub = await this.getSubscription(db, userId);
    return sub?.tier ?? this.TIERS.FREE;
  },

  async getAvailableWeatherProviders(db: any, userId: string) {
    const tier = await this.getUserTier(db, userId);
    return this.getAvailableProviders(tier);
  },

  async validateRequestedSources(db: any, userId: string, requestedSources: string[]) {
    const tier = await this.getUserTier(db, userId);
    const available = await this.getAvailableWeatherProviders(db, userId);

    const valid = requestedSources.filter((s) =>
      available.includes(s.toLowerCase())
    );

    if (valid.length === 0) {
      throw new Error(
        `No valid providers for your tier (${tier}). Available: ${available.join(", ")}. Requested: ${requestedSources.join(", ")}`
      );
    }

    return valid;
  },

  // -------------------------------------------------------
  // CREATE SUBSCRIPTION
  // -------------------------------------------------------
  async createSubscription(db: any, userId: string, tier: string, paymentMethod: string, options = {}) {
    const { paymentType = this.PAYMENT_TYPES.ONE_TIME } = options;

    const now = new Date().toISOString();
    const id = crypto.randomUUID();

    // Lifetime = 100 years
    const expires = new Date();
    expires.setFullYear(expires.getFullYear() + 100);

    const originalPrice = this.PRICING[tier]?.one_time ?? 0;

    const { data, error } = await db
      .from("subscriptions")
      .insert({
        id,
        user_id: userId,
        tier,
        payment_method: paymentMethod,
        payment_type: paymentType,
        original_price: originalPrice,
        created_at: now,
        expires_at: expires.toISOString(),
        is_active: tier !== this.TIERS.FREE
      })
      .select()
      .single();

    if (error) throw error;

    // Update user tier
    const { error: userErr } = await db
      .from("users")
      .update({
        subscription_tier: tier,
        updated_at: now
      })
      .eq("id", userId);

    if (userErr) throw userErr;

    return data;
  },

  // -------------------------------------------------------
  // GET SUBSCRIPTION
  // -------------------------------------------------------
  async getSubscription(db: any, userId: string) {
    const { data, error } = await db
      .from("subscriptions")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== "PGRST116") throw error;
    return data ?? null;
  },

  // -------------------------------------------------------
  // UPDATE SUBSCRIPTION
  // -------------------------------------------------------
  async updateSubscription(db: any, subscriptionId: string, tier: string, options = {}) {
    const { paymentType = this.PAYMENT_TYPES.ONE_TIME } = options;

    const expires = new Date();
    expires.setFullYear(expires.getFullYear() + 100);

    const originalPrice = this.PRICING[tier]?.one_time ?? 0;

    const { data, error } = await db
      .from("subscriptions")
      .update({
        tier,
        payment_type: paymentType,
        original_price: originalPrice,
        expires_at: expires.toISOString(),
        is_active: true
      })
      .eq("id", subscriptionId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // -------------------------------------------------------
  // FEATURE ACCESS
  // -------------------------------------------------------
  async checkFeatureAccess(db: any, userId: string, feature: string) {
    const sub = await this.getSubscription(db, userId);
    const tier = sub?.tier ?? this.TIERS.FREE;

    const f = this.FEATURES[tier];
    if (!f) return false;

    switch (feature) {
      case "push_notifications": return f.pushNotifications;
      case "map_layers": return f.mapLayers;
      case "data_export": return f.dataExport;
      case "multiple_sources": return f.dataSourcesCount > 1;
      default: return false;
    }
  },

  // -------------------------------------------------------
  // UPGRADE LOGIC
  // -------------------------------------------------------
  getAvailableUpgrades(currentTier: string) {
    return this.UPGRADE_PATHS[currentTier] ?? [];
  },

  canUpgrade(fromTier: string, toTier: string) {
    return this.getAvailableUpgrades(fromTier).includes(toTier);
  },

  // -------------------------------------------------------
  // CREDIT CALCULATION
  // -------------------------------------------------------
  async calculateUpgradeCredit(subscription: any, targetTier: string) {
    if (!subscription) {
      return {
        available: false,
        creditAmount: 0,
        description: "No existing subscription"
      };
    }

    if (subscription.payment_type === this.PAYMENT_TYPES.ONE_TIME) {
      return {
        available: false,
        creditAmount: 0,
        description: "One-time lifetime purchase - no credit available"
      };
    }

    const now = new Date();
    const expires = new Date(subscription.expires_at);
    const created = new Date(subscription.created_at);

    const totalDays = (expires.getTime() - created.getTime()) / 86400000;
    const remainingDays = (expires.getTime() - now.getTime()) / 86400000;

    if (remainingDays <= 0 || totalDays <= 0) {
      return {
        available: false,
        creditAmount: 0,
        description: "Subscription already expired"
      };
    }

    const creditAmount = (remainingDays / totalDays) * subscription.original_price;

    return {
      available: true,
      creditAmount: Math.round(creditAmount * 100) / 100,
      remainingDays: Math.floor(remainingDays),
      originalPrice: subscription.original_price,
      description: `Credit for ${Math.floor(remainingDays)} days remaining`
    };
  },

  // -------------------------------------------------------
  // MAX HISTORY DAYS
  // -------------------------------------------------------
  async getMaxHistoryDays(db: any, userId: string) {
    const sub = await this.getSubscription(db, userId);
    const tier = sub?.tier ?? this.TIERS.FREE;

    return this.FEATURES[tier]?.maxHistoryDays ?? this.FEATURES.free.maxHistoryDays;
  },

  // -------------------------------------------------------
  // FINAL: UPGRADE PRICING
  // -------------------------------------------------------
  async getUpgradePricing(db: any, userId: string, targetTier: string) {
    const current = await this.getSubscription(db, userId);
    const currentTier = current?.tier ?? this.TIERS.FREE;

    if (!this.canUpgrade(currentTier, targetTier)) {
      return {
        valid: false,
        message: `Cannot upgrade from ${currentTier} to ${targetTier}`,
        currentTier,
        targetTier
      };
    }

    const basePrice =
      this.UPGRADE_PRICING[currentTier]?.[targetTier] ??
      this.PRICING[targetTier]?.one_time ??
      0;

    const credit = await this.calculateUpgradeCredit(current, targetTier);

    const finalPrice = Math.max(0, basePrice - (credit.available ? credit.creditAmount : 0));

    return {
      valid: true,
      currentTier,
      targetTier,
      basePrice,
      credit,
      finalPrice: Math.round(finalPrice * 100) / 100
    };
  }
};
