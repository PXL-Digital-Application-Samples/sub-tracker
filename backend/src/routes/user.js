const express = require('express');
const bcrypt = require('bcrypt');
const { body } = require('express-validator');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const { validate, emailValidation, passwordValidation } = require('../middleware/validate');
const logger = require('../logger');

const router = express.Router();

router.get('/user', requireAuth, async (req, res) => {
  try {
    const user = await db.findUserById(req.session.userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }
    res.json(user);
  } catch (error) {
    logger.error({ err: error }, 'Get user error');
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
    const existingUser = await db.findUserByEmail(email);
    if (existingUser && existingUser.id !== req.session.userId) {
      return res.status(409).json({ message: 'Email already in use by another user.' });
    }

    await db.updateUser(req.session.userId, { email, first_name, last_name, zipcode });
    res.json({ message: 'User updated successfully.' });
  } catch (error) {
    logger.error({ err: error }, 'Update user error');
    res.status(500).json({ message: 'Internal server error.' });
  }
});

router.put('/user/password', requireAuth, passwordValidation, validate, async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  if (!oldPassword) {
    return res.status(400).json({ message: 'Old password is required.' });
  }

  try {
    const user = await db.getUserPassword(req.session.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const passwordMatch = await bcrypt.compare(oldPassword, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ message: 'Invalid old password.' });
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    await db.updatePassword(req.session.userId, hashedNewPassword);
    res.json({ message: 'Password updated successfully.' });
  } catch (error) {
    logger.error({ err: error }, 'Update password error');
    res.status(500).json({ message: 'Internal server error.' });
  }
});

module.exports = router;
