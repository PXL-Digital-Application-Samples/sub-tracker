const sessionSecret = process.env.SESSION_SECRET;

if (process.env.NODE_ENV === 'production' && !sessionSecret) {
  throw new Error('SESSION_SECRET must be set in production!');
}

module.exports = {
  sessionSecret: sessionSecret || 'test-secret',
};
