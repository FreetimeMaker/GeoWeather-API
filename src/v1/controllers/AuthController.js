const User = require('../models/User');
const { generateToken, generateRefreshToken } = require('../config/auth');
const https = require("https");
const querystring = require("querystring");

// ---------------------------------------------------------
// GitHub OAuth – Start
// ---------------------------------------------------------
async function githubAuth(req, res) {
    const clientId = process.env.GITHUB_CLIENT_ID;

    const redirect = `https://github.com/login/oauth/authorize?client_id=${clientId}&scope=user:email`;

    res.redirect(redirect);
}

// ---------------------------------------------------------
// GitHub OAuth – Callback (Deep Link Redirect)
// ---------------------------------------------------------
async function githubCallback(req, res) {
    try {
        const { code } = req.query;

        const token = await exchangeCodeForToken(code);
        const ghUser = await fetchGitHubUser(token);

        let user = await User.findByUsername(ghUser.login);

        if (!user) {
        user = await User.createOAuthUser(
            ghUser.login,
            ghUser.name || ghUser.login,
            ghUser.avatar_url
        );
        }

        const jwt = generateToken(user.id, user.username);
        const refreshToken = generateRefreshToken(user.id);

        const avatar = encodeURIComponent(user.avatar_url || "");

        return res.redirect(
        `geoweather://auth/callback?token=${jwt}&avatar=${avatar}`
        );

    } catch (error) {
        console.error("GitHub OAuth error:", error);
        return res.status(500).json({ message: "OAuth failed", error: error.message });
    }
}

// ---------------------------------------------------------
// GitHub OAuth – Mobile JSON Callback
// ---------------------------------------------------------
async function githubMobileCallback(req, res) {
    try {
        const { code } = req.query;

        const token = await exchangeCodeForToken(code);
        const ghUser = await fetchGitHubUser(token);

        let user = await User.findByUsername(ghUser.login);

        if (!user) {
        user = await User.createOAuthUser(
            ghUser.login,
            ghUser.name || ghUser.login,
            ghUser.avatar_url
        );
        }

        const jwt = generateToken(user.id, user.username);
        const refreshToken = generateRefreshToken(user.id);

        return res.status(200).json({
        success: true,
        message: "GitHub authentication successful",
        user: {
            id: user.id,
            username: user.username,
            name: user.name,
            avatar_url: user.avatar_url,
            subscription_tier: user.subscription_tier
        },
        token: jwt,
        refreshToken
        });

    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
}

// ---------------------------------------------------------
// Registrierung (Username + Passwort)
// ---------------------------------------------------------
async function register(req, res) {
    try {
        const { username, password, name } = req.body;

        if (!username || !password || !name) {
        return res.status(400).json({ message: 'Username, password and name required' });
        }

        const existingUser = await User.findByUsername(username);
        if (existingUser) {
        return res.status(400).json({ message: 'Username already taken' });
        }

        const user = await User.create(username, password, name);

        const token = generateToken(user.id, user.username);
        const refreshToken = generateRefreshToken(user.id);

        return res.status(201).json({
        message: 'User successfully registered',
        user: {
            id: user.id,
            username: user.username,
            name: user.name,
            subscription_tier: user.subscription_tier,
        },
        token,
        refreshToken,
        });

    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
}

// ---------------------------------------------------------
// Login (Username + Passwort)
// ---------------------------------------------------------
async function login(req, res) {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
        return res.status(400).json({ message: 'Username and password required' });
        }

        const user = await User.findByUsername(username);
        if (!user) {
        return res.status(401).json({ message: 'Invalid credentials' });
        }

        const isPasswordValid = await User.verifyPassword(password, user.password);
        if (!isPasswordValid) {
        return res.status(401).json({ message: 'Invalid credentials' });
        }

        const token = generateToken(user.id, user.username);
        const refreshToken = generateRefreshToken(user.id);

        return res.status(200).json({
        message: 'Successfully logged in',
        user: {
            id: user.id,
            username: user.username,
            name: user.name,
            subscription_tier: user.subscription_tier,
        },
        token,
        refreshToken,
        });

    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
}

// ---------------------------------------------------------
// Logout
// ---------------------------------------------------------
async function logout(req, res) {
    return res.status(200).json({ message: 'Successfully logged out' });
}

// ---------------------------------------------------------
// Helper: Exchange GitHub Code for Access Token
// ---------------------------------------------------------
function exchangeCodeForToken(code) {
    const postData = querystring.stringify({
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code
    });

    const options = {
        hostname: "github.com",
        path: "/login/oauth/access_token",
        method: "POST",
        headers: {
        "Accept": "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
        "Content-Length": Buffer.byteLength(postData)
        }
    };

    return new Promise((resolve, reject) => {
        const request = https.request(options, (response) => {
        let data = "";

        response.on("data", (chunk) => data += chunk);
        response.on("end", () => {
            try {
            const json = JSON.parse(data);
            if (!json.access_token) return reject(new Error("No access token"));
            resolve(json.access_token);
            } catch (err) {
            reject(err);
            }
        });
        });

        request.on("error", reject);
        request.write(postData);
        request.end();
    });
}

// ---------------------------------------------------------
// Helper: Fetch GitHub User
// ---------------------------------------------------------
function fetchGitHubUser(token) {
    return new Promise((resolve, reject) => {
        const options = {
        hostname: "api.github.com",
        path: "/user",
        method: "GET",
        headers: {
            "User-Agent": "GeoWeather-App",
            "Authorization": `Bearer ${token}`
        }
        };

        const request = https.request(options, (response) => {
        let data = "";

        response.on("data", (chunk) => data += chunk);
        response.on("end", () => {
            try {
            resolve(JSON.parse(data));
            } catch (err) {
            reject(err);
            }
        });
        });

        request.on("error", reject);
        request.end();
    });
}

module.exports = {
    githubAuth,
    githubCallback,
    githubMobileCallback,
    register,
    login,
    logout
};