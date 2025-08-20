const { Pool } = require('pg');

// Centralized PostgreSQL connection pool
// Use the shared pool configured via environment variables (DATABASE_URL, etc.)
// This ensures containers connect to the postgres service host, not localhost.
const pool = require('../db-connection');

module.exports = { pool };
