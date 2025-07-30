const express = require('express');
const router = express.Router();

// Get the pool from server.js instead of creating a new one
const pool = require('../db-connection');

/**
 * Get all characters for a user
 */
router.get('/user/:userId', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const result = await pool.query(
      'SELECT * FROM Character WHERE AccountId = $1 ORDER BY id',
      [userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error getting characters:', err);
    res.status(500).json({ error: 'Failed to get characters' });
  }
});

/**
 * Get a character by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const characterId = parseInt(req.params.id);
    const result = await pool.query(
      'SELECT * FROM Character WHERE id = $1',
      [characterId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Character not found' });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error getting character:', err);
    res.status(500).json({ error: 'Failed to get character' });
  }
});

/**
 * Create a new character
 */
router.post('/', async (req, res) => {
  try {
    console.log('Received character data:', req.body);
    
    // Extract character data from request body, supporting both capitalized and lowercase fields
    const { 
      AccountId, Name, Level, Experience, Health, Mana, Strength, Agility, Intelligence, // Capitalized fields
      accountId, name, level, experience, health, mana, strength, agility, intelligence   // Lowercase fields
    } = req.body;
    
    // Use either capitalized or lowercase fields, preferring capitalized if both exist
    const characterData = {
      accountId: AccountId || accountId,
      name: Name || name,
      level: Level || level || 1,
      experience: Experience || experience || 0,
      health: Health || health || 100,
      mana: Mana || mana || 100,
      strength: Strength || strength || 10,
      agility: Agility || agility || 10,
      intelligence: Intelligence || intelligence || 10
    };
    
    // Validate required fields
    if (!characterData.accountId) {
      return res.status(400).json({ error: 'AccountId is required' });
    }
    
    if (!characterData.name) {
      return res.status(400).json({ error: 'Name is required' });
    }
    
    console.log('Processed character data:', characterData);
    
    const result = await pool.query(
      `INSERT INTO "character" 
       (AccountId, Name, Level, Experience) 
       VALUES ($1, $2, $3, $4) 
       RETURNING *`,
      [
        characterData.accountId,
        characterData.name,
        characterData.level || 1,
        characterData.experience || 0
      ]
    );
    
    // Create initial player progress for the new character
    await pool.query(
      'INSERT INTO playerprogress (characterid, currentnodeid) VALUES ($1, 1)',
      [result.rows[0].id]
    );
    
    // Create initial character profile for the new character
    await pool.query(
      `INSERT INTO characterprofile 
       (characterid, goodevilaxis, orderchaosaxis) 
       VALUES ($1, 0, 0)`,
      [result.rows[0].id]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating character:', err);
    res.status(500).json({ error: 'Failed to create character' });
  }
});

/**
 * Update a character
 */
router.put('/:id', async (req, res) => {
  try {
    const characterId = parseInt(req.params.id);
    const { name, level, experience, health, mana, strength, agility, intelligence } = req.body;
    
    // Check if character exists
    const checkResult = await pool.query(
      'SELECT * FROM Character WHERE id = $1',
      [characterId]
    );
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Character not found' });
    }
    
    const result = await pool.query(
      `UPDATE Character 
       SET name = $1, level = $2, experience = $3, health = $4, 
           mana = $5, strength = $6, agility = $7, intelligence = $8,
           updated_at = NOW()
       WHERE id = $9
       RETURNING *`,
      [
        name,
        level,
        experience,
        health,
        mana,
        strength,
        agility,
        intelligence,
        characterId
      ]
    );
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating character:', err);
    res.status(500).json({ error: 'Failed to update character' });
  }
});

/**
 * Delete a character
 */
