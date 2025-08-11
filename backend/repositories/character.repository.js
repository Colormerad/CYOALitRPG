const { pool } = require('./db');

module.exports = {
  async getById(id) {
    const client = await pool.connect();
    try {
      const res = await client.query('SELECT * FROM "character" WHERE Id = $1', [id]);
      return res.rows[0] || null;
    } finally {
      client.release();
    }
  },

  async updateClassId(characterId, classId) {
    const client = await pool.connect();
    try {
      await client.query('UPDATE Character SET ClassId = $1 WHERE Id = $2', [classId, characterId]);
      return { id: characterId, classId };
    } finally {
      client.release();
    }
  }
  ,

  async markDead(characterId) {
    const client = await pool.connect();
    try {
      const res = await client.query(
        `UPDATE "character" 
         SET is_dead = true
         WHERE Id = $1 RETURNING *`,
        [characterId]
      );
      return res.rows[0] || null;
    } finally {
      client.release();
    }
  }
};
