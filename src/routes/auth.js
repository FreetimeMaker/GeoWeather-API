const express = require('express');
const AuthController = require('../controllers/AuthController');
const { githubLogin, githubCallback } = require('../config/github');

const router = express.Router();

router.post('/register', AuthController.register);
router.post('/login', AuthController.login);

router.get('/github', githubLogin);
router.get('/github/callback', AuthController.githubCallback);

router.get('/github/mobile-callback', AuthController.githubMobileCallback);

module.exports = router;
