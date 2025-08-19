const { pool } = require('../repositories/db');

(async () => {
  const client = await pool.connect();
  try {
    const choiceId = 138;
    const titleLike = '%Mystery Chase%';

    const ch = await client.query(
      'SELECT id, storynodeid, choicetext, nextnodeid FROM storychoice WHERE id = $1',
      [choiceId]
    );
    console.log('Choice', choiceId, ch.rows[0]);

    const nodes = await client.query(
      'SELECT id, title FROM storynode WHERE LOWER(title) LIKE LOWER($1) ORDER BY id',
      [titleLike]
    );
    console.log('Nodes like Mystery Chase:', nodes.rows);
    for (const n of nodes.rows) {
      const opts = await client.query(
        'SELECT id, choicetext, nextnodeid FROM storychoice WHERE storynodeid = $1 ORDER BY id',
        [n.id]
      );
      console.log(`Node ${n.id} ${n.title} choices:`, opts.rows);
    }
  } catch (e) {
    console.error('Inspection failed:', e);
    process.exit(1);
  } finally {
    await pool.end();
  }
})();
