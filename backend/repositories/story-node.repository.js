const { pool } = require('./db');

module.exports = {
  async getById(id) {
    const client = await pool.connect();
    try {
      const res = await client.query('SELECT * FROM StoryNode WHERE Id = $1', [id]);
      return res.rows[0] || null;
    } finally {
      client.release();
    }
  },

  async getFirstId() {
    const client = await pool.connect();
    try {
      const res = await client.query('SELECT Id FROM StoryNode ORDER BY Id LIMIT 1');
      return res.rows[0]?.id ?? null;
    } finally {
      client.release();
    }
  },

  async getChoicesForNode(nodeId) {
    const client = await pool.connect();
    try {
      const res = await client.query(
        'SELECT * FROM StoryChoice WHERE StoryNodeId = $1 ORDER BY Id',
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
      const res = await client.query('SELECT * FROM StoryChoice WHERE Id = $1', [choiceId]);
      return res.rows[0] || null;
    } finally {
      client.release();
    }
  },

  async getChoiceTextById(choiceId) {
    const client = await pool.connect();
    try {
      const res = await client.query('SELECT ChoiceText FROM StoryChoice WHERE Id = $1', [choiceId]);
      return res.rows[0]?.choicetext ?? null;
    } finally {
      client.release();
    }
  }
};
