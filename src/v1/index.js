require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const errorHandler = require('./middleware/errorHandler');
const database = require('./config/database');
const axios = require('axios');

// Import routes
const authRoutes = require('./routes/auth');
const locationsRoutes = require('./routes/locations');
const weatherHistoryRoutes = require('./routes/weatherHistory');
const subscriptionRoutes = require('./routes/subscriptions');
const freemiumRoutes = require('./routes/freemium');
const premiumRoutes = require('./routes/premium');

const app = express();

// Middleware
app.use(helmet());
app.use(cors({
  origin: (process.env.CORS_ORIGIN || '*').split(','),
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ❌ REMOVE PASSPORT COMPLETELY
// const passport = require('./config/passport');
// app.use(passport.initialize());

// Health Check
app.get('/api/v1/health', async (req, res) => {
  const result = {
    status: 'ok',
    service: 'GeoWeather API',
    timestamp: new Date().toISOString(),
    version: process.env.VERCEL_GIT_COMMIT_SHA || 'local-dev',
    checks: {}
  };

  // -----------------------------
  // 1) LIVENESS
  // -----------------------------
  result.checks.live = true;

  // -----------------------------
  // 2) READINESS (DB erreichbar?)
  // -----------------------------
  try {
    const dbStatus = await database.healthCheck();
    result.checks.database = dbStatus ? 'connected' : 'disconnected';
    if (!dbStatus) result.status = 'degraded';
  } catch (err) {
    result.checks.database = `error: ${err.message}`;
    result.status = 'degraded';
  }

  // -----------------------------
  // 3) OXAPAY API CHECK
  // -----------------------------
  try {
    const oxapay = await axios.post('https://api.oxapay.com/merchant/check-payment', {
      merchant: process.env.OXAPAY_API_KEY,
      order_id: 'health-check'
    });

    result.checks.oxapay = oxapay.data.status ? 'reachable' : 'reachable-but-error';
  } catch (err) {
    result.checks.oxapay = `error: ${err.message}`;
    result.status = 'degraded';
  }

  // -----------------------------
  // 4) ENVIRONMENT INFO
  // -----------------------------
  result.checks.environment = {
    node: process.version,
    region: process.env.VERCEL_REGION || 'local',
    runtime: 'vercel-node'
  };

  // -----------------------------
  // RESPONSE
  // -----------------------------
  res.status(result.status === 'ok' ? 200 : 503).json(result);
});


// Root Route
app.get('/', (req, res) => {
  res.status(200).json({
    message: 'Welcome to the GeoWeather API!',
    version: '1.0.0',
    endpoints: {
      health: '/api/v1/health',
      auth: '/api/v1/auth',
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

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/locations', locationsRoutes);
app.use('/api/weather-history', weatherHistoryRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/freemium', freemiumRoutes);
app.use('/api/premium', premiumRoutes);

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Error Handler (must be last)
app.use(errorHandler);

const PORT = process.env.PORT || 3000;

app.listen(PORT, async () => {
  console.log('GeoWeather API running on port ' + PORT);
  console.log('Environment: ' + (process.env.NODE_ENV || 'production'));
  
  // Startup health check
  try {
    const dbStatus = await database.healthCheck();
    const statusText = dbStatus === null ? 'not_configured' : (dbStatus ? '✅ connected' : '❌ disconnected');
    console.log('Database:', statusText);
  } catch (error) {
    console.error('Startup DB check failed:', error.message);
  }
});

module.exports = app;
