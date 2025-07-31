const axios = require('axios');
const { Pool } = require('pg');

// PostgreSQL connection
const pool = new Pool({
  user: 'cyoa_user',
  host: 'localhost',
  database: 'cyoa_litrpg',
  password: 'cyoa_password',
  port: 5432,
});

// LM Studio API configuration
const LLM_CONFIG = {
  apiUrl: process.env.LLM_API_URL || 'http://localhost:1234/v1/chat/completions', // Default LM Studio local API endpoint
  apiKey: process.env.LLM_API_KEY || '', // API key if needed
  model: process.env.LLM_MODEL || 'local-model', // Model name
  temperature: 0.7,
  max_tokens: 1000,
  top_p: 0.95,
};

class LlmService {
  /**
   * Generate a story node and choices using LLM
   * @param {Object} context - Context information for the LLM
   * @param {number} context.characterId - Character ID
   * @param {Object} context.playerProgress - Player progress data
   * @param {Array} context.choiceHistory - History of choices made
   * @param {Object} context.characterInfo - Character information
   * @param {Object} context.metadata - Player metadata
   * @returns {Promise<Object>} - Generated story node with choices
   */
  async generateStoryNode(context) {
    try {
      console.log('Generating story node with LLM...');
      
      // Gather all necessary context for the LLM
      const fullContext = await this.buildFullContext(context);
      
      // Create the prompt for the LLM
      const prompt = this.createPrompt(fullContext);
      
      // Call the LLM API
      const response = await this.callLlmApi(prompt);
      
      // Parse the LLM response into a story node with choices
      const generatedNode = this.parseResponse(response);
      
      // Save the generated node to the database
      const savedNode = await this.saveGeneratedNode(generatedNode, context.characterId);
      
      return savedNode;
    } catch (error) {
      console.error('Error generating story node with LLM:', error);
      throw new Error(`Failed to generate story node: ${error.message}`);
    }
  }
  
  /**
   * Build full context for the LLM from the database
   * @param {Object} context - Basic context information
   * @returns {Promise<Object>} - Full context with all relevant data
   */
  async buildFullContext(context) {
    const client = await pool.connect();
    
    try {
      const fullContext = { ...context };
      
      // Get character details
      if (context.characterId) {
        const characterResult = await client.query(
          'SELECT * FROM "character" WHERE Id = $1',
          [context.characterId]
        );
        
        if (characterResult.rows.length > 0) {
          fullContext.character = characterResult.rows[0];
          
          // Get character stats
          const statsResult = await client.query(
            `SELECT cs.*, s.Name as StatName, s.Description as StatDescription
             FROM CharacterStat cs
             JOIN Stat s ON cs.StatId = s.Id
             WHERE cs.CharacterId = $1`,
            [context.characterId]
          );
          
          fullContext.characterStats = statsResult.rows;
          
          // Get character skills
          const skillsResult = await client.query(
            `SELECT cs.*, s.Name as SkillName, s.Description as SkillDescription
             FROM CharacterSkill cs
             JOIN Skill s ON cs.SkillId = s.Id
             WHERE cs.CharacterId = $1`,
            [context.characterId]
          );
          
          fullContext.characterSkills = skillsResult.rows;
          
          // Get character inventory
          const inventoryResult = await client.query(
            `SELECT ci.*, i.Name as ItemName, i.Description as ItemDescription
             FROM CharacterInventory ci
             JOIN Item i ON ci.ItemId = i.Id
             WHERE ci.CharacterId = $1`,
            [context.characterId]
          );
          
          fullContext.characterInventory = inventoryResult.rows;
        }
      }
      
      // Get previous story nodes from choice history
      if (context.choiceHistory && Array.isArray(context.choiceHistory)) {
        const nodeIds = [...new Set(context.choiceHistory.map(choice => choice.nodeId))];
        
        if (nodeIds.length > 0) {
          const nodesResult = await client.query(
            `SELECT * FROM StoryNode WHERE Id IN (${nodeIds.join(',')})
             ORDER BY Id`
          );
          
          fullContext.previousNodes = nodesResult.rows;
        }
      }
      
      // Get all story prompts to understand the story style and flow
      const allPromptsResult = await client.query(
        'SELECT * FROM StoryNode ORDER BY Id LIMIT 10'
      );
      
      fullContext.storyStyle = allPromptsResult.rows;
      
      return fullContext;
    } finally {
      client.release();
    }
  }
  
