const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.resolve(__dirname, '../../data/sub_tracker.db');
const db = new Database(dbPath);

async function query(sql, params = []) {
  return db.prepare(sql).all(params);
}

async function run(sql, params = []) {
  return db.prepare(sql).run(params);
}

async function close() {
  db.close();
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
  return run(sql, [email, password, first_name, last_name, zipcode]);
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
  const sql = 'SELECT * FROM subscriptions WHERE user_id = ? AND cancelled_at IS NULL LIMIT ? OFFSET ?';
  return query(sql, [userId, limit, offset]);
}

async function countActiveSubscriptions(userId) {
  const sql = 'SELECT COUNT(*) as count FROM subscriptions WHERE user_id = ? AND cancelled_at IS NULL';
  const rows = await query(sql, [userId]);
  return rows[0].count;
}

async function getHistorySubscriptions(userId, limit = 20, offset = 0) {
  const sql = 'SELECT * FROM subscriptions WHERE user_id = ? AND cancelled_at IS NOT NULL LIMIT ? OFFSET ?';
  return query(sql, [userId, limit, offset]);
}

async function countHistorySubscriptions(userId) {
  const sql = 'SELECT COUNT(*) as count FROM subscriptions WHERE user_id = ? AND cancelled_at IS NOT NULL';
  const rows = await query(sql, [userId]);
  return rows[0].count;
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
  insertSubscription,
  updateSubscription,
  deleteSubscription,
  cancelSubscription,
  db,
};
