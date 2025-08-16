#!/usr/bin/env node
const { Pool } = require('pg');

(async () => {
  const pool = new Pool({
    user: 'cyoa_user',
    host: 'localhost',
    database: 'cyoa_litrpg',
    password: 'cyoa_password',
    port: 5432,
  });

  const client = await pool.connect();
  try {
    const targetNodeId = 24; // The End – Dream or Awakening?
    const choiceIds = [91, 92, 93];

    await client.query('BEGIN');

    const before = await client.query(
      'SELECT id, storynodeid, nextnodeid, choicetext FROM StoryChoice WHERE id = ANY($1::int[]) ORDER BY id',
      [choiceIds]
    );
    console.log(`[update_choices_91_92_93_to_end] Before (count=${before.rowCount}):`);
    before.rows.forEach(r => console.log(`  id=${r.id}, storyNodeId=${r.storynodeid}, nextNodeId=${r.nextnodeid}, text=${r.choicetext}`));

    const upd = await client.query(
      'UPDATE StoryChoice SET nextnodeid = $1 WHERE id = ANY($2::int[])',
      [targetNodeId, choiceIds]
    );
    console.log(`[update_choices_91_92_93_to_end] Updated rows: ${upd.rowCount}`);

    const after = await client.query(
      'SELECT id, storynodeid, nextnodeid, choicetext FROM StoryChoice WHERE id = ANY($1::int[]) ORDER BY id',
      [choiceIds]
    );
    console.log('[update_choices_91_92_93_to_end] After:');
    after.rows.forEach(r => console.log(`  id=${r.id}, storyNodeId=${r.storynodeid}, nextNodeId=${r.nextnodeid}, text=${r.choicetext}`));

    await client.query('COMMIT');
    console.log('[update_choices_91_92_93_to_end] DONE');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[update_choices_91_92_93_to_end] ERROR:', err.message || err);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
})();
