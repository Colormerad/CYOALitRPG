const { Pool } = require('pg');

// PostgreSQL connection
const pool = new Pool({
  user: 'cyoa_user',
  host: 'localhost',
  database: 'cyoa_litrpg',
  password: 'cyoa_password',
  port: 5432,
});

class ProfileService {
  /**
   * Get a character's profile
   * @param {number} characterId - The ID of the character
   * @returns {Promise<Object>} - The character profile
   */
  async getCharacterProfile(characterId) {
    const client = await pool.connect();
    
    try {
      // Check if profile exists
      const result = await client.query(
        'SELECT * FROM CharacterProfile WHERE CharacterId = $1',
        [characterId]
      );
      
      if (result.rows.length === 0) {
        // Create profile if it doesn't exist
        return this.initializeCharacterProfile(characterId);
      }
      
      return result.rows[0];
    } finally {
      client.release();
    }
  }
  
  /**
   * Initialize a character's profile
   * @param {number} characterId - The ID of the character
   * @returns {Promise<Object>} - The initialized character profile
   */
  async initializeCharacterProfile(characterId) {
    const client = await pool.connect();
    
    try {
      // Create initial profile with default values
      const result = await client.query(
        `INSERT INTO CharacterProfile 
         (CharacterId, Strength, Dexterity, Constitution, Intelligence, Wisdom, Charisma) 
         VALUES ($1, 10, 10, 10, 10, 10, 10) 
         RETURNING *`,
        [characterId]
      );
      
      return result.rows[0];
    } finally {
      client.release();
    }
  }
  
