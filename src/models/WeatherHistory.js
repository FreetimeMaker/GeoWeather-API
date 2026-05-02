const pool = require('../config/database');
const { generateUUID } = require('../utils/helpers');

const WeatherHistory = {
  async create(userId, location, weatherData, sensorData) {
    const historyId = generateUUID();
    const recordedAt = new Date();

    const query = `
      INSERT INTO weather_history (
        id, user_id, location, temperature, humidity, pressure, 
        wind_speed, conditions, sensor_data, recorded_at, created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *;
    `;

    const result = await pool.query(query, [
      historyId,
      userId,
      location,
      weatherData.temperature,
      weatherData.humidity,
      weatherData.pressure,
      weatherData.windSpeed,
      weatherData.conditions,
      JSON.stringify(sensorData || {}),
      recordedAt,
      recordedAt,
    ]);

    return result.rows[0];
  },

  async findByUserIdAndDateRange(userId, startDate, endDate) {
    const query = `
      SELECT * FROM weather_history 
      WHERE user_id = $1 
      AND recorded_at BETWEEN $2 AND $3
      ORDER BY recorded_at DESC;
    `;

    const result = await pool.query(query, [userId, startDate, endDate]);
    return result.rows;
  },

  async getMonthlyAverage(userId, location, year, month) {
    const query = `
      SELECT 
        AVG(temperature) as avg_temperature,
        AVG(humidity) as avg_humidity,
        AVG(pressure) as avg_pressure,
        AVG(wind_speed) as avg_wind_speed,
        MAX(temperature) as max_temperature,
        MIN(temperature) as min_temperature,
        COUNT(*) as record_count
      FROM weather_history
      WHERE user_id = $1 
      AND location = $2
      AND EXTRACT(YEAR FROM recorded_at) = $3
      AND EXTRACT(MONTH FROM recorded_at) = $4;
    `;

    const result = await pool.query(query, [userId, location, year, month]);
    return result.rows[0];
  },

  async getYearlyTrend(userId, location, year) {
    const query = `
      SELECT 
        EXTRACT(MONTH FROM recorded_at) as month,
        AVG(temperature) as avg_temperature,
        AVG(humidity) as avg_humidity,
        COUNT(*) as record_count
      FROM weather_history
      WHERE user_id = $1 
      AND location = $2
      AND EXTRACT(YEAR FROM recorded_at) = $3
      GROUP BY EXTRACT(MONTH FROM recorded_at)
      ORDER BY month;
    `;

    const result = await pool.query(query, [userId, location, year]);
    return result.rows;
  },

  async archiveOldRecords() {
    // Archiviere Datensätze älter als 1 Jahr
    const query = `
      DELETE FROM weather_history 
      WHERE recorded_at < NOW() - INTERVAL '1 year';
    `;

    const result = await pool.query(query);
    return result.rowCount;
  },
};

module.exports = WeatherHistory;
