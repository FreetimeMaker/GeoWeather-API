const express = require('express');
const SubscriptionController = require('../controllers/SubscriptionController');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

/**
 * @route   POST /api/subscriptions
 * @desc    Create a new subscription
 * @body    { tier, paymentMethod }
 * @returns { subscription }
 */
router.post('/', SubscriptionController.createSubscription);

/**
 * @route   GET /api/subscriptions
 * @desc    Get user's subscription
 * @returns { subscription }
 */
router.get('/', SubscriptionController.getSubscription);

/**
 * @route   PUT /api/subscriptions
 * @desc    Update/upgrade subscription
 * @body    { tier, paymentMethod }
 * @returns { subscription }
 */
router.put('/', SubscriptionController.upgradeSubscription);

/**
 * @route   GET /api/subscriptions/pricing
 * @desc    Get available subscription pricing options
 * @returns { tiers }
 */
router.get('/pricing', (req, res) => {
  try {
    const pricing = {};

    Object.keys(Subscription.PRICING).forEach(tier => {
      pricing[tier] = {
        monthly: Subscription.PRICING[tier].monthly,
        yearly: Subscription.PRICING[tier].yearly,
        savings: {
          amount: (Subscription.PRICING[tier].monthly * 12) - Subscription.PRICING[tier].yearly,
          percentage: Math.round(((Subscription.PRICING[tier].monthly * 12 - Subscription.PRICING[tier].yearly) / (Subscription.PRICING[tier].monthly * 12)) * 100),
        },
      };
    });

    res.status(200).json({
      message: 'Pricing options retrieved',
      currency: 'USD',
      tiers: pricing,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * @route   POST /api/subscriptions/buy
 * @desc    Generate payment link for subscription purchase
 * @body    { tier, billingCycle: 'monthly' | 'yearly' }
 * @returns { paymentUrl, tier, billingCycle, price, savings? }
 */
router.post('/buy', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { tier, billingCycle = 'monthly' } = req.body;

    if (!tier || !Object.values(Subscription.TIERS).includes(tier)) {
      return res.status(400).json({
        message: 'Invalid subscription tier',
      });
    }

    if (!['monthly', 'yearly'].includes(billingCycle)) {
      return res.status(400).json({
        message: 'Invalid billing cycle. Use "monthly" or "yearly"',
      });
    }

    const pricing = Subscription.PRICING[tier];
    const price = pricing[billingCycle];

    let savings = null;
    if (billingCycle === 'yearly') {
      const monthlyTotal = pricing.monthly * 12;
      savings = monthlyTotal - price;
    }

    // Generate payment URL (placeholder - integrate with Stripe/PayPal/etc.)
    const paymentUrl = `https://payment.example.com/subscribe?user=${userId}&tier=${tier}&cycle=${billingCycle}`;

    res.status(200).json({
      message: 'Payment link generated',
      paymentUrl,
      tier,
      billingCycle,
      price,
      currency: 'USD',
      savings: savings ? { amount: savings, description: `Save $${savings.toFixed(2)} vs monthly` } : null,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
