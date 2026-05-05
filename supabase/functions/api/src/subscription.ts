// ---------------------------------------------------------
// Subscription Config (wie in deinem Node-Projekt)
// ---------------------------------------------------------
export const TIERS = {
  FREE: "free",
  FREEMIUM: "freemium",
  PREMIUM: "premium"
};

export const FEATURES = {
  free: { maxLocations: 5, providers: ["open-meteo"] },
  freemium: { maxLocations: 10, providers: ["open-meteo", "weatherapi"] },
  premium: { maxLocations: 15, providers: ["open-meteo", "weatherapi", "openweather"] }
};

export function getAvailableProviders(tier: string) {
  return FEATURES[tier]?.providers ?? FEATURES.free.providers;
}

// ---------------------------------------------------------
// Helper: JSON Response
// ---------------------------------------------------------
function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

// ---------------------------------------------------------
// DB Helpers
// ---------------------------------------------------------
async function getSubscription(db: any, userId: string) {
  const { data } = await db
    .from("subscriptions")
    .select("*")
    .eq("user_id", userId)
    .single();

  return data;
}

async function createSubscription(db: any, userId: string, tier: string, paymentMethod: string) {
  const { data } = await db
    .from("subscriptions")
    .insert({
      id: crypto.randomUUID(),
      user_id: userId,
      tier,
      payment_method: paymentMethod,
      created_at: new Date().toISOString()
    })
    .select()
    .single();

  return data;
}

async function updateSubscription(db: any, id: string, tier: string) {
  const { data } = await db
    .from("subscriptions")
    .update({ tier })
    .eq("id", id)
    .select()
    .single();

  return data;
}

// ---------------------------------------------------------
// Controller
// ---------------------------------------------------------
export const SubscriptionController = {
  // -------------------------------------------------------
  // POST /v1/subscription
  // -------------------------------------------------------
  async create(req: Request, db: any, user: any): Promise<Response> {
    try {
      const { tier, paymentMethod } = await req.json();

      if (!tier || !Object.values(TIERS).includes(tier)) {
        return json({ message: "Invalid subscription tier" }, 400);
      }

      const subscription = await createSubscription(db, user.userId, tier, paymentMethod);

      return json({
        message: "Subscription created",
        subscription
      }, 201);

    } catch (error) {
      return json({ message: error.message }, 500);
    }
  },

  // -------------------------------------------------------
  // GET /v1/subscription
  // -------------------------------------------------------
  async get(req: Request, db: any, user: any): Promise<Response> {
    try {
      const subscription = await getSubscription(db, user.userId);

      if (!subscription) {
        return json({
          message: "User does not have Freemium subscription",
          subscription: {
            tier: TIERS.FREE,
            features: FEATURES[TIERS.FREE],
            availableWeatherProviders: getAvailableProviders(TIERS.FREE)
          }
        });
      }

      return json({
        message: "Subscription retrieved",
        subscription: {
          ...subscription,
          features: FEATURES[subscription.tier],
          availableWeatherProviders: getAvailableProviders(subscription.tier)
        }
      });

    } catch (error) {
      return json({ message: error.message }, 500);
    }
  },

  // -------------------------------------------------------
  // PUT /v1/subscription
  // -------------------------------------------------------
  async upgrade(req: Request, db: any, user: any): Promise<Response> {
    try {
      const { tier } = await req.json();

      const current = await getSubscription(db, user.userId);
      if (!current) {
        return json({ message: "No subscription found" }, 404);
      }

      const updated = await updateSubscription(db, current.id, tier);

      return json({
        message: "Subscription updated",
        subscription: {
          ...updated,
          features: FEATURES[updated.tier],
          availableWeatherProviders: getAvailableProviders(updated.tier)
        }
      });

    } catch (error) {
      return json({ message: error.message }, 500);
    }
  },

  // -------------------------------------------------------
  // GET /v1/subscription/features
  // -------------------------------------------------------
  async getFeatures(req: Request, db: any, user: any): Promise<Response> {
    try {
      const subscription = await getSubscription(db, user.userId);
      const tier = subscription?.tier ?? TIERS.FREE;

      return json({
        message: "Features retrieved",
        tier,
        features: FEATURES[tier],
        availableWeatherProviders: getAvailableProviders(tier)
      });

    } catch (error) {
      return json({ message: error.message }, 500);
    }
  }
};
