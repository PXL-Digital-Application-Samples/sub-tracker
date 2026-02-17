const bcrypt = require('bcrypt');
const db = require('./index');
const logger = require('../logger');

const ensureDefaultUser = async () => {
  const defaultEmail = process.env.INITIAL_USER_EMAIL || 'user@test.com';
  const defaultPassword = process.env.INITIAL_USER_PASSWORD || 'password123';

  try {
    const existingUser = await db.findUserByEmail(defaultEmail);
    if (!existingUser) {
      const hashedPassword = await bcrypt.hash(defaultPassword, 10);
      await db.insertUser({
        email: defaultEmail,
        password: hashedPassword,
        first_name: 'Default',
        last_name: 'User',
        zipcode: '0000'
      });
      logger.info({ email: defaultEmail }, 'Default user created');
    }
  } catch (error) {
    logger.error({ err: error }, 'Error ensuring default user');
    throw error;
  }
};

const seedData = async () => {
  const defaultEmail = process.env.INITIAL_USER_EMAIL || 'user@test.com';
  try {
    await ensureDefaultUser();

    const user = await db.findUserByEmail(defaultEmail);
    const userId = user.id;

    // Use a generic query for checking existence, or better, use a named method if we had one.
    // For now, we use db.query which is already Dialect-agnostic if we use both styles of placeholders? 
    // No, sqlite uses ? and pg uses $1.
    // Let's use the adapter's getActiveSubscriptions to see if any exist.
    const activeSubs = await db.getActiveSubscriptions(userId);
    const historySubs = await db.getHistorySubscriptions(userId);
    
    if (activeSubs.length === 0 && historySubs.length === 0) {
      const now = new Date().toISOString().slice(0, 10);

      const subs = [
        { company_name: 'Netflix', description: 'Premium Plan', price: 1999, subscription_type: 'monthly', start_date: now },
        { company_name: 'Spotify', description: 'Family Plan', price: 1599, subscription_type: 'monthly', start_date: now },
        { company_name: 'Gym Membership', description: 'Annual contract', price: 40000, subscription_type: 'yearly', start_date: now },
        { company_name: 'Phone Subscription', description: 'Unlimited data', price: 5000, subscription_type: 'monthly', start_date: now },
        { company_name: 'ChatGPT Plus', description: 'AI assistant', price: 2000, subscription_type: 'monthly', start_date: now },
      ];

      for (const sub of subs) {
        await db.insertSubscription(userId, sub);
      }
      logger.info('Sample subscriptions created');
    }
    logger.info('Database seeding completed');
  } catch (error) {
    logger.error({ err: error }, 'Error seeding database');
    throw error;
  }
};

module.exports = { seedData, ensureDefaultUser };
