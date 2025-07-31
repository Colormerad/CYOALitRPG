const { Pool } = require('pg');

// PostgreSQL connection
const pool = new Pool({
  user: 'cyoa_user',
  host: 'localhost',
  database: 'cyoa_litrpg',
  password: 'cyoa_password',
  port: 5432,
});

async function cleanupStoryData() {
  const client = await pool.connect();
  
  try {
    console.log('Starting story data cleanup...');
    
    await client.query('BEGIN');
    
    // First delete all choices as they reference story nodes
    const choiceResult = await client.query('DELETE FROM StoryChoice');
    console.log(`Deleted ${choiceResult.rowCount} story choices`);
    
    // Then delete all story nodes
    const nodeResult = await client.query('DELETE FROM StoryNode');
    console.log(`Deleted ${nodeResult.rowCount} story nodes`);
    
    // Reset sequences to avoid ID conflicts
    await client.query('ALTER SEQUENCE IF EXISTS storychoice_id_seq RESTART WITH 1');
    await client.query('ALTER SEQUENCE IF EXISTS storynode_id_seq RESTART WITH 1');
    
    await client.query('COMMIT');
    console.log('Story data cleanup complete. You can now re-import story prompts.');
    
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error during cleanup:', err);
  } finally {
    client.release();
    pool.end();
  }
}

// Run the cleanup
cleanupStoryData();
