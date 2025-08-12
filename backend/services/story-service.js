// Use centralized DB pool and repositories
const { pool } = require('../repositories/db');
const classRepo = require('../repositories/class.repository');
const inventoryRepo = require('../repositories/inventory.repository');
const storyNodeRepo = require('../repositories/story-node.repository');
const progressRepo = require('../repositories/progress.repository');
const characterRepo = require('../repositories/character.repository');
const profileService = require('./profile-service');
const llmService = require('./llm-service');
const nodeFormatter = require('./domain/node-formatter.service');
const choiceDomain = require('./domain/choice-domain.service');

// Pool configuration moved to ../repositories/db.js

class StoryService {
  /**
   * Get random class outfits for selection
   * @param {number} count - Number of outfits to retrieve
   * @returns {Promise<Array>} - Array of class outfits with class info
   */
  async getRandomClassOutfits(count = 4) {
    // Delegate to repository
    return classRepo.getRandomClassOutfits(count);
  }

  /**
   * Assign class and starting equipment to a character
   * @param {number} characterId - The character ID
   * @param {number} classId - The class ID to assign
   * @returns {Promise<Object>} - Updated character info
   */
  async assignClassToCharacter(characterId, classId) {
    // Update character and fetch class/equipment via repositories
    const updated = await characterRepo.updateClassId(characterId, classId);
    const classData = await classRepo.getById(classId);
    if (!classData) {
      throw new Error(`Class with ID ${classId} not found`);
    }
    
    // Apply attribute bonuses from class to character profile
    // Support multiple casings/keys from DB
    console.log('[assignClassToCharacter] characterId:', characterId, 'classId:', classId);
    console.log('[assignClassToCharacter] classData bonus fields snapshot:', {
      strengthbonus: classData.strengthbonus,
      strengthBonus: classData.strengthBonus,
      StrengthBonus: classData.StrengthBonus,
      dexteritybonus: classData.dexteritybonus,
      dexterityBonus: classData.dexterityBonus,
      DexterityBonus: classData.DexterityBonus,
      constitutionbonus: classData.constitutionbonus,
      constitutionBonus: classData.constitutionBonus,
      ConstitutionBonus: classData.ConstitutionBonus,
      intelligencebonus: classData.intelligencebonus,
      intelligenceBonus: classData.intelligenceBonus,
      IntelligenceBonus: classData.IntelligenceBonus,
      wisdombonus: classData.wisdombonus,
      wisdomBonus: classData.wisdomBonus,
      WisdomBonus: classData.WisdomBonus,
      charismabonus: classData.charismabonus,
      charismaBonus: classData.charismaBonus,
      CharismaBonus: classData.CharismaBonus,
    });
    const toInt = (v) => {
      const n = parseInt(v, 10);
      return Number.isFinite(n) ? n : 0;
    };
    const bonusByKey = (obj, keys) => {
      for (const k of keys) {
        if (obj[k] !== undefined && obj[k] !== null) return toInt(obj[k]);
      }
      return 0;
    };
    const bonuses = {
      strength: bonusByKey(classData, ['strengthbonus', 'strengthBonus', 'StrengthBonus']),
      dexterity: bonusByKey(classData, ['dexteritybonus', 'dexterityBonus', 'DexterityBonus']),
      constitution: bonusByKey(classData, ['constitutionbonus', 'constitutionBonus', 'ConstitutionBonus']),
      intelligence: bonusByKey(classData, ['intelligencebonus', 'intelligenceBonus', 'IntelligenceBonus']),
      wisdom: bonusByKey(classData, ['wisdombonus', 'wisdomBonus', 'WisdomBonus']),
      charisma: bonusByKey(classData, ['charismabonus', 'charismaBonus', 'CharismaBonus'])
    };
    const base = 10;
    const targetAttrs = {
      strength: bonuses.strength,
      dexterity: bonuses.dexterity,
      constitution: bonuses.constitution,
      intelligence: bonuses.intelligence,
      wisdom: bonuses.wisdom,
      charisma: bonuses.charisma,
    };
    console.log('[assignClassToCharacter] computed bonuses:', bonuses, 'target attributes (replace):', targetAttrs);
    let updatedProfile = null;
    try {
      updatedProfile = await profileService.setCharacterAttributes(characterId, targetAttrs);
      console.log('[assignClassToCharacter] profile set to:', updatedProfile ? {
        strength: updatedProfile.strength,
        dexterity: updatedProfile.dexterity,
        constitution: updatedProfile.constitution,
        intelligence: updatedProfile.intelligence,
        wisdom: updatedProfile.wisdom,
        charisma: updatedProfile.charisma,
      } : null);
    } catch (e) {
      console.error('Failed to set class attributes on profile:', e);
    }
    const equipment = await classRepo.getStartingEquipment(classId);
    let addedInventory = [];
    try {
      addedInventory = await inventoryRepo.addDescriptionsAsItemsToInventory(characterId, equipment);
      console.log('[assignClassToCharacter] added starting equipment to inventory:', addedInventory);
    } catch (e) {
      console.error('[assignClassToCharacter] failed to add starting equipment to inventory:', e);
    }
    return {
      character: updated,
      class: classData,
      equipment,
      profile: updatedProfile,
      addedInventory,
    };
  }