router.delete('/:id', async (req, res) => {
  try {
    const characterId = parseInt(req.params.id);
    
    // Delete related records first (foreign key constraints)
    await pool.query('DELETE FROM PlayerProgress WHERE character_id = $1', [characterId]);
    await pool.query('DELETE FROM CharacterProfile WHERE character_id = $1', [characterId]);
    
    // Then delete the character
    const result = await pool.query(
      'DELETE FROM Character WHERE id = $1 RETURNING id',
      [characterId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Character not found' });
    }
    
    res.json({ message: 'Character deleted successfully', id: characterId });
  } catch (err) {
    console.error('Error deleting character:', err);
    res.status(500).json({ error: 'Failed to delete character' });
  }
});

/**
 * Mark a character as dead
 */
router.put('/:id/mark-dead', async (req, res) => {
  try {
    const characterId = parseInt(req.params.id);
    
    // First check if the character exists
    const checkResult = await pool.query(
      'SELECT id FROM "character" WHERE id = $1',
      [characterId]
    );
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Character not found' });
    }
    
    // First, check if the is_dead column exists
    try {
      const columnCheck = await pool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'character' AND column_name = 'is_dead'
      `);
      
      // If the column doesn't exist, add it
      if (columnCheck.rows.length === 0) {
        await pool.query('ALTER TABLE "character" ADD COLUMN is_dead BOOLEAN NOT NULL DEFAULT FALSE');
        console.log('Added is_dead column to Character table');
      }
    } catch (alterErr) {
      console.error('Error checking/adding is_dead column:', alterErr);
      return res.status(500).json({ error: 'Database schema error' });
    }
    
    // Mark the character as dead
    try {
      const result = await pool.query(
        'UPDATE "character" SET is_dead = TRUE WHERE id = $1 RETURNING id',
        [characterId]
      );
      
      res.json({ message: 'Character marked as dead', id: characterId });
    } catch (updateErr) {
      console.error('Error updating character:', updateErr);
      res.status(500).json({ error: 'Failed to update character status' });
    }
  } catch (err) {
    console.error('Error marking character as dead:', err);
    res.status(500).json({ error: 'Failed to mark character as dead' });
  }
});

/**
 * Get legacy data for a dead character
 */
router.get('/:id/legacy', async (req, res) => {
  try {
    const characterId = parseInt(req.params.id);
    
    // First check if the character exists and is dead
    const characterResult = await pool.query(
      'SELECT * FROM "character" WHERE id = $1',
      [characterId]
    );
    
    if (characterResult.rows.length === 0) {
      return res.status(404).json({ error: 'Character not found' });
    }
    
    const character = characterResult.rows[0];
    
    if (!character.is_dead) {
      return res.status(400).json({ error: 'Character is not deceased' });
    }
    
    // Get player progress to determine prompts survived
    const progressResult = await pool.query(
      'SELECT COUNT(*) as prompt_count FROM PlayerProgress WHERE character_id = $1',
      [characterId]
    );
    
    const promptsSurvived = parseInt(progressResult.rows[0]?.prompt_count || 0);
    
    // Generate placeholder data for now
    // In a real implementation, this would come from the database
    const moralityScale = Math.floor(Math.random() * 100); // 0-100
    
    const possibleFamily = [
      'Spouse who misses them dearly',
      'Three young children',
      'Elderly parents',
      'A loyal dog named Rex',
      'A twin sibling',
      'A large extended family'
    ];
    
    const familyCount = Math.floor(Math.random() * 3) + 1;
    const familyLeftBehind = [];
    for (let i = 0; i < familyCount; i++) {
      const index = Math.floor(Math.random() * possibleFamily.length);
      familyLeftBehind.push(possibleFamily[index]);
      possibleFamily.splice(index, 1);
      if (possibleFamily.length === 0) break;
    }
    
    const possibleImpacts = [
      'Saved a village from destruction',
      'Defeated a fearsome monster',
      'Discovered an ancient artifact',
      'Brokered peace between warring factions',
      'Built a school for orphaned children',
      'Planted an enchanted forest'
    ];
    
    const impactCount = Math.floor(Math.random() * 3) + 1;
    const worldImpacts = [];
    for (let i = 0; i < impactCount; i++) {
      const index = Math.floor(Math.random() * possibleImpacts.length);
      worldImpacts.push(possibleImpacts[index]);
      possibleImpacts.splice(index, 1);
      if (possibleImpacts.length === 0) break;
    }
    
    res.json({
      promptsSurvived,
      moralityScale,
      familyLeftBehind,
      worldImpacts
    });
  } catch (err) {
    console.error('Error getting character legacy:', err);
    res.status(500).json({ error: 'Failed to get character legacy data' });
  }
});

module.exports = router;
