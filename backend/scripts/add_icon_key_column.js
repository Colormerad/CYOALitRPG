// Migration: add icon_key column to "character" table if it doesn't exist
// Usage: node backend/scripts/add_icon_key_column.js

const { Pool } = require('pg');

const pool = new Pool({
  user: 'cyoa_user',
  host: 'localhost',
  database: 'cyoa_litrpg',
  password: 'cyoa_password',
  port: 5432,
});

async function ensureIconKeyColumn() {
  const client = await pool.connect();
  try {
    console.log('[migration] Checking for icon_key column on "character"...');
    const check = await client.query(
      `SELECT 1 FROM information_schema.columns
       WHERE table_name = 'character' AND column_name = 'icon_key'
       LIMIT 1`
    );

    if (check.rowCount > 0) {
      console.log('[migration] Column icon_key already exists. No changes made.');
      return;
    }

    console.log('[migration] Adding icon_key column (TEXT) to "character"...');
    await client.query('ALTER TABLE "character" ADD COLUMN icon_key TEXT');
    console.log('[migration] Column icon_key added successfully.');
  } catch (err) {
    console.error('[migration] Failed to apply migration:', err);
    process.exitCode = 1;
  } finally {
    client.release();
    // Explicit end to allow process to exit in some environments
    try { await pool.end?.(); } catch (_) {}
  }
}

ensureIconKeyColumn();
