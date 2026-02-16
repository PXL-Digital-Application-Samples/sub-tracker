const { app } = require('../../index');
const supertest = require('supertest');
const db = require('../../db');
const bcrypt = require('bcrypt');
const { ensureServer } = require('../setup');

describe('Auth Routes', () => {
  const email = 'user@test.com';
  const password = 'password123';

  beforeEach(async () => {
    await ensureServer();
    // Clean up and ensure test user
    const user = await db.findUserByEmail(email);
    if (!user) {
      const hashedPassword = await bcrypt.hash(password, 10);
      await db.insertUser({
        email,
        password: hashedPassword,
        first_name: 'Test',
        last_name: 'User',
        zipcode: '1000'
      });
    }
  });

  it('POST /api/login - success', async () => {
    const res = await supertest(app)
      .post('/api/login')
      .send({ email, password });
    
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Login successful.');
    expect(res.body).toHaveProperty('token');
    expect(res.headers['set-cookie']).toBeDefined();
  });

  it('POST /api/login - wrong password', async () => {
    const res = await supertest(app)
      .post('/api/login')
      .send({ email, password: 'wrongpassword' });
    
    expect(res.status).toBe(401);
  });

  it('POST /api/login - missing fields', async () => {
    const res = await supertest(app)
      .post('/api/login')
      .send({ email });
    
    expect(res.status).toBe(400);
  });

  it('POST /api/logout', async () => {
    const agent = supertest.agent(app);
    await agent.post('/api/login').send({ email, password });
    
    const res = await agent.post('/api/logout');
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Logout successful.');
  });
});
