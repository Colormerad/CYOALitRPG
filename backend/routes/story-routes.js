const express = require('express');
const router = express.Router();
const storyService = require('../services/story-service');

// Get a story node by ID
router.get('/nodes/:id', async (req, res) => {
  try {
    const nodeId = parseInt(req.params.id);
    // Check if this is a refresh request for outfit options
    const refresh = req.query.refresh === 'true';
    const node = await storyService.getStoryNode(nodeId);
    res.json(node);
  } catch (err) {
    console.error('Error fetching story node:', err);
    res.status(404).json({ error: err.message });
  }
});

// Refresh outfit options for a node
router.get('/nodes/:id/refresh-outfits', async (req, res) => {
  try {
    const nodeId = parseInt(req.params.id);
    const node = await storyService.getStoryNode(nodeId);
    res.json(node);
  } catch (err) {
    console.error('Error refreshing outfit options:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get the first story node
router.get('/start', async (req, res) => {
  try {
    const node = await storyService.getFirstStoryNode();
    res.json(node);
  } catch (err) {
    console.error('Error fetching first story node:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get a player's current progress
router.get('/progress/:characterId', async (req, res) => {
  try {
    const characterId = parseInt(req.params.characterId);
    const progress = await storyService.getPlayerProgress(characterId);
    res.json(progress);
  } catch (err) {
    console.error('Error fetching player progress:', err);
    res.status(500).json({ error: err.message });
  }
});

// Make a choice
router.post('/choice', async (req, res) => {
  try {
    const { characterId, choiceId, inputValue, classId } = req.body;
    
    if (!characterId || !choiceId) {
      return res.status(400).json({ error: 'Character ID and choice ID are required' });
    }
    
    const progress = await storyService.makeChoice(
      parseInt(characterId),
      parseInt(choiceId),
      inputValue,
      classId ? parseInt(classId) : undefined
    );
    
    res.json(progress);
  } catch (err) {
    console.error('Error making choice:', err);
    res.status(500).json({ error: err.message });
  }
});

// Process a password choice
router.post('/password-choice', async (req, res) => {
  try {
    const { characterId, choiceId, password } = req.body;
    
    if (!characterId || !choiceId || !password) {
      return res.status(400).json({ 
        error: 'Character ID, choice ID, and password are required' 
      });
    }
    
    const progress = await storyService.processPasswordChoice(
      parseInt(characterId),
      parseInt(choiceId),
      password
    );
    
    res.json(progress);
  } catch (err) {
    console.error('Error processing password choice:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get random outfits for selection
router.get('/outfits/random', async (req, res) => {
  try {
    const count = parseInt(req.query.count) || 4;
    const outfits = await storyService.getRandomOutfits(count);
    res.json(outfits);
  } catch (err) {
    console.error('Error getting random outfits:', err);
    res.status(500).json({ error: err.message });
  }
});

// Set character class (separate from makeChoice)
router.post('/character/set-class', async (req, res) => {
  try {
    const { characterId, classId, outfitStyle } = req.body;
    
    if (!characterId || !classId) {
      return res.status(400).json({ error: 'Character ID and class ID are required' });
    }
    
    const progress = await storyService.assignClassToCharacter(
      parseInt(characterId),
      parseInt(classId),
      outfitStyle
    );
    
    res.json(progress);
  } catch (err) {
    console.error('Error setting character class:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
