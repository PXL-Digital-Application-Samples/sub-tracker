const db = require('./index');
const logger = require('../logger');

const createTables = async () => {
  try {
    await db.createUsersTable();
    await db.createSubscriptionsTable();
    logger.info('Tables created successfully or already exist');
  } catch (error) {
    logger.error({ err: error }, 'Error creating tables');
    throw error;
  }
};

module.exports = { createTables };
