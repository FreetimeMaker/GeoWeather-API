const supabase = require('../config/database');
const { generateUUID } = require('../utils/helpers');

const Favorite = {
  async create(userId, name, latitude, longitude) {
    const favoriteId = generateUUID();
    const createdAt = new Date().toISOString();

    const { data, error } = await supabase
      .from('favorites')
      .insert({
        id: favoriteId,
        user_id: userId,
        name,
        latitude,
        longitude,
        created_at: createdAt,
        updated_at: createdAt
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async findByUserId(userId) {
    const { data, error } = await supabase
      .from('favorites')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async findById(favoriteId) {
    const { data, error } = await supabase
      .from('favorites')
      .select('*')
      .eq('id', favoriteId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  async update(favoriteId, userId, data) {
    const { name, latitude, longitude } = data;
    const { data: updatedData, error } = await supabase
      .from('favorites')
      .update({
        name,
        latitude,
        longitude,
        updated_at: new Date().toISOString()
      })
      .eq('id', favoriteId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;
    return updatedData;
  },

  async delete(favoriteId, userId) {
    const { error } = await supabase
      .from('favorites')
      .delete()
      .eq('id', favoriteId)
      .eq('user_id', userId);

    return !error;
  },

  async sync(userId, favorites) {
    const { error: deleteError } = await supabase
      .from('favorites')
      .delete()
      .eq('user_id', userId);

    if (deleteError) throw deleteError;

    const newFavorites = favorites.map(fav => ({
      id: generateUUID(),
      user_id: userId,
      name: fav.name,
      latitude: fav.latitude,
      longitude: fav.longitude,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));

    const { data, error } = await supabase
      .from('favorites')
      .insert(newFavorites);

    if (error) throw error;

    return this.findByUserId(userId);
  },
};

module.exports = Favorite;
