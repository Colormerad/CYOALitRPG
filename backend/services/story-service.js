const { Pool } = require('pg');
const profileService = require('./profile-service');
const llmService = require('./llm-service');

// PostgreSQL connection
const pool = new Pool({
  user: 'cyoa_user',
  host: 'localhost',
  database: 'cyoa_litrpg',
  password: 'cyoa_password',
  port: 5432,
});

class StoryService {
  /**
   * Get random class outfits for selection
   * @param {number} count - Number of outfits to retrieve
   * @returns {Promise<Array>} - Array of class outfits with class info
   */
  async getRandomClassOutfits(count = 4) {
    const client = await pool.connect();
    
    try {
      // Get random classes with their outfits
      const result = await client.query(
        `SELECT c.Id AS ClassId, c.Name AS ClassName, c.Description AS ClassDescription, 
                o.Id AS OutfitId, o.Description AS OutfitDescription
         FROM Class c
         JOIN ClassOutfit o ON c.Id = o.ClassId
         ORDER BY RANDOM()
         LIMIT $1`,
        [count]
      );
      
      return result.rows;
    } finally {
      client.release();
    }
  }

  /**
   * Assign class and starting equipment to a character
   * @param {number} characterId - The character ID
   * @param {number} classId - The class ID to assign
   * @returns {Promise<Object>} - Updated character info
   */
  async assignClassToCharacter(characterId, classId) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Update character with class ID
      await client.query(
        'UPDATE Character SET ClassId = $1 WHERE Id = $2',
        [classId, characterId]
      );
      
      // Get class details
      const classResult = await client.query(
        'SELECT * FROM Class WHERE Id = $1',
        [classId]
      );
      
      if (classResult.rows.length === 0) {
        throw new Error(`Class with ID ${classId} not found`);
      }
      
      const classData = classResult.rows[0];
      
      // Get starting equipment for the class
      const equipmentResult = await client.query(
        'SELECT * FROM ClassStartingEquipment WHERE ClassId = $1',
        [classId]
      );
      
      const equipment = equipmentResult.rows;
      
      // TODO: Add equipment to character inventory (if inventory system exists)
      // For now, we'll just track it in metadata
      
      await client.query('COMMIT');
      
