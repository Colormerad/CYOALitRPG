const express = require('express');
const router = express.Router();
const inventoryRepo = require('../repositories/inventory.repository');

// Get the pool from server.js instead of creating a new one
const pool = require('../db-connection');

/**
 * Get all characters for a user
 */
router.get('/user/:userId', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const result = await pool.query(
      'SELECT c.*, c.icon_key as "iconKey", cls.name as "className" FROM "character" c LEFT JOIN class cls ON cls.id = c.classid WHERE c.accountid = $1 ORDER BY c.id',
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
      'SELECT c.*, c.icon_key as "iconKey", cls.Name as "className" FROM "character" c LEFT JOIN Class cls ON cls.Id = c.ClassId WHERE c.id = $1',
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
    
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating character:', err);
    res.status(500).json({ error: 'Failed to create character' });
  }
});

/**
 * Mark a character as dead
 */
// Duplicate mark-dead route removed; consolidated below.
/**
 * Update a character
 */
router.put('/:id', async (req, res) => {
  try {
    const characterId = parseInt(req.params.id);
    // Accept multiple casings/aliases from the client
    const body = req.body || {};
    const payload = {
      name: body.name || body.character_name || body.Name || null,
      level: body.level ?? body.Level ?? null,
      experience: body.experience ?? body.Experience ?? null,
      health: body.health ?? body.Health ?? null,
      mana: body.mana ?? body.Mana ?? null,
      strength: body.strength ?? body.Strength ?? null,
      agility: (body.agility ?? body.Agility ?? body.dexterity ?? body.Dexterity) ?? null, // map dexterity->agility
      intelligence: body.intelligence ?? body.Intelligence ?? null,
      classid: body.classid ?? body.classId ?? body.ClassId ?? null,
      icon_key: body.icon_key ?? body.iconKey ?? body.icon ?? null
    };

    // Check if character exists first
    const checkResult = await pool.query('SELECT * FROM "character" WHERE id = $1', [characterId]);
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Character not found' });
    }

    // Map payload keys to exact DB column names (quoted where necessary)
    const columnMap = new Map([
      ['name', '"Name"'],
      ['level', '"Level"'],
      ['experience', '"Experience"'],
      ['health', '"Health"'],
      ['mana', '"Mana"'],
      ['strength', '"Strength"'],
      ['agility', '"Agility"'],
      ['intelligence', '"Intelligence"'],
      ['classid', '"ClassId"'],
      // icon_key was added as lower_snake; keep unquoted identifier
      ['icon_key', 'icon_key']
    ]);

    const makeUpdateParts = (omitIconKey = false) => {
      const setClauses = [];
      const values = [];
      let i = 1;
      for (const [key, val] of Object.entries(payload)) {
        if (val === null || val === undefined) continue;
        if (omitIconKey && key === 'icon_key') continue;
        const col = columnMap.get(key);
        if (!col) continue; // ignore unknown fields
        setClauses.push(`${col} = $${i}`);
        values.push(val);
        i++;
      }
      return { setClauses, values };
    };

    let { setClauses, values } = makeUpdateParts(false);

    if (setClauses.length === 0) {
      return res.status(400).json({ error: 'No valid fields provided to update' });
    }

    let i = values.length + 1;
    let sql = `UPDATE "character" SET ${setClauses.join(', ')} WHERE id = $${i} RETURNING *`;
    values.push(characterId);

    try {
      const result = await pool.query(sql, values);
      return res.json(result.rows[0]);
    } catch (err) {
      // If undefined_column due to icon_key missing in some environments, retry without icon_key
      const pgCode = err && err.code;
      const msg = String(err && err.message || '');
      const attemptedIcon = setClauses.some(c => c.includes('icon_key'));
      if (attemptedIcon && (pgCode === '42703' || msg.includes('icon_key') || msg.includes('undefined column'))) {
        const rebuilt = makeUpdateParts(true);
        if (rebuilt.setClauses.length === 0) {
          return res.status(400).json({ error: 'No valid fields provided to update (after removing icon_key)' });
        }
        let j = rebuilt.values.length + 1;
        const sql2 = `UPDATE "character" SET ${rebuilt.setClauses.join(', ')} WHERE id = $${j} RETURNING *`;
        const vals2 = [...rebuilt.values, characterId];
        try {
          const result2 = await pool.query(sql2, vals2);
          return res.json(result2.rows[0]);
        } catch (err2) {
          console.error('Error updating character (retry without icon_key):', err2);
          return res.status(500).json({ error: 'Failed to update character' });
        }
      }
      console.error('Error updating character:', err);
      return res.status(500).json({ error: 'Failed to update character' });
    }
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
    await pool.query('DELETE FROM playerprogress WHERE character_id = $1', [characterId]);
    await pool.query('DELETE FROM characterprofile WHERE character_id = $1', [characterId]);
    
    // Then delete the character
    const result = await pool.query(
      'DELETE FROM character WHERE id = $1 RETURNING id',
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
    console.log('[mark-dead] PUT called for id:', characterId);
    
    // First check if the character exists
    const checkResult = await pool.query(
      'SELECT id FROM "character" WHERE id = $1',
      [characterId]
    );
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Character not found' });
    }
    
    // Mark the character as dead (assumes schema is already in place)
    try {
      const result = await pool.query(
        'UPDATE "character" SET is_dead = TRUE WHERE id = $1 RETURNING *',
        [characterId]
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Character not found after update' });
      }
      res.json(result.rows[0]);
    } catch (updateErr) {
      console.error('[mark-dead] Error updating character:', updateErr);
      return res.status(500).json({ error: 'Failed to update character status', details: updateErr.message });
    }
  } catch (err) {
    console.error('[mark-dead] Unexpected error:', err);
    return res.status(500).json({ error: 'Failed to mark character as dead', details: err.message });
  }
});

