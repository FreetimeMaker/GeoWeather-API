const crypto = require('crypto');
const { verifyToken } = require('../config/auth');
const { generateUUID } = require('../utils/helpers');

const optionalAuth = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];

    if (token) {
        // Try auth token
        const decoded = verifyToken(token);
        if (decoded) {
        req.user = decoded;
        return next();
        }
    }

    // Anonymous user: free tier, generate temp userId
    const anonId = 'anon_' + generateUUID().slice(0,8);
    req.user = { userId: anonId };
    req.isAnonymous = true;

    next();
};

module.exports = optionalAuth;
