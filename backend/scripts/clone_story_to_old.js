/*
  Clone current story tables into backup tables within the same DB.
  - Creates tables: story_old, choices_old (if not exist) with same schema as storynode, storychoice.
  - Truncates the target tables to avoid duplicates on repeated runs.
  - Copies all current rows from storynode/storychoice into the _old tables.

  Usage:
    node backend/scripts/clone_story_to_old.js
*/
const { pool } = require('../repositories/db');

(async () => {
  const client = await pool.connect();
  try {
    console.log('[clone] Starting clone of story tables to story_old / choices_old');
    await client.query('BEGIN');

    // Create clone tables if not exist, copying schema (including constraints, defaults, indexes)
    await client.query(`
      CREATE TABLE IF NOT EXISTS story_old (LIKE storynode INCLUDING ALL);
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS choices_old (LIKE storychoice INCLUDING ALL);
    `);

    // Clear target tables to be idempotent
    await client.query('TRUNCATE TABLE story_old');
    await client.query('TRUNCATE TABLE choices_old');

    // Copy data
    const storyRes = await client.query('INSERT INTO story_old SELECT * FROM storynode RETURNING 1');
    const choiceRes = await client.query('INSERT INTO choices_old SELECT * FROM storychoice RETURNING 1');

    await client.query('COMMIT');
    console.log(`[clone] Done. Copied storynode -> story_old (rows: ${storyRes.rowCount}) and storychoice -> choices_old (rows: ${choiceRes.rowCount}).`);
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('[clone] Failed:', e);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
})();
