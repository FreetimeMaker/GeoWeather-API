const supabase = require('../config/database');
const { generateUUID } = require('../utils/helpers');
const bcrypt = require('bcryptjs');

const User = {
  async create(username, password, name) {
    const userId = generateUUID();
    const hashedPassword = await bcrypt.hash(password, 10);
    const createdAt = new Date().toISOString(); // Supabase prefers ISO strings

    try {
      const { data, error } = await supabase
        .from('users')
        .insert({
          id: userId,
          username,
          password: hashedPassword,
          name,
          created_at: createdAt,
          updated_at: createdAt
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505' || error.details?.includes('duplicate key')) {
          throw new Error('Username already taken');
        }
        throw error;
      }

      return data;
    } catch (error) {
      throw error;
    }
  },

  async findById(userId) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error && error.code !== 'PGRST116') { // No rows
      throw error;
    }

    return data;
  },

  async findByUsername(username) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    return data;
  },

  async verifyPassword(password, hashedPassword) {
    return bcrypt.compare(password, hashedPassword);
  },

  async update(userId, data) {
    const { username, name, subscription_tier } = data; // Fixed: no 'email'
    const { data: updatedData, error } = await supabase
      .from('users')
      .update({
        username,
        name,
        subscription_tier,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return updatedData;
  },

  async delete(userId) {
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', userId);

    return !error;
  },
};

module.exports = User;

