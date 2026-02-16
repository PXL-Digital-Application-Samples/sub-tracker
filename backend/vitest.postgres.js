const { defineConfig } = require('vitest/config');

module.exports = defineConfig({
  test: {
    globals: true,
    environment: 'node',
    fileParallelism: false,
    include: [
      'src/__tests__/routes/**/*.test.js',
      'src/__tests__/error.test.js'
    ],
    exclude: [
      '**/sqlite.test.js'
    ]
  },
});
