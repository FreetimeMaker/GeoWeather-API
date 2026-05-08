const jwt = require('jsonwebtoken');

const generateToken = (user) => {
    return jwt.sign(
        {
        userId: user.id,
        username: user.username,
        avatar: user.avatar_url
        },
        process.env.JWT_SECRET,
        { 
        expiresIn: process.env.JWT_EXPIRY || '7d'
        }
    );
};

const generateRefreshToken = (user) => {
    return jwt.sign(
        {
        userId: user.id
        },
        process.env.JWT_SECRET + '_refresh',
        { 
        expiresIn: process.env.REFRESH_TOKEN_EXPIRY || '30d'
        }
    );
};

const verifyToken = (token) => {
    try {
        return jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
        return null;
    }
};

module.exports = {
    generateToken,
    generateRefreshToken,
    verifyToken,
};