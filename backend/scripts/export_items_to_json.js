#!/usr/bin/env node
/*
 Export all items from the database to backend/data/items.json
 Usage:
   DATABASE_URL=postgres://user:pass@host:port/db node backend/scripts/export_items_to_json.js
or set POSTGRES_* envs (PGHOST, PGUSER, PGPASSWORD, PGDATABASE, PGPORT)
*/

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

async function main() {
  const outDir = path.join(__dirname, '..', 'data');
  const outFile = path.join(outDir, 'items.json');

  const conn = process.env.DATABASE_URL || undefined;
  const pool = new Pool(
    conn
      ? { connectionString: conn }
      : {
          host: process.env.PGHOST || 'localhost',
          port: +(process.env.PGPORT || 5432),
          user: process.env.PGUSER || 'cyoa_user',
          password: process.env.PGPASSWORD || 'cyoa_password',
          database: process.env.PGDATABASE || 'cyoa_litrpg',
        }
  );

  try {
    const sql = `
      SELECT i.*, it.name as itemtypename
      FROM item i
      JOIN itemtype it ON i.itemtypeid = it.id
      ORDER BY i.id
    `;
    const { rows } = await pool.query(sql);

    // Ensure output dir exists
    fs.mkdirSync(outDir, { recursive: true });

    fs.writeFileSync(outFile, JSON.stringify(rows, null, 2), 'utf-8');
    console.log(`Exported ${rows.length} items to ${outFile}`);
  } catch (err) {
    console.error('Failed to export items:', err);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

main();
