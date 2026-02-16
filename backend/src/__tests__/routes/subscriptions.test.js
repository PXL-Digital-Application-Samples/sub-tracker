const { createTestAgent } = require('../setup');
const db = require('../../db');

describe('Subscription Routes', () => {
  let agent, csrfToken;

  beforeEach(async () => {
    const setup = await createTestAgent();
    agent = setup.agent;
    csrfToken = setup.csrfToken;
  });

  it('GET /api/subscriptions/active', async () => {
    const res = await agent.get('/api/subscriptions/active');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('subscriptions');
    expect(res.body).toHaveProperty('total_active');
  });

  it('POST /api/subscriptions - success', async () => {
    const sub = {
      company_name: 'Test Sub',
      description: 'Test Desc',
      price: 1000,
      subscription_type: 'monthly',
      start_date: '2026-01-01'
    };

    const res = await agent
      .post('/api/subscriptions')
      .set('x-csrf-token', csrfToken)
      .send(sub);
    
    expect(res.status).toBe(201);
    expect(res.body.company_name).toBe('Test Sub');
    expect(res.body.price).toBe(1000);
  });

  it.skip('POST /api/subscriptions - missing CSRF', async () => {
    const res = await agent
      .post('/api/subscriptions')
      .send({});
    
    expect(res.status).toBe(403);
  });

  it('POST /api/subscriptions - invalid data', async () => {
    const res = await agent
      .post('/api/subscriptions')
      .set('x-csrf-token', csrfToken)
      .send({ company_name: '' });
    
    expect(res.status).toBe(400);
  });

  it('POST /api/subscriptions/:id/cancel', async (context) => {
    // Create one first
    const insertRes = await agent
      .post('/api/subscriptions')
      .set('x-csrf-token', csrfToken)
      .send({
        company_name: 'To Cancel',
        price: 500,
        subscription_type: 'monthly',
        start_date: '2026-01-01'
      });
    
    const subId = insertRes.body.id;

    const res = await agent
      .post(`/api/subscriptions/${subId}/cancel`)
      .set('x-csrf-token', csrfToken);
    
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Subscription cancelled successfully.');
  });
});
