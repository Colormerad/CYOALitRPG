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
    const choiceIds = [91, 92, 93];

    await client.query('BEGIN');

    const before = await client.query(
      'SELECT id, storynodeid, nextnodeid, choicetext FROM StoryChoice WHERE id = ANY($1::int[]) ORDER BY id',
      [choiceIds]
    );
    console.log(`[fix_end_choices_91_92_93] Before (count=${before.rowCount}):`);
    before.rows.forEach(r => console.log(`  id=${r.id}, storyNodeId=${r.storynodeid}, nextNodeId=${r.nextnodeid}, text=${r.choicetext}`));

    const upd = await client.query(
      'UPDATE StoryChoice SET nextnodeid = NULL WHERE id = ANY($1::int[])',
      [choiceIds]
    );
    console.log(`[fix_end_choices_91_92_93] Updated rows set nextnodeid=NULL: ${upd.rowCount}`);

    const after = await client.query(
      'SELECT id, storynodeid, nextnodeid, choicetext FROM StoryChoice WHERE id = ANY($1::int[]) ORDER BY id',
      [choiceIds]
    );
    console.log('[fix_end_choices_91_92_93] After:');
    after.rows.forEach(r => console.log(`  id=${r.id}, storyNodeId=${r.storynodeid}, nextNodeId=${r.nextnodeid}, text=${r.choicetext}`));

    await client.query('COMMIT');
    console.log('[fix_end_choices_91_92_93] DONE');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[fix_end_choices_91_92_93] ERROR:', err.message || err);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
})();