  /**
   * Get a story node by ID
   * @param {number} nodeId - The ID of the story node
   * @param {Array} choiceHistory - Optional choice history for placeholder replacement
   * @param {number} characterId - Optional character ID for LLM generation
   * @returns {Promise<Object>} - The story node with its choices
   */
  async getStoryNode(nodeId, choiceHistory = null, characterId = null) {
    // Debug log
    console.log('getStoryNode called with nodeId:', nodeId);
    console.log('choiceHistory:', JSON.stringify(choiceHistory));
    
    // Get the story node
    const node = await storyNodeRepo.getById(nodeId);
    
    // If node doesn't exist and we have a character ID, try to generate it with LLM
    if (!node && characterId) {
        console.log(`Story node with ID ${nodeId} not found. Attempting to generate with LLM...`);
        
        try {
          // Get player progress for context
          const progress = await progressRepo.getByCharacterId(characterId);
          
          if (progress) {
            
            // Get character info
            const characterInfo = await characterRepo.getById(characterId) || {};
            
            // Prepare context for LLM
            const llmContext = {
              characterId,
              playerProgress: progress,
              choiceHistory: progress.choicehistory || [],
              characterInfo,
              metadata: progress.metadata || {}
            };
            
            // Generate a new node using LLM
            const generatedNode = await llmService.generateStoryNode(llmContext);
            console.log('Successfully generated new story node with LLM');
            
            // Return the generated node
            return generatedNode;
          }
        } catch (llmError) {
          console.error('Failed to generate story node with LLM:', llmError);
          // Fall through to the original error
        }
        
        // If we get here, either we don't have enough context or LLM generation failed
        throw new Error(`Story node with ID ${nodeId} not found and could not be generated`);
    } else if (!node) {
        // No character ID provided, can't generate
        throw new Error(`Story node with ID ${nodeId} not found`);
    }
    
    // Get the choices for this node
    const choicesRows = await storyNodeRepo.getChoicesForNode(nodeId);
    
    // Process placeholders via domain service
    const processedContent = await nodeFormatter.processContentPlaceholders(node.content, choiceHistory || []);
    
    // Format node via domain service
    if (node.nodetype === 'outfit_selection') {
      const outfits = await this.getRandomClassOutfits(4);
      const formatted = nodeFormatter.formatOutfitSelectionNode(
        { ...node, content: processedContent },
        choicesRows,
        outfits
      );
      return formatted;
    }
    
    return nodeFormatter.formatStandardNode(
      { ...node },
      processedContent,
      choicesRows
    );
  }
  
  /**
   * Get the first story node
   * @returns {Promise<Object>} - The first story node
   */
  async getFirstStoryNode() {
    const firstId = await storyNodeRepo.getFirstId();
    if (!firstId) {
      throw new Error('No story nodes found');
    }
    return this.getStoryNode(firstId);
  }
  
  /**
   * Get a player's current progress
   * @param {number} characterId - The ID of the character
   * @returns {Promise<Object>} - The player's progress
   */
  async getPlayerProgress(characterId) {
    const progress = await progressRepo.getByCharacterId(characterId);
    if (!progress) {
      return this.initializePlayerProgress(characterId);
    }
    const choiceHistory = progress.choicehistory || [];
    const currentNode = await this.getStoryNode(progress.currentnodeid, choiceHistory);
    return {
      id: progress.id,
      characterId: progress.characterid,
      currentNode,
      choiceHistory,
      metadata: progress.metadata || {},
    };
  }
  
  /**
   * Initialize a new player's progress
   * @param {number} characterId - The ID of the character
   * @returns {Promise<Object>} - The initialized player progress
   */
  async initializePlayerProgress(characterId) {
    const firstNodeId = await storyNodeRepo.getFirstId();
    if (!firstNodeId) {
      throw new Error('No story nodes found');
    }
    const progress = await progressRepo.insertInitial(characterId, firstNodeId);
    const currentNode = await this.getStoryNode(progress.currentnodeid);
    return {
      id: progress.id,
      characterId: progress.characterid,
      currentNode,
      choiceHistory: progress.choicehistory || [],
      metadata: progress.metadata || {},
    };
  }
  
