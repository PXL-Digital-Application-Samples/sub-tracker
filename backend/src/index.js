const express = require('express');
const cors = require('cors');
require('dotenv').config();
const session = require('express-session');
const PgSession = require('connect-pg-simple')(session);
const SqliteStore = require('better-sqlite3-session-store')(session);
const { doubleCsrf } = require('csrf-csrf');

const db = require('./db');
const { createTables } = require('./db/schema');
const { seedData } = require('./db/seed');
const authRouter = require('./routes/auth');
const userRouter = require('./routes/user');
const subscriptionsRouter = require('./routes/subscriptions');
const logger = require('./logger');

const app = express();
const port = process.env.PORT || 3000;

const allowedOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',')
  : ['http://localhost:8080'];

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
}));
app.use(express.json());

// Health check before routers and session
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

const sessionStore = process.env.DB_TYPE === 'postgres'
  ? new PgSession({ pool: db.pool, createTableIfMissing: true })
  : new SqliteStore({ client: db.db });

app.use(session({
  store: sessionStore,
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 1000 * 60 * 60 * 24 * 7, // 1 week
    secure: process.env.NODE_ENV === 'production',
  },
}));

const { doubleCsrfProtection, generateToken } = doubleCsrf({
  getSecret: () => process.env.SESSION_SECRET,
  cookieName: '_csrf',
  cookieOptions: {
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  },
  getTokenFromRequest: (req) => req.headers['x-csrf-token'],
});

app.get('/api/csrf-token', (req, res) => {
  res.json({ token: generateToken(req, res) });
});

app.use('/api', authRouter);
app.use('/api/user', doubleCsrfProtection, userRouter);
app.use('/api/subscriptions', doubleCsrfProtection, subscriptionsRouter);

app.use((err, req, res, next) => {
  logger.error({ err }, 'Unhandled error');
  res.status(err.status || 500).json({
    message: process.env.NODE_ENV === 'production'
      ? 'Internal server error.'
      : err.message,
  });
});

let server;

async function startServer() {
  try {
    await createTables();
    await seedData();

    server = app.listen(port, () => {
      logger.info({ port }, 'Server started');
    });
  } catch (error) {
    logger.error({ err: error }, 'Failed to start server');
    process.exit(1);
  }
}

startServer();

async function shutdown(signal) {
  logger.info({ signal }, 'Shutdown signal received');
  if (server) {
    server.close(() => {
      logger.info('HTTP server closed');
    });
  }
  if (db && db.close) {
    await db.close();
    logger.info('Database connection closed');
  }
  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
