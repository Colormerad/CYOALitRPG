const { pool } = require('./db');

module.exports = {
  async getByCharacterId(characterId) {
    const client = await pool.connect();
    try {
      const res = await client.query('SELECT * FROM playerprogress WHERE characterid = $1', [characterId]);
      return res.rows[0] || null;
    } finally {
      client.release();
    }
  },

  async insertInitial(characterId, firstNodeId) {
    const client = await pool.connect();
    try {
      const res = await client.query(
        `INSERT INTO PlayerProgress (CharacterId, CurrentNodeId, ChoiceHistory, Metadata)
         VALUES ($1, $2, $3, $4) RETURNING *`,
        [characterId, firstNodeId, '[]', '{}']
      );
      return res.rows[0];
    } finally {
      client.release();
    }
  }
  ,

  async updateProgress(progressId, nextNodeId, choiceHistory, metadata) {
    const client = await pool.connect();
    try {
      await client.query(
        `UPDATE PlayerProgress 
         SET CurrentNodeId = $1, ChoiceHistory = $2, Metadata = $3, UpdatedAt = CURRENT_TIMESTAMP
         WHERE Id = $4`,
        [nextNodeId, JSON.stringify(choiceHistory), JSON.stringify(metadata), progressId]
      );
    } finally {
      client.release();
    }
  },

  async updateMetadata(progressId, metadata) {
    const client = await pool.connect();
    try {
      await client.query(
        `UPDATE PlayerProgress SET Metadata = $1 WHERE Id = $2`,
        [JSON.stringify(metadata), progressId]
      );
    } finally {
      client.release();
    }
  },

  async update(characterId, updateData) {
    const client = await pool.connect();
    try {
      // Build dynamic UPDATE query based on provided fields
      const fields = [];
      const values = [];
      let paramIndex = 1;

      if (updateData.metadata !== undefined) {
        fields.push(`Metadata = $${paramIndex}`);
        values.push(JSON.stringify(updateData.metadata));
        paramIndex++;
      }

      if (updateData.currentNodeId !== undefined) {
        fields.push(`CurrentNodeId = $${paramIndex}`);
        values.push(updateData.currentNodeId);
        paramIndex++;
      }

      if (updateData.choiceHistory !== undefined) {
        fields.push(`ChoiceHistory = $${paramIndex}`);
        values.push(JSON.stringify(updateData.choiceHistory));
        paramIndex++;
      }

      if (fields.length === 0) {
        throw new Error('No valid fields provided for update');
      }

      // Always update timestamp
      fields.push('UpdatedAt = CURRENT_TIMESTAMP');
      
      // Add characterId as final parameter
      values.push(characterId);

      const query = `UPDATE PlayerProgress SET ${fields.join(', ')} WHERE CharacterId = $${paramIndex} RETURNING *`;
      
      const res = await client.query(query, values);
      return res.rows[0];
    } finally {
      client.release();
    }
  }
};
