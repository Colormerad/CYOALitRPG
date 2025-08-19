const { pool } = require('../repositories/db');

(async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const targets = [
      { id: 138, next: 44 },
      { id: 139, next: 49 },
      { id: 140, next: 53 },
    ];

    for (const t of targets) {
      const before = await client.query(
        'SELECT id, storynodeid, choicetext, nextnodeid FROM storychoice WHERE id=$1',
        [t.id]
      );
      console.log('Before', before.rows[0]);

      await client.query(
        'UPDATE storychoice SET nextnodeid = $2 WHERE id = $1',
        [t.id, t.next]
      );

      const after = await client.query(
        'SELECT id, storynodeid, choicetext, nextnodeid FROM storychoice WHERE id=$1',
        [t.id]
      );
      console.log('After ', after.rows[0]);
    }

    await client.query('COMMIT');
    console.log('Updates committed.');
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('Failed, rolled back:', e);
    process.exit(1);
  } finally {
    await pool.end();
  }
})();