  /**
   * Create a prompt for the LLM based on the context
   * @param {Object} context - Full context information
   * @returns {Array} - Formatted prompt for the LLM
   */
  createPrompt(context) {
    // System message with instructions
    const systemMessage = {
      role: 'system',
      content: `You are a creative storyteller for a LitRPG adventure game. 
      Your task is to generate the next story node and 4 choices based on the player's history and character information.
      
      The story is set in a fantasy renaissance faire called MYTHOS that has magical elements.
      
      Follow these guidelines:
      1. Maintain the tone and style of the existing story
      2. Consider the player's previous choices and character stats
      3. Respect the player's gender preference in how they are addressed
      4. Create meaningful choices that would impact the story in different ways
      5. Each choice should have potential metadata impacts (personality traits, stats, etc.)
      6. Format your response as JSON with the following structure:
      {
        "title": "Node Title",
        "content": "Detailed story text with rich description",
        "choices": [
          {
            "text": "Choice 1 text",
            "metadataImpact": {"trait": value, "trait2": value}
          },
          {
            "text": "Choice 2 text",
            "metadataImpact": {"trait": value, "trait2": value}
          },
          {
            "text": "Choice 3 text",
            "metadataImpact": {"trait": value, "trait2": value}
          },
          {
            "text": "Choice 4 text",
            "metadataImpact": {"trait": value, "trait2": value}
          }
        ]
      }`
    };
    
    // User message with context
    let userMessage = 'Generate the next story node and choices for this LitRPG adventure.';
    
    // Add character information
    if (context.character) {
      userMessage += `\n\nCharacter Information:
      Name: ${context.character.name}
      Level: ${context.character.level}
      Experience: ${context.character.experience}`;
    }
    
    // Add character stats
    if (context.characterStats && context.characterStats.length > 0) {
      userMessage += '\n\nCharacter Stats:';
      context.characterStats.forEach(stat => {
        userMessage += `\n${stat.statname}: ${stat.value}`;
      });
    }
    
    // Add metadata/preferences
    if (context.metadata) {
      userMessage += '\n\nPlayer Preferences:';
      Object.entries(context.metadata).forEach(([key, value]) => {
        userMessage += `\n${key}: ${value}`;
      });
    }
    
    // Add choice history summary
    if (context.choiceHistory && context.choiceHistory.length > 0) {
      userMessage += '\n\nRecent Story Progression:';
      
      // If we have previous nodes, use them to summarize the story
      if (context.previousNodes && context.previousNodes.length > 0) {
        const recentNodes = context.previousNodes.slice(-3); // Last 3 nodes
        recentNodes.forEach(node => {
          userMessage += `\n\nTitle: ${node.title}\nContent: ${node.content}`;
          
          // Add the choice the player made for this node
          const choice = context.choiceHistory.find(c => c.nodeId === node.id);
          if (choice) {
            userMessage += `\nPlayer chose: ${choice.choiceText}`;
          }
        });
      } else {
        // Fallback to just listing choices
        const recentChoices = context.choiceHistory.slice(-5); // Last 5 choices
        recentChoices.forEach(choice => {
          userMessage += `\n- ${choice.choiceText}`;
        });
      }
    }
    
    // Add story style examples
    if (context.storyStyle && context.storyStyle.length > 0) {
      userMessage += '\n\nStory Style Examples (for consistency):';
      const styleExamples = context.storyStyle.slice(0, 2); // Just 2 examples
      styleExamples.forEach(node => {
        userMessage += `\n\nExample Title: ${node.title}\nExample Content: ${node.content}`;
      });
    }
    
    return [
      systemMessage,
      { role: 'user', content: userMessage }
    ];
  }
  
