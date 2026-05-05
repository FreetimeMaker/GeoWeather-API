import { SubscriptionModel } from "./models/subscription.ts";
import { OxaPayService } from "./services/oxapay_service.ts";

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

export const SubscriptionController = {
  // -------------------------------------------------------
  // POST /v1/subscriptions
  // -------------------------------------------------------
  async create(req: Request, db: any, user: any): Promise<Response> {
    try {
      const { tier, paymentMethod } = await req.json();

      if (!tier || !Object.values(SubscriptionModel.TIERS).includes(tier)) {
        return json({ message: "Invalid subscription tier" }, 400);
      }

      const subscription = await SubscriptionModel.createSubscription(
        db,
        user.userId,
        tier,
        paymentMethod
      );

      return json({
        message: "Subscription created",
        subscription
      }, 201);

    } catch (err) {
      return json({ message: err.message }, 500);
    }
  },

  // -------------------------------------------------------
  // GET /v1/subscriptions
  // -------------------------------------------------------
  async get(req: Request, db: any, user: any): Promise<Response> {
    try {
      const subscription = await SubscriptionModel.getSubscription(db, user.userId);

      if (!subscription) {
        return json({
          message: "User does not have Freemium subscription",
          subscription: {
            tier: SubscriptionModel.TIERS.FREE,
            features: SubscriptionModel.FEATURES.free
          }
        });
      }

      return json({
        message: "Subscription retrieved",
        subscription: {
          ...subscription,
          features: SubscriptionModel.FEATURES[subscription.tier]
        }
      });

    } catch (err) {
      return json({ message: err.message }, 500);
    }
  },

  // -------------------------------------------------------
  // PUT /v1/subscriptions
  // -------------------------------------------------------
  async upgrade(req: Request, db: any, user: any): Promise<Response> {
    try {
      const { tier } = await req.json();

      const current = await SubscriptionModel.getSubscription(db, user.userId);
      if (!current) {
        return json({ message: "No subscription found" }, 404);
      }

      const updated = await SubscriptionModel.updateSubscription(
        db,
        current.id,
        tier
      );

      return json({
        message: "Subscription updated",
        subscription: {
          ...updated,
          features: SubscriptionModel.FEATURES[updated.tier]
        }
      });

    } catch (err) {
      return json({ message: err.message }, 500);
    }
  },

  // -------------------------------------------------------
  // GET /v1/subscriptions/pricing
  // -------------------------------------------------------
  async pricing(): Promise<Response> {
    const pricing: Record<string, any> = {};

    for (const tier of Object.keys(SubscriptionModel.PRICING)) {
      pricing[tier] = {
        one_time: SubscriptionModel.PRICING[tier].one_time
      };
    }

    return json({
      message: "One-time pricing retrieved",
      currency: "USD",
      tiers: pricing
    });
  },

  // -------------------------------------------------------
  // GET /v1/subscriptions/upgrade-pricing
  // -------------------------------------------------------
  async upgradePricing(req: Request, db: any, user: any): Promise<Response> {
    try {
      const url = new URL(req.url);
      const targetTier = url.searchParams.get("targetTier");

      if (!targetTier) {
        return json({ message: "targetTier is required" }, 400);
      }

      const pricing = await SubscriptionModel.getUpgradePricing(
        db,
        user.userId,
        targetTier
      );

      if (!pricing.valid) {
        return json({
          message: pricing.message,
          currentTier: pricing.currentTier,
          targetTier: pricing.targetTier
        }, 400);
      }

      return json({
        message: "Upgrade pricing retrieved",
        ...pricing
      });

    } catch (err) {
      return json({ message: err.message }, 500);
    }
  },

  // -------------------------------------------------------
  // POST /v1/subscriptions/upgrade
  // -------------------------------------------------------
  async upgradeOneTime(req: Request, db: any, user: any): Promise<Response> {
    try {
      const { targetTier } = await req.json();

      if (!targetTier) {
        return json({ message: "targetTier is required" }, 400);
      }

      const current = await SubscriptionModel.getSubscription(db, user.userId);
      const currentTier = current?.tier ?? SubscriptionModel.TIERS.FREE;

      if (!SubscriptionModel.canUpgrade(currentTier, targetTier)) {
        return json({
          message: `Cannot upgrade from ${currentTier} to ${targetTier}`,
          availableUpgrades: SubscriptionModel.getAvailableUpgrades(currentTier)
        }, 400);
      }

      const credit = await SubscriptionModel.calculateUpgradeCredit(current, targetTier);

      let subscription;

      if (current) {
        subscription = await SubscriptionModel.updateSubscription(
          db,
          current.id,
          targetTier
        );
      } else {
        subscription = await SubscriptionModel.createSubscription(
          db,
          user.userId,
          targetTier,
          "one_time"
        );
      }

      return json({
        message: "Subscription upgraded successfully",
        subscription: {
          ...subscription,
          features: SubscriptionModel.FEATURES[subscription.tier]
        },
        upgradeCredit: credit
      });

    } catch (err) {
      return json({ message: err.message }, 500);
    }
  }
};
