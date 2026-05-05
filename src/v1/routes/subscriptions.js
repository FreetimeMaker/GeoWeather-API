const express = require('express');
const Subscription = require('../models/Subscription');
const SubscriptionController = require('../controllers/SubscriptionController');
const authMiddleware = require('../middleware/auth');
const OxaPayService = require('../services/OxaPayService');

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

/**
 * @route   POST /api/subscriptions
 * @desc    Create a new subscription
 */
router.post('/', SubscriptionController.createSubscription);

/**
 * @route   GET /api/subscriptions
 * @desc    Get user's subscription
 */
router.get('/', SubscriptionController.getSubscription);

/**
 * @route   PUT /api/subscriptions
 * @desc    Update/upgrade subscription
 */
router.put('/', SubscriptionController.upgradeSubscription);

/**
 * @route   GET /api/subscriptions/pricing
 * @desc    Get one-time pricing
 */
router.get('/pricing', (req, res) => {
  try {
    const pricing = {};

    Object.keys(Subscription.PRICING).forEach(tier => {
      pricing[tier] = {
        one_time: Subscription.PRICING[tier].one_time,
      };
    });

    res.status(200).json({
      message: 'One-time pricing retrieved',
      currency: 'USD',
      tiers: pricing,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * @route   GET /api/subscriptions/upgrade-pricing
 * @desc    Get upgrade pricing
 */
router.get('/upgrade-pricing', async (req, res) => {
  try {
    const userId = req.user.userId;
    const { targetTier } = req.query;

    if (!targetTier) {
      return res.status(400).json({ message: 'targetTier is required' });
    }

    const upgradePricing = await Subscription.getUpgradePricing(userId, targetTier);

    if (!upgradePricing.valid) {
      return res.status(400).json({
        message: upgradePricing.message,
        currentTier: upgradePricing.currentTier,
        targetTier: upgradePricing.targetTier,
      });
    }

    res.status(200).json({
      message: 'Upgrade pricing retrieved',
      ...upgradePricing
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * @route   POST /api/subscriptions/upgrade
 * @desc    Upgrade subscription (one-time)
 */
router.post('/upgrade', async (req, res) => {
  try {
    const userId = req.user.userId;
    const { targetTier } = req.body;

    if (!targetTier) {
      return res.status(400).json({ message: 'targetTier is required' });
    }

    const currentSubscription = await Subscription.getSubscription(userId);
    const currentTier = currentSubscription?.tier || Subscription.TIERS.FREE;

    if (!Subscription.canUpgrade(currentTier, targetTier)) {
      return res.status(400).json({
        message: `Cannot upgrade from ${currentTier} to ${targetTier}`,
        availableUpgrades: Subscription.getAvailableUpgrades(currentTier),
      });
    }

    const credit = await Subscription.calculateUpgradeCredit(currentSubscription, targetTier);

    let subscription;

    if (currentSubscription) {
      subscription = await Subscription.updateSubscription(
        currentSubscription.id,
        targetTier
      );
    } else {
      subscription = await Subscription.createSubscription(
        userId,
        targetTier,
        "one_time"
      );
    }

    res.status(200).json({
      message: 'Subscription upgraded successfully',
      subscription: {
        ...subscription,
        features: Subscription.FEATURES[subscription.tier],
      },
      upgradeCredit: credit,
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * @route   POST /api/subscriptions/buy
 * @desc    Generate OxaPay payment link (ONE-TIME)
 */
router.post('/buy', async (req, res) => {
  try {
    const userId = req.user.userId;
    const { tier: targetTier } = req.body;

    if (!targetTier || !Object.values(Subscription.TIERS).includes(targetTier)) {
      return res.status(400).json({ message: 'Invalid subscription tier' });
    }

    const currentSubscription = await Subscription.getSubscription(userId);
    const currentTier = currentSubscription?.tier || Subscription.TIERS.FREE;

    if (!Subscription.canUpgrade(currentTier, targetTier)) {
      return res.status(400).json({
        message: `Cannot upgrade from ${currentTier} to ${targetTier}`,
        availableUpgrades: Subscription.getAvailableUpgrades(currentTier),
      });
    }

    const pricing = await Subscription.getUpgradePricing(userId, targetTier);

    if (!pricing.valid) {
      return res.status(400).json({ message: pricing.message });
    }

    // OxaPay Payment erzeugen
    const { paymentUrl, orderId } = await OxaPayService.createPayment({
      userId,
      targetTier,
      amountUsd: pricing.finalPrice,
    });

    // Wenn User bereits eine Subscription hat → pending speichern
    if (currentSubscription) {
      await supabase.rpc('append_payment_history', {
        sub_id: currentSubscription.id,
        entry: {
          order_id: orderId,
          tier: targetTier,
          amount_usd: pricing.finalPrice,
          status: "pending",
          timestamp: new Date().toISOString()
        }
      });
    }

    return res.status(200).json({
      success: true,
      message: 'OxaPay payment link generated',
      paymentUrl,
      currentTier,
      targetTier,
      pricing,
      orderId,
    });

  } catch (error) {
    console.error('OXAPAY ERROR:', error.response?.data || error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to create OxaPay payment',
      error: error.message,
    });
  }
});

/**
 * @route   POST /api/subscriptions/oxapay/callback
 * @desc    Server-to-server confirmation from OxaPay
 */
router.post('/oxapay/callback', async (req, res) => {
  try {
    const { order_id, status } = req.body;

    if (!order_id) return res.status(400).send('Missing order_id');

    const { userId, targetTier } = OxaPayService.parseOrderId(order_id);

    // Subscription holen oder neu erstellen
    let subscription = await Subscription.getSubscription(userId);

    if (!subscription) {
      subscription = await Subscription.createSubscription(
        userId,
        targetTier,
        "oxapay"
      );
    }

    const currentTier = subscription.tier;

    if (status !== 'success') {
      // Zahlung fehlgeschlagen → History speichern
      await supabase.rpc('append_payment_history', {
        sub_id: subscription.id,
        entry: {
          order_id,
          tier: targetTier,
          status: "failed",
          payload: req.body,
          timestamp: new Date().toISOString()
        }
      });

      return res.status(200).send('Payment failed');
    }

    // Upgrade durchführen
    if (Subscription.canUpgrade(currentTier, targetTier)) {
      subscription = await Subscription.updateSubscription(
        subscription.id,
        targetTier
      );
    }

    // Erfolg speichern
    await supabase.rpc('append_payment_history', {
      sub_id: subscription.id,
      entry: {
        order_id,
        tier: targetTier,
        status: "success",
        payload: req.body,
        timestamp: new Date().toISOString()
      }
    });

    return res.status(200).send('OK');

  } catch (error) {
    console.error('OXAPAY CALLBACK ERROR:', error);
    return res.status(500).send('Callback processing failed');
  }
});

/**
 * @route   GET /api/subscriptions/oxapay/return
 * @desc    User redirect after payment (mobile deep link)
 */
router.get('/oxapay/return', async (req, res) => {
  try {
    const { order_id } = req.query;

    if (!order_id) return res.status(400).send('Missing order_id');

    const { targetTier } = OxaPayService.parseOrderId(order_id);
    const deepLink = OxaPayService.buildDeepLink(targetTier);

    return res.redirect(deepLink);

  } catch (error) {
    console.error('OXAPAY RETURN ERROR:', error);
    return res.status(500).send('Return processing failed');
  }
});

module.exports = router;
