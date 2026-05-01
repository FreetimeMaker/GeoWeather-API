require('dotenv').config();
const pool = require('../src/config/database');

const migrations = [
  // Users table
  `
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY,
      username VARCHAR(255) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      name VARCHAR(255) NOT NULL,
      subscription_tier VARCHAR(50) DEFAULT 'free',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `,

  // Favorites table
  `
    CREATE TABLE IF NOT EXISTS favorites (
      id UUID PRIMARY KEY,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      latitude DECIMAL(10, 8) NOT NULL,
      longitude DECIMAL(11, 8) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `,

  // Weather history table
  `
    CREATE TABLE IF NOT EXISTS weather_history (
      id UUID PRIMARY KEY,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      location VARCHAR(255) NOT NULL,
      temperature DECIMAL(5, 2),
      humidity DECIMAL(5, 2),
      pressure DECIMAL(7, 2),
      wind_speed DECIMAL(5, 2),
      conditions VARCHAR(255),
      sensor_data JSONB,
      recorded_at TIMESTAMP NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `,

  // Subscriptions table
  `
    CREATE TABLE IF NOT EXISTS subscriptions (
      id UUID PRIMARY KEY,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      tier VARCHAR(50) NOT NULL,
      payment_method VARCHAR(255),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      expires_at TIMESTAMP,
      is_active BOOLEAN DEFAULT true
    )
  `,

  // Push notifications table
  `
    CREATE TABLE IF NOT EXISTS push_notifications (
      id UUID PRIMARY KEY,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title VARCHAR(255) NOT NULL,
      message TEXT NOT NULL,
      event_type VARCHAR(100),
      latitude DECIMAL(10, 8),
      longitude DECIMAL(11, 8),
      read BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `,

  // Indexes
  `CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON favorites(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_weather_history_user_id ON weather_history(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_weather_history_recorded_at ON weather_history(recorded_at)`,
  `CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_push_notifications_user_id ON push_notifications(user_id)`,
];

async function runMigrations() {
  try {
    console.log('Starte Datenbankmigrationen...');

    for (const migration of migrations) {
      await pool.query(migration);
      console.log('✓ Migration ausgeführt');
    }

    console.log('✓ Alle Migrationen erfolgreich abgeschlossen');
    process.exit(0);
  } catch (error) {
    console.error('✗ Migrationsfehler:', error);
    process.exit(1);
  }
}

runMigrations();
