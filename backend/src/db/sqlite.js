const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.resolve(__dirname, '../../data/sub_tracker.db');
const db = new Database(dbPath);

function query(sql, params = []) {
  return db.prepare(sql).all(params);
}

function run(sql, params = []) {
  return db.prepare(sql).run(params);
}

function close() {
  db.close();
}

module.exports = {
  query,
  run,
  close,
  db,
};
