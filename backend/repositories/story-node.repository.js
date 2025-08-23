const { pool } = require('./db');

module.exports = {
  async getById(id) {
    const client = await pool.connect();
    try {
      const res = await client.query('SELECT * FROM storynode WHERE id = $1', [id]);
      return res.rows[0] || null;
    } finally {
      client.release();
    }
  },
  
  async updateStoryNode(id, nodeData) {
    const client = await pool.connect();
    try {
      const { title, content, nodetype, requiresinput, inputtype } = nodeData;
      const res = await client.query(
        'UPDATE storynode SET title = $1, content = $2, nodetype = $3, requiresinput = $4, inputtype = $5, updatedat = NOW() WHERE id = $6 RETURNING *',
        [title, content, nodetype, requiresinput, inputtype, id]
      );
      return res.rows[0] || null;
    } finally {
      client.release();
    }
  },
  
  async createStoryNode(nodeData) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      const { title, content, nodetype, requiresinput, inputtype, choices } = nodeData;
      
      // Create the story node
      const nodeRes = await client.query(
        'INSERT INTO storynode (title, content, nodetype, requiresinput, inputtype, createdat, updatedat) VALUES ($1, $2, $3, $4, $5, NOW(), NOW()) RETURNING *',
        [title, content, nodetype || 'standard', requiresinput || false, inputtype || null]
      );
      
      const newNode = nodeRes.rows[0];
      
      // If choices are provided, create them with metadata and effects
      if (choices && Array.isArray(choices) && choices.length > 0) {
        for (const choice of choices) {
          const { choicetext, nextnodeid, metadataimpact, effects } = choice;
          await client.query(
            `INSERT INTO storychoice 
             (storynodeid, choicetext, nextnodeid, metadataimpact, effects, createdat, updatedat) 
             VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`,
            [
              newNode.id,
              choicetext,
              nextnodeid || null,
              metadataimpact ? JSON.stringify(metadataimpact) : null,
              effects ? JSON.stringify(effects) : null
            ]
          );
        }
      }
      
      await client.query('COMMIT');
      
      // Return the created node with its choices
      const fullNodeRes = await client.query(
        `SELECT sn.*, 
                COALESCE(
                  json_agg(
                    json_build_object(
                      'id', sc.id,
                      'choicetext', sc.choicetext,
                      'nextnodeid', sc.nextnodeid,
                      'metadataimpact', sc.metadataimpact,
                      'effects', sc.effects
                    ) ORDER BY sc.id
                  ) FILTER (WHERE sc.id IS NOT NULL), 
                  '[]'
                ) as choices
         FROM storynode sn
         LEFT JOIN storychoice sc ON sn.id = sc.storynodeid
         WHERE sn.id = $1
         GROUP BY sn.id`,
        [newNode.id]
      );
      
      return fullNodeRes.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  async getFirstId() {
    const client = await pool.connect();
    try {
      const res = await client.query('SELECT id FROM storynode ORDER BY id LIMIT 1');
      return res.rows[0]?.id ?? null;
    } finally {
      client.release();
    }
  },

  async getChoicesForNode(nodeId) {
    const client = await pool.connect();
    try {
      const res = await client.query(
        'SELECT * FROM storychoice WHERE storynodeid = $1 ORDER BY id',
        [nodeId]
      );
      return res.rows;
    } finally {
      client.release();
    }
  },

  async getChoiceById(choiceId) {
    const client = await pool.connect();
    try {
      const res = await client.query('SELECT * FROM storychoice WHERE id = $1', [choiceId]);
      return res.rows[0] || null;
    } finally {
      client.release();
    }
  },

  async updateChoice(choiceId, choiceData) {
    const client = await pool.connect();
    try {
      const { choicetext, nextnodeid, storynodeid, metadataimpact, effects } = choiceData;
      const res = await client.query(
        `UPDATE storychoice 
         SET choicetext = $1, nextnodeid = $2, storynodeid = $3, metadataimpact = $4, effects = $5, updatedat = CURRENT_TIMESTAMP
         WHERE id = $6 RETURNING *`,
        [
          choicetext,
          nextnodeid,
          storynodeid,
          metadataimpact ? JSON.stringify(metadataimpact) : null,
          effects ? JSON.stringify(effects) : null,
          choiceId
        ]
      );
      return res.rows[0] || null;
    } finally {
      client.release();
    }
  },

  async createChoice(choiceData) {
    const client = await pool.connect();
    try {
      const { choicetext, nextnodeid, storynodeid, metadataimpact, effects } = choiceData;
      const res = await client.query(
        `INSERT INTO storychoice 
         (choicetext, nextnodeid, storynodeid, metadataimpact, effects, createdat, updatedat) 
         VALUES ($1, $2, $3, $4, $5, NOW(), NOW()) RETURNING *`,
        [
          choicetext,
          nextnodeid,
          storynodeid,
          metadataimpact ? JSON.stringify(metadataimpact) : null,
          effects ? JSON.stringify(effects) : null
        ]
      );
      return res.rows[0];
    } finally {
      client.release();
    }
  },

  async getChoiceTextById(choiceId) {
    const client = await pool.connect();
    try {
      const res = await client.query('SELECT choicetext FROM storychoice WHERE id = $1', [choiceId]);
      return res.rows[0]?.choicetext ?? null;
    } finally {
      client.release();
    }
  },

  async deleteChoice(choiceId) {
    const client = await pool.connect();
    try {
      const res = await client.query('DELETE FROM storychoice WHERE id = $1 RETURNING *', [choiceId]);
      return res.rows[0] || null;
    } finally {
      client.release();
    }
  },

  async getAllChoicesWithOptions() {
    const client = await pool.connect();
    try {
      // First, get all choices
      const choicesRes = await client.query(
        'SELECT sc.*, sn.title as node_title FROM storychoice sc ' +
        'JOIN storynode sn ON sc.storynodeid = sn.id ' +
        'ORDER BY sc.storynodeid, sc.id'
      );
      
      // Group choices by their story node
      const choicesByNode = {};
      for (const choice of choicesRes.rows) {
        const nodeId = choice.storynodeid;
        if (!choicesByNode[nodeId]) {
          choicesByNode[nodeId] = {
            nodeId,
            nodeTitle: choice.node_title,
            choices: []
          };
        }
        
        // Remove node_title from choice object as it's now in the parent object
        const { node_title, ...choiceData } = choice;
        choicesByNode[nodeId].choices.push(choiceData);
      }
      
      return Object.values(choicesByNode);
    } finally {
      client.release();
    }
  }
};
