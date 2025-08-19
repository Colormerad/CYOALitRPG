const { pool } = require('../repositories/db');

(async () => {
  const client = await pool.connect();
  try {
    const ids = [138, 139, 140];
    const res = await client.query(
      'SELECT id, storynodeid, choicetext, nextnodeid FROM storychoice WHERE id = ANY($1::int[]) ORDER BY id',
      [ids]
    );
    console.log(res.rows);
  } catch (e) {
    console.error(e);
    process.exit(1);
  } finally {
    await pool.end();
  }
})();
