
const sqlite = require('./sqlite');
const postgres = require('./postgres');

function getDb() {
  if (process.env.DB_TYPE === 'postgres') {
    return postgres;
  }
  return sqlite;
}

module.exports = getDb();
