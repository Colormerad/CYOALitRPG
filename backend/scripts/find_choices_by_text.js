const { pool } = require('../repositories/db');

(async () => {
  const client = await pool.connect();
  try {
    const patterns = [
      '%Ask a vendor if they saw someone run past.%food stalls%'.replace(/%/g,'%%'),
      'Stop running and collect your bearings heading back toward the crossroads%'.replace(/%/g,'%%')
    ];

    const q = 'SELECT id, storynodeid, choicetext, nextnodeid FROM storychoice WHERE choicetext ILIKE $1 OR choicetext ILIKE $2 ORDER BY id';
    const res = await client.query(q, patterns);
    console.log(res.rows);
  } catch (e) {
    console.error('Query failed:', e);
    process.exit(1);
  } finally {
    await pool.end();
  }
})();
