const { Pool } = require('pg');

// Vercel Postgres uses POSTGRES_CONNECTION_STRING env variable
const connectionString = process.env.POSTGRES_CONNECTION_STRING || process.env.DATABASE_URL;

// Fallback to individual env vars for local development
const poolConfig = connectionString
  ? { connectionString }
  : {
      user: process.env.DB_USER || 'geoweather_user',
      password: process.env.DB_PASSWORD || 'password',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT, 10) || 5432,
      database: process.env.DB_NAME || 'geoweather',
    };

const pool = new Pool({
  ...poolConfig,
  // Vercel serverless optimization
  max: process.env.NODE_ENV === 'production' ? 1 : 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

// Health check for database connection
pool.healthCheck = async () => {
  try {
    const result = await pool.query('SELECT 1');
    return result.rowCount === 1;
  } catch (error) {
    console.error('Database health check failed:', error);
    return false;
  }
};

module.exports = pool;
