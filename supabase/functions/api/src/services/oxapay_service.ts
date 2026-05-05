// ---------------------------------------------------------
// OxaPayService (Deno + Supabase Edge Functions)
// ---------------------------------------------------------

const OXAPAY_API_KEY = Deno.env.get("OXAPAY_API_KEY") ?? "";
const API_URL = Deno.env.get("API_URL") ?? "";
const MOBILE_SCHEME = Deno.env.get("MOBILE_DEEP_LINK_SCHEME") ?? "geoweather://";

if (!OXAPAY_API_KEY) console.error("⚠️ OXAPAY_API_KEY missing");
if (!API_URL) console.error("⚠️ API_URL missing");

export const OxaPayService = {
  // -------------------------------------------------------
  // Create Payment
  // -------------------------------------------------------
  async createPayment({
    userId,
    targetTier,
    amountUsd
  }: {
    userId: string;
    targetTier: string;
    amountUsd: number;
  }): Promise<{ paymentUrl: string; orderId: string }> {
    if (!OXAPAY_API_KEY) throw new Error("OXAPAY_API_KEY is not set");
    if (!API_URL) throw new Error("API_URL is not set");

    const orderId = `${userId}:${targetTier}`;

    const body = {
      merchant: OXAPAY_API_KEY,
      amount: amountUsd,
      currency: "USD",
      order_id: orderId,
      callback_url: `${API_URL}/v1/subscriptions/oxapay/callback`,
      return_url: `${API_URL}/v1/subscriptions/oxapay/return`
    };

    const response = await fetch(
      "https://api.oxapay.com/merchant/create-payment",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      }
    );

    const data = await response.json();

    if (data.status !== "success") {
      throw new Error(`OxaPay error: ${data.message ?? "unknown error"}`);
    }

    return {
      paymentUrl: data.payment_url,
      orderId
    };
  },

  // -------------------------------------------------------
  // Parse order_id → { userId, targetTier }
  // -------------------------------------------------------
  parseOrderId(orderId: string): { userId: string; targetTier: string } {
    if (!orderId || typeof orderId !== "string") {
      throw new Error("Invalid order_id");
    }

    const [userId, targetTier] = orderId.split(":");

    if (!userId || !targetTier) {
      throw new Error("Invalid order_id format");
    }

    return { userId, targetTier };
  },

  // -------------------------------------------------------
  // Build Mobile Deep Link
  // -------------------------------------------------------
  buildDeepLink(targetTier: string): string {
    return `${MOBILE_SCHEME}payment/success?tier=${encodeURIComponent(
      targetTier
    )}`;
  },

  // -------------------------------------------------------
  // Optional: Check Payment
  // -------------------------------------------------------
  async checkPayment(orderId: string): Promise<any> {
    if (!OXAPAY_API_KEY) throw new Error("OXAPAY_API_KEY is not set");

    const response = await fetch(
      "https://api.oxapay.com/merchant/check-payment",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          merchant: OXAPAY_API_KEY,
          order_id: orderId
        })
      }
    );

    return await response.json();
  }
};
