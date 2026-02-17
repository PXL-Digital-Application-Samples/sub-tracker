const express = require('express');
const cors = require('cors');
require('dotenv').config();
const session = require('express-session');
const cookieParser = require('cookie-parser');
const PgSession = require('connect-pg-simple')(session);
const SqliteStore = require('better-sqlite3-session-store')(session);

const db = require('./db');
const { createTables } = require('./db/schema');
const { seedData, ensureDefaultUser } = require('./db/seed');
const authRouter = require('./routes/auth');
const userRouter = require('./routes/user');
const subscriptionsRouter = require('./routes/subscriptions');
const logger = require('./logger');
const { doubleCsrfProtection, generateCsrfToken } = require('./middleware/csrf');
const { sessionSecret } = require('./config');

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
app.use(cookieParser(sessionSecret));

// Health check before routers and session
app.get('/api/health', async (req, res) => {
  try {
    // Verify database connectivity
    const sql = process.env.DB_TYPE === 'postgres' ? 'SELECT 1' : 'SELECT 1'; // same for both
    await db.query(sql);
    res.json({ status: 'ok', database: 'connected' });
  } catch (error) {
    logger.error({ err: error }, 'Health check failed');
    res.status(503).json({ status: 'error', message: 'Database disconnected' });
  }
});

const sessionStore = process.env.DB_TYPE === 'postgres'
  ? new PgSession({ pool: db.pool, createTableIfMissing: true })
  : new SqliteStore({ client: db.db });

app.use(session({
  store: sessionStore,
  secret: sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 1000 * 60 * 60 * 24 * 7, // 1 week
    secure: process.env.NODE_ENV === 'production',
  },
}));

app.get('/api/csrf-token', (req, res) => {
  const token = generateCsrfToken(req, res);
  res.json({ token });
});

app.use('/api', authRouter);
app.use('/api', doubleCsrfProtection, userRouter);
app.use('/api', doubleCsrfProtection, subscriptionsRouter);

app.use((err, req, res, _next) => {
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
    if (process.env.NODE_ENV !== 'production') {
      await seedData();
    } else {
      await ensureDefaultUser();
    }

    server = app.listen(port, () => {
      logger.info({ port }, 'Server started');
    });
    return server;
  } catch (error) {
    logger.error({ err: error }, 'Failed to start server');
    throw error;
  }
}

async function shutdown(signal) {
  logger.info({ signal }, 'Shutdown signal received');
  if (server) {
    await new Promise((resolve) => {
      server.close(() => {
        logger.info('HTTP server closed');
        resolve();
      });
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

if (require.main === module) {
  startServer().catch(_err => {
    process.exit(1);
  });
}

module.exports = { app, startServer };
