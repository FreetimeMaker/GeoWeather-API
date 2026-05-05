const express = require('express');
const AuthController = require('../controllers/AuthController');

const router = express.Router();

// Username/Password Auth
router.post('/register', AuthController.register);
router.post('/login', AuthController.login);

// GitHub OAuth (Start)
router.get("/github", AuthController.githubAuth);

// GitHub OAuth (Callback → Deep Link)
router.get("/github/callback", AuthController.githubCallback);

// GitHub OAuth (Mobile JSON Callback)
router.get("/github/mobile-callback", AuthController.githubMobileCallback);

module.exports = router;
