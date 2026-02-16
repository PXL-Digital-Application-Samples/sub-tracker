const { body, validationResult } = require('express-validator');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

const emailValidation = [
  body('email').isEmail().withMessage('Invalid email format.'),
];

const passwordValidation = [
  body('newPassword').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long.'),
];

const subscriptionValidation = [
  body('company_name').notEmpty().withMessage('Company name is required.'),
  body('price').isFloat({ gt: 0 }).withMessage('Price must be a positive number.'),
  body('subscription_type').isIn(['monthly', 'yearly', 'lifetime']).withMessage('Invalid subscription type.'),
  body('start_date').isISO8601().withMessage('Invalid date format.'),
];

module.exports = {
  validate,
  emailValidation,
  passwordValidation,
  subscriptionValidation,
};
