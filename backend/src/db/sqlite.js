const path = require('path');

let _db;
function getDbInstance() {
  if (!_db) {
    const dbType = process.env.DB_TYPE || 'sqlite';
    if (dbType !== 'sqlite') {
      throw new Error(`Attempted to initialize SQLite DB when DB_TYPE is ${dbType}`);
    }
    // Lazy require to avoid side effects in environments where better-sqlite3 cannot load
    const Database = require('better-sqlite3');
    const dbPath = process.env.DB_PATH || path.resolve(__dirname, '../../data/sub_tracker.db');
    _db = new Database(dbPath);
  }
  return _db;
}

async function query(sql, params = []) {
  return getDbInstance().prepare(sql).all(params);
}

async function run(sql, params = []) {
  return getDbInstance().prepare(sql).run(params);
}

async function close() {
  if (_db) {
    _db.close();
    _db = null;
  }
}

// Schema
async function createUsersTable() {
  const sql = `
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
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
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      company_name TEXT NOT NULL,
      description TEXT,
      price INTEGER NOT NULL,
      subscription_type TEXT NOT NULL CHECK(subscription_type IN ('monthly', 'yearly', 'lifetime')),
      start_date TEXT NOT NULL,
      cancelled_at TEXT DEFAULT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id)
    );
  `;
  return run(sql);
}

// Users
async function findUserByEmail(email) {
  const sql = 'SELECT * FROM users WHERE email = ?';
  const rows = await query(sql, [email]);
  return rows[0];
}

async function findUserById(id) {
  const sql = 'SELECT id, email, first_name, last_name, zipcode FROM users WHERE id = ?';
  const rows = await query(sql, [id]);
  return rows[0];
}

async function insertUser({ email, password, first_name, last_name, zipcode }) {
  const sql = 'INSERT INTO users (email, password, first_name, last_name, zipcode) VALUES (?, ?, ?, ?, ?)';
  const result = await run(sql, [email, password, first_name, last_name, zipcode]);
  return findUserById(result.lastInsertRowid);
}

async function updateUser(id, { email, first_name, last_name, zipcode }) {
  const sql = 'UPDATE users SET email = ?, first_name = ?, last_name = ?, zipcode = ? WHERE id = ?';
  return run(sql, [email, first_name, last_name, zipcode, id]);
}

async function getUserPassword(id) {
  const sql = 'SELECT password FROM users WHERE id = ?';
  const rows = await query(sql, [id]);
  return rows[0];
}

async function updatePassword(id, hashedPassword) {
  const sql = 'UPDATE users SET password = ? WHERE id = ?';
  return run(sql, [hashedPassword, id]);
}

// Subscriptions
async function getActiveSubscriptions(userId, limit = 20, offset = 0) {
  const sql = 'SELECT * FROM subscriptions WHERE user_id = ? AND cancelled_at IS NULL ORDER BY id ASC LIMIT ? OFFSET ?';
  return query(sql, [userId, limit, offset]);
}

async function countActiveSubscriptions(userId) {
  const sql = 'SELECT COUNT(*) as count FROM subscriptions WHERE user_id = ? AND cancelled_at IS NULL';
  const rows = await query(sql, [userId]);
  return rows[0].count;
}

async function getHistorySubscriptions(userId, limit = 20, offset = 0) {
  const sql = 'SELECT * FROM subscriptions WHERE user_id = ? AND cancelled_at IS NOT NULL ORDER BY id ASC LIMIT ? OFFSET ?';
  return query(sql, [userId, limit, offset]);
}

async function countHistorySubscriptions(userId) {
  const sql = 'SELECT COUNT(*) as count FROM subscriptions WHERE user_id = ? AND cancelled_at IS NOT NULL';
  const rows = await query(sql, [userId]);
  return rows[0].count;
}

async function getSubscriptionSummaries(userId) {
  const sql = `
    SELECT 
      SUM(CASE WHEN subscription_type = 'monthly' THEN price ELSE 0 END) as total_monthly_cost,
      SUM(CASE WHEN subscription_type = 'yearly' THEN price ELSE 0 END) as total_yearly_cost,
      COUNT(*) as total_active
    FROM subscriptions 
    WHERE user_id = ? AND cancelled_at IS NULL
  `;
  const rows = await query(sql, [userId]);
  return rows[0] || { total_monthly_cost: 0, total_yearly_cost: 0, total_active: 0 };
}

async function cancelSubscription(id, userId) {
  const sql = 'UPDATE subscriptions SET cancelled_at = ? WHERE id = ? AND user_id = ?';
  const now = new Date().toISOString();
  return run(sql, [now, id, userId]);
}

async function insertSubscription(userId, { company_name, description, price, subscription_type, start_date }) {
  const sql = 'INSERT INTO subscriptions (user_id, company_name, description, price, subscription_type, start_date) VALUES (?, ?, ?, ?, ?, ?)';
  const result = await run(sql, [userId, company_name, description, price, subscription_type, start_date]);
  const rows = await query('SELECT * FROM subscriptions WHERE id = ?', [result.lastInsertRowid]);
  return rows[0];
}

async function updateSubscription(id, userId, { company_name, description, price, subscription_type, start_date }) {
  const sql = 'UPDATE subscriptions SET company_name = ?, description = ?, price = ?, subscription_type = ?, start_date = ? WHERE id = ? AND user_id = ?';
  return run(sql, [company_name, description, price, subscription_type, start_date, id, userId]);
}

async function deleteSubscription(id, userId) {
  const sql = 'DELETE FROM subscriptions WHERE id = ? AND user_id = ?';
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
  get db() { return getDbInstance(); },
};
