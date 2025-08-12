/*
  Migration: Add Effects (jsonb) to StoryChoice and optional backfill for pickup choices
  Usage:
    node backend/scripts/migrate_add_storychoice_effects.js            # adds column only
    APPLY=1 node backend/scripts/migrate_add_storychoice_effects.js    # also attempts heuristic backfill
*/

const { pool } = require('../repositories/db');

async function addEffectsColumn() {
  const client = await pool.connect();
  try {
    console.log('[migrate] Adding Effects jsonb column to "StoryChoice" if not exists...');
    await client.query('BEGIN');
    await client.query(`
      ALTER TABLE StoryChoice
      ADD COLUMN IF NOT EXISTS effects jsonb DEFAULT '{}'::jsonb
    `);
    await client.query('COMMIT');
    console.log('[migrate] Effects column ensured.');
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('[migrate] Failed to add column:', e);
    throw e;
  } finally {
    client.release();
  }
}

function parsePickupName(choiceText) {
  if (!choiceText) return null;
  const patterns = [
    /(grab|snatch|get|collect|acquire|take)\s+(?:one of the\s+|the\s+|a\s+|an\s+)?([^\.;,!\n]+?)(?:\s+from\s+.*|\s+off\s+.*|\s+out of\s+.*|\s+and\s+.*|$)/i,
    /(pick\s+up)\s+(?:one of the\s+|the\s+|a\s+|an\s+)?([^\.;,!\n]+?)(?:\s+from\s+.*|\s+off\s+.*|\s+out of\s+.*|\s+and\s+.*|$)/i,
  ];
  for (const rx of patterns) {
    const m = rx.exec(choiceText);
    if (m && m[2]) {
      let name = m[2].trim();
      name = name.replace(/^(one of the|the|a|an)\s+/i, '');
      name = name.replace(/\s+(from|off|out of)\s+.*$/i, '');
      name = name.replace(/\s+and\s+.*$/i, '');
      name = name.replace(/\.$/, '');
      if (name && name.length <= 100) return name;
    }
  }
  return null;
}

async function heuristicBackfill() {
  const apply = process.env.APPLY === '1' || process.env.APPLY === 'true';
  const client = await pool.connect();
  try {
    console.log('[migrate] Scanning StoryChoice for pickup candidates...');
    const res = await client.query(`
      SELECT Id, ChoiceText, COALESCE(effects, '{}'::jsonb) AS effects
      FROM StoryChoice
      WHERE (ChoiceText ILIKE '%pick up%'
          OR ChoiceText ILIKE 'pick % up%'
          OR ChoiceText ILIKE '%grab%'
          OR ChoiceText ILIKE '%take %'
          OR ChoiceText ILIKE '%collect %'
          OR ChoiceText ILIKE '%acquire %')
        AND (COALESCE(effects, '{}'::jsonb) = '{}'::jsonb
             OR NOT (effects ? 'inventory_add'))
      ORDER BY Id
    `);
    const rows = res.rows || [];
    console.log(`[migrate] Found ${rows.length} candidate choices.`);
    let updated = 0;
    for (const row of rows) {
      const id = row.id;
      const text = row.choicetext;
      const currentEffects = row.effects || {};
      const name = parsePickupName(text);
      if (!name) continue;
      const nextEffects = { ...currentEffects, inventory_add: [{ name, quantity: 1 }] };
      console.log(`[migrate] Suggest Id=${id} -> inventory_add ${JSON.stringify(nextEffects.inventory_add)} | text="${text}"`);
      if (apply) {
        await client.query('UPDATE StoryChoice SET effects = $1 WHERE Id = $2', [nextEffects, id]);
        updated++;
      }
    }
    if (apply) console.log(`[migrate] Applied updates to ${updated} choices.`);
    else console.log('[migrate] Dry run only. Set APPLY=1 to write updates.');
  } catch (e) {
    console.error('[migrate] Backfill failed:', e);
    throw e;
  } finally {
    client.release();
  }
}

(async () => {
  try {
    await addEffectsColumn();
    if (process.env.APPLY) {
      await heuristicBackfill();
    } else {
      console.log('[migrate] Skipping backfill (dry run). To enable, run with APPLY=1');
      await heuristicBackfill();
    }
  } catch (e) {
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
