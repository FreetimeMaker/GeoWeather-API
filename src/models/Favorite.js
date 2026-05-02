const pool = require('../config/database');
const { generateUUID } = require('../utils/helpers');

const Favorite = {
async create(userId, name, latitude, longitude) {
    const favoriteId = generateUUID();
    const createdAt = new Date();

    const query = `
      INSERT INTO favorites (id, user_id, name, latitude, longitude, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *;
    `;

    const result = await pool.query(query, [
      favoriteId,
      userId,
      name,
      latitude,
      longitude,
      createdAt,
      createdAt,
    ]);

    return result.rows[0];
  },

  async findByUserId(userId) {
    const query = `
      SELECT * FROM favorites 
      WHERE user_id = $1 
      ORDER BY created_at DESC;
    `;

    const result = await pool.query(query, [userId]);
    return result.rows;
  },

  async findById(favoriteId) {
    const query = 'SELECT * FROM favorites WHERE id = $1';
    const result = await pool.query(query, [favoriteId]);
    return result.rows[0];
  },

  async update(favoriteId, userId, data) {
    const { name, latitude, longitude } = data;
    const query = `
      UPDATE favorites 
      SET name = COALESCE($3, name),
          latitude = COALESCE($4, latitude),
          longitude = COALESCE($5, longitude),
          updated_at = NOW()
      WHERE id = $1 AND user_id = $2
      RETURNING *;
    `;

    const result = await pool.query(query, [
      favoriteId,
      userId,
      name,
      latitude,
      longitude,
    ]);

    return result.rows[0];
  },

  async delete(favoriteId, userId) {
    const query = 'DELETE FROM favorites WHERE id = $1 AND user_id = $2 RETURNING id';
    const result = await pool.query(query, [favoriteId, userId]);
    return result.rowCount > 0;
  },

  async sync(userId, favorites) {
    // Wird geräteübergreifend synchronisiert
    const query = `
      DELETE FROM favorites WHERE user_id = $1;
    `;
    await pool.query(query, [userId]);

    // Neue Favoriten einfügen
for (const fav of favorites) {
      const favoriteId = generateUUID();
      const createdAt = new Date();

      const insertQuery = `
        INSERT INTO favorites (id, user_id, name, latitude, longitude, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7);
      `;

      await pool.query(insertQuery, [
        favoriteId,
        userId,
        fav.name,
        fav.latitude,
        fav.longitude,
        createdAt,
        createdAt,
      ]);
    }

    return this.findByUserId(userId);
  },
};

module.exports = Favorite;
