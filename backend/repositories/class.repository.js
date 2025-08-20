const { pool } = require('./db');

module.exports = {
  async getRandomClassOutfits(count = 4) {
    const client = await pool.connect();
    try {
      const res = await client.query(
        `SELECT c.id AS classid, c.name AS classname, c.description AS classdescription, 
                o.id AS outfitid, o.description AS outfitdescription
         FROM class c
         JOIN classoutfit o ON c.id = o.classid
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
      const res = await client.query('SELECT * FROM class WHERE id = $1', [classId]);
      return res.rows[0] || null;
    } finally {
      client.release();
    }
  },

  async getStartingEquipment(classId) {
    const client = await pool.connect();
    try {
      const res = await client.query('SELECT * FROM classstartingequipment WHERE classid = $1', [classId]);
      return res.rows;
    } finally {
      client.release();
    }
  }
};
