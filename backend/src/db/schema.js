const db = require('./index');

const createTables = async () => {
  const usersTable = `
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      first_name TEXT,
      last_name TEXT,
      zipcode TEXT
    );
  `;

  const subscriptionsTable = `
    CREATE TABLE IF NOT EXISTS subscriptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      company_name TEXT NOT NULL,
      description TEXT,
      price REAL NOT NULL,
      subscription_type TEXT NOT NULL CHECK(subscription_type IN ('monthly', 'yearly', 'lifetime')),
      start_date TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id)
    );
  `;
  
  // For postgres, use SERIAL instead of INTEGER PRIMARY KEY AUTOINCREMENT
  const usersTablePg = `
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      first_name TEXT,
      last_name TEXT,
      zipcode TEXT
    );
  `;

  const subscriptionsTablePg = `
    CREATE TABLE IF NOT EXISTS subscriptions (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      company_name TEXT NOT NULL,
      description TEXT,
      price NUMERIC(10, 2) NOT NULL,
      subscription_type TEXT NOT NULL CHECK(subscription_type IN ('monthly', 'yearly', 'lifetime')),
      start_date DATE NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id)
    );
  `;

  try {
    if (process.env.DB_TYPE === 'postgres') {
      await db.run(usersTablePg);
      await db.run(subscriptionsTablePg);
    } else {
      await db.run(usersTable);
      await db.run(subscriptionsTable);
    }
    console.log('Tables created successfully or already exist.');
  } catch (error) {
    console.error('Error creating tables:', error);
  }
};

module.exports = { createTables };
