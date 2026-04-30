require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const errorHandler = require('./middleware/errorHandler');

// Import routes
const authRoutes = require('./routes/auth');
const favoriteRoutes = require('./routes/favorites');
const weatherHistoryRoutes = require('./routes/weatherHistory');
const subscriptionRoutes = require('./routes/subscriptions');
const premiumRoutes = require('./routes/premium');

const app = express();

// Middleware
app.use(helmet());
app.use(cors({
  origin: (process.env.CORS_ORIGIN || 'http://localhost:3000').split(','),
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health Check
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date() });
});

// Root Route
app.get('/', (req, res) => {
  res.status(200).json({
    message: 'Welcome to the GeoWeather API!',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      auth: '/api/auth',
      favorites: '/api/favorites',
      weatherHistory: '/api/weather-history',
      subscriptions: '/api/subscriptions',
      'subscriptions/pricing': '/api/subscriptions/pricing',
      'subscriptions/buy': '/api/subscriptions/buy',
      premium: '/api/premium'
    }
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/favorites', favoriteRoutes);
app.use('/api/weather-history', weatherHistoryRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/premium', premiumRoutes);

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Error Handler (must be last)
app.use(errorHandler);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`GeoWeather API läuft auf Port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
