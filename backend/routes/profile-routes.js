const express = require('express');
const router = express.Router();
const profileService = require('../services/profile-service');

/**
 * Get a character's profile
 */
router.get('/:characterId', async (req, res) => {
  try {
    const characterId = parseInt(req.params.characterId);
    const profile = await profileService.getCharacterProfile(characterId);
    res.json(profile);
  } catch (err) {
    console.error('Error getting character profile:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * Get a character's alignment description
 */
router.get('/:characterId/alignment', async (req, res) => {
  try {
    const characterId = parseInt(req.params.characterId);
    const alignment = await profileService.getCharacterAlignment(characterId);
    res.json({ alignment });
  } catch (err) {
    console.error('Error getting character alignment:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * Get a character's attributes
 */
router.get('/:characterId/attributes', async (req, res) => {
  try {
    const characterId = parseInt(req.params.characterId);
    const attributes = await profileService.getCharacterAttributes(characterId);
    res.json(attributes);
  } catch (err) {
    console.error('Error getting character attributes:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * Get a character's preferences
 */
router.get('/:characterId/preferences', async (req, res) => {
  try {
    const characterId = parseInt(req.params.characterId);
    const preferences = await profileService.getCharacterPreferences(characterId);
    res.json(preferences);
  } catch (err) {
    console.error('Error getting character preferences:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * Update profile extras (stored in AdditionalTraits), e.g., gender and ageBucket
 */
router.post('/:characterId/extras', async (req, res) => {
  try {
    const characterId = parseInt(req.params.characterId);
    const payload = req.body || {};
    // Pass arbitrary keys to updateCharacterProfile to merge into AdditionalTraits
    const updated = await profileService.updateCharacterProfile(characterId, payload);
    res.json(updated);
  } catch (err) {
    console.error('Error updating profile extras:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
