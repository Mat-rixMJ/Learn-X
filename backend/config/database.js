const { Pool } = require('pg');

// Enhanced database configuration with connection pooling
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'learnx',
  password: process.env.DB_PASSWORD || 'password',
  port: process.env.DB_PORT || 5432,
  
  // Connection pool settings
  max: 20, // Maximum number of clients in the pool
  min: 5,  // Minimum number of clients in the pool
  idle: 30000, // How long a client is allowed to remain idle before being closed
  connectionTimeoutMillis: 5000, // How long to wait when connecting a client
  idleTimeoutMillis: 30000, // How long a client is allowed to remain idle
  
  // SSL configuration for production
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: false
  } : false
});

// Handle pool errors
pool.on('error', (err, client) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

// Test database connection on startup
pool.connect((err, client, done) => {
  if (err) {
    console.error('Error connecting to database:', err);
  } else {
    console.log('✅ Database connected successfully');
    done();
  }
});

// Graceful shutdown
process.on('SIGINT', () => {
  pool.end(() => {
    console.log('💤 Database connection pool has ended');
    process.exit(0);
  });
});

module.exports = pool;
