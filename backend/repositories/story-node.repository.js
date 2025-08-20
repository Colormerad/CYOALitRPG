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

  async getChoiceTextById(choiceId) {
    const client = await pool.connect();
    try {
      const res = await client.query('SELECT choicetext FROM storychoice WHERE id = $1', [choiceId]);
      return res.rows[0]?.choicetext ?? null;
    } finally {
      client.release();
    }
  }
};