/**
 * Guard against accidental GETs to mark-dead (helps avoid confusing 404s from GET requests)
 */
router.get('/:id/mark-dead', (req, res) => {
  return res.status(405).json({ error: 'Method Not Allowed', allowed: 'PUT' });
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
      'SELECT COUNT(*) as prompt_count FROM playerprogress WHERE characterid = $1',
      [characterId]
    );
    
    const promptsSurvived = parseInt(progressResult.rows[0]?.prompt_count || 0);

    // Fetch the most recent player progress to get metadata and choice history
    const latestProgressResult = await pool.query(
      'SELECT * FROM playerprogress WHERE characterid = $1 ORDER BY id DESC LIMIT 1',
      [characterId]
    );

    const latestProgress = latestProgressResult.rows[0] || null;
    let metadata = {};
    let choiceHistory = [];
    let lastChoiceId = null;
    let deathReason = null;
    let deathTimestamp = null;
    let deathNode = null;
    let deathPrompt = null;
    let className = null;
    let classIdFromMeta = null;

    try {
      if (latestProgress) {
        metadata = latestProgress.metadata || {};
        // choicehistory may be stored as array of numbers or array of objects
        const rawHistory = latestProgress.choicehistory;
        if (Array.isArray(rawHistory)) {
          choiceHistory = rawHistory;
          const lastEntry = rawHistory.length ? rawHistory[rawHistory.length - 1] : null;
          if (lastEntry && typeof lastEntry === 'object' && lastEntry.choiceId != null) {
            lastChoiceId = lastEntry.choiceId;
          } else if (typeof lastEntry === 'number') {
            lastChoiceId = lastEntry;
          }
        }

        deathReason = metadata.death_reason || metadata.deathReason || null;
        deathTimestamp = metadata.death_timestamp || metadata.deathTimestamp || null;
        // Accept multiple casings/keys from metadata
        className = metadata.className || metadata.classname || metadata.class_name || null;
        classIdFromMeta = metadata.classId || metadata.classid || metadata.class_id || null;
      }
    } catch (parseErr) {
      console.error('[legacy] Error parsing latest progress:', parseErr);
    }

    // If we have lastChoiceId, fetch the choice to include text/title as context
    if (lastChoiceId != null) {
      try {
        const choiceRes = await pool.query(
          'SELECT id as id, choicetext as "choiceText" FROM storychoice WHERE id = $1',
          [lastChoiceId]
        );
        if (choiceRes.rows.length) {
          deathPrompt = choiceRes.rows[0];
        }
      } catch (choiceErr) {
        console.error('[legacy] Error loading last StoryChoice:', choiceErr);
      }
    }

    // Attempt to include death node context if present on latest progress
    if (latestProgress && (latestProgress.nodeid != null || latestProgress.nodeId != null)) {
      const nodeId = latestProgress.nodeid ?? latestProgress.nodeId;
      try {
        const nodeRes = await pool.query(
          'SELECT id, title, content, isdeathnode FROM storynode WHERE id = $1',
          [nodeId]
        );
        if (nodeRes.rows.length) {
          deathNode = nodeRes.rows[0];
        }
      } catch (nodeErr) {
        console.error('[legacy] Error loading death StoryNode:', nodeErr);
      }
    }

    // Prefer explicit metadata value; else use number of choices made; else fallback to row count
    const metaPrompts = metadata && (metadata.prompts_survived || metadata.promptsSurvived);
    const choiceCount = Array.isArray(choiceHistory) ? choiceHistory.length : 0;
    const finalPromptsSurvived = Number(metaPrompts ?? (choiceCount || promptsSurvived)) || 0;
    
    // Load CharacterProfile for summary display
    let profile = null;
    try {
      const profRes = await pool.query(
        'SELECT * FROM characterprofile WHERE characterid = $1 LIMIT 1',
        [characterId]
      );
      if (profRes.rows.length) {
        profile = profRes.rows[0];
      }
    } catch (profErr) {
      console.error('[legacy] Error loading CharacterProfile:', profErr);
    }

    // try to fallback classId from character row if not present in metadata
    const classId = classIdFromMeta != null ? classIdFromMeta : (character.classid || character.classId || null);

    // If className is still missing but we have classId, look up the class name
    if (!className && classId != null) {
      try {
        const classRes = await pool.query('SELECT name FROM class WHERE id = $1', [classId]);
        if (classRes.rows.length) {
          className = classRes.rows[0].name || classRes.rows[0].Name || null;
        }
      } catch (clsErr) {
        console.error('[legacy] Error looking up class name by classId:', clsErr);
      }
    }

    res.json({
      promptsSurvived: Number(finalPromptsSurvived) || 0,
      moralityScale: null, // backend no longer fabricates; frontend will handle default
      familyLeftBehind: [],
      worldImpacts: [],
      deathReason,
      deathTimestamp,
      lastChoiceId,
      deathNode,
      deathPrompt,
      profile,
      className,
      classId
    });
  } catch (err) {
    console.error('Error getting character legacy:', err);
    res.status(500).json({ error: 'Failed to get character legacy data' });
  }
});

