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

    // Group choices by storynodeid
    const choicesByNode = new Map();
    for (const ch of choicesRes.rows) {
      if (!choicesByNode.has(ch.storynodeid)) choicesByNode.set(ch.storynodeid, []);
      choicesByNode.get(ch.storynodeid).push({
        id: ch.id,
        choiceText: ch.choicetext,
        nextNodeId: ch.nextnodeid,
        metadataImpact: ch.metadataimpact || null,
        effects: ch.effects || null,
        createdAt: ch.createdat,
        updatedAt: ch.updatedat,
      });
    }

    const flat = nodesRes.rows.map(n => ({
      id: n.id,
      title: n.title,
      content: n.content,
      nodeType: n.nodetype,
      requiresInput: n.requiresinput,
      inputType: n.inputtype,
      createdAt: n.createdat,
      updatedAt: n.updatedat,
      choices: choicesByNode.get(n.id) || [],
    }));

    const dir = path.join(__dirname, '..', 'backups');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, `story_flat_${tsStamp()}.json`);
    fs.writeFileSync(file, JSON.stringify(flat, null, 2), 'utf8');

    console.log(`[export] Wrote ${file}`);
  } catch (e) {
    console.error('Error exporting flat story:', e);
    process.exitCode = 1;
  } finally {
    client.release();
    pool.end();
  }
})();
