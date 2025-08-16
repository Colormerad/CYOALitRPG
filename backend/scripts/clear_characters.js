/*
  Danger: Removes all characters and related data.
  Usage:
    node backend/scripts/clear_characters.js
*/

const { pool } = require('../repositories/db');

async function clearAllCharacters() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Collect all character ids first (for logging)
    const chars = await client.query('SELECT Id FROM "character"');
    const ids = (chars.rows || []).map(r => r.id);
    console.log(`[clear] Found ${ids.length} characters to delete.`);

    // Delete dependent rows first to satisfy FKs
    const delInv = await client.query('DELETE FROM characterinventory WHERE characterid = ANY($1::int[])', [ids]);
    console.log(`[clear] Deleted characterinventory rows: ${delInv.rowCount}`);

    const delProf = await client.query('DELETE FROM CharacterProfile WHERE CharacterId = ANY($1::int[])', [ids]);
    console.log(`[clear] Deleted CharacterProfile rows: ${delProf.rowCount}`);

    const delProg = await client.query('DELETE FROM PlayerProgress WHERE CharacterId = ANY($1::int[])', [ids]);
    console.log(`[clear] Deleted PlayerProgress rows: ${delProg.rowCount}`);

    // Finally delete characters
    const delChars = await client.query('DELETE FROM "character"');
    console.log(`[clear] Deleted characters: ${delChars.rowCount}`);

    await client.query('COMMIT');
    console.log('[clear] Done.');
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('[clear] Failed:', e);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

clearAllCharacters();
