const passport = require('passport');
const GitHubStrategy = require('passport-github2').Strategy;
const { createClient } = require('@supabase/supabase-js');
const { generateUUID } = require('../utils/helpers');

// Supabase Client (Cloud)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();

    if (error) return done(error, null);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
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

          // Find by email
          if (email) {
            const { data } = await supabase
              .from('users')
              .select('*')
              .eq('email', email)
              .single();
            user = data;
          }

          // Find by GitHub ID
          if (!user && profile.id) {
            const { data } = await supabase
              .from('users')
              .select('*')
              .eq('github_id', profile.id)
              .single();
            user = data;
          }

          // Existing user
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

          // Create new user
          const userId = generateUUID();
          const username = profile.username || `user_${profile.id}`;
          const name = profile.displayName || profile.username || username;
          const now = new Date().toISOString();

          const { data: newUser, error: insertError } = await supabase
            .from('users')
            .insert({
              id: userId,
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

          if (insertError) throw insertError;

          return done(null, newUser);

        } catch (error) {
          console.error('GitHub OAuth error:', error);
          return done(error, null);
        }
      }
    )
  );
}
module.exports = passport;