  /**
   * Make a choice and update player progress
   * @param {number} characterId - The ID of the character
   * @param {number} choiceId - The ID of the choice made
   * @param {string} inputValue - Optional input value for choices that require input
   * @param {number} classId - Optional class ID for outfit selection
   * @returns {Promise<Object>} - The updated player progress
   */
  async makeChoice(characterId, choiceId, inputValue, classId = null) {
    // Get the choice
    const choice = await storyNodeRepo.getChoiceById(choiceId);
    if (!choice) {
      throw new Error(`Choice with ID ${choiceId} not found`);
    }
    // Get the current progress
    const progress = await progressRepo.getByCharacterId(characterId);
    if (!progress) {
      throw new Error(`No progress found for character with ID ${characterId}`);
    }
    // Verify this choice belongs to the current node
    if (choice.storynodeid !== progress.currentnodeid) {
      throw new Error(`Choice ${choiceId} does not belong to the current node ${progress.currentnodeid}`);
    }
    // Get the current node to check if it requires input
    const node = await storyNodeRepo.getById(progress.currentnodeid);

    // If the node requires input, validate it
    if (node.requiresinput && !inputValue) {
      throw new Error('This choice requires an input value');
    }
    
    // Resolve outcome via domain service (pure logic)
    const { choiceHistory, metadataDelta, refreshOnly, nextNodeId: initialNextNodeId, resolvedClassId } =
      choiceDomain.resolveOutcome({ progress, choice, node, inputValue, fallbackClassId: classId });

    // Merge metadata and apply profile updates
    let metadata = { ...(progress.metadata || {}) };
    if (metadataDelta && Object.keys(metadataDelta).length > 0) {
      metadata = { ...metadata, ...metadataDelta };
      await profileService.updateCharacterProfile(characterId, metadataDelta);
    }

    // If outfit selection assigned class, update character and metadata
    if (resolvedClassId) {
      const classAssignment = await this.assignClassToCharacter(characterId, resolvedClassId);
      metadata.classId = resolvedClassId;
      metadata.className = classAssignment.class.name;
      metadata.equipment = classAssignment.equipment.map(item => item.description);
    }

    // Determine next node
    let nextNodeId = initialNextNodeId;
    console.log(`Choice ID: ${choiceId}, Choice text: ${choice.choicetext}, Next Node ID from choice: ${nextNodeId}`);
      
      // Check if the next node exists in the database
    let nextNodeExists = false;
    let isDeathNode = false;
    if (nextNodeId) {
      console.log(`Checking if node ID ${nextNodeId} exists in database...`);
      const nextNode = await storyNodeRepo.getById(nextNodeId);
      nextNodeExists = !!nextNode;
      if (nextNodeExists && nextNode.title && nextNode.title.toLowerCase() === 'the end') {
        isDeathNode = true;
        console.log(`Node ID ${nextNodeId} is a death node with title '${nextNode.title}'`);
        console.log('This should mark the character as dead');
      } else if (nextNodeExists) {
        console.log(`Node ID ${nextNodeId} is NOT a death node. Title: '${nextNode.title}'`);
      }
      console.log(`Node ID ${nextNodeId} exists: ${nextNodeExists}`);
    } else {
      console.log('WARNING: nextNodeId is null or undefined! Attempting LLM generation.');
      // Generate a next node if none specified
      const characterInfo = await characterRepo.getById(characterId) || {};
      const llmContext = {
        characterId,
        playerProgress: progress,
        choiceHistory,
        characterInfo,
        metadata
      };
      try {
        const generatedNode = await llmService.generateStoryNode(llmContext);
        if (generatedNode && generatedNode.id) {
          nextNodeId = generatedNode.id;
          nextNodeExists = true;
        }
      } catch (e) {
        console.error('LLM generation failed when nextNodeId was null:', e);
      }
    }

    // If next node doesn't exist, generate one using LLM
    if (nextNodeId && !nextNodeExists) {
      console.log(`Next node ID ${nextNodeId} not found in database. Generating with LLM...`);
      const characterInfo = await characterRepo.getById(characterId) || {};
      const llmContext = { characterId, playerProgress: progress, choiceHistory, characterInfo, metadata };
      try {
        const generatedNode = await llmService.generateStoryNode(llmContext);
        if (generatedNode && generatedNode.id) {
          nextNodeId = generatedNode.id;
          nextNodeExists = true;
        }
      } catch (llmError) {
        console.error('Failed to generate story node with LLM:', llmError);
      }
    }

    // Defensive check to ensure nextNodeId is never null
    if (!nextNodeId) {
      console.error('Critical error: nextNodeId is null before updating PlayerProgress');
      nextNodeId = progress.currentnodeid; // fallback to prevent DB constraint violation
      console.log(`Using fallback node ID: ${nextNodeId}`);
    }

    // Update progress
    await progressRepo.updateProgress(progress.id, nextNodeId, choiceHistory, metadata);

    // If this is a death node, mark the character as dead and update metadata
    console.log(`Is death node check: isDeathNode = ${isDeathNode}`);
    if (isDeathNode) {
      console.log(`Marking character ${characterId} as dead`);
      try {
        const updated = await characterRepo.markDead(characterId);
        console.log('Character update result:', updated);
      } catch (updateError) {
        console.error('Error updating character death status:', updateError);
      }

      metadata.death_reason = 'You met an unfortunate end in your adventure';
      metadata.death_timestamp = new Date().toISOString();
      metadata.prompts_survived = choiceHistory.length;
      await progressRepo.updateMetadata(progress.id, metadata);
    }

    // Return the updated progress with the new node
    return this.getPlayerProgress(characterId);
  }

