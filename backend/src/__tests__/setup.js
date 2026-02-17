const { app, startServer } = require('../index');
const supertest = require('supertest');
const db = require('../db');
const bcrypt = require('bcrypt');
const path = require('path');
const fs = require('fs');

let serverStarted = false;

// Use a separate test database for each run to avoid state leakage
const testDbPath = path.resolve(__dirname, `../../data/test_${Date.now()}.db`);
process.env.DB_PATH = testDbPath;

async function ensureServer() {
  if (!serverStarted) {
    await startServer();
    serverStarted = true;
  }
}

afterAll(async () => {
  if (db && db.close) {
    await db.close();
  }
  if (fs.existsSync(testDbPath)) {
    try {
      fs.unlinkSync(testDbPath);
    } catch (_err) {
      // Ignore errors if file is already gone or locked
    }
  }
});

async function createTestAgent() {
  await ensureServer();
  const agent = supertest.agent(app);
  
  // Ensure test user exists
  const email = 'user@test.com';
  const password = 'password123';
  const existingUser = await db.findUserByEmail(email);
  if (!existingUser) {
    const hashedPassword = await bcrypt.hash(password, 10);
    await db.insertUser({
      email,
      password: hashedPassword,
      first_name: 'Test',
      last_name: 'User',
      zipcode: '1000'
    });
  }

  // Login first
  await agent
    .post('/api/login')
    .send({ email, password });

  // Get CSRF token AFTER login
  const csrfRes = await agent.get('/api/csrf-token');
  const csrfToken = csrfRes.body.token;
  
  return { agent, csrfToken };
}

module.exports = { createTestAgent, ensureServer };
