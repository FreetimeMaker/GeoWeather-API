const express = require('express');
const AuthController = require('../controllers/AuthController');

const { githubLogin } = require('../config/github');
const { modrinthLogin } = require('../config/modrinth');

const router = express.Router();

router.post('/register', AuthController.register);
router.post('/login', AuthController.login);

// GitHub OAuth
router.get('/github', githubLogin);
router.get('/github/callback', AuthController.githubCallback);
router.get('/github/mobile-callback', AuthController.githubMobileCallback);

// Modrinth OAuth
router.get('/modrinth', modrinthLogin);
router.get('/modrinth/callback', AuthController.modrinthCallback);
router.get('/modrinth/mobile-callback', AuthController.modrinthMobileCallback);

module.exports = router;
