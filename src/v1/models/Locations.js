const supabase = require('../config/database');
const { generateUUID } = require('../utils/helpers');

const Locations = {
    async create(userId, name, latitude, longitude) {
        const locationId = generateUUID();
        const createdAt = new Date().toISOString();

        const { data, error } = await supabase
        .from('locations')
        .insert({
            id: locationId,
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
        .from('locations')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
    },

    async findById(locationId) {
        const { data, error } = await supabase
        .from('locations')
        .select('*')
        .eq('id', locationId)
        .single();

        if (error && error.code !== 'PGRST116') throw error;
        return data;
    },

    async update(locationId, userId, data) {
        const { name, latitude, longitude } = data;
        const { data: updatedData, error } = await supabase
        .from('locations')
        .update({
            name,
            latitude,
            longitude,
            updated_at: new Date().toISOString()
        })
        .eq('id', locationId)
        .eq('user_id', userId)
        .select()
        .single();

        if (error) throw error;
        return updatedData;
    },

    async delete(locationId, userId) {
        const { error } = await supabase
        .from('locations')
        .delete()
        .eq('id', locationId)
        .eq('user_id', userId);

        return !error;
    },

    async sync(userId, locations) {
        // Delete all
        const { error: deleteError } = await supabase
        .from('locations')
        .delete()
        .eq('user_id', userId);

        if (deleteError) throw deleteError;

        // Insert new
        const newLocations = locations.map(loc => ({
        id: generateUUID(),
        user_id: userId,
        name: loc.name,
        latitude: loc.latitude,
        longitude: loc.longitude,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
        }));

        const { data, error } = await supabase
        .from('locations')
        .insert(newLocations);

        if (error) throw error;

        return this.findByUserId(userId);
    },
};

module.exports = Locations;
