const express = require('express');
const AuthController = require('../controllers/AuthController');

const router = express.Router();

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @body    { username, password, name }
 * @returns { user, token, refreshToken }
 */
router.post('/register', AuthController.register);

/**
 * @route   POST /api/auth/login
 * @desc    Log in user
 * @body    { username, password }
 * @returns { user, token, refreshToken }
 */
router.post('/login', AuthController.login);

/**
 * @route   POST /api/auth/logout
 * @desc    Log out user
 * @returns { message }
 */
router.post('/logout', AuthController.logout);

module.exports = router;
