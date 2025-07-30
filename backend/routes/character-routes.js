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
      `INSERT INTO Character 
       (AccountId, Name, Level, Experience, Health, Mana, Strength, Agility, Intelligence) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
       RETURNING *`,
      [
        characterData.accountId,
        characterData.name,
        characterData.level,
        characterData.experience,
        characterData.health,
        characterData.mana,
        characterData.strength,
        characterData.agility,
        characterData.intelligence
      ]
    );
    
    // Create initial player progress for the new character
    await pool.query(
      'INSERT INTO PlayerProgress (character_id, current_node_id) VALUES ($1, 1)',
      [result.rows[0].id]
    );
    
    // Create initial character profile for the new character
    await pool.query(
      `INSERT INTO CharacterProfile 
       (character_id, good_alignment, evil_alignment, neutral_alignment) 
       VALUES ($1, 0, 0, 0)`,
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

module.exports = router;
