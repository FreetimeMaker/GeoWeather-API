// src/services/OxaPayService.js
const axios = require('axios');

const OxaPayService = {
  /**
   * Erzeugt eine OxaPay-Zahlung und gibt payment_url + orderId zurück
   */
  async createPayment({ userId, targetTier, amountUsd }) {
    if (!process.env.OXAPAY_API_KEY) {
      throw new Error('OXAPAY_API_KEY is not set');
    }
    if (!process.env.API_URL) {
      throw new Error('API_URL is not set');
    }

    const orderId = `${userId}:${targetTier}`;

    const { data } = await axios.post(
      'https://api.oxapay.com/merchant/create-payment',
      {
        merchant: process.env.OXAPAY_API_KEY,
        amount: amountUsd,
        currency: 'USD',
        order_id: orderId,
        callback_url: `${process.env.API_URL}/api/v1/subscriptions/oxapay/callback`,
        return_url: `${process.env.API_URL}/api/v1/subscriptions/oxapay/return`,
      }
    );

    if (data.status !== 'success') {
      throw new Error(`OxaPay error: ${data.message || 'unknown error'}`);
    }

    return {
      paymentUrl: data.payment_url,
      orderId,
    };
  },

  /**
   * Parsed order_id → { userId, targetTier }
   */
  parseOrderId(orderId) {
    if (!orderId || typeof orderId !== 'string') {
      throw new Error('Invalid order_id');
    }
    const [userId, targetTier] = orderId.split(':');
    if (!userId || !targetTier) {
      throw new Error('Invalid order_id format');
    }
    return { userId, targetTier };
  },

  /**
   * Baut den Mobile-Deep-Link
   */
  buildDeepLink(targetTier) {
    const scheme = process.env.MOBILE_DEEP_LINK_SCHEME || 'geoweather://';
    return `${scheme}payment/success?tier=${encodeURIComponent(targetTier)}`;
  },

  /**
   * Optional: Zahlung verifizieren (falls du check-payment nutzen willst)
   */
  async checkPayment(orderId) {
    if (!process.env.OXAPAY_API_KEY) {
      throw new Error('OXAPAY_API_KEY is not set');
    }

    const { data } = await axios.post(
      'https://api.oxapay.com/merchant/check-payment',
      {
        merchant: process.env.OXAPAY_API_KEY,
        order_id: orderId,
      }
    );

    return data;
  },
};

module.exports = OxaPayService;
