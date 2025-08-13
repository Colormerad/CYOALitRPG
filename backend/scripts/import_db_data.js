/*
  Import data exported by export_db_data.js (JSON) without requiring psql/pg_restore.
  Usage:
    node backend/scripts/import_db_data.js backend/backups/db_export_YYYYMMDD_HHMM.json
  Notes:
    - Disables constraints/triggers via session_replication_role = 'replica' during load
    - Clears tables with DELETE (order derived heuristically)
    - Resets sequences on identity/serial columns based on MAX(value)
*/
const fs = require('fs');
const path = require('path');
const { pool } = require('../repositories/db');

async function getTables(client) {
  const res = await client.query(`SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename`);
  return res.rows.map(r => r.tablename);
}

async function getSerialSequences(client, table) {
  // Map of column -> sequence name for serial/identity
  const res = await client.query(
    `SELECT a.attname AS column_name,
            pg_get_serial_sequence(format('"%s"', $1), a.attname) AS seq
     FROM pg_class c
     JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum > 0 AND NOT a.attisdropped
     JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public' AND c.relname = $1`,
    [table]
  );
  const m = {};
  for (const r of res.rows) {
    if (r.seq) m[r.column_name] = r.seq;
  }
  return m;
}

async function importFromJson(filePath) {
  const client = await pool.connect();
  try {
    const abs = path.resolve(filePath);
    const raw = fs.readFileSync(abs, 'utf8');
    const dump = JSON.parse(raw);
    if (!dump || !dump.tables) throw new Error('Invalid dump JSON: missing tables');

    const tableNames = Object.keys(dump.tables);

    await client.query('BEGIN');
    // Disable constraints/triggers
    await client.query("SET session_replication_role = 'replica'");

    // Heuristic order: delete in forward order, insert in forward order
    for (const table of tableNames) {
      await client.query(`DELETE FROM "${table}"`);
    }

    for (const table of tableNames) {
      const t = dump.tables[table];
      const cols = t.columns;
      const quotedCols = cols.map(c => `"${c}"`).join(', ');
      for (const row of t.rows) {
        const values = cols.map((c, i) => {
          const v = row[c];
          if (v === null || v === undefined) return null;
          return v;
        });
        const params = values.map((_, i) => `$${i + 1}`).join(', ');
        const text = `INSERT INTO "${table}" (${quotedCols}) VALUES (${params})`;
        await client.query(text, values);
      }
    }

    // Reset sequences
    for (const table of tableNames) {
      const seqs = await getSerialSequences(client, table);
      for (const [col, seq] of Object.entries(seqs)) {
        const { rows } = await client.query(`SELECT COALESCE(MAX("${col}"), 0) AS m FROM "${table}"`);
        const max = rows[0].m || 0;
        await client.query('SELECT setval($1, $2, $3)', [seq, Math.max(1, Number(max)), true]);
      }
    }

    // Re-enable constraints
    await client.query("SET session_replication_role = 'origin'");
    await client.query('COMMIT');
    console.log('[import] Done.');
  } catch (e) {
    await (async () => { try { await client.query('ROLLBACK'); } catch (_) {} })();
    console.error('[import] Failed:', e);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

const file = process.argv[2];
if (!file) {
  console.error('Usage: node backend/scripts/import_db_data.js <path/to/export.json>');
  process.exit(1);
}
importFromJson(file);
