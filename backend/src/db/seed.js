const bcrypt = require('bcrypt');
const db = require('./index');

const seedData = async () => {
  try {
    const users = await db.query('SELECT * FROM users');
    if (users.length === 0) {
      const hashedPassword = await bcrypt.hash('password123', 10);
      const userQuery =
        process.env.DB_TYPE === 'postgres'
          ? 'INSERT INTO users (email, password, first_name, last_name, zipcode) VALUES ($1, $2, $3, $4, $5)'
          : 'INSERT INTO users (email, password, first_name, last_name, zipcode) VALUES (?, ?, ?, ?, ?)';
      await db.run(userQuery, ['user@test.com', hashedPassword, 'Test', 'User', '1000']);
      console.log('Default user created.');
    }

    const subscriptions = await db.query('SELECT * FROM subscriptions');
    if (subscriptions.length === 0) {
      const userSelectQuery = process.env.DB_TYPE === 'postgres' ? 'SELECT id FROM users WHERE email = $1' : 'SELECT id FROM users WHERE email = ?';
      const user = await db.query(userSelectQuery, ['user@test.com']);
      const userId = user[0].id;
      const now = new Date().toISOString().slice(0, 10);

      const subs = [
        { name: 'Netflix', desc: 'Premium Plan', price: 19.99, type: 'monthly', start: now },
        { name: 'Spotify', desc: 'Family Plan', price: 15.99, type: 'monthly', start: now },
        { name: 'Gym Membership', desc: 'Annual contract', price: 400, type: 'yearly', start: now },
        { name: 'Phone Subscription', desc: 'Unlimited data', price: 50, type: 'monthly', start: now },
        { name: 'ChatGPT Plus', desc: 'AI assistant', price: 20, type: 'monthly', start: now },
      ];

      const subInsertQuery =
        process.env.DB_TYPE === 'postgres'
          ? 'INSERT INTO subscriptions (user_id, company_name, description, price, subscription_type, start_date) VALUES ($1, $2, $3, $4, $5, $6)'
          : 'INSERT INTO subscriptions (user_id, company_name, description, price, subscription_type, start_date) VALUES (?, ?, ?, ?, ?, ?)';

      for (const sub of subs) {
        await db.run(subInsertQuery, [userId, sub.name, sub.desc, sub.price, sub.type, sub.start]);
      }
      console.log('Sample subscriptions created.');
    }
    console.log('Database seeding completed.');
  } catch (error) {
    console.error('Error seeding database:', error);
  }
};

module.exports = { seedData };
