const { doubleCsrf } = require('csrf-csrf');

const sessionSecret = process.env.SESSION_SECRET || 'test-secret';

const {
  doubleCsrfProtection,
  generateCsrfToken,
  invalidCsrfTokenError,
} = doubleCsrf({
  getSecret: () => sessionSecret,
  getSessionIdentifier: (req) => req.session.id,
  cookieName: '_csrf',
  cookieOptions: {
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  },
  getTokenFromRequest: (req) => req.headers['x-csrf-token'],
});

module.exports = {
  doubleCsrfProtection,
  generateCsrfToken,
  invalidCsrfTokenError,
};
