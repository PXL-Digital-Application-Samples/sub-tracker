const db = require('../../db');

describe('PostgreSQL Adapter', () => {
  // Skip if we are not testing postgres
  if (process.env.DB_TYPE !== 'postgres') {
    it.skip('Skipping PostgreSQL tests for non-postgres DB_TYPE', () => {});
    return;
  }

  let userId;
  let testEmail;

  beforeAll(async () => {
    // Tables should already exist from seed/global setup in vitest.postgres.js
    // but we can ensure they are there.
    await db.createUsersTable();
    await db.createSubscriptionsTable();
    
    // Create a test user
    testEmail = `adapter_pg_${Date.now()}@test.com`;
    const user = await db.insertUser({
      email: testEmail,
      password: 'password',
      first_name: 'Adapter',
      last_name: 'Postgres',
      zipcode: '0000'
    });
    userId = user.id;
  });

  afterAll(async () => {
    // We don't close the pool here because other tests might need it 
    // and vitest.postgres.js handles cleanup.
  });

  it('should get subscription summaries with correct yearly total', async () => {
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
