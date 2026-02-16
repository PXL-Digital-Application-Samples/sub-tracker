const supertest = require('supertest');
const express = require('express');

describe('Global Error Handler', () => {
  let app;

  beforeAll(() => {
    app = express();
    app.get('/error', (_req, _res, next) => {
      const err = new Error('Test Error');
      err.status = 400;
      next(err);
    });

    app.get('/unhandled', (_req, _res, _next) => {
      throw new Error('Explosion');
    });

    app.use((err, _req, res, _next) => {
      // Mimic index.js error handler
      res.status(err.status || 500).json({
        message: process.env.NODE_ENV === 'production'
          ? 'Internal server error.'
          : err.message,
      });
    });
  });

  it('should handle explicit errors with status', async () => {
    const res = await supertest(app).get('/error');
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Test Error');
  });

  it('should handle unhandled errors as 500', async () => {
    const res = await supertest(app).get('/unhandled');
    expect(res.status).toBe(500);
    expect(res.body.message).toBe('Explosion');
  });
});
