const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// PostgreSQL connection
const pool = new Pool({
  user: 'cyoa_user',
  host: 'localhost',
  database: 'cyoa_litrpg',
  password: 'cyoa_password',
  port: 5432,
});

async function runMigration() {
  try {
    // Read the migration SQL file
    const migrationPath = path.join(__dirname, 'migrations', 'add_character_profile_simple.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('Running simplified migration to add character profile...');
    
    // Connect to the database
    const client = await pool.connect();
    
    try {
      // Start a transaction
      await client.query('BEGIN');
      
      // Split the SQL into separate statements and execute them
      const statements = migrationSQL.split(';').filter(stmt => stmt.trim());
      
      for (const statement of statements) {
        if (statement.trim()) {
          console.log(`Executing: ${statement.trim()}`);
          await client.query(statement);
        }
      }
      
      // Commit the transaction
      await client.query('COMMIT');
      console.log('Migration completed successfully!');
      
    } catch (err) {
      // Rollback in case of error
      await client.query('ROLLBACK');
      console.error('Error during migration:', err);
      throw err;
    } finally {
      // Release the client
      client.release();
    }
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    // End the pool
    await pool.end();
  }
}

// Run the migration
runMigration();
