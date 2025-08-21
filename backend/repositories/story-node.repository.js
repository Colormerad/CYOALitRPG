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
      const { title, content, imageurl, backgroundurl } = nodeData;
      const res = await client.query(
        'UPDATE storynode SET title = $1, content = $2, imageurl = $3, backgroundurl = $4, updated_at = NOW() WHERE id = $5 RETURNING *',
        [title, content, imageurl, backgroundurl, id]
      );
      return res.rows[0] || null;
    } finally {
      client.release();
    }
  },
  
  async createStoryNode(nodeData) {
    const client = await pool.connect();
    try {
      const { title, content, imageurl, backgroundurl } = nodeData;
      const res = await client.query(
        'INSERT INTO storynode (title, content, imageurl, backgroundurl, created_at, updated_at) VALUES ($1, $2, $3, $4, NOW(), NOW()) RETURNING *',
        [title, content, imageurl || null, backgroundurl || null]
      );
      return res.rows[0];
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
      const { choicetext, nextnodeid, storynodeid, requirespassword, requiresinput, requiresclass } = choiceData;
      const res = await client.query(
        `UPDATE storychoice 
         SET choicetext = $1, nextnodeid = $2, storynodeid = $3, 
             requirespassword = $4, requiresinput = $5, requiresclass = $6 
         WHERE id = $7 RETURNING *`,
        [choicetext, nextnodeid, storynodeid, requirespassword, requiresinput, requiresclass, choiceId]
      );
      return res.rows[0] || null;
    } finally {
      client.release();
    }
  },

  async createChoice(choiceData) {
    const client = await pool.connect();
    try {
      const { choicetext, nextnodeid, storynodeid, requirespassword, requiresinput, requiresclass } = choiceData;
      const res = await client.query(
        `INSERT INTO storychoice 
         (choicetext, nextnodeid, storynodeid, requirespassword, requiresinput, requiresclass) 
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [choicetext, nextnodeid, storynodeid, 
         requirespassword || false, requiresinput || false, requiresclass || false]
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