  /**
   * Update a character's profile based on choice metadata impact
   * @param {number} characterId - The ID of the character
   * @param {Object} metadataImpact - The impact of the choice on the character's metadata
   * @returns {Promise<Object>} - The updated character profile
   */
  async updateCharacterProfile(characterId, metadataImpact) {
    if (!metadataImpact) return this.getCharacterProfile(characterId);
    
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Get current profile
      let profile = await this.getCharacterProfile(characterId);
      
      // Build update query dynamically based on metadataImpact
      const updates = [];
      const values = [characterId]; // First param is always characterId
      let paramIndex = 2; // Start from 2 since $1 is characterId
      
      // Process core attributes
      if (metadataImpact.strength) {
        updates.push(`Strength = GREATEST(0, LEAST(100, Strength + $${paramIndex}))`);
        values.push(parseInt(metadataImpact.strength));
        paramIndex++;
      }
      
      if (metadataImpact.dexterity) {
        updates.push(`Dexterity = GREATEST(0, LEAST(100, Dexterity + $${paramIndex}))`);
        values.push(parseInt(metadataImpact.dexterity));
        paramIndex++;
      }
      
      if (metadataImpact.constitution) {
        updates.push(`Constitution = GREATEST(0, LEAST(100, Constitution + $${paramIndex}))`);
        values.push(parseInt(metadataImpact.constitution));
        paramIndex++;
      }
      
      if (metadataImpact.intelligence) {
        updates.push(`Intelligence = GREATEST(0, LEAST(100, Intelligence + $${paramIndex}))`);
        values.push(parseInt(metadataImpact.intelligence));
        paramIndex++;
      }
      
      if (metadataImpact.wisdom) {
        updates.push(`Wisdom = GREATEST(0, LEAST(100, Wisdom + $${paramIndex}))`);
        values.push(parseInt(metadataImpact.wisdom));
        paramIndex++;
      }
      
      if (metadataImpact.charisma) {
        updates.push(`Charisma = GREATEST(0, LEAST(100, Charisma + $${paramIndex}))`);
        values.push(parseInt(metadataImpact.charisma));
        paramIndex++;
      }
      
      // Process experience points
      if (metadataImpact.strength_exp) {
        updates.push(`StrengthExp = StrengthExp + $${paramIndex}`);
        values.push(parseInt(metadataImpact.strength_exp));
        paramIndex++;
      }
      
      if (metadataImpact.dexterity_exp) {
        updates.push(`DexterityExp = DexterityExp + $${paramIndex}`);
        values.push(parseInt(metadataImpact.dexterity_exp));
        paramIndex++;
      }
      
      if (metadataImpact.constitution_exp) {
        updates.push(`ConstitutionExp = ConstitutionExp + $${paramIndex}`);
        values.push(parseInt(metadataImpact.constitution_exp));
        paramIndex++;
      }
      
      if (metadataImpact.intelligence_exp) {
        updates.push(`IntelligenceExp = IntelligenceExp + $${paramIndex}`);
        values.push(parseInt(metadataImpact.intelligence_exp));
        paramIndex++;
      }
      
      if (metadataImpact.wisdom_exp) {
        updates.push(`WisdomExp = WisdomExp + $${paramIndex}`);
        values.push(parseInt(metadataImpact.wisdom_exp));
        paramIndex++;
      }
      
      if (metadataImpact.charisma_exp) {
        updates.push(`CharismaExp = CharismaExp + $${paramIndex}`);
        values.push(parseInt(metadataImpact.charisma_exp));
        paramIndex++;
      }
      
      // Process alignment
      if (metadataImpact.good_evil) {
        updates.push(`GoodEvilAxis = GREATEST(-100, LEAST(100, GoodEvilAxis + $${paramIndex}))`);
        values.push(parseInt(metadataImpact.good_evil));
        paramIndex++;
      }
      
      if (metadataImpact.order_chaos) {
        updates.push(`OrderChaosAxis = GREATEST(-100, LEAST(100, OrderChaosAxis + $${paramIndex}))`);
        values.push(parseInt(metadataImpact.order_chaos));
        paramIndex++;
      }
      
      // Process story preferences
      if (metadataImpact.combat_preference) {
        updates.push(`CombatPreference = GREATEST(0, LEAST(100, CombatPreference + $${paramIndex}))`);
        values.push(parseInt(metadataImpact.combat_preference));
        paramIndex++;
      }
      
      if (metadataImpact.exploration_preference) {
        updates.push(`ExplorationPreference = GREATEST(0, LEAST(100, ExplorationPreference + $${paramIndex}))`);
        values.push(parseInt(metadataImpact.exploration_preference));
        paramIndex++;
      }
      
      if (metadataImpact.social_preference) {
        updates.push(`SocialPreference = GREATEST(0, LEAST(100, SocialPreference + $${paramIndex}))`);
        values.push(parseInt(metadataImpact.social_preference));
        paramIndex++;
      }
      
      if (metadataImpact.puzzle_preference) {
        updates.push(`PuzzlePreference = GREATEST(0, LEAST(100, PuzzlePreference + $${paramIndex}))`);
        values.push(parseInt(metadataImpact.puzzle_preference));
        paramIndex++;
      }
      
      // Process personality traits
      if (metadataImpact.caution) {
        updates.push(`Caution = GREATEST(0, LEAST(100, Caution + $${paramIndex}))`);
        values.push(parseInt(metadataImpact.caution));
        paramIndex++;
      }
      
      if (metadataImpact.bravery) {
        updates.push(`Bravery = GREATEST(0, LEAST(100, Bravery + $${paramIndex}))`);
        values.push(parseInt(metadataImpact.bravery));
        paramIndex++;
      }
      
      if (metadataImpact.curiosity) {
        updates.push(`Curiosity = GREATEST(0, LEAST(100, Curiosity + $${paramIndex}))`);
        values.push(parseInt(metadataImpact.curiosity));
        paramIndex++;
      }
      
      if (metadataImpact.empathy) {
        updates.push(`Empathy = GREATEST(0, LEAST(100, Empathy + $${paramIndex}))`);
        values.push(parseInt(metadataImpact.empathy));
        paramIndex++;
      }
      
      // Process magic affinity
      if (metadataImpact.magic_affinity) {
        updates.push(`MagicAffinity = GREATEST(0, LEAST(100, MagicAffinity + $${paramIndex}))`);
        values.push(parseInt(metadataImpact.magic_affinity));
        paramIndex++;
      }
      
      // Process additional traits
      const additionalTraits = {};
      Object.keys(metadataImpact).forEach(key => {
        // Skip keys we've already processed
        if (!['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma',
              'strength_exp', 'dexterity_exp', 'constitution_exp', 'intelligence_exp', 'wisdom_exp', 'charisma_exp',
              'good_evil', 'order_chaos', 'combat_preference', 'exploration_preference',
              'social_preference', 'puzzle_preference', 'caution', 'bravery', 'curiosity',
              'empathy', 'magic_affinity'].includes(key)) {
          additionalTraits[key] = metadataImpact[key];
        }
      });
      
      if (Object.keys(additionalTraits).length > 0) {
        updates.push(`AdditionalTraits = AdditionalTraits || $${paramIndex}::jsonb`);
        values.push(JSON.stringify(additionalTraits));
        paramIndex++;
      }
      
      // Always update the timestamp
      updates.push('UpdatedAt = CURRENT_TIMESTAMP');
      
      // If we have updates to make
      if (updates.length > 0) {
        const updateQuery = `
          UPDATE CharacterProfile 
          SET ${updates.join(', ')} 
          WHERE CharacterId = $1 
          RETURNING *
        `;
        
        const result = await client.query(updateQuery, values);
        profile = result.rows[0];
      }
      
      await client.query('COMMIT');
      return profile;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
  
  /**
   * Get a character's alignment description
   * @param {number} characterId - The ID of the character
   * @returns {Promise<string>} - The character's alignment description
   */
  async getCharacterAlignment(characterId) {
    const profile = await this.getCharacterProfile(characterId);
    
    // Determine good/evil axis
    let goodEvilDesc = 'Neutral';
    if (profile.goodevilaxis >= 30) goodEvilDesc = 'Good';
    if (profile.goodevilaxis >= 70) goodEvilDesc = 'Very Good';
    if (profile.goodevilaxis <= -30) goodEvilDesc = 'Evil';
    if (profile.goodevilaxis <= -70) goodEvilDesc = 'Very Evil';
    
    // Determine order/chaos axis
    let orderChaosDesc = 'Neutral';
    if (profile.orderchaosaxis >= 30) orderChaosDesc = 'Lawful';
    if (profile.orderchaosaxis >= 70) orderChaosDesc = 'Very Lawful';
    if (profile.orderchaosaxis <= -30) orderChaosDesc = 'Chaotic';
    if (profile.orderchaosaxis <= -70) orderChaosDesc = 'Very Chaotic';
    
    // Special cases for pure neutral
    if (goodEvilDesc === 'Neutral' && orderChaosDesc === 'Neutral') {
      return 'True Neutral';
    }
    
    // Combine the descriptions
    if (goodEvilDesc === 'Neutral') {
      return `${orderChaosDesc} Neutral`;
    }
    if (orderChaosDesc === 'Neutral') {
      return `Neutral ${goodEvilDesc}`;
    }
    
    return `${orderChaosDesc} ${goodEvilDesc}`;
  }
  
  /**
   * Get a character's primary attributes
   * @param {number} characterId - The ID of the character
   * @returns {Promise<Object>} - The character's primary attributes
   */
  async getCharacterAttributes(characterId) {
    const profile = await this.getCharacterProfile(characterId);
    
    return {
      strength: profile.strength,
      dexterity: profile.dexterity,
      constitution: profile.constitution,
      intelligence: profile.intelligence,
      wisdom: profile.wisdom,
      charisma: profile.charisma
    };
  }
  
  /**
   * Get a character's story preferences
   * @param {number} characterId - The ID of the character
   * @returns {Promise<Object>} - The character's story preferences
   */
  async getCharacterPreferences(characterId) {
    const profile = await this.getCharacterProfile(characterId);
    
    return {
      combat: profile.combatpreference,
      exploration: profile.explorationpreference,
      social: profile.socialpreference,
      puzzle: profile.puzzlepreference
    };
  }
}

module.exports = new ProfileService();