/**
 * Get a character's inventory
 */
router.get('/:id/inventory', async (req, res) => {
  try {
    const characterId = parseInt(req.params.id);
    if (!Number.isFinite(characterId)) {
      return res.status(400).json({ error: 'Invalid character id' });
    }
    const result = await pool.query(
      `SELECT 
         ci.characterid as characterid,
         ci.itemid as itemid,
         ci.quantity as quantity,
         ci.isequipped as isequipped,
         i.name as itemname,
         i.description as itemdescription,
         i.value as value,
         i.isconsumable as isconsumable,
         it.name as itemtypename
       FROM characterinventory ci
       JOIN item i ON i.id = ci.itemid
       LEFT JOIN itemtype it ON it.id = i.itemtypeid
       WHERE ci.characterid = $1
       ORDER BY i.name`,
      [characterId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error getting character inventory:', err);
    res.status(500).json({ error: 'Failed to get character inventory' });
  }
});

/**
 * Use an inventory item (consumable): decrement quantity for character
 */
router.post('/:id/inventory/:itemId/use', async (req, res) => {
  try {
    const characterId = parseInt(req.params.id);
    const itemId = parseInt(req.params.itemId);
    const amount = Math.max(1, Number(req.body?.amount || 1));

    if (!Number.isFinite(characterId) || !Number.isFinite(itemId)) {
      return res.status(400).json({ error: 'Invalid character or item id' });
    }

    // Verify the item belongs to character and is consumable
    const invRes = await pool.query(
      `SELECT ci.quantity, i.isconsumable, it.name as itemtypename
       FROM characterinventory ci
       JOIN item i ON i.id = ci.itemid
       LEFT JOIN itemtype it ON it.id = i.itemtypeid
       WHERE ci.characterid = $1 AND ci.itemid = $2`,
      [characterId, itemId]
    );

    if (!invRes.rows.length) {
      return res.status(404).json({ error: 'Item not found in character inventory' });
    }

    const row = invRes.rows[0];
    const isConsumable = !!row.isconsumable || (row.itemtypename || '').toLowerCase() === 'consumable';

    if (!isConsumable) {
      return res.status(400).json({ error: 'Item is not consumable' });
    }

    const result = await inventoryRepo.decrementItemQuantity(characterId, itemId, amount);
    return res.json({ itemId, quantity: result.quantity, removed: result.removed });
  } catch (err) {
    console.error('Error using inventory item:', err);
    return res.status(500).json({ error: 'Failed to use item', details: err.message });
  }
});

module.exports = router;
