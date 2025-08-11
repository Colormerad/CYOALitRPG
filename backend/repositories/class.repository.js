const { pool } = require('./db');

module.exports = {
  async getRandomClassOutfits(count = 4) {
    const client = await pool.connect();
    try {
      const res = await client.query(
        `SELECT c.Id AS ClassId, c.Name AS ClassName, c.Description AS ClassDescription, 
                o.Id AS OutfitId, o.Description AS OutfitDescription
         FROM Class c
         JOIN ClassOutfit o ON c.Id = o.ClassId
         ORDER BY RANDOM()
         LIMIT $1`,
        [count]
      );
      return res.rows;
    } finally {
      client.release();
    }
  },

  async getById(classId) {
    const client = await pool.connect();
    try {
      const res = await client.query('SELECT * FROM Class WHERE Id = $1', [classId]);
      return res.rows[0] || null;
    } finally {
      client.release();
    }
  },

  async getStartingEquipment(classId) {
    const client = await pool.connect();
    try {
      const res = await client.query('SELECT * FROM ClassStartingEquipment WHERE ClassId = $1', [classId]);
      return res.rows;
    } finally {
      client.release();
    }
  }
};
