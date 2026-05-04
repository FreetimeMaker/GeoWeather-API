console.log(">>> USING PASSPORT FILE:", __filename);

const passport = require('passport');
const GitHubStrategy = require('passport-github2').Strategy;
const { createClient } = require('@supabase/supabase-js');
const { generateUUID } = require('../utils/helpers');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
  try {
    const { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();
    done(null, user);
  } catch (e) {
    done(e, null);
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

        if (email) {
          const { data } = await supabase
            .from('users')
            .select('*')
            .eq('email', email)
            .single();
          user = data;
        }

        if (!user) {
          const { data } = await supabase
            .from('users')
            .select('*')
            .eq('github_id', profile.id)
            .single();
          user = data;
        }

        if (user) {
          await supabase
            .from('users')
            .update({
              github_id: user.github_id || profile.id,
              avatar_url: user.avatar_url || avatarUrl
            })
            .eq('id', user.id);

          return done(null, user);
        }

        const newUserId = generateUUID();
        const username = profile.username || `user_${profile.id}`;
        const name = profile.displayName || username;
        const now = new Date().toISOString();

        const { data: newUser } = await supabase
          .from('users')
          .insert({
            id: newUserId,
            username,
            github_id: profile.id,
            name,
            email,
            avatar_url: avatarUrl,
            created_at: now,
            updated_at: now
          })
          .select()
          .single();

        return done(null, newUser);

      } catch (error) {
        return done(error, null);
      }
    }
  )
);

console.log("CLIENT_ID:", process.env.GITHUB_CLIENT_ID);

module.exports = passport;
