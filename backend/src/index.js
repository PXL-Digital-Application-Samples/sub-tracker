const express = require('express');
const cors = require('cors');
require('dotenv').config();
const session = require('express-session');
const PgSession = require('connect-pg-simple')(session);
const SqliteStore = require('better-sqlite3-session-store')(session);

const db = require('./db');
const { createTables } = require('./db/schema');
const { seedData } = require('./db/seed');
const authRouter = require('./routes/auth');
const userRouter = require('./routes/user');
const subscriptionsRouter = require('./routes/subscriptions');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors({
  origin: 'http://localhost:8080',
  credentials: true,
}));
app.use(express.json());

const sessionStore = process.env.DB_TYPE === 'postgres'
  ? new PgSession({ pool: db.pool })
  : new SqliteStore({ db: db.db });

app.use(session({
  store: sessionStore,
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 1000 * 60 * 60 * 24 * 7, // 1 week
  },
}));

app.use('/api', authRouter);
app.use('/api', userRouter);
app.use('/api', subscriptionsRouter);


app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

async function startServer() {
  try {
    await createTables();
    await seedData();

    app.listen(port, () => {
      console.log(`Server running on port ${port}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

process.on('exit', () => {
  if (db && db.close) {
    db.close();
    console.log('Database connection closed.');
  }
});
