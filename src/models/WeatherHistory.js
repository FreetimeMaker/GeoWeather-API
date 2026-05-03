const supabase = require('../config/database');
const { generateUUID } = require('../utils/helpers');

const WeatherHistory = {
  async create(userId, location, weatherData, sensorData) {
    const historyId = generateUUID();
    const recordedAt = new Date().toISOString();
    const createdAt = recordedAt;

    const { data, error } = await supabase
      .from('weather_history')
      .insert({
        id: historyId,
        user_id: userId,
        location,
        temperature: weatherData.temperature,
        humidity: weatherData.humidity,
        pressure: weatherData.pressure,
        wind_speed: weatherData.windSpeed,
        conditions: weatherData.conditions,
        sensor_data: sensorData || {},
        recorded_at: recordedAt,
        created_at: createdAt
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async findByUserIdAndDateRange(userId, startDate, endDate) {
    const { data, error } = await supabase
      .from('weather_history')
      .select('*')
      .eq('user_id', userId)
      .gte('recorded_at', startDate)
      .lte('recorded_at', endDate)
      .order('recorded_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async getMonthlyAverage(userId, location, year, month) {
    // Note: PostgREST supports aggregates, but EXTRACT requires RPC or sql tag
    // Create RPC function in Supabase SQL editor for complex queries
    // For now, approximate with client filter (full EXTRACT needs RPC)
    const { data, error } = await supabase
      .from('weather_history')
      .select(`
        avg_temperature:avg(temperature),
        avg_humidity:avg(humidity),
        avg_pressure:avg(pressure),
        avg_wind_speed:avg(wind_speed),
        max_temperature:max(temperature),
        min_temperature:min(temperature),
        record_count:count()
      `)
      .eq('user_id', userId)
      .eq('location', location)
      .gte('recorded_at', `${year}-${String(month).padStart(2, '0')}-01`)
      .lt('recorded_at', `${year}-${String(month + 1).padStart(2, '0')}-01`); // Approx month filter

    if (error) throw error;
    return data[0] || null;
  },

  async getYearlyTrend(userId, location, year) {
    // Approximate GROUP BY with client (full EXTRACT needs RPC)
    const { data, error } = await supabase
      .from('weather_history')
      .select(`
        month:recorded_at!month(),
        avg_temperature:avg(temperature),
        avg_humidity:avg(humidity),
        record_count:count()
      `)
      .eq('user_id', userId)
      .eq('location', location)
      .eq('recorded_at_year', year) // Assume indexed column or RPC for EXTRACT
      .order('month');

    if (error) throw error;
    return data || [];
  },

  async archiveOldRecords() {
    const cutoff = new Date();
    cutoff.setFullYear(cutoff.getFullYear() - 1);
    cutoff = cutoff.toISOString();

    const { error, count } = await supabase
      .from('weather_history')
      .delete()
      .lt('recorded_at', cutoff);

    if (error) throw error;
    return count || 0;
  },
};

module.exports = WeatherHistory;

