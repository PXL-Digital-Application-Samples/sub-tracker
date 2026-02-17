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
  body('newPassword').isLength({ min: 6, max: 100 }).withMessage('Password must be between 6 and 100 characters long.'),
];

const userUpdateValidation = [
  ...emailValidation,
  body('first_name').notEmpty().isLength({ max: 50 }).withMessage('First name is required and must be under 50 characters.'),
  body('last_name').notEmpty().isLength({ max: 50 }).withMessage('Last name is required and must be under 50 characters.'),
  body('zipcode').notEmpty().isLength({ max: 20 }).withMessage('Zipcode is required and must be under 20 characters.'),
];

const subscriptionValidation = [
  body('company_name').notEmpty().isLength({ max: 100 }).withMessage('Company name is required and must be under 100 characters.'),
  body('description').optional().isLength({ max: 500 }).withMessage('Description must be under 500 characters.'),
  body('price').isInt({ gt: 0 }).withMessage('Price must be a positive integer (cents).'),
  body('subscription_type').isIn(['monthly', 'yearly', 'lifetime']).withMessage('Invalid subscription type.'),
  body('start_date').isISO8601().withMessage('Invalid date format.'),
];

module.exports = {
  validate,
  emailValidation,
  passwordValidation,
  subscriptionValidation,
  userUpdateValidation,
};
