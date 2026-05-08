const express = require('express');
const FavoriteController = require('../controllers/FavoriteController');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

/**
 * @route   POST /api/favorites
 * @desc    Create a new favorite
 * @body    { name, latitude, longitude }
 * @returns { favorite }
 */
router.post('/', FavoriteController.create);

/**
 * @route   GET /api/favorites
 * @desc    Get all user's favorites
 * @returns { favorites[] }
 */
router.get('/', FavoriteController.getAll);

/**
 * @route   GET /api/favorites/:id
 * @desc    Get favorite by ID
 * @returns { favorite }
 */
router.get('/:id', FavoriteController.getById);

/**
 * @route   PUT /api/favorites/:id
 * @desc    Update favorite
 * @body    { name, latitude, longitude }
 * @returns { favorite }
 */
router.put('/:id', FavoriteController.update);

/**
 * @route   DELETE /api/favorites/:id
 * @desc    Delete favorite
 * @returns { message }
 */
router.delete('/:id', FavoriteController.delete);

/**
 * @route   POST /api/favorites/sync
 * @desc    Synchronize favorites across devices
 * @body    { favorites[] }
 * @returns { favorites[] }
 */
router.post('/sync', FavoriteController.sync);

module.exports = router;
