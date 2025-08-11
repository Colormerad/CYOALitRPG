const { pool } = require('./db');

module.exports = {
  async getByCharacterId(characterId) {
    const client = await pool.connect();
    try {
      const res = await client.query('SELECT * FROM PlayerProgress WHERE CharacterId = $1', [characterId]);
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
  }
};
