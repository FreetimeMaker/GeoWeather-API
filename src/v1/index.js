const express = require('express');
const router = express.Router();
const axios = require('axios');
const database = require('./config/database');
const errorHandler = require('./middleware/errorHandler');

// Import routes
const authRoutes = require('./routes/auth');
const locationsRoutes = require('./routes/locations');
const weatherHistoryRoutes = require('./routes/weatherHistory');
const subscriptionRoutes = require('./routes/subscriptions');
const freemiumRoutes = require('./routes/freemium');
const premiumRoutes = require('./routes/premium');

// Health Check (ohne /api/v1 prefix!)
router.get('/health', async (req, res) => {
    const result = {
        status: 'ok',
        service: 'GeoWeather API',
        timestamp: new Date().toISOString(),
        checks: {}
    };

    try {
        const dbStatus = await database.healthCheck();
        result.checks.database = dbStatus ? 'connected' : 'disconnected';
    } catch (err) {
        result.checks.database = `error: ${err.message}`;
        result.status = 'degraded';
    }

    try {
        await axios.head('https://api.oxapay.com/v1/common/monitor');
        result.checks.oxapay = 'reachable';
    } catch (err) {
        result.checks.oxapay = `error: ${err.message}`;
        result.status = 'degraded';
    }

    res.status(result.status === 'ok' ? 200 : 503).json(result);
});

// Root of v1
router.get('/', (req, res) => {
    res.json({
        message: 'Welcome to the GeoWeather API v1!',
        version: '1.1.0',
        endpoints: {
            health: '/api/v1/health',
            auth: '/api/v1/auth',
            modrinth: '/api/v1/auth/modrinth',
            github: '/api/v1/auth/github',
            locations: '/api/v1/locations',
            weatherHistory: '/api/v1/weather-history',
            subscriptions: '/api/v1/subscriptions',
            'subscriptions/pricing': '/api/v1/subscriptions/pricing',
            'subscriptions/buy': '/api/v1/subscriptions/buy',
            freemium: '/api/v1/freemium',
            premium: '/api/v1/premium',
        },
    });
});

// V1 routes (ohne /api/v1 prefix!)
router.use('/auth', authRoutes);
router.use('/locations', locationsRoutes);
router.use('/weather-history', weatherHistoryRoutes);
router.use('/subscriptions', subscriptionRoutes);
router.use('/freemium', freemiumRoutes);
router.use('/premium', premiumRoutes);

// Error handler
router.use(errorHandler);

module.exports = router;
