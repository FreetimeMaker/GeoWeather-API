const supabase = require('../config/database');
const { generateUUID } = require('../utils/helpers');

const Orte = {
  async create(userId, name, latitude, longitude) {
    const ortId = generateUUID();
    const createdAt = new Date().toISOString();

    const { data, error } = await supabase
      .from('orte')
      .insert({
        id: ortId,
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
      .from('orte')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async findById(ortId) {
    const { data, error } = await supabase
      .from('orte')
      .select('*')
      .eq('id', ortId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  async update(ortId, userId, data) {
    const { name, latitude, longitude } = data;
    const { data: updatedData, error } = await supabase
      .from('orte')
      .update({
        name,
        latitude,
        longitude,
        updated_at: new Date().toISOString()
      })
      .eq('id', ortId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;
    return updatedData;
  },

  async delete(ortId, userId) {
    const { error } = await supabase
      .from('orte')
      .delete()
      .eq('id', ortId)
      .eq('user_id', userId);

    return !error;
  },

  async sync(userId, orte) {
    const { error: deleteError } = await supabase
      .from('orte')
      .delete()
      .eq('user_id', userId);

    if (deleteError) throw deleteError;

    const newOrte = orte.map(o => ({
      id: generateUUID(),
      user_id: userId,
      name: o.name,
      latitude: o.latitude,
      longitude: o.longitude,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));

    const { data, error } = await supabase
      .from('orte')
      .insert(newOrte);

    if (error) throw error;

    return this.findByUserId(userId);
  },
};

module.exports = Orte;

