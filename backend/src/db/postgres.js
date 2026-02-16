const { Pool } = require('pg');

const poolConfig = process.env.DATABASE_URL 
  ? { connectionString: process.env.DATABASE_URL }
  : {
      host: process.env.POSTGRES_HOST || '127.0.0.1',
      port: process.env.POSTGRES_PORT || 5432,
      user: process.env.POSTGRES_USER,
      password: process.env.POSTGRES_PASSWORD,
      database: process.env.POSTGRES_DB,
    };

const pool = new Pool(poolConfig);

async function query(sql, params = []) {
  const client = await pool.connect();
  try {
    const result = await client.query(sql, params);
    return result.rows;
  } finally {
    client.release();
  }
}

async function run(sql, params = []) {
  const client = await pool.connect();
  try {
    const result = await client.query(sql, params);
    return result;
  } finally {
    client.release();
  }
}

async function close() {
  await pool.end();
}

// Schema
async function createUsersTable() {
  const sql = `
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      first_name TEXT,
      last_name TEXT,
      zipcode TEXT
    );
  `;
  return run(sql);
}

async function createSubscriptionsTable() {
  const sql = `
    CREATE TABLE IF NOT EXISTS subscriptions (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      company_name TEXT NOT NULL,
      description TEXT,
      price INTEGER NOT NULL,
      subscription_type TEXT NOT NULL CHECK(subscription_type IN ('monthly', 'yearly', 'lifetime')),
      start_date DATE NOT NULL,
      cancelled_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id)
    );
  `;
  return run(sql);
}

// Users
async function findUserByEmail(email) {
  const sql = 'SELECT * FROM users WHERE email = $1';
  const rows = await query(sql, [email]);
  return rows[0];
}

async function findUserById(id) {
  const sql = 'SELECT id, email, first_name, last_name, zipcode FROM users WHERE id = $1';
  const rows = await query(sql, [id]);
  return rows[0];
}

async function insertUser({ email, password, first_name, last_name, zipcode }) {
  const sql = 'INSERT INTO users (email, password, first_name, last_name, zipcode) VALUES ($1, $2, $3, $4, $5) RETURNING id, email, first_name, last_name, zipcode';
  const result = await run(sql, [email, password, first_name, last_name, zipcode]);
  return result.rows[0];
}

async function updateUser(id, { email, first_name, last_name, zipcode }) {
  const sql = 'UPDATE users SET email = $1, first_name = $2, last_name = $3, zipcode = $4 WHERE id = $5';
  return run(sql, [email, first_name, last_name, zipcode, id]);
}

async function getUserPassword(id) {
  const sql = 'SELECT password FROM users WHERE id = $1';
  const rows = await query(sql, [id]);
  return rows[0];
}

async function updatePassword(id, hashedPassword) {
  const sql = 'UPDATE users SET password = $1 WHERE id = $2';
  return run(sql, [hashedPassword, id]);
}

// Subscriptions
async function getActiveSubscriptions(userId, limit = 20, offset = 0) {
  const sql = 'SELECT * FROM subscriptions WHERE user_id = $1 AND cancelled_at IS NULL ORDER BY id ASC LIMIT $2 OFFSET $3';
  return query(sql, [userId, limit, offset]);
}

async function countActiveSubscriptions(userId) {
  const sql = 'SELECT COUNT(*) as count FROM subscriptions WHERE user_id = $1 AND cancelled_at IS NULL';
  const rows = await query(sql, [userId]);
  return parseInt(rows[0].count);
}

async function getHistorySubscriptions(userId, limit = 20, offset = 0) {
  const sql = 'SELECT * FROM subscriptions WHERE user_id = $1 AND cancelled_at IS NOT NULL ORDER BY id ASC LIMIT $2 OFFSET $3';
  return query(sql, [userId, limit, offset]);
}

async function countHistorySubscriptions(userId) {
  const sql = 'SELECT COUNT(*) as count FROM subscriptions WHERE user_id = $1 AND cancelled_at IS NOT NULL';
  const rows = await query(sql, [userId]);
  return parseInt(rows[0].count);
}

async function getSubscriptionSummaries(userId) {
  const sql = `
    SELECT 
      COALESCE(SUM(CASE WHEN subscription_type = 'monthly' THEN price ELSE 0 END), 0) as total_monthly_cost,
      COALESCE(SUM(CASE WHEN subscription_type = 'yearly' THEN price ELSE 0 END), 0) as total_yearly_cost,
      COUNT(*) as total_active
    FROM subscriptions 
    WHERE user_id = $1 AND cancelled_at IS NULL
  `;
  const rows = await query(sql, [userId]);
  return {
    total_monthly_cost: parseInt(rows[0].total_monthly_cost),
    total_yearly_cost: parseInt(rows[0].total_yearly_cost),
    total_active: parseInt(rows[0].total_active),
  };
}

async function cancelSubscription(id, userId) {
  const sql = 'UPDATE subscriptions SET cancelled_at = NOW() WHERE id = $1 AND user_id = $2';
  return run(sql, [id, userId]);
}

async function insertSubscription(userId, { company_name, description, price, subscription_type, start_date }) {
  const sql = 'INSERT INTO subscriptions (user_id, company_name, description, price, subscription_type, start_date) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *';
  const result = await run(sql, [userId, company_name, description, price, subscription_type, start_date]);
  return result.rows[0];
}

async function updateSubscription(id, userId, { company_name, description, price, subscription_type, start_date }) {
  const sql = 'UPDATE subscriptions SET company_name = $1, description = $2, price = $3, subscription_type = $4, start_date = $5 WHERE id = $6 AND user_id = $7';
  return run(sql, [company_name, description, price, subscription_type, start_date, id, userId]);
}

async function deleteSubscription(id, userId) {
  const sql = 'DELETE FROM subscriptions WHERE id = $1 AND user_id = $2';
  return run(sql, [id, userId]);
}

module.exports = {
  query,
  run,
  close,
  createUsersTable,
  createSubscriptionsTable,
  findUserByEmail,
  findUserById,
  insertUser,
  updateUser,
  getUserPassword,
  updatePassword,
  getActiveSubscriptions,
  countActiveSubscriptions,
  getHistorySubscriptions,
  countHistorySubscriptions,
  getSubscriptionSummaries,
  insertSubscription,
  updateSubscription,
  deleteSubscription,
  cancelSubscription,
  pool,
};
