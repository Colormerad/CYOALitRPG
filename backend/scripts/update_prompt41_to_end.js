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
    const sourcePromptId = 41; // prompt whose options should all go to The End

    await client.query('BEGIN');

    const endNode = await client.query('SELECT id, title FROM StoryNode WHERE id = $1', [targetNodeId]);
    if (!endNode.rows.length) {
      throw new Error(`Target StoryNode id=${targetNodeId} not found`);
    }
    console.log(`[update_prompt41_to_end] Target node: id=${endNode.rows[0].id}, title="${endNode.rows[0].title}"`);

    const before = await client.query(
      'SELECT id, storynodeid, nextnodeid, choicetext FROM StoryChoice WHERE storynodeid = $1 ORDER BY id',
      [sourcePromptId]
    );
    console.log(`[update_prompt41_to_end] Choices before update (count=${before.rowCount}):`);
    before.rows.forEach(r => console.log(`  id=${r.id}, nextNodeId=${r.nextnodeid}, text=${r.choicetext}`));

    const upd = await client.query(
      'UPDATE StoryChoice SET nextnodeid = $1 WHERE storynodeid = $2',
      [targetNodeId, sourcePromptId]
    );
    console.log(`[update_prompt41_to_end] Updated rows: ${upd.rowCount}`);

    const after = await client.query(
      'SELECT id, storynodeid, nextnodeid, choicetext FROM StoryChoice WHERE storynodeid = $1 ORDER BY id',
      [sourcePromptId]
    );
    console.log('[update_prompt41_to_end] Choices after update:');
    after.rows.forEach(r => console.log(`  id=${r.id}, nextNodeId=${r.nextnodeid}, text=${r.choicetext}`));

    await client.query('COMMIT');
    console.log('[update_prompt41_to_end] DONE');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[update_prompt41_to_end] ERROR:', err.message || err);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
})();
