const { pool } = require('../repositories/db');

(async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const id = 142;
    const next = 18;

    const before = await client.query(
      'SELECT id, storynodeid, choicetext, nextnodeid FROM storychoice WHERE id=$1',
      [id]
    );
    console.log('Before', before.rows[0]);

    await client.query(
      'UPDATE storychoice SET nextnodeid = $2 WHERE id = $1',
      [id, next]
    );

    const after = await client.query(
      'SELECT id, storynodeid, choicetext, nextnodeid FROM storychoice WHERE id=$1',
      [id]
    );
    console.log('After ', after.rows[0]);

    await client.query('COMMIT');
    console.log('Update committed.');
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('Failed, rolled back:', e);
    process.exit(1);
  } finally {
    await pool.end();
  }
})();
