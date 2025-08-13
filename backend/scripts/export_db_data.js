/*
  Export all public tables' data to JSON and a plain SQL file without requiring pg_dump.
  Usage:
    node backend/scripts/export_db_data.js
*/
const fs = require('fs');
const path = require('path');
const { pool } = require('../repositories/db');

function sqlLiteral(val, col) {
  if (val === null || val === undefined) return 'NULL';
  const dt = (col && (col.udt_name || col.data_type || '')).toLowerCase();
  if (dt.includes('json')) {
    const s = JSON.stringify(val);
    return `('${s.replace(/'/g, "''")}')::${dt}`;
  }
  switch (typeof val) {
    case 'number':
      return Number.isFinite(val) ? String(val) : 'NULL';
    case 'boolean':
      return val ? 'TRUE' : 'FALSE';
    case 'object': {
      // Date or other object -> stringify
      if (val instanceof Date) {
        const s = val.toISOString();
        return `'${s.replace(/'/g, "''")}'`;
      }
      const s = JSON.stringify(val);
      return `'${s.replace(/'/g, "''")}'`;
    }
    default: {
      const s = String(val);
      return `'${s.replace(/'/g, "''")}'`;
    }
  }
}

(async () => {
  const client = await pool.connect();
  try {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const ts = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
    const backupDir = path.join(__dirname, '..', 'backups');
    fs.mkdirSync(backupDir, { recursive: true });

    const tablesRes = await client.query(`
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename
    `);
    const tableNames = tablesRes.rows.map(r => r.tablename);

    const data = { generatedAt: new Date().toISOString(), tables: {} };

    // helper: get columns metadata
    async function getColumns(table) {
      const res = await client.query(
        `SELECT column_name, data_type, udt_name
         FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = $1
         ORDER BY ordinal_position`, [table]
      );
      return res.rows.map(r => ({
        name: r.column_name,
        data_type: r.data_type,
        udt_name: r.udt_name,
      }));
    }

    // We will generate SQL with DELETE then INSERTs
    let sqlOut = '-- Plain SQL data export (no schema)\nBEGIN;\n';

    for (const table of tableNames) {
      const cols = await getColumns(table);
      const colNames = cols.map(c => c.name);
      const quotedCols = colNames.map(n => `"${n}"`).join(', ');

      const rowsRes = await client.query(`SELECT * FROM "${table}"`);
      const rows = rowsRes.rows;

      data.tables[table] = { columns: colNames, rows };

      // DELETE existing data for import convenience
      sqlOut += `DELETE FROM "${table}";\n`;

      for (const row of rows) {
        const values = colNames.map((n, idx) => sqlLiteral(row[n], cols[idx]));
        sqlOut += `INSERT INTO "${table}" (${quotedCols}) VALUES (${values.join(', ')});\n`;
      }
      sqlOut += '\n';
    }

    sqlOut += 'COMMIT;\n';

    const base = `db_export_${ts}`;
    const jsonFile = path.join(backupDir, `${base}.json`);
    const sqlFile = path.join(backupDir, `${base}.sql`);
    fs.writeFileSync(jsonFile, JSON.stringify(data, null, 2), 'utf8');
    fs.writeFileSync(sqlFile, sqlOut, 'utf8');

    console.log('[export] Wrote:');
    console.log('  -', jsonFile);
    console.log('  -', sqlFile);
  } catch (e) {
    console.error('[export] Failed:', e);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
})();
