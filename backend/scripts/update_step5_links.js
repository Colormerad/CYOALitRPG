const { Pool } = require('pg');

// Config must match your local DB creds
const pool = new Pool({
  user: 'cyoa_user',
  host: 'localhost',
  database: 'cyoa_litrpg',
  password: 'cyoa_password',
  port: 5432,
});

(async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const sourceNodeId = Number(process.env.STEP_NODE_ID || 5);

    // 1) Find the new target nodes by title
    const titles = ['The Masked Path', 'The Stagecoach'];
    const titleToId = {};

    const res = await client.query(
      `select id, title from storynode where title = any($1)`,
      [titles]
    );

    for (const row of res.rows) {
      titleToId[row.title] = row.id;
    }

    const maskedPathId = titleToId['The Masked Path'];
    const stagecoachId = titleToId['The Stagecoach'];

    if (!maskedPathId || !stagecoachId) {
      throw new Error(`Could not find target nodes. Found: MaskedPath=${maskedPathId}, Stagecoach=${stagecoachId}`);
    }

    console.log(`Target IDs -> Masked Path: ${maskedPathId}, Stagecoach: ${stagecoachId}`);

    // 2) Get choices under old step 5
    const step5Choices = await client.query(
      `select id, choicetext from storychoice where storynodeid = $1 order by id`,
      [sourceNodeId]
    );

    if (step5Choices.rows.length === 0) {
      console.warn(`No choices found for StoryNodeId=${sourceNodeId}. Nothing to update.`);
      await client.query('ROLLBACK');
      return;
    }

    // 3) Update NextNodeId based on simple keyword heuristics
    let updated = 0;
    for (const ch of step5Choices.rows) {
      const text = (ch.choicetext || '').toLowerCase();

      let targetId = null;
      if (/(lantern|left|mask)/.test(text)) {
        targetId = maskedPathId;
      } else if (/(wheels|coach|right|driver)/.test(text)) {
        targetId = stagecoachId;
      }

      if (targetId) {
        await client.query(
          `update storychoice set nextnodeid = $1 where id = $2`,
          [targetId, ch.id]
        );
        updated++;
        console.log(`Updated choice ${ch.id} -> NextNodeId=${targetId}`);
      } else {
        console.log(`Skipped choice ${ch.id} (no keyword match)`);
      }
    }

    await client.query('COMMIT');
    console.log(`Done. Updated ${updated} choices for node ${sourceNodeId}.`);
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('Error updating step 5 links:', e);
    process.exitCode = 1;
  } finally {
    pool.end();
  }
})();
