# Gemini Code Assistant Context

This document provides context for the Gemini Code Assistant to understand and assist with the development of the **Subscription Tracker** project.

## Project Overview

The project is a web application designed to help users track their subscriptions. It consists of a **Vue 3** (TypeScript, Vite) frontend and a **Node.js** (Express 5, CommonJS) backend. It supports both **SQLite** and **PostgreSQL** databases, switchable via the `DB_TYPE` environment variable.

Current features:
- Session-based user authentication (single seeded user — no registration)
- User profile management (view, edit, change password)
- Subscription management (CRUD — create, read, update, cancel, delete)
- Dashboard with analytics (monthly/yearly cost totals)
- Separation of active and historical (cancelled) subscriptions
- Docker Compose deployment for both database variants
- Full test coverage (Backend integration, Frontend component, and E2E)
- Secure practices (CSRF protection, Rate limiting, Structured logging)

## Project Structure

The project is structured as a monorepo:

```
/
├── frontend/                    # Vue 3 + Vite + TypeScript application
│   ├── Dockerfile               # Multi-stage build: Node → Nginx
│   ├── nginx.conf               # Nginx config (serves SPA, proxies /api to backend)
│   ├── package.json
│   ├── vite.config.ts
│   ├── vitest.config.ts         # Unit/Component test config (vitest)
│   ├── cypress.config.ts        # E2E test config (cypress)
│   ├── cypress/
│   │   └── e2e/                 # E2E test files (auth, subscriptions)
│   └── src/
│       ├── App.vue              # Root component with nav + RouterView
│       ├── main.ts              # App entry point (Pinia + Vue Router + CSRF init)
│       ├── assets/
│       │   ├── base.css         # CSS variables, dark mode, body reset, global styles
│       │   └── main.css         # App-level imports
│       ├── components/
│       │   └── SubscriptionModal.vue  # Add/edit subscription modal
│       ├── router/
│       │   └── index.ts         # Route definitions + auth guard (Pinia-based)
│       ├── services/
│       │   └── api.ts           # HTTP client wrapping fetch() with CSRF/Auth handling
│       ├── stores/              # Pinia stores (auth)
│       ├── types/               # TypeScript interfaces for API models
│       ├── utils/               # Shared utilities (formatting)
│       └── views/
│           ├── LoginPage.vue
│           ├── DashboardPage.vue
│           ├── SubscriptionsPage.vue
│           ├── HistoryPage.vue
│           ├── ProfilePage.vue
│           └── ChangePasswordPage.vue
├── backend/                     # Node.js + Express 5 API
│   ├── Dockerfile               # Node 22 Alpine
│   ├── package.json             # CommonJS, scripts: start, dev, test
│   ├── .env.example             # Example environment variables
│   ├── data/                    # SQLite database file directory (gitignored)
│   ├── vitest.config.js         # Backend test config
│   └── src/
│       ├── index.js             # App entry point, session config, server startup
│       ├── logger.js            # Structured logging (Pino)
│       ├── db/
│       │   ├── index.js         # Factory — returns sqlite or postgres adapter based on DB_TYPE
│       │   ├── sqlite.js        # SQLite adapter (fully async wrapper)
│       │   ├── postgres.js      # PostgreSQL adapter (pg Pool)
│       │   ├── schema.js        # Table creation (delegated to adapters)
│       │   └── seed.js          # Default user + sample subscriptions
│       ├── middleware/
│       │   ├── auth.js          # requireAuth session check
│       │   ├── validate.js      # express-validator rules + validate middleware
│       │   └── rateLimit.js     # Rate limiting for sensitive routes
│       └── routes/
│           ├── auth.js          # POST /api/login, POST /api/logout
│           ├── user.js          # GET/PUT /api/user, PUT /api/user/password
│           └── subscriptions.js # CRUD + Cancel for /api/subscriptions/*
├── .github/workflows/ci.yml     # GitHub Actions CI pipeline
├── compose.yaml                 # Docker Compose — SQLite variant (port 8080)
├── compose.postgres.yaml        # Docker Compose — PostgreSQL variant (port 8080)
├── smoke_test.sh                # Bash smoke test
├── CODE_REVIEW.md               # Detailed code review findings
├── IMPLEMENTATION_PLAN.md       # remediated implementation plan
├── README.md                    # User-facing documentation
└── .env                         # Local environment variables (gitignored)
```

