const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  user: 'cyoa_user',
  host: 'localhost',
  database: 'cyoa_litrpg',
  password: 'cyoa_password',
  port: 5432,
});

function tsStamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return (
    d.getFullYear().toString() +
    pad(d.getMonth() + 1) +
    pad(d.getDate()) + '_' +
    pad(d.getHours()) +
    pad(d.getMinutes()) +
    pad(d.getSeconds())
  );
}

(async () => {
  const client = await pool.connect();
  try {
    const nodesRes = await client.query(
      `select id, title, content, nodetype, requiresinput, inputtype, createdat, updatedat from storynode order by id`
    );
    const choicesRes = await client.query(
      `select id, storynodeid, choicetext, nextnodeid, metadataimpact, effects, createdat, updatedat from storychoice order by storynodeid, id`
    );

    const out = {
      exported_at: new Date().toISOString(),
      story_nodes: nodesRes.rows,
      story_choices: choicesRes.rows,
    };

    const dir = path.join(__dirname, '..', 'backups');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, `story_content_${tsStamp()}.json`);
    fs.writeFileSync(file, JSON.stringify(out, null, 2), 'utf8');

    console.log(`[export] Wrote ${file}`);
  } catch (e) {
    console.error('Error exporting story nodes/choices:', e);
    process.exitCode = 1;
  } finally {
    client.release();
    pool.end();
  }
})();
