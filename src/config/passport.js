const passport = require('passport');
const GitHubStrategy = require('passport-github2').Strategy;
const supabase = require('../config/database');
const User = require('../models/User');
const { generateUUID } = require('../utils/helpers');
const crypto = require('crypto');



passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

    // Only init GitHub strategy if credentials available
    if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
      passport.use(
        new GitHubStrategy(
          {
      clientID: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      callbackURL: `https://geo-weather-api.vercel.app/api/auth/github/callback`,
      scope: ['user:email', 'read:user'],
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value || null;
        const avatarUrl = profile.photos?.[0]?.value || null;

        let user = null;

        // Try find by email
        if (email) {
          const { data: result } = await supabase
            .from('users')
            .select('*')
            .eq('email', email)
            .single();
          user = result;
        }

        // Try find by GitHub ID
        if (!user && profile.id) {
          const { data: result } = await supabase
            .from('users')
            .select('*')
            .eq('github_id', profile.id)
            .single();
          user = result;
        }

        // Existing user
        if (user) {
          // Update GitHub ID if missing
          if (!user.github_id) {
            const { error: updateError } = await supabase
              .from('users')
              .update({ github_id: profile.id })
              .eq('id', user.id);
            if (updateError) console.error('Update github_id failed:', updateError);
          }

          // Update avatar if missing
          if (!user.avatar_url && avatarUrl) {
            const { error: avatarError } = await supabase
              .from('users')
              .update({ avatar_url: avatarUrl })
              .eq('id', user.id);
            if (avatarError) console.error('Update avatar failed:', avatarError);
            else user.avatar_url = avatarUrl;
          }

          return done(null, user);
        }

        // Create new user
        const userId = generateUUID();
        const username = profile.username || `user_${profile.id}`;
        const name = profile.displayName || profile.username || username;
        const now = new Date().toISOString();

        const { data: result, error: insertError } = await supabase
          .from('users')
          .insert({
            id: userId,
            username,
            github_id: profile.id,
            name,
            avatar_url: avatarUrl,
            created_at: now,
            updated_at: now
          })
          .select()
          .single();

        if (insertError) {
          console.error('User insert failed:', insertError);
          throw insertError;
        }

        return done(null, result);

      } catch (error) {
        console.error('GitHub OAuth error:', error);
        return done(error, null);
      }
    }
  )
      );
    }

module.exports = passport;
