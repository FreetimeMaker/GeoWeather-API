const express = require('express');
const authMiddleware = require('../middleware/auth');
const Subscription = require('../models/Subscription');
const WeatherDataService = require('../services/WeatherDataService');
const MapTileService = require('../services/MapTileService');

const router = express.Router();

router.use(authMiddleware);

/**
 * @route   POST /api/premium/weather-sources
 * @desc    Get weather data from multiple sources (Premium)
 * @body    { latitude, longitude, sources: ['openweather', 'weatherapi', 'open-weather-map',] }
 */
router.post('/weather-sources', async (req, res) => {
  try {
    const userId = req.user.userId;

    // Check Freemium access
    const hasAccess = await Subscription.checkFeatureAccess(userId, 'multiple_sources');
    if (!hasAccess) {
      return res.status(403).json({
        message: 'Feature requires Premium subscription',
      });
    }

    const { latitude, longitude, sources } = req.body;

    if (!latitude || !longitude || !sources) {
      return res.status(400).json({
        message: 'Latitude, Longitude and sources required',
      });
    }

    // Validate and filter sources based on subscription tier
    const validSources = await Subscription.validateRequestedSources(userId, sources);

    const weatherData = await WeatherDataService.getAggregatedWeather(
      latitude,
      longitude,
      validSources
    );

    res.status(200).json({
      message: 'Aggregated weather data (tier-filtered)',
      requestedSources: sources,
      usedSources: validSources,
      availableProviders: await Subscription.getAvailableWeatherProviders(userId),
      data: weatherData,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * @route   GET /api/premium/map-layers
 * @desc    Get Premium map layers (Radar, Satellite, etc.)
 * @query   { latitude, longitude, zoom }
 */
router.get('/map-layers', async (req, res) => {
  try {
    const userId = req.user.userId;

    // Check Premium access
    const hasAccess = await Subscription.checkFeatureAccess(userId, 'map_layers');
    if (!hasAccess) {
      return res.status(403).json({
        message: 'Feature requires Premium subscription',
      });
    }

    const { latitude, longitude, zoom } = req.query;

    if (!latitude || !longitude) {
      return res.status(400).json({
        message: 'Latitude and Longitude required',
      });
    }

    const mapLayers = await MapTileService.getFreemiumMapLayers(
      parseFloat(latitude),
      parseFloat(longitude),
      parseInt(zoom) || 10
    );

    res.status(200).json({
      message: 'Map layers retrieved',
      layers: mapLayers,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * @route   POST /api/premium/weather-alert
 * @desc    Push notification for weather alerts (Premium)
 * @body    { latitude, longitude, alertType, message }
 */
router.post('/weather-alert', async (req, res) => {
  try {
    const userId = req.user.userId;

    // Check Premium access
    const hasAccess = await Subscription.checkFeatureAccess(userId, 'push_notifications');
    if (!hasAccess) {
      return res.status(403).json({
        message: 'Feature requires Premium subscription',
      });
    }

    const { latitude, longitude, alertType, message } = req.body;

    if (!latitude || !longitude || !alertType) {
      return res.status(400).json({
        message: 'Coordinates and alert type required',
      });
    }

    const PushNotificationService = require('../services/PushNotificationService');
    const notification = await PushNotificationService.sendWeatherAlert(
      userId,
      latitude,
      longitude,
      alertType,
      message,
      req.body.platform || 'unknown'
    );

    res.status(201).json({
      message: 'Notification sent',
      notification,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
