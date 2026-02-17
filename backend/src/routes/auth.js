const express = require('express');
const bcrypt = require('bcrypt');
const db = require('../db');
const { loginLimiter } = require('../middleware/rateLimit');
const logger = require('../logger');
const { generateCsrfToken } = require('../middleware/csrf');

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

    req.session.regenerate((err) => {
      if (err) {
        logger.error({ err }, 'Session regeneration error');
        return res.status(500).json({ message: 'Internal server error.' });
      }
      req.session.userId = user.id;
      logger.info({ event: 'login_success' }, 'User logged in successfully');

      // Generate a new CSRF token after login to bind it to the new session
      const token = generateCsrfToken(req, res);
      res.json({ message: 'Login successful.', token });
    });
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
    res.clearCookie('_csrf'); // Also clear the CSRF cookie
    res.json({ message: 'Logout successful.' });
  });
});

module.exports = router;
