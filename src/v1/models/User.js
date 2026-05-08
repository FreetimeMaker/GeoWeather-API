const supabase = require('../config/database');
const { generateUUID } = require('../utils/helpers');
const bcrypt = require('bcryptjs');

const User = {

  // ---------------------------------------------------------
  // Create normal user (username + password)
  // ---------------------------------------------------------
  async create(username, password, name) {
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
        subscription_tier: username === "DEIN_USERNAME" ? "premium" : "freemium",
        created_at: createdAt,
        updated_at: createdAt
      })
      .select('id, username, name, avatar_url, subscription_tier, created_at, updated_at')
      .single();

    if (error) throw error;
    return data;
  },

  // ---------------------------------------------------------
  // Create OAuth user (GitHub)
  // ---------------------------------------------------------
  async createOAuthUser(username, name, avatar_url) {
    const userId = generateUUID();
    const createdAt = new Date().toISOString();

    const { data, error } = await supabase
      .from('users')
      .insert({
        id: userId,
        username,
        name,
        avatar_url,
        subscription_tier: username === "DEIN_GITHUB_USERNAME" ? "premium" : "freemium",
        created_at: createdAt,
        updated_at: createdAt
      })
      .select('id, username, name, avatar_url, subscription_tier, created_at, updated_at')
      .single();

    if (error) throw error;
    return data;
  },

  // ---------------------------------------------------------
  // Find by ID
  // ---------------------------------------------------------
  async findById(userId) {
    const { data, error } = await supabase
      .from('users')
      .select('id, username, name, avatar_url, subscription_tier, created_at, updated_at, password')
      .eq('id', userId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  // ---------------------------------------------------------
  // Find by username
  // ---------------------------------------------------------
  async findByUsername(username) {
    const { data, error } = await supabase
      .from('users')
      .select('id, username, name, avatar_url, subscription_tier, created_at, updated_at, password')
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
  },

  // ---------------------------------------------------------
  // Update user
  // ---------------------------------------------------------
  async update(userId, data) {
    const { username, name, subscription_tier } = data;

    const { data: updatedData, error } = await supabase
      .from('users')
      .update({
        username,
        name,
        subscription_tier,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select('id, username, name, avatar_url, subscription_tier, created_at, updated_at')
      .single();

    if (error) throw error;
    return updatedData;
  },

  // ---------------------------------------------------------
  // Delete user
  // ---------------------------------------------------------
  async delete(userId) {
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', userId);

    return !error;
  },
};

module.exports = User;