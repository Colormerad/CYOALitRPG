const express = require('express');
const router = express.Router();
const storyService = require('../services/story-service');
const storyNodeRepo = require('../repositories/story-node.repository');

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

// Advance progress directly (e.g., after battle outcome)
router.post('/progress/:characterId/advance', async (req, res) => {
  try {
    const characterId = parseInt(req.params.characterId);
    const { nextNodeId, experienceGain, choiceId } = req.body || {};
    if (!characterId || !nextNodeId) {
      return res.status(400).json({ error: 'characterId and nextNodeId are required' });
    }
    const progress = await storyService.advanceProgress(characterId, parseInt(nextNodeId), {
      experienceGain: experienceGain || null,
      choiceId: choiceId ? parseInt(choiceId) : undefined,
    });
    res.json(progress);
  } catch (err) {
    console.error('Error advancing progress:', err);
    res.status(500).json({ error: err.message });
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

// Update a player's progress (including metadata)
router.put('/progress/:characterId', async (req, res) => {
  try {
    const characterId = parseInt(req.params.characterId);
    const updateData = req.body;
    
    if (!characterId) {
      return res.status(400).json({ error: 'Character ID is required' });
    }
    
    const progress = await storyService.updatePlayerProgress(characterId, updateData);
    res.json(progress);
  } catch (err) {
    console.error('Error updating player progress:', err);
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

// Get all choices and their options
router.get('/choices', async (req, res) => {
  try {
    const choices = await storyNodeRepo.getAllChoicesWithOptions();
    return res.json(choices);
  } catch (err) {
    console.error('Error fetching choices:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get option by ID
router.get('/choices/:id', async (req, res) => {
  try {
    const choiceId = parseInt(req.params.id);
    const choice = await storyNodeRepo.getChoiceById(choiceId);
    
    if (!choice) {
      return res.status(404).json({ error: 'Choice not found' });
    }
    
    res.json(choice);
  } catch (err) {
    console.error('Error fetching choice:', err);
    res.status(500).json({ error: err.message });
  }
});

// Update story node by ID
router.put('/nodes/:id', async (req, res) => {
  try {
    const nodeId = parseInt(req.params.id);
    const nodeData = req.body;
    
    // Validate required fields
    if (!nodeData.title || !nodeData.content) {
      return res.status(400).json({ error: 'Title and content are required' });
    }
    
    // Check if node exists
    const existingNode = await storyNodeRepo.getById(nodeId);
    if (!existingNode) {
      return res.status(404).json({ error: 'Story node not found' });
    }
    
    const updatedNode = await storyNodeRepo.updateStoryNode(nodeId, nodeData);
    res.json(updatedNode);
  } catch (err) {
    console.error('Error updating story node:', err);
    res.status(500).json({ error: err.message });
  }
});

// Update option by ID
router.put('/choices/:id', async (req, res) => {
  try {
    const choiceId = parseInt(req.params.id);
    const choiceData = req.body;
    
    // Validate required fields
    if (!choiceData.choicetext || !choiceData.nextnodeid || !choiceData.storynodeid) {
      return res.status(400).json({ error: 'Choice text, target node ID, and story node ID are required' });
    }
    
    // Validate metadata impact format if provided
    if (choiceData.metadataimpact && typeof choiceData.metadataimpact !== 'object') {
      return res.status(400).json({ error: 'Metadata impact must be an object' });
    }
    
    // Validate effects format if provided
    if (choiceData.effects && typeof choiceData.effects !== 'object') {
      return res.status(400).json({ error: 'Effects must be an object' });
    }
    
    // Check if choice exists
    const existingChoice = await storyNodeRepo.getChoiceById(choiceId);
    if (!existingChoice) {
      return res.status(404).json({ error: 'Choice not found' });
    }
    
    const updatedChoice = await storyNodeRepo.updateChoice(choiceId, choiceData);
    res.json(updatedChoice);
  } catch (err) {
    console.error('Error updating choice:', err);
    res.status(500).json({ error: err.message });
  }
});

// Create new story node
router.post('/nodes', async (req, res) => {
  try {
    const nodeData = req.body;
    
    // Validate required fields
    if (!nodeData.title || !nodeData.content) {
      return res.status(400).json({ error: 'Title and content are required' });
    }
    
    // Validate choices if provided
    if (nodeData.choices) {
      if (!Array.isArray(nodeData.choices)) {
        return res.status(400).json({ error: 'Choices must be an array' });
      }
      
      for (let i = 0; i < nodeData.choices.length; i++) {
        const choice = nodeData.choices[i];
        if (!choice.choicetext) {
          return res.status(400).json({ error: `Choice ${i + 1} must have choicetext` });
        }
        
        // Validate metadata impact format if provided
        if (choice.metadataimpact && typeof choice.metadataimpact !== 'object') {
          return res.status(400).json({ error: `Choice ${i + 1} metadataimpact must be an object` });
        }
        
        // Validate effects format if provided
        if (choice.effects && typeof choice.effects !== 'object') {
          return res.status(400).json({ error: `Choice ${i + 1} effects must be an object` });
        }
      }
    }
    
    const newNode = await storyNodeRepo.createStoryNode(nodeData);
    res.status(201).json(newNode);
  } catch (err) {
    console.error('Error creating story node:', err);
    res.status(500).json({ error: err.message });
  }
});

// Create new option
router.post('/choices', async (req, res) => {
  try {
    const choiceData = req.body;
    
    // Validate required fields
    if (!choiceData.choicetext || !choiceData.nextnodeid || !choiceData.storynodeid) {
      return res.status(400).json({ error: 'Choice text, target node ID, and story node ID are required' });
    }
    
    // Validate metadata impact format if provided
    if (choiceData.metadataimpact && typeof choiceData.metadataimpact !== 'object') {
      return res.status(400).json({ error: 'Metadata impact must be an object' });
    }
    
    // Validate effects format if provided
    if (choiceData.effects && typeof choiceData.effects !== 'object') {
      return res.status(400).json({ error: 'Effects must be an object' });
    }
    
    // Check if target node exists
    const targetNode = await storyNodeRepo.getById(choiceData.nextnodeid);
    if (!targetNode) {
      return res.status(400).json({ error: 'Target node does not exist' });
    }
    
    // Check if story node exists
    const storyNode = await storyNodeRepo.getById(choiceData.storynodeid);
    if (!storyNode) {
      return res.status(400).json({ error: 'Story node does not exist' });
    }
    
    const newChoice = await storyNodeRepo.createChoice(choiceData);
    res.status(201).json(newChoice);
  } catch (err) {
    console.error('Error creating choice:', err);
    res.status(500).json({ error: err.message });
  }
});

// Delete choice
router.delete('/choices/:id', async (req, res) => {
  try {
    const choiceId = parseInt(req.params.id);
    
    // Check if choice exists
    const existingChoice = await storyNodeRepo.getChoiceById(choiceId);
    if (!existingChoice) {
      return res.status(404).json({ error: 'Choice not found' });
    }
    
    const deletedChoice = await storyNodeRepo.deleteChoice(choiceId);
    res.json({ message: 'Choice deleted successfully', choice: deletedChoice });
  } catch (err) {
    console.error('Error deleting choice:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