## Building and Running

### Docker Compose (recommended)

1.  **Preparation:**
    ```bash
    cp .env.example .env
    # Edit .env with your secrets
    ```

2.  **Run:**
    ```bash
    docker compose up --build
    # OR for postgres:
    docker compose -f compose.postgres.yaml up --build
    ```
    The frontend will be available at `http://localhost:8080`.

### Environment Variables

The application requires a `.env` file at the root.

| Variable | Default | Description |
|----------|---------|-------------|
| `DB_TYPE` | `sqlite` | Database backend: `sqlite` or `postgres` |
| `SESSION_SECRET` | (required) | Secret for signing session cookies and CSRF |
| `PORT` | `3000` | Backend HTTP port |
| `CORS_ORIGINS` | `http://localhost:8080` | Allowed CORS origins (comma-separated) |
| `POSTGRES_HOST` | `postgres` | PostgreSQL hostname |
| `POSTGRES_PORT` | `5432` | PostgreSQL port |
| `POSTGRES_USER` | `sub_user` | PostgreSQL username |
| `POSTGRES_PASSWORD` | (required) | PostgreSQL password |
| `POSTGRES_DB` | `sub_tracker` | PostgreSQL database name |

### Local Development

-   **Backend:**
    ```bash
    cd backend
    npm install
    npm run dev             # Hot-reload with nodemon
    ```
-   **Frontend:**
    ```bash
    cd frontend
    npm install
    npm run dev
    ```

### Default Credentials

- **Email:** `user@test.com`
- **Password:** `password123`

## Technical Stack

### Backend
- **Runtime:** Node.js 22
- **Framework:** Express 5.2
- **Logging:** Pino (structured JSON)
- **Security:** `csrf-csrf` (Double Submit Cookie), `express-rate-limit`
- **Testing:** Vitest + Supertest

### Frontend
- **Framework:** Vue 3.5 (TypeScript, `<script setup>`)
- **State management:** Pinia 3
- **Styling:** CSS Variables (Light/Dark mode), Responsive design
- **Testing:** Vitest + @vue/test-utils (Unit/Component), Cypress (E2E)

## Development Conventions

-   **Database abstraction:** All SQL is encapsulated within `backend/src/db/sqlite.js` and `backend/src/db/postgres.js`. Route handlers call named adapter methods (e.g., `db.getActiveSubscriptions(userId)`).
-   **Currency:** Prices are stored as **integer cents** (e.g., $19.99 is `1999`) to avoid floating-point issues.
-   **CSRF:** The frontend must call `initCsrf()` on boot to fetch the token, and include it in the `x-csrf-token` header for all state-changing requests.
-   **Auth:** Handled by `auth` Pinia store. Reacts to 401 responses automatically via an unauthorized handler in `api.ts`.

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/health` | No | Health check |
| `GET` | `/api/csrf-token` | No | Get CSRF token |
| `POST` | `/api/login` | No | Authenticate (Rate limited) |
| `POST` | `/api/logout` | Yes | Destroy session |
| `GET` | `/api/user` | Yes | Get current user profile |
| `PUT` | `/api/user` | Yes | Update profile |
| `PUT` | `/api/user/password` | Yes | Change password |
| `GET` | `/api/subscriptions/active` | Yes | List active subscriptions (Paginated) |
| `GET` | `/api/subscriptions/history` | Yes | List cancelled subscriptions (Paginated) |
| `POST` | `/api/subscriptions` | Yes | Create subscription |
| `POST` | `/api/subscriptions/:id/cancel`| Yes | Cancel (archive) subscription |
| `PUT` | `/api/subscriptions/:id` | Yes | Update subscription |
| `DELETE` | `/api/subscriptions/:id` | Yes | Hard delete subscription |

## Database Schema

### `subscriptions`
- `price`: `INTEGER` (cents)
- `cancelled_at`: `TIMESTAMP` / `TEXT` (ISO8601) - determines if a sub is active or history.
