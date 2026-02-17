const path = require('path');
const fs = require('fs');

describe('SQLite Adapter', () => {
  // Skip if we are not testing sqlite
  if (process.env.DB_TYPE && process.env.DB_TYPE !== 'sqlite') {
    it.skip('Skipping SQLite tests for non-sqlite DB_TYPE', () => {});
    return;
  }

  // Set a unique DB path BEFORE requiring the module
  const dbPath = path.resolve(__dirname, `../../../data/test_adapter_${Date.now()}.db`);
  process.env.DB_PATH = dbPath;

  // ONLY require if we ARE in sqlite mode
  const db = require('../../db/sqlite');

  let userId;
  let testEmail;

  beforeAll(async () => {
    await db.createUsersTable();
    await db.createSubscriptionsTable();
    
    // Create a test user
    testEmail = `adapter_${Date.now()}@test.com`;
    const user = await db.insertUser({
      email: testEmail,
      password: 'password',
      first_name: 'Adapter',
      last_name: 'Test',
      zipcode: '0000'
    });
    userId = user.id;
  });

  afterAll(async () => {
    await db.close();
    if (fs.existsSync(dbPath)) {
      fs.unlinkSync(dbPath);
    }
  });

  it('should insert and find a user', async () => {
    const user = await db.findUserByEmail(testEmail);
    expect(user).toBeDefined();
    expect(user.first_name).toBe('Adapter');
  });

  it('should get subscription summaries', async () => {
    await db.insertSubscription(userId, {
      company_name: 'Monthly Sub',
      price: 1000,
      subscription_type: 'monthly',
      start_date: '2026-01-01'
    });
    await db.insertSubscription(userId, {
      company_name: 'Yearly Sub',
      price: 12000,
      subscription_type: 'yearly',
      start_date: '2026-01-01'
    });

    const summaries = await db.getSubscriptionSummaries(userId);
    expect(summaries.total_active).toBe(2);
    expect(summaries.total_monthly_cost).toBe(2000);
    expect(summaries.total_yearly_cost).toBe(24000); // (1000 * 12) + 12000
  });
});
