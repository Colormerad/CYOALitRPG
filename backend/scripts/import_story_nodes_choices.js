const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Usage: node scripts/import_story_nodes_choices.js path/to/story_content.json
// The JSON shape must be: { exported_at: string, story_nodes: [...], story_choices: [...] }

const pool = new Pool({
  user: 'cyoa_user',
  host: 'localhost',
  database: 'cyoa_litrpg',
  password: 'cyoa_password',
  port: 5432,
});

function readJson(filePath) {
  const abs = path.resolve(filePath);
  if (!fs.existsSync(abs)) throw new Error(`JSON file not found: ${abs}`);
  const raw = fs.readFileSync(abs, 'utf8');
  return JSON.parse(raw);
}

async function getSequenceName(client, table, column) {
  const res = await client.query(
    `SELECT pg_get_serial_sequence($1, $2) AS seq`,
    [table, column]
  );
  return res.rows[0] ? res.rows[0].seq : null;
}

async function setSequenceToMax(client, table, column) {
  const seq = await getSequenceName(client, table, column);
  if (!seq) return; // table may not use a serial/identity sequence
  const { rows } = await client.query(`SELECT COALESCE(MAX(${column}), 0) AS max FROM ${table}`);
  const max = rows[0].max || 0;
  await client.query(`SELECT setval($1, $2, $3)`, [seq, Number(max), max > 0]);
}

(async () => {
  const jsonPath = process.argv[2];
  if (!jsonPath) {
    console.error('Usage: node scripts/import_story_nodes_choices.js <path-to-json>');
    process.exit(1);
  }

  let data;
  try {
    data = readJson(jsonPath);
  } catch (e) {
    console.error('Failed to read/parse JSON:', e.message);
    process.exit(1);
  }

  const nodes = Array.isArray(data.story_nodes) ? data.story_nodes : [];
  const choices = Array.isArray(data.story_choices) ? data.story_choices : [];

  if (!nodes.length) {
    console.error('No story_nodes found in JSON. Aborting.');
    process.exit(1);
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Clean tables (choices first due to FK), then nodes
    await client.query('TRUNCATE TABLE storychoice RESTART IDENTITY CASCADE');
    await client.query('TRUNCATE TABLE storynode RESTART IDENTITY CASCADE');

    // Insert nodes
    const nodeInsert = `
      INSERT INTO storynode (id, title, content, nodetype, requiresinput, inputtype, createdat, updatedat)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
    `;

    for (const n of nodes) {
      await client.query(nodeInsert, [
        n.id,
        n.title ?? null,
        n.content ?? null,
        n.nodetype ?? 'standard',
        n.requiresinput ?? false,
        n.inputtype ?? null,
        n.createdat ? new Date(n.createdat) : new Date(),
        n.updatedat ? new Date(n.updatedat) : new Date(),
      ]);
    }

    // Insert choices
    const choiceInsert = `
      INSERT INTO storychoice (id, storynodeid, choicetext, nextnodeid, metadataimpact, effects, createdat, updatedat)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
    `;

    for (const c of choices) {
      // Ensure jsonb columns are objects (not null/undefined)
      const metadataimpact = c.metadataimpact ?? {};
      const effects = c.effects ?? {};
      await client.query(choiceInsert, [
        c.id,
        c.storynodeid,
        c.choicetext ?? null,
        c.nextnodeid ?? null,
        metadataimpact,
        effects,
        c.createdat ? new Date(c.createdat) : new Date(),
        c.updatedat ? new Date(c.updatedat) : new Date(),
      ]);
    }

    // Reset sequences to max(id)
    await setSequenceToMax(client, 'storynode', 'id');
    await setSequenceToMax(client, 'storychoice', 'id');

    await client.query('COMMIT');
    console.log(`Imported ${nodes.length} story nodes and ${choices.length} story choices from ${jsonPath}`);
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('Import failed, transaction rolled back. Error:', e);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
})();
