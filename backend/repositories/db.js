const { Pool } = require('pg');

// Centralized PostgreSQL connection pool
const pool = new Pool({
  user: 'cyoa_user',
  host: 'localhost',
  database: 'cyoa_litrpg',
  password: 'cyoa_password',
  port: 5432,
});

module.exports = { pool };
