const express = require('express');
const bcrypt = require('bcrypt');
const db = require('../db');
const { loginLimiter } = require('../middleware/rateLimit');
const logger = require('../logger');

const router = express.Router();

router.post('/login', loginLimiter, async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required.' });
  }

  try {
    const user = await db.findUserByEmail(email);

    if (!user) {
      logger.warn({ event: 'login_failed', reason: 'user_not_found' }, 'Login attempt failed');
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      logger.warn({ event: 'login_failed', reason: 'invalid_password' }, 'Login attempt failed');
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    req.session.userId = user.id;
    logger.info({ event: 'login_success' }, 'User logged in successfully');
    res.json({ message: 'Login successful.' });
  } catch (error) {
    logger.error({ err: error }, 'Login error');
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
