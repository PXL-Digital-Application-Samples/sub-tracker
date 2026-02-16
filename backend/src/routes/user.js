const express = require('express');
const bcrypt = require('bcrypt');
const { body } = require('express-validator');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const { validate, emailValidation, passwordValidation } = require('../middleware/validate');

const router = express.Router();

router.get('/user', requireAuth, async (req, res) => {
  try {
    const userQuery = process.env.DB_TYPE === 'postgres'
      ? 'SELECT id, email, first_name, last_name, zipcode FROM users WHERE id = $1'
      : 'SELECT id, email, first_name, last_name, zipcode FROM users WHERE id = ?';
    const users = await db.query(userQuery, [req.session.userId]);

    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found.' });
    }
    res.json(users[0]);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
});

const userUpdateValidation = [
  ...emailValidation,
  body('first_name').notEmpty().withMessage('First name is required.'),
  body('last_name').notEmpty().withMessage('Last name is required.'),
  body('zipcode').notEmpty().withMessage('Zipcode is required.'),
];

router.put('/user', requireAuth, userUpdateValidation, validate, async (req, res) => {
  const { email, first_name, last_name, zipcode } = req.body;

  try {
    const userUpdateQuery = process.env.DB_TYPE === 'postgres'
      ? 'UPDATE users SET email = $1, first_name = $2, last_name = $3, zipcode = $4 WHERE id = $5'
      : 'UPDATE users SET email = ?, first_name = ?, last_name = ?, zipcode = ? WHERE id = ?';
    
    await db.run(userUpdateQuery, [email, first_name, last_name, zipcode, req.session.userId]);
    res.json({ message: 'User updated successfully.' });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
});

router.put('/user/password', requireAuth, passwordValidation, validate, async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  if (!oldPassword) {
    return res.status(400).json({ message: 'Old password is required.' });
  }

  try {
    const userQuery = process.env.DB_TYPE === 'postgres'
      ? 'SELECT password FROM users WHERE id = $1'
      : 'SELECT password FROM users WHERE id = ?';
    const users = await db.query(userQuery, [req.session.userId]);
    const user = users[0];

    const passwordMatch = await bcrypt.compare(oldPassword, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ message: 'Invalid old password.' });
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    const passwordUpdateQuery = process.env.DB_TYPE === 'postgres'
      ? 'UPDATE users SET password = $1 WHERE id = $2'
      : 'UPDATE users SET password = ? WHERE id = ?';
      
    await db.run(passwordUpdateQuery, [hashedNewPassword, req.session.userId]);
    res.json({ message: 'Password updated successfully.' });
  } catch (error) {
    console.error('Update password error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
});

module.exports = router;
