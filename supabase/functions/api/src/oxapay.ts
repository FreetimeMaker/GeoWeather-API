import { SubscriptionModel } from "./models/subscription.ts";
import { OxaPayService } from "./services/oxapay_service.ts";

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

export const OxaPayController = {
  // -------------------------------------------------------
  // POST /v1/subscriptions/buy
  // -------------------------------------------------------
  async buy(req: Request, db: any, user: any): Promise<Response> {
    try {
      const { tier: targetTier } = await req.json();

      if (!targetTier || !Object.values(SubscriptionModel.TIERS).includes(targetTier)) {
        return json({ message: "Invalid subscription tier" }, 400);
      }

      const current = await SubscriptionModel.getSubscription(db, user.userId);
      const currentTier = current?.tier ?? SubscriptionModel.TIERS.FREE;

      if (!SubscriptionModel.canUpgrade(currentTier, targetTier)) {
        return json({
          message: `Cannot upgrade from ${currentTier} to ${targetTier}`,
          availableUpgrades: SubscriptionModel.getAvailableUpgrades(currentTier)
        }, 400);
      }

      const pricing = await SubscriptionModel.getUpgradePricing(db, user.userId, targetTier);

      if (!pricing.valid) {
        return json({ message: pricing.message }, 400);
      }

      const { paymentUrl, orderId } = await OxaPayService.createPayment({
        userId: user.userId,
        targetTier,
        amountUsd: pricing.finalPrice
      });

      if (current) {
        await db.rpc("append_payment_history", {
          sub_id: current.id,
          entry: {
            order_id: orderId,
            tier: targetTier,
            amount_usd: pricing.finalPrice,
            status: "pending",
            timestamp: new Date().toISOString()
          }
        });
      }

      return json({
        success: true,
        message: "OxaPay payment link generated",
        paymentUrl,
        currentTier,
        targetTier,
        pricing,
        orderId
      });

    } catch (err) {
      return json({
        success: false,
        message: "Failed to create OxaPay payment",
        error: err.message
      }, 500);
    }
  },

  // -------------------------------------------------------
  // POST /v1/subscriptions/oxapay/callback
  // -------------------------------------------------------
  async callback(req: Request, db: any): Promise<Response> {
    try {
      const { order_id, status } = await req.json();

      if (!order_id) return new Response("Missing order_id", { status: 400 });

      const { userId, targetTier } = OxaPayService.parseOrderId(order_id);

      let subscription = await SubscriptionModel.getSubscription(db, userId);

      if (!subscription) {
        subscription = await SubscriptionModel.createSubscription(
          db,
          userId,
          targetTier,
          "oxapay"
        );
      }

      const currentTier = subscription.tier;

      if (status !== "success") {
        await db.rpc("append_payment_history", {
          sub_id: subscription.id,
          entry: {
            order_id,
            tier: targetTier,
            status: "failed",
            payload: { order_id, status },
            timestamp: new Date().toISOString()
          }
        });

        return new Response("Payment failed");
      }

      if (SubscriptionModel.canUpgrade(currentTier, targetTier)) {
        subscription = await SubscriptionModel.updateSubscription(
          db,
          subscription.id,
          targetTier
        );
      }

      await db.rpc("append_payment_history", {
        sub_id: subscription.id,
        entry: {
          order_id,
          tier: targetTier,
          status: "success",
          payload: { order_id, status },
          timestamp: new Date().toISOString()
        }
      });

      return new Response("OK");

    } catch (err) {
      return new Response("Callback processing failed", { status: 500 });
    }
  },

  // -------------------------------------------------------
  // GET /v1/subscriptions/oxapay/return
  // -------------------------------------------------------
  async return(req: Request): Promise<Response> {
    try {
      const url = new URL(req.url);
      const orderId = url.searchParams.get("order_id");

      if (!orderId) return new Response("Missing order_id", { status: 400 });

      const { targetTier } = OxaPayService.parseOrderId(orderId);
      const deepLink = OxaPayService.buildDeepLink(targetTier);

      return Response.redirect(deepLink, 302);

    } catch (err) {
      return new Response("Return processing failed", { status: 500 });
    }
  }
};
