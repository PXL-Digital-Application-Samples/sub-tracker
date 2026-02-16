const express = require('express');
const bcrypt = require('bcrypt');
const db = require('../db');

const router = express.Router();

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required.' });
  }

  try {
    const userQuery = process.env.DB_TYPE === 'postgres'
      ? 'SELECT * FROM users WHERE email = $1'
      : 'SELECT * FROM users WHERE email = ?';
    const users = await db.query(userQuery, [email]);

    if (users.length === 0) {
      console.log(`Login failed: ${email}`);
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    const user = users[0];
    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      console.log(`Login failed: ${email}`);
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    req.session.userId = user.id;
    console.log(`Login success: ${email}`);
    res.json({ message: 'Login successful.' });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
});

router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ message: 'Could not log out, please try again.' });
    }
    res.clearCookie('connect.sid');
    res.json({ message: 'Logout successful.' });
  });
});

module.exports = router;
