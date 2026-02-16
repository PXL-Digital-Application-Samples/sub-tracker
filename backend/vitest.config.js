const { defineConfig } = require('vitest/config');

const isPostgres = process.env.DB_TYPE === 'postgres';

module.exports = defineConfig({
  test: {
    globals: true,
    environment: 'node',
    fileParallelism: false,
    // Exclude sqlite tests when running in postgres mode to avoid environment clashes
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      isPostgres ? '**/sqlite.test.js' : '',
    ].filter(Boolean),
  },
});