  /**
   * Process a choice that requires a password input
   * @param {number} characterId - The ID of the character
   * @param {number} choiceId - The ID of the choice made
   * @param {string} password - The password entered by the player
   * @returns {Promise<Object>} - The updated player progress
   */
  async processPasswordChoice(characterId, choiceId, password) {
    // Validate password (4-digit numeric code)
    if (!password || !/^\d{4}$/.test(password)) {
      throw new Error('Password must be a 4-digit numeric code');
    }
    
    return this.makeChoice(characterId, choiceId, password);
  }
  
  /**
   * Get random outfits for the outfit selection prompt
   * @param {number} count - Number of outfits to return
   * @returns {Promise<Array>} - Array of random outfits
   */
  async getRandomOutfits(count = 4) {
    // This would typically fetch from a database of outfits
    // For now, we'll return hardcoded examples
    const outfits = [
      {
        id: 1,
        name: "Ranger's Garb",
        description: "A forest-green tunic with leather accents, perfect for blending into woodland shadows.",
        bonuses: { dexterity: 1, perception: 1 }
      },
      {
        id: 2,
        name: "Wizard's Robes",
        description: "Midnight blue robes adorned with silver stars that seem to twinkle in the right light.",
        bonuses: { intelligence: 1, magic_power: 1 }
      },
      {
        id: 3,
        name: "Knight's Armor",
        description: "Gleaming plate armor with a tabard bearing a mysterious crest.",
        bonuses: { strength: 1, defense: 1 }
      },
      {
        id: 4,
        name: "Bard's Attire",
        description: "A flamboyant outfit with a feathered cap and a lute slung across your back.",
        bonuses: { charisma: 1, performance: 1 }
      },
      {
        id: 5,
        name: "Rogue's Leathers",
        description: "Supple dark leather armor with plenty of hidden pockets.",
        bonuses: { dexterity: 1, stealth: 1 }
      },
      {
        id: 6,
        name: "Cleric's Vestments",
        description: "White and gold robes with holy symbols embroidered along the hem.",
        bonuses: { wisdom: 1, healing: 1 }
      },
      {
        id: 7,
        name: "Druid's Garb",
        description: "Earthy tones with leaves and vines woven into the fabric.",
        bonuses: { wisdom: 1, nature: 1 }
      },
      {
        id: 8,
        name: "Alchemist's Coat",
        description: "A sturdy coat with numerous vials and pouches attached.",
        bonuses: { intelligence: 1, crafting: 1 }
      }
    ];
    
    // Shuffle and return requested number
    return this.shuffleArray(outfits).slice(0, count);
  }
  
  /**
   * Helper function to shuffle an array
   * @param {Array} array - The array to shuffle
   * @returns {Array} - The shuffled array
   */
  shuffleArray(array) {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
  }
  
  /**
   * Update a story node's content with personalized data
   * @param {Object} node - The story node
   * @param {Object} metadata - The player's metadata
   * @returns {Object} - The updated story node
   */
  personalizeNodeContent(node, metadata) {
    let content = node.content;
    
    // Replace placeholders with metadata values
    if (content.includes('{{prompt2answer}}')) {
      // Extract the chosen form of address from metadata
      let address = 'adventurer';
      if (metadata.gender_preference === 'masculine') {
        address = 'my lord';
      } else if (metadata.gender_preference === 'feminine') {
        address = 'my lady';
      }
      
      content = content.replace(/\{\{prompt2answer\}\}/g, address);
    }
    
    // Handle special node types
    if (node.nodeType === 'outfit_selection') {
      // We would dynamically generate outfit options here
      // For now, just update the placeholder text in choices
      node.choices = node.choices.map((choice, index) => {
        if (index < 4) {
          // This would be replaced with actual outfit data
          choice.text = `A ${['elegant', 'rugged', 'mysterious', 'colorful'][index]} outfit that suits your style.`;
        }
        return choice;
      });
    }
    
    return {
      ...node,
      content
    };
  }
}

module.exports = new StoryService();
