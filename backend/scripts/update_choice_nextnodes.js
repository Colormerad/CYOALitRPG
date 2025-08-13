const { Pool } = require('pg');

// Usage: node backend/scripts/update_choice_nextnodes.js 6 18 20
// Sets nextnodeid = <targetNodeId> for all provided choice IDs.

(async () => {
  const target = Number(process.argv[2]);
  const ids = process.argv.slice(3).map(Number).filter(n => Number.isInteger(n));
  if (!Number.isInteger(target) || ids.length === 0) {
    console.error('Usage: node backend/scripts/update_choice_nextnodes.js <targetNodeId> <choiceId1> [choiceId2] ...');
    process.exit(1);
  }

  const pool = new Pool({
    user: 'cyoa_user',
    host: 'localhost',
    database: 'cyoa_litrpg',
    password: 'cyoa_password',
    port: 5432,
  });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const id of ids) {
      await client.query('UPDATE storychoice SET nextnodeid = $1 WHERE id = $2', [target, id]);
    }
    const res = await client.query('SELECT id, storynodeid, choicetext, nextnodeid FROM storychoice WHERE id = ANY($1) ORDER BY id', [ids]);
    await client.query('COMMIT');
    console.log('Updated rows:', res.rows);
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('Update failed:', e);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
})();
