require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Root Route
app.get('/', (req, res) => {
    res.status(200).json({
        message: 'Welcome to the GeoWeather API!',
        api: {
            version: '1.0.0',
            'v1 endpoints': {
                health: '/api/v1/health',
                auth: '/api/v1/auth',
                github: '/api/v1/auth/github',
                locations: '/api/v1/locations',
                weatherHistory: '/api/v1/weather-history',
                subscriptions: '/api/v1/subscriptions',
                'subscriptions/pricing': '/api/v1/subscriptions/pricing',
                'subscriptions/buy': '/api/v1/subscriptions/buy',
                freemium: '/api/v1/freemium',
                premium: '/api/v1/premium'
            }
        }
    });
});

// 👉 V1 API registrieren
app.use('/api/v1', require('./v1/index'));

module.exports = app;