// Migration runner: executes SQL files from migrations folder
// Usage: node backend/scripts/run_migration.js <migration_file>
// Example: node backend/scripts/run_migration.js 2025-08-27_add_icon_key_to_character.sql

const fs = require('fs');
const path = require('path');
const pool = require('../db-connection');

async function runMigration(migrationFile) {
  const migrationPath = path.join(__dirname, '..', 'migrations', migrationFile);
  
  if (!fs.existsSync(migrationPath)) {
    console.error(`[migration] File not found: ${migrationPath}`);
    process.exitCode = 1;
    return;
  }

  const client = await pool.connect();
  try {
    console.log(`[migration] Reading SQL from: ${migrationFile}`);
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    console.log(`[migration] Executing migration...`);
    await client.query(sql);
    
    console.log(`[migration] Successfully applied: ${migrationFile}`);
  } catch (err) {
    console.error(`[migration] Failed to apply ${migrationFile}:`, err);
    process.exitCode = 1;
  } finally {
    client.release();
    // Explicit end to allow process to exit
    try { await pool.end?.(); } catch (_) {}
  }
}

const migrationFile = process.argv[2];
if (!migrationFile) {
  console.error('Usage: node backend/scripts/run_migration.js <migration_file>');
  console.error('Example: node backend/scripts/run_migration.js 2025-08-27_add_icon_key_to_character.sql');
  process.exitCode = 1;
} else {
  runMigration(migrationFile);
}
