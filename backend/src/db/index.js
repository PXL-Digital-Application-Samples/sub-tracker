
function getDb() {
  if (process.env.DB_TYPE === 'postgres') {
    return require('./postgres');
  }
  return require('./sqlite');
}

module.exports = getDb();
