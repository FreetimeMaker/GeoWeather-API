const express = require('express');
const SubscriptionController = require('../controllers/SubscriptionController');
const Subscription = require('../models/Subscription');
const CryptoPaymentService = require('../services/CryptoPaymentService');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

/**
 * @route   GET /api/subscriptions/crypto/coins
 * @desc    Get supported cryptocurrencies with USD prices
 * @returns { coins }
 */
router.get('/crypto/coins', async (req, res) => {
  try {
    const coins = await CryptoPaymentService.getSupportedCoins();
    
    res.status(200).json({
      message: 'Supported cryptocurrencies',
      coins,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * @route   GET /api/subscriptions/crypto/price/:tier
 * @desc    Get crypto price for a subscription tier
 * @query   crypto - Crypto symbol (eth, btc, usdt, usdc, doge, sol)
 * @returns { payment details }
 */
router.get('/crypto/price/:tier', async (req, res) => {
  try {
    const { tier } = req.params;
    const { crypto = 'eth' } = req.query;

    if (!Object.values(Subscription.TIERS).includes(tier)) {
      return res.status(400).json({
        message: 'Invalid subscription tier',
      });
    }

    const paymentDetails = await CryptoPaymentService.getPaymentDetails(tier, crypto);

    res.status(200).json({
      message: 'Crypto payment details',
      tier: paymentDetails.tier,
      currency: 'USD',
      priceUsd: paymentDetails.priceUsd,
      crypto: paymentDetails.crypto,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * @route   GET /api/subscriptions/crypto/options/:tier
 * @desc    Get all crypto payment options for a tier
 * @returns { payment options }
 */
router.get('/crypto/options/:tier', async (req, res) => {
  try {
    const { tier } = req.params;

    if (!Object.values(Subscription.TIERS).includes(tier)) {
      return res.status(400).json({
        message: 'Invalid subscription tier',
      });
    }

    const options = await CryptoPaymentService.getAllPaymentOptions(tier);
    const usdPrice = Subscription.PRICING[tier]?.one_time;

    res.status(200).json({
      message: 'Crypto payment options',
      tier,
      currency: 'USD',
      priceUsd: usdPrice,
      options,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * @route   POST /api/subscriptions/crypto/instructions
 * @desc    Generate payment instructions for wallet-to-wallet transfer
 * @body    { tier, crypto }
 * @returns { payment instructions }
 */
router.post('/crypto/instructions', async (req, res) => {
  try {
    const userId = req.user.userId;
    const { tier, crypto = 'eth' } = req.body;

    if (!tier || !Object.values(Subscription.TIERS).includes(tier)) {
      return res.status(400).json({
        message: 'Invalid subscription tier',
      });
    }

    const instructions = await CryptoPaymentService.generatePaymentInstructions(
      tier,
      crypto,
      userId
    );

    res.status(200).json({
      message: 'Payment instructions generated',
      ...instructions,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * @route   POST /api/subscriptions/crypto/verify
 * @desc    Verify a crypto payment
 * @body    { txHash, crypto, tier }
 * @returns { payment status }
 */
router.post('/crypto/verify', async (req, res) => {
  try {
    const { txHash, crypto = 'eth', tier } = req.body;
    const userId = req.user.userId;

    if (!txHash) {
      return res.status(400).json({
        message: 'txHash is required',
      });
    }

    // Get payment details if tier provided
    let expectedAmount = null;
    let merchantWallet = null;
    
    if (tier) {
      try {
        const paymentDetails = await CryptoPaymentService.getPaymentDetails(tier, crypto);
        expectedAmount = paymentDetails.crypto.cryptoAmount;
        merchantWallet = CryptoPaymentService.getMerchantWallet(crypto);
      } catch (e) {
        console.error('Failed to get payment details:', e.message);
      }
    }

    // Get cached status first
    const cachedStatus = CryptoPaymentService.getPaymentStatus(txHash);
    if (cachedStatus) {
      return res.status(200).json({
        message: 'Payment status (cached)',
        ...cachedStatus,
      });
    }

    // Verify with blockchain
    const status = await CryptoPaymentService.verifyPaymentStatus(
      txHash, 
      crypto, 
      expectedAmount, 
      merchantWallet
    );

    res.status(200).json({
      message: 'Payment verification',
      ...status,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

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
 * @desc    Get available one-time pricing options (NO monthly/yearly)
 * @returns { tiers }
 */
router.get('/pricing', (req, res) => {
  try {
    const pricing = {};

    // One-time lifetime pricing (NO recurring)
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
 * @route   GET /api/subscriptions/available-providers
 * @desc    Get weather providers available for user's subscription tier
 * @returns { providers, tier }
 */
router.get('/available-providers', async (req, res) => {
  try {
    const userId = req.user.userId;
    const tier = await Subscription.getUserTier(userId);
    const providers = await Subscription.getAvailableWeatherProviders(userId);
    
    res.status(200).json({
      message: 'Available weather providers for your tier',
      tier,
      providers,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * @route   GET /api/subscriptions/upgrade-pricing
 * @desc    Get upgrade pricing with available credits (ONE-TIME only)
 * @query   targetTier - The tier to upgrade to
 * @returns { upgrade pricing }
 */
router.get('/upgrade-pricing', async (req, res) => {
  try {
    const userId = req.user.userId;
    const { targetTier } = req.query;

    if (!targetTier) {
      return res.status(400).json({
        message: 'targetTier query parameter is required',
      });
    }

    if (!Object.values(Subscription.TIERS).includes(targetTier)) {
      return res.status(400).json({
        message: 'Invalid target tier',
      });
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
      currentTier: upgradePricing.currentTier,
      targetTier: upgradePricing.targetTier,
      credit: upgradePricing.credit,
      price: upgradePricing.price,
      finalPrice: upgradePricing.finalPrice,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * @route   POST /api/subscriptions/upgrade
 * @desc    Process subscription upgrade with credit application (ONE-TIME only)
 * @body    { targetTier }
 * @returns { upgraded subscription }
 */
router.post('/upgrade', async (req, res) => {
  try {
    const userId = req.user.userId;
    const { targetTier } = req.body;

    if (!targetTier) {
      return res.status(400).json({
        message: 'targetTier is required',
      });
    }

    // Get current subscription
    const currentSubscription = await Subscription.getSubscription(userId);
    const currentTier = currentSubscription?.tier || Subscription.TIERS.FREE;

    // Validate upgrade path
    if (!Subscription.canUpgrade(currentTier, targetTier)) {
      return res.status(400).json({
        message: `Cannot upgrade from ${currentTier} to ${targetTier}`,
        availableUpgrades: Subscription.getAvailableUpgrades(currentTier),
      });
    }

    // Calculate upgrade credit (only for existing one-time purchases)
    const credit = await Subscription.calculateUpgradeCredit(currentSubscription, targetTier);

    let subscription;

    if (currentSubscription) {
      // Update existing subscription to new tier (one-time)
      subscription = await Subscription.updateSubscription(
        currentSubscription.id,
        targetTier
      );
    } else {
      // Create new subscription (from FREE)
      subscription = await Subscription.createSubscription(
        userId,
        targetTier,
        null
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
 * @desc    Generate payment link for one-time lifetime purchase (NO monthly/yearly)
 * @body    { tier }
 * @returns { paymentUrl, tier, price }
 */
router.post('/buy', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { tier } = req.body;

    if (!tier || !Object.values(Subscription.TIERS).includes(tier)) {
      return res.status(400).json({
        message: 'Invalid subscription tier',
      });
    }

    // Get one-time price
    const price = Subscription.PRICING[tier]?.one_time;

    if (!price) {
      return res.status(400).json({
        message: `One-time purchase not available for ${tier} tier`,
      });
    }

    // Generate payment URL (placeholder - integrate with Stripe/PayPal/etc.)
    const paymentUrl = `https://payment.example.com/subscribe?user=${userId}&tier=${tier}&type=one_time`;

    res.status(200).json({
      message: 'Payment link generated',
      paymentUrl,
      tier,
      paymentType: 'one_time',
      price,
      currency: 'USD',
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
