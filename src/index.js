require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const session = require('express-session');
const passport = require('./config/passport');
const errorHandler = require('./middleware/errorHandler');
const database = require('./config/database');

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


// Initialize Passport
app.use(passport.initialize());

// Health Check
app.get('/api/health', async (req, res) => {
  try {
    const dbStatus = await database.healthCheck();
    let dbStatusText = 'not_configured';
    if (dbStatus === null) {
      dbStatusText = 'not_configured';
    } else if (dbStatus) {
      dbStatusText = 'connected';
    } else {
      dbStatusText = 'disconnected';
    }
    res.status(200).json({
      status: 'OK',
      database: dbStatusText,
      timestamp: new Date(),
    });
  } catch (error) {
    console.error('Health check error:', error.message);
    res.status(200).json({
      status: 'OK',
      database: 'error',
      error: error.message,
      timestamp: new Date(),
    });
  }
});

// Root Route
app.get('/', (req, res) => {
  res.status(200).json({
    message: 'Welcome to the GeoWeather API!',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      auth: '/api/auth',
      github: '/api/auth/github',
      locations: '/api/locations',
      weatherHistory: '/api/weather-history',
      subscriptions: '/api/subscriptions',
      'subscriptions/pricing': '/api/subscriptions/pricing',
      'subscriptions/buy': '/api/subscriptions/buy',
      freemium: '/api/freemium',
      premium: '/api/premium',
    },
  });
});

app.get("/", (req, res) => {
  res.json({ status: "GeoWeather API running" });
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
