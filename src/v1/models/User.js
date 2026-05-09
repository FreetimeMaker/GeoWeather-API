const supabase = require('../config/database');
const { generateUUID } = require('../utils/helpers');
const bcrypt = require('bcryptjs');

const User = {

  // ---------------------------------------------------------
  // Create normal user (username + password + email)
  // ---------------------------------------------------------
  async create(username, password, name, email) {
    const userId = generateUUID();
    const hashedPassword = await bcrypt.hash(password, 10);
    const createdAt = new Date().toISOString();

    const { data, error } = await supabase
      .from('users')
      .insert({
        id: userId,
        username,
        password: hashedPassword,
        name,
        email,
        subscription_tier: "freemium",
        created_at: createdAt,
        updated_at: createdAt
      })
      .select('*')
      .single();

    if (error) throw error;
    return data;
  },

  // ---------------------------------------------------------
  // Create OAuth user (GitHub / Modrinth / etc.)
  // ---------------------------------------------------------
  async createOAuthUser({ username, name, email, avatar_url, provider, provider_id }) {
    const userId = generateUUID();
    const createdAt = new Date().toISOString();

    const { data, error } = await supabase
      .from('users')
      .insert({
        id: userId,
        username,
        name,
        email,
        avatar_url,
        provider,
        provider_id,
        subscription_tier: "freemium",
        created_at: createdAt,
        updated_at: createdAt
      })
      .select('*')
      .single();

    if (error) throw error;
    return data;
  },

  // ---------------------------------------------------------
  // Find by email
  // ---------------------------------------------------------
  async findByEmail(email) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  // ---------------------------------------------------------
  // Find by provider + provider_id
  // ---------------------------------------------------------
  async findByProvider(provider, provider_id) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('provider', provider)
      .eq('provider_id', provider_id)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  // ---------------------------------------------------------
  // Find by username (legacy)
  // ---------------------------------------------------------
  async findByUsername(username) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  // ---------------------------------------------------------
  // Password check
  // ---------------------------------------------------------
  async verifyPassword(password, hashedPassword) {
    return bcrypt.compare(password, hashedPassword);
  }
};

module.exports = User;
