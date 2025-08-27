const { Pool } = require('pg');
// Load env from backend/.env to support scripts and local server
try {
  const path = require('path');
  require('dotenv').config({ path: path.join(__dirname, '.env') });
} catch (e) {
  // dotenv optional; ignore if not available
}

// PostgreSQL connection
// Prefer a single DATABASE_URL (provided by Docker Compose) like:
// postgresql://user:password@postgres:5432/mythosDB
// Fallback to individual env vars or sensible docker defaults.

const {
  DATABASE_URL,
  POSTGRES_USER,
  POSTGRES_PASSWORD,
  POSTGRES_DB,
  POSTGRES_HOST,
  POSTGRES_PORT,
  NODE_ENV
} = process.env;

// Determine if we're running in a Docker environment
// In Docker, hostname is 'postgres', but locally it should be 'localhost'
const isDocker = process.env.DOCKER_CONTAINER === 'true';
const defaultHost = isDocker ? 'postgres' : 'localhost';

console.log(`Database connection: Using ${isDocker ? 'Docker' : 'local'} configuration`);
console.log(`Database host: ${POSTGRES_HOST || defaultHost}`);

let pool;
const normalizeDollar = (s) => (typeof s === 'string' ? s.replace(/\$\$/g, '$') : s);

if (DATABASE_URL) {
  console.log('Using DATABASE_URL for connection');
  pool = new Pool({
    connectionString: normalizeDollar(DATABASE_URL),
    ssl: process.env.POSTGRES_SSL === 'true',
  });
} else {
  console.log('Using individual connection parameters');
  pool = new Pool({
    user: POSTGRES_USER || 'mythosAdmin',
    host: POSTGRES_HOST || defaultHost, // Use localhost for local development
    database: POSTGRES_DB || 'mythosDB',
    password: normalizeDollar(POSTGRES_PASSWORD) || 'p@$$h@ck',
    port: Number(POSTGRES_PORT) || 5432,
    ssl: process.env.POSTGRES_SSL === 'true',
  });
}

// Test the connection
pool.on('connect', () => {
  console.log('Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('PostgreSQL connection error:', err);
});

module.exports = pool;
