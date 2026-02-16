const { createTestAgent } = require('../setup');
const db = require('../../db');

describe('User Routes', () => {
  let agent, csrfToken;

  beforeEach(async () => {
    const setup = await createTestAgent();
    agent = setup.agent;
    csrfToken = setup.csrfToken;
  });

  it('GET /api/user - success', async () => {
    const res = await agent.get('/api/user');
    expect(res.status).toBe(200);
    expect(res.body.email).toBe('user@test.com');
  });

  it('PUT /api/user - success', async () => {
    const res = await agent
      .put('/api/user')
      .set('x-csrf-token', csrfToken)
      .send({
        email: 'updated@test.com',
        first_name: 'Updated',
        last_name: 'User',
        zipcode: '2000'
      });
    
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('User updated successfully.');

    const user = await db.findUserById(1); // Assuming ID 1 for test user
    expect(user.email).toBe('updated@test.com');
    
    // Cleanup for other tests
    await db.updateUser(1, { email: 'user@test.com', first_name: 'Test', last_name: 'User', zipcode: '1000' });
  });

  it('PUT /api/user - email conflict', async () => {
    // Create another user
    const otherEmail = `other_${Date.now()}@test.com`;
    await db.insertUser({
      email: otherEmail,
      password: 'password',
      first_name: 'Other',
      last_name: 'User',
      zipcode: '3000'
    });

    const res = await agent
      .put('/api/user')
      .set('x-csrf-token', csrfToken)
      .send({
        email: otherEmail,
        first_name: 'Updated',
        last_name: 'User',
        zipcode: '2000'
      });
    
    expect(res.status).toBe(409);
    expect(res.body.message).toBe('Email already in use by another user.');
  });

  it('PUT /api/user/password - success', async () => {
    const res = await agent
      .put('/api/user/password')
      .set('x-csrf-token', csrfToken)
      .send({
        oldPassword: 'password123',
        newPassword: 'newpassword123'
      });
    
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Password updated successfully.');

    // Verify login with new password
    const loginRes = await agent
      .post('/api/login')
      .send({ email: 'user@test.com', password: 'newpassword123' });
    expect(loginRes.status).toBe(200);

    // Cleanup: Restore original password
    const bcrypt = require('bcrypt');
    const hashedOriginal = await bcrypt.hash('password123', 10);
    await db.updatePassword(1, hashedOriginal);
  });

  it('PUT /api/user/password - invalid old password', async () => {
    const res = await agent
      .put('/api/user/password')
      .set('x-csrf-token', csrfToken)
      .send({
        oldPassword: 'wrongpassword',
        newPassword: 'newpassword123'
      });
    
    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Invalid old password.');
  });
});
