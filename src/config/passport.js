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
        const email = profile.emails?.[0]?.value || null;
        const avatarUrl = profile.photos?.[0]?.value || null;

        let user = null;

        // Try find by email
        if (email) {
          const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
          user = result.rows[0];
        }

        // Try find by GitHub ID
        if (!user && profile.id) {
          const result = await pool.query('SELECT * FROM users WHERE github_id = $1', [profile.id]);
          user = result.rows[0];
        }

        // Existing user
        if (user) {
          // Update GitHub ID if missing
          if (!user.github_id) {
            await pool.query(
              'UPDATE users SET github_id = $1 WHERE id = $2',
              [profile.id, user.id]
            );
          }

          // Update avatar if missing
          if (!user.avatar_url && avatarUrl) {
            await pool.query(
              'UPDATE users SET avatar_url = $1 WHERE id = $2',
              [avatarUrl, user.id]
            );
            user.avatar_url = avatarUrl;
          }

          return done(null, user);
        }

        // Create new user
        const userId = generateUUID();
        const username = profile.username || `user_${profile.id}`;
        const name = profile.displayName || profile.username || username;

        const result = await pool.query(
          `INSERT INTO users (id, username, github_id, name, avatar_url, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
           RETURNING *`,
          [userId, username, profile.id, name, avatarUrl]
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