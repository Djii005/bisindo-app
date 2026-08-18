const { createClient } = require('@libsql/client');
const path = require('path');

const url = process.env.TURSO_DATABASE_URL || `file:${path.join(__dirname, 'bisindo.db')}`;
const authToken = process.env.TURSO_AUTH_TOKEN;

const client = createClient({
  url,
  authToken,
});

async function initDb() {
  await client.executeMultiple(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      full_name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      avatar_url TEXT,
      level INTEGER DEFAULT 1,
      total_xp INTEGER DEFAULT 0,
      streak_days INTEGER DEFAULT 0,
      last_active TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS user_progress (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      module_id TEXT NOT NULL,
      lessons_completed INTEGER DEFAULT 0,
      total_lessons INTEGER NOT NULL,
      xp_earned INTEGER DEFAULT 0,
      updated_at TEXT DEFAULT (datetime('now')),
      UNIQUE(user_id, module_id)
    );

    CREATE TABLE IF NOT EXISTS user_achievements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      achievement_id TEXT NOT NULL,
      unlocked_at TEXT DEFAULT (datetime('now')),
      UNIQUE(user_id, achievement_id)
    );

    CREATE TABLE IF NOT EXISTS practice_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      correct INTEGER DEFAULT 0,
      incorrect INTEGER DEFAULT 0,
      accuracy REAL,
      xp_earned INTEGER DEFAULT 0,
      duration_seconds INTEGER,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  const mode = process.env.TURSO_DATABASE_URL ? 'Turso Cloud' : 'Local SQLite file';
  console.log(`✅ Database initialized [${mode}]`);
}

function getDb() {
  return client;
}

module.exports = { getDb, initDb };