      return {
        character: { id: characterId, classId: classId },
        class: classData,
        equipment: equipment
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Get a story node by ID
   * @param {number} nodeId - The ID of the story node
   * @param {Array} choiceHistory - Optional choice history for placeholder replacement
   * @returns {Promise<Object>} - The story node with its choices
   */
  async getStoryNode(nodeId, choiceHistory = null, characterId = null) {
    // Debug log
    console.log('getStoryNode called with nodeId:', nodeId);
    console.log('choiceHistory:', JSON.stringify(choiceHistory));
    const client = await pool.connect();
    
    try {
      // Get the story node
      const nodeResult = await client.query(
        'SELECT * FROM StoryNode WHERE Id = $1',
        [nodeId]
      );
      
      // If node doesn't exist and we have a character ID, try to generate it with LLM
      if (nodeResult.rows.length === 0 && characterId) {
        console.log(`Story node with ID ${nodeId} not found. Attempting to generate with LLM...`);
        
        try {
          // Get player progress for context
          const progressResult = await client.query(
            'SELECT * FROM PlayerProgress WHERE CharacterId = $1',
            [characterId]
          );
          
          if (progressResult.rows.length > 0) {
            const progress = progressResult.rows[0];
            
            // Get character info
            const characterResult = await client.query(
              'SELECT * FROM "character" WHERE Id = $1',
              [characterId]
            );
            
            const characterInfo = characterResult.rows[0] || {};
            
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
      } else if (nodeResult.rows.length === 0) {
        // No character ID provided, can't generate
        throw new Error(`Story node with ID ${nodeId} not found`);
      }
      
      const node = nodeResult.rows[0];
      
      // Get the choices for this node
      const choicesResult = await client.query(
        'SELECT * FROM StoryChoice WHERE StoryNodeId = $1 ORDER BY Id',
        [nodeId]
      );
      
      // Process content for placeholders if choice history is available
      let processedContent = node.content;
      console.log('Original content:', processedContent);
      
      if (choiceHistory && Array.isArray(choiceHistory)) {
        console.log('Processing choice history, length:', choiceHistory.length);
        
        // Replace {{prompt2answer}} with the text from the second prompt's selected choice
        if (processedContent.includes('{{prompt2answer}}')) {
          console.log('Found {{prompt2answer}} placeholder');
          
          // For prompt 3, we need the answer from prompt 2 (node 2)
          // First, find the choice made at prompt 2 (should be choices with IDs 5, 6, 7, or 8)
          const prompt2Choices = [5, 6, 7, 8]; // These are the choice IDs for prompt 2
          
          // Find the choice from prompt 2 in the history
          const prompt2Choice = choiceHistory.find(choice => 
            prompt2Choices.includes(choice.choiceId));
          
          if (prompt2Choice) {
            console.log('Found prompt 2 choice:', JSON.stringify(prompt2Choice));
            
            // Get the choice text for the prompt 2 choice
            const choiceId = prompt2Choice.choiceId;
            console.log('Using choice ID from prompt 2:', choiceId);
            
            const choiceResult = await client.query(
              'SELECT choicetext FROM StoryChoice WHERE Id = $1',
              [choiceId]
            );
            
            if (choiceResult.rows.length > 0) {
              const choiceText = choiceResult.rows[0].choicetext;
              console.log('Found choice text:', choiceText);
              
              // For these specific choices, we'll use the full text since they're short phrases
              // like "My good sir", "Dearest madam", etc.
              const replacement = choiceText.trim();
              console.log('Using replacement:', replacement);
              
              processedContent = processedContent.replace(/\{\{prompt2answer\}\}/g, replacement);
              console.log('Processed content:', processedContent);
            } else {
              console.log('No choice text found for ID:', choiceId);
              processedContent = processedContent.replace(/\{\{prompt2answer\}\}/g, 'adventurer');
            }
          } else {
            console.log('No prompt 2 choice found in history, using placeholder');
            processedContent = processedContent.replace(/\{\{prompt2answer\}\}/g, 'adventurer');
          }
        }
      } else {
        console.log('No choice history available');
      }
      
      // Special handling for outfit selection node
      if (node.nodetype === 'outfit_selection') {
        // Get random outfits
        const outfits = await this.getRandomClassOutfits(4);
        
        // Format the response with actual outfit descriptions
        const formattedNode = {
          id: node.id,
          title: node.title,
          content: processedContent,
          nodeType: node.nodetype,
          requiresInput: node.requiresinput,
          inputType: node.inputtype,
          choices: outfits.map((outfit, index) => ({
            id: choicesResult.rows[index]?.id || 0,
            text: `${outfit.classname}: ${outfit.outfitdescription}`,
            nextNodeId: choicesResult.rows[index]?.nextnodeid || null,
            metadataImpact: choicesResult.rows[index]?.metadataimpact || {},
            classId: outfit.classid, // Add classId for later processing
            outfitId: outfit.outfitid // Add outfitId for later processing
          })).concat([
            // Add the "Show me more options" choice if it exists in the original choices
            ...choicesResult.rows
              .filter(choice => choice.choicetext.includes('more options'))
              .map(choice => ({
                id: choice.id,
                text: choice.choicetext,
                nextNodeId: choice.nextnodeid,
                metadataImpact: choice.metadataimpact
              }))
          ])
        };
        
        return formattedNode;
      } else {
        // Standard node formatting
        const formattedNode = {
          id: node.id,
          title: node.title,
          content: processedContent, // Use the processed content with replacements
          nodeType: node.nodetype,
          requiresInput: node.requiresinput,
          inputType: node.inputtype,
          choices: choicesResult.rows.map(choice => ({
            id: choice.id,
            text: choice.choicetext,
            nextNodeId: choice.nextnodeid,
            metadataImpact: choice.metadataimpact
          }))
        };
        
        return formattedNode;
      }
    } finally {
      client.release();
    }
  }
  
  /**
   * Get the first story node
   * @returns {Promise<Object>} - The first story node
   */
  async getFirstStoryNode() {
    const client = await pool.connect();
    
    try {
      const result = await client.query(
        'SELECT Id FROM StoryNode ORDER BY Id LIMIT 1'
      );
      
      if (result.rows.length === 0) {
        throw new Error('No story nodes found');
      }
      
      return this.getStoryNode(result.rows[0].id);
    } finally {
      client.release();
    }
  }
  
  /**
   * Get a player's current progress
   * @param {number} characterId - The ID of the character
   * @returns {Promise<Object>} - The player's progress
   */
  async getPlayerProgress(characterId) {
    const client = await pool.connect();
    
    try {
      const result = await client.query(
        'SELECT * FROM PlayerProgress WHERE CharacterId = $1',
        [characterId]
      );
      
      if (result.rows.length === 0) {
        // No progress found, create initial progress
        return this.initializePlayerProgress(characterId);
      }
      
      const progress = result.rows[0];
      const choiceHistory = progress.choicehistory || [];
      
      // Get the current node with choice history for placeholder replacement
      const currentNode = await this.getStoryNode(progress.currentnodeid, choiceHistory);
      
      return {
        id: progress.id,
        characterId: progress.characterid,
        currentNode: currentNode,
        choiceHistory: choiceHistory,
        metadata: progress.metadata || {},
      };
    } finally {
      client.release();
    }
  }
  
  /**
   * Initialize a new player's progress
   * @param {number} characterId - The ID of the character
   * @returns {Promise<Object>} - The initialized player progress
   */
  async initializePlayerProgress(characterId) {
    const client = await pool.connect();
    
    try {
      // Get the first story node
      const firstNodeResult = await client.query(
        'SELECT Id FROM StoryNode ORDER BY Id LIMIT 1'
      );
      
      if (firstNodeResult.rows.length === 0) {
        throw new Error('No story nodes found');
      }
      
      const firstNodeId = firstNodeResult.rows[0].id;
      
      // Create initial progress
      const progressResult = await client.query(
        `INSERT INTO PlayerProgress 
         (CharacterId, CurrentNodeId, ChoiceHistory, Metadata) 
         VALUES ($1, $2, $3, $4) 
         RETURNING *`,
        [characterId, firstNodeId, '[]', '{}']
      );
      
      const progress = progressResult.rows[0];
      
      // Get the current node
      const currentNode = await this.getStoryNode(progress.currentnodeid);
      
      return {
        id: progress.id,
        characterId: progress.characterid,
        currentNode: currentNode,
        choiceHistory: progress.choicehistory || [],
        metadata: progress.metadata || {},
      };
    } finally {
      client.release();
    }
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
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Get the choice
      const choiceResult = await client.query(
        'SELECT * FROM StoryChoice WHERE Id = $1',
        [choiceId]
      );
      
      if (choiceResult.rows.length === 0) {
        throw new Error(`Choice with ID ${choiceId} not found`);
      }
      
      const choice = choiceResult.rows[0];
      
      // Get the current progress
      const progressResult = await client.query(
        'SELECT * FROM PlayerProgress WHERE CharacterId = $1',
        [characterId]
      );
      
      if (progressResult.rows.length === 0) {
        throw new Error(`No progress found for character with ID ${characterId}`);
      }
      
      const progress = progressResult.rows[0];
      
      // Verify this choice belongs to the current node
      if (choice.storynodeid !== progress.currentnodeid) {
        throw new Error(`Choice ${choiceId} does not belong to the current node ${progress.currentnodeid}`);
      }
      
      // Get the current node to check if it requires input
      const nodeResult = await client.query(
        'SELECT * FROM StoryNode WHERE Id = $1',
        [progress.currentnodeid]
      );
      
      const node = nodeResult.rows[0];
      
      // If the node requires input, validate it
      if (node.requiresinput && !inputValue) {
        throw new Error('This choice requires an input value');
      }
      
      // Update choice history
      let choiceHistory = progress.choicehistory || [];
      if (Array.isArray(choiceHistory)) {
        choiceHistory.push({
          choiceId: choice.id,
          timestamp: new Date().toISOString(),
          inputValue: inputValue
        });
      } else {
        choiceHistory = [{
          choiceId: choice.id,
          timestamp: new Date().toISOString(),
          inputValue: inputValue
        }];
      }
      
      // Update metadata based on choice impact
      let metadata = progress.metadata || {};
      if (choice.metadataimpact) {
        metadata = { ...metadata, ...choice.metadataimpact };
        
        // Update character profile based on choice impact
        await profileService.updateCharacterProfile(characterId, choice.metadataimpact);
      }
      
      // Handle outfit selection and class assignment
      const currentNodeResult = await client.query(
        'SELECT * FROM StoryNode WHERE Id = $1',
        [progress.currentnodeid]
      );
      
      if (currentNodeResult.rows.length > 0 && currentNodeResult.rows[0].nodetype === 'outfit_selection') {
        // Get the full choice data including classId if it exists
        const fullChoiceResult = await client.query(
          'SELECT * FROM StoryChoice WHERE Id = $1',
          [choiceId]
        );
        
        if (fullChoiceResult.rows.length > 0) {
          const fullChoice = fullChoiceResult.rows[0];
          
          // Check if this is a refresh choice ("Show me more options")
          if (fullChoice.choicetext.includes('more options')) {
            // This is a refresh choice, don't assign a class
          } else {
            // This is an outfit choice, get the classId from the request or from the choice metadata
            const classIdFromRequest = fullChoice.classid;
            const classIdFromMetadata = fullChoice.metadataimpact?.classId;
            
            // Use the first available classId
            const classId = classIdFromRequest || classIdFromMetadata;
            
            if (classId) {
              // Assign the class to the character
              const classAssignment = await this.assignClassToCharacter(characterId, classId);
              
              // Update metadata with class and equipment info
              metadata.classId = classId;
              metadata.className = classAssignment.class.name;
              metadata.equipment = classAssignment.equipment.map(item => item.description);
            }
          }
        }
      }
      
      // If this choice leads to a specific next node, use that
      let nextNodeId = choice.nextnodeid;
      console.log(`Choice ID: ${choiceId}, Choice text: ${choice.choicetext}, Next Node ID from choice: ${nextNodeId}`);
      
      // Special handling for "Show me more options" in outfit selection
      if (currentNodeResult.rows.length > 0 && 
          currentNodeResult.rows[0].nodetype === 'outfit_selection' && 
          choice.choicetext && choice.choicetext.includes('more options')) {
        // Stay on the same node to refresh options
        nextNodeId = progress.currentnodeid;
        console.log('Refreshing outfit options without advancing to next node');
      }
      
      // Check if the next node exists in the database
      let nextNodeExists = false;
      let isDeathNode = false;
      
      if (nextNodeId) {
        console.log(`Checking if node ID ${nextNodeId} exists in database...`);
        const nextNodeResult = await client.query(
          'SELECT Id, Title FROM StoryNode WHERE Id = $1',
          [nextNodeId]
        );
        nextNodeExists = nextNodeResult.rows.length > 0;
        
        // Check if this is a death node
        if (nextNodeExists && nextNodeResult.rows[0].title === "The End") {
          isDeathNode = true;
          console.log(`Node ID ${nextNodeId} is a death node`);
        }
        
        console.log(`Node ID ${nextNodeId} exists: ${nextNodeExists}`);
      } else {
        console.log('WARNING: nextNodeId is null or undefined!');
      }
      
      // If next node doesn't exist, generate one using LLM
      if (nextNodeId && !nextNodeExists) {
        console.log(`Next node ID ${nextNodeId} not found in database. Generating with LLM...`);
        
        // Get character info for context
        const characterResult = await client.query(
          'SELECT * FROM "character" WHERE Id = $1',
          [characterId]
        );
        
        const characterInfo = characterResult.rows[0] || {};
        
        // Prepare context for LLM
        const llmContext = {
          characterId,
          playerProgress: progress,
          choiceHistory,
          characterInfo,
          metadata
        };
        
        // Generate a new node using LLM
        try {
          const generatedNode = await llmService.generateStoryNode(llmContext);
          console.log('Successfully generated new story node with LLM');
          
          // Use the generated node's ID as the next node
          nextNodeId = generatedNode.id;
        } catch (llmError) {
          console.error('Failed to generate story node with LLM:', llmError);
          // If LLM fails, we'll continue with the original nextNodeId
          // This might lead to a 404 later, but at least we tried
        }
      }
      
      // Defensive check to ensure nextNodeId is never null
      if (!nextNodeId) {
        console.error('Critical error: nextNodeId is null before updating PlayerProgress');
        // Use the current node ID as a fallback to prevent database constraint violation
        nextNodeId = progress.currentnodeid;
        console.log(`Using fallback node ID: ${nextNodeId}`);
      }
      
      // Update progress
      await client.query(
        `UPDATE PlayerProgress 
         SET CurrentNodeId = $1, ChoiceHistory = $2, Metadata = $3, UpdatedAt = CURRENT_TIMESTAMP
         WHERE Id = $4`,
        [nextNodeId, JSON.stringify(choiceHistory), JSON.stringify(metadata), progress.id]
      );
      
      // If this is a death node, mark the character as dead
      if (isDeathNode) {
        console.log(`Marking character ${characterId} as dead`);
        await client.query(
          `UPDATE "character" 
           SET is_dead = true, updated_at = CURRENT_TIMESTAMP
           WHERE Id = $1`,
          [characterId]
        );
        
        // Add death metadata
        metadata.death_reason = "You met an unfortunate end in your adventure";
        metadata.death_timestamp = new Date().toISOString();
        metadata.prompts_survived = choiceHistory.length;
        
        // Update progress with death metadata
        await client.query(
          `UPDATE PlayerProgress 
           SET Metadata = $1
           WHERE Id = $2`,
          [JSON.stringify(metadata), progress.id]
        );
      }
      
      await client.query('COMMIT');
      
      // Return the updated progress with the new node
      return this.getPlayerProgress(characterId);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
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
