#!/usr/bin/env node
const { pool } = require('../repositories/db');

(async () => {
  const delta = parseInt(process.argv[2] || '5', 10);
  if (!Number.isFinite(delta)) {
    console.error('Usage: node scripts/grant_gold_all.js <delta>');
    process.exit(1);
  }
  try {
    const sql = `
      UPDATE characterprofile
      SET additionaltraits = jsonb_set(
            COALESCE(additionaltraits, '{}'::jsonb),
            '{gold}',
            to_jsonb(GREATEST(0, COALESCE((additionaltraits->>'gold')::int, 0) + $1)),
            true
          ),
          updatedat = CURRENT_TIMESTAMP
    `;
    const res = await pool.query(sql, [delta]);
    const summary = await pool.query(
      `SELECT COUNT(*) AS rows,
              COALESCE(MIN((additionaltraits->>'gold')::int),0) AS min_gold,
              COALESCE(MAX((additionaltraits->>'gold')::int),0) AS max_gold,
              COALESCE(SUM((additionaltraits->>'gold')::int),0) AS total_gold
         FROM characterprofile`
    );
    console.log(JSON.stringify({ updated: res.rowCount, summary: summary.rows[0] }, null, 2));
  } catch (e) {
    console.error('Failed to grant gold:', e);
    process.exit(1);
  } finally {
    await pool.end();
  }
})();
