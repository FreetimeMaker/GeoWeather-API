const express = require('express');
const WeatherHistoryController = require('../controllers/WeatherHistoryController');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

/**
 * @route   POST /api/weather-history/record
 * @desc    Record weather data
 * @body    { location, temperature, humidity, pressure, windSpeed, conditions, sensorData }
 * @returns { history }
 */
router.post('/record', WeatherHistoryController.record);

/**
 * @route   GET /api/weather-history
 * @desc    Get weather history in time period
 * @query   { startDate, endDate, location? }
 * @returns { records[] }
 */
router.get('/', WeatherHistoryController.getHistory);

/**
 * @route   GET /api/weather-history/analytics/monthly
 * @desc    Get monthly statistics
 * @query   { location, year, month }
 * @returns { analytics }
 */
router.get('/analytics/monthly', WeatherHistoryController.getMonthlyAnalytics);

/**
 * @route   GET /api/weather-history/analytics/yearly
 * @desc    Get yearly trends
 * @query   { location, year }
 * @returns { trend[] }
 */
router.get('/analytics/yearly', WeatherHistoryController.getYearlyTrend);

/**
 * @route   GET /api/weather-history/export
 * @desc    Export weather data (Freemium only)
 * @query   { startDate, endDate }
 * @returns { CSV }
 */
router.get('/export', WeatherHistoryController.exportData);

module.exports = router;
