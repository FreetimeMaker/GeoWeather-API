const express = require('express');
const LocationsController = require('../controllers/LocationsController');
const optionalAuth = require('../middleware/optionalAuth');

const router = express.Router();

// Use optional authentication (supports anonymous free plan)
router.use(optionalAuth);

/**
 * @route   POST /api/locations
 * @desc    Create new Location (also anonymous, free plan Limit 4)
 * @body    { name, latitude, longitude }
 * @returns { location }
 */
router.post('/', LocationsController.create);

/**
 * @route   GET /api/locations
 * @desc    Get all Locations of User/Anon
 * @returns { locations[] }
 */
router.get('/', LocationsController.getAll);

/**
 * @route   GET /api/locations/:id
 * @desc    Get Location by ID
 * @returns { location }
 */
router.get('/:id', LocationsController.getById);

/**
 * @route   PUT /api/locations/:id
 * @desc    Update Location
 * @body    { name, latitude, longitude }
 * @returns { location }
 */
router.put('/:id', LocationsController.update);

/**
 * @route   DELETE /api/locations/:id
 * @desc    Delete Location
 * @returns { message }
 */
router.delete('/:id', LocationsController.delete);

/**
 * @route   POST /api/locations/sync
 * @desc    Synchronize Locations across devices
 * @body    { locations[] }
 * @returns { locations[] }
 */
router.post('/sync', LocationsController.sync);

module.exports = router;
