const fs = require('fs');
const path = require('path');
const pool = require('./db-connection');

// Function to run the migration
async function runWorldMigration() {
  const client = await pool.connect();
  
  try {
    console.log('Running world data migration...');
    
    // Read the migration file
    const migrationPath = path.join(__dirname, 'migrations', 'add_world_tables.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Start a transaction
    await client.query('BEGIN');
    
    // Execute the entire SQL file at once
    try {
      console.log('Executing migration SQL...');
      await client.query(migrationSQL);
    } catch (err) {
      console.error(`Error executing migration: ${err.message}`);
      throw err;
    }
    
    // Commit the transaction
    await client.query('COMMIT');
    console.log('World data migration completed successfully!');
    
  } catch (err) {
    // Rollback on error
    await client.query('ROLLBACK');
    console.error('Migration failed:', err);
    throw err;
  } finally {
    client.release();
  }
}

// Run the migration
runWorldMigration()
  .then(() => {
    console.log('Migration process completed.');
    process.exit(0);
  })
  .catch(err => {
    console.error('Migration process failed:', err);
    process.exit(1);
  });