  /**
   * Call the LLM API with the prompt
   * @param {Array} prompt - Formatted prompt messages
   * @returns {Promise<Object>} - LLM API response
   */
  async callLlmApi(prompt) {
    try {
      const response = await axios.post(
        LLM_CONFIG.apiUrl,
        {
          model: LLM_CONFIG.model,
          messages: prompt,
          temperature: LLM_CONFIG.temperature,
          max_tokens: LLM_CONFIG.max_tokens,
          top_p: LLM_CONFIG.top_p,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            ...(LLM_CONFIG.apiKey && { 'Authorization': `Bearer ${LLM_CONFIG.apiKey}` })
          }
        }
      );
      
      return response.data;
    } catch (error) {
      console.error('Error calling LLM API:', error);
      throw new Error(`LLM API call failed: ${error.message}`);
    }
  }
  
  /**
   * Parse the LLM response into a story node with choices
   * @param {Object} response - LLM API response
   * @returns {Object} - Parsed story node with choices
   */
  parseResponse(response) {
    try {
      // Extract the content from the LLM response
      const content = response.choices[0].message.content;
      
      // Parse the JSON from the content
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Could not extract JSON from LLM response');
      }
      
      const parsedResponse = JSON.parse(jsonMatch[0]);
      
      // Validate the response structure
      if (!parsedResponse.title || !parsedResponse.content || !Array.isArray(parsedResponse.choices)) {
        throw new Error('LLM response is missing required fields');
      }
      
      if (parsedResponse.choices.length < 4) {
        throw new Error('LLM response does not have enough choices');
      }
      
      return {
        title: parsedResponse.title,
        content: parsedResponse.content,
        nodeType: 'standard',
        requiresInput: false,
        inputType: null,
        choices: parsedResponse.choices.map(choice => ({
          text: choice.text,
          metadataImpact: choice.metadataImpact || {}
        }))
      };
    } catch (error) {
      console.error('Error parsing LLM response:', error);
      throw new Error(`Failed to parse LLM response: ${error.message}`);
    }
  }
  
  /**
   * Save the generated node to the database
   * @param {Object} generatedNode - Generated story node with choices
   * @param {number} characterId - Character ID
   * @returns {Promise<Object>} - Saved node with database IDs
   */
  async saveGeneratedNode(generatedNode, characterId) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Insert the story node
      const nodeResult = await client.query(
        `INSERT INTO StoryNode (Title, Content, NodeType, RequiresInput, InputType)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [
          generatedNode.title,
          generatedNode.content,
          generatedNode.nodeType,
          generatedNode.requiresInput,
          generatedNode.inputType
        ]
      );
      
      const savedNode = nodeResult.rows[0];
      
      // Insert the choices
      const savedChoices = [];
      for (const choice of generatedNode.choices) {
        const choiceResult = await client.query(
          `INSERT INTO StoryChoice (StoryNodeId, ChoiceText, NextNodeId, MetadataImpact)
           VALUES ($1, $2, $3, $4)
           RETURNING *`,
          [
            savedNode.id,
            choice.text,
            null, // NextNodeId will be set when the choice is made
            JSON.stringify(choice.metadataImpact)
          ]
        );
        
        savedChoices.push(choiceResult.rows[0]);
      }
      
      await client.query('COMMIT');
      
      // Format the response to match the getStoryNode format
      return {
        id: savedNode.id,
        title: savedNode.title,
        content: savedNode.content,
        nodeType: savedNode.nodetype,
        requiresInput: savedNode.requiresinput,
        inputType: savedNode.inputtype,
        choices: savedChoices.map(choice => ({
          id: choice.id,
          text: choice.choicetext,
          nextNodeId: choice.nextnodeid,
          metadataImpact: choice.metadataimpact
        })),
        isGenerated: true // Flag to indicate this was generated by LLM
      };
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error saving generated node:', error);
      throw new Error(`Failed to save generated node: ${error.message}`);
    } finally {
      client.release();
    }
  }
}

module.exports = new LlmService();
