const passport = require('passport');
const GitHubStrategy = require('passport-github2').Strategy;
const pool = require('../config/database');
const crypto = require('crypto');

function generateUUID() {
  return crypto.randomUUID();
}

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    done(null, user.rows[0]);
  } catch (error) {
    done(error, null);
  }
});

passport.use(
  new GitHubStrategy(
    {
      clientID: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      callbackURL: "https://geo-weather-api.vercel.app/api/auth/github/callback",
      scope: ['user:email'],
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Try to find existing user by github_id or email
        const email = profile.emails?.[0]?.value || null;
        let user = null;

        if (email) {
          user = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
          user = user.rows[0];
        }

        if (!user && profile.id) {
          user = await pool.query('SELECT * FROM users WHERE github_id = $1', [profile.id]);
          user = user.rows[0];
        }

        if (user) {
          // Update github_id if not set
          if (!user.github_id) {
            await pool.query('UPDATE users SET github_id = $1 WHERE id = $2', [profile.id, user.id]);
          }
          return done(null, user);
        }

// Create new user
        const userId = generateUUID();
        const username = profile.username || `user_${profile.id}`;
        const name = profile.displayName || profile.username || username;
        const githubId = profile.id;

        const result = await pool.query(
          `INSERT INTO users (id, username, github_id, name, created_at, updated_at)
           VALUES ($1, $2, $3, $4, NOW(), NOW())
           RETURNING *`,
          [userId, username, githubId, name]
        );

        return done(null, result.rows[0]);
      } catch (error) {
        console.error('GitHub OAuth error:', error);
        return done(error, null);
      }
    }
  )
);

module.exports = passport;
