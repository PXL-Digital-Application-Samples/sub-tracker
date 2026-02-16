# Gemini Code Assistant Context

This document provides context for the Gemini Code Assistant to understand and assist with the development of the **Subscription Tracker** project.

## Project Overview

The project is a web application designed to help users track their subscriptions. It consists of a **Vue 3** (TypeScript, Vite) frontend and a **Node.js** (Express 5, CommonJS) backend. It supports both **SQLite** and **PostgreSQL** databases, switchable via the `DB_TYPE` environment variable.

Current features:
- Session-based user authentication (single seeded user — no registration)
- User profile management (view, edit, change password)
- Subscription management (CRUD — create, read, update, delete)
- Dashboard with analytics (monthly/yearly cost totals)
- Separation of active and historical subscriptions
- Docker Compose deployment for both database variants

### Known Issues

A comprehensive code review has been performed. See [CODE_REVIEW.md](CODE_REVIEW.md) for all findings and [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md) for the remediation plan. Key issues include:
- PostgreSQL mode has critical bugs (missing session table, broken result handling)
- Frontend layout is broken by leftover scaffolding CSS
- Zero test coverage (no unit, integration, or meaningful E2E tests)
- SQL dialect logic is scattered across route files instead of being abstracted into adapters

## Project Structure

The project is structured as a monorepo:

```
/
├── frontend/                    # Vue 3 + Vite + TypeScript application
│   ├── Dockerfile               # Multi-stage build: Node → Nginx
│   ├── nginx.conf               # Nginx config (serves SPA, proxies /api to backend)
│   ├── package.json
│   ├── vite.config.ts
│   ├── vitest.config.ts         # Unit test config (vitest, no tests yet)
│   ├── cypress.config.ts        # E2E test config (cypress, placeholder test only)
│   ├── cypress/
│   │   └── e2e/
│   │       └── example.cy.ts    # Scaffolding test — does not test the actual app
│   └── src/
│       ├── App.vue              # Root component with nav + RouterView
│       ├── main.ts              # App entry point (Pinia + Vue Router)
│       ├── assets/
│       │   ├── base.css         # CSS variables, dark mode, body reset
│       │   └── main.css         # App-level styles (includes broken scaffolding CSS)
│       ├── components/
│       │   └── SubscriptionModal.vue  # Add/edit subscription modal
│       ├── router/
│       │   └── index.ts         # Route definitions + auth guard (localStorage-based)
│       ├── services/
│       │   └── api.ts           # HTTP client wrapping fetch() for all API calls
│       ├── stores/              # Pinia stores (Pinia is installed but not actually used)
│       └── views/
│           ├── LoginPage.vue
│           ├── DashboardPage.vue
│           ├── SubscriptionsPage.vue
│           ├── HistoryPage.vue
│           ├── ProfilePage.vue
│           └── ChangePasswordPage.vue
├── backend/                     # Node.js + Express 5 API
│   ├── Dockerfile               # Node 22 Alpine
│   ├── package.json             # CommonJS, no start/dev scripts
│   ├── .env.example             # Example environment variables
│   ├── data/                    # SQLite database file directory (gitignored)
│   └── src/
│       ├── index.js             # App entry point, session config, server startup
│       ├── db/
│       │   ├── index.js         # Factory — returns sqlite or postgres adapter based on DB_TYPE
│       │   ├── sqlite.js        # SQLite adapter (better-sqlite3, synchronous)
│       │   ├── postgres.js      # PostgreSQL adapter (pg Pool, async)
│       │   ├── schema.js        # Table creation (branched SQL for each DB type)
│       │   └── seed.js          # Default user + sample subscriptions
│       ├── middleware/
│       │   ├── auth.js          # requireAuth session check
│       │   └── validate.js      # express-validator rules + validate middleware
│       └── routes/
│           ├── auth.js          # POST /api/login, POST /api/logout
│           ├── user.js          # GET/PUT /api/user, PUT /api/user/password
│           └── subscriptions.js # CRUD for /api/subscriptions/*
├── compose.yaml                 # Docker Compose — SQLite variant (port 8090)
├── compose.postgres.yaml        # Docker Compose — PostgreSQL variant (port 8080)
├── smoke_test.sh                # Bash smoke test (currently broken — wrong port)
├── CODE_REVIEW.md               # Detailed code review findings
├── IMPLEMENTATION_PLAN.md       # Prioritized remediation plan
├── README.md                    # User-facing documentation
├── LICENSE
└── .gitignore
```

## Building and Running

### Docker Compose (recommended)

1.  **SQLite variant (default):**
    ```bash
    docker compose up --build
    ```
    The frontend will be available at `http://localhost:8090`.

    > **Note:** The `compose.yaml` maps port 8090, not 8080. See CODE_REVIEW.md §2.1 for the inconsistency.

2.  **PostgreSQL variant:**
    ```bash
    docker compose -f compose.postgres.yaml up --build
    ```
    The frontend will be available at `http://localhost:8080`.

### Environment Variables

The backend reads these variables (see `backend/.env.example`):

| Variable | Default | Description |
|----------|---------|-------------|
| `DB_TYPE` | `sqlite` | Database backend: `sqlite` or `postgres` |
| `SESSION_SECRET` | (required) | Secret for signing session cookies |
| `PORT` | `3000` | Backend HTTP port |
| `POSTGRES_HOST` | `postgres` | PostgreSQL hostname |
| `POSTGRES_PORT` | `5432` | PostgreSQL port |
| `POSTGRES_USER` | `sub_user` | PostgreSQL username |
| `POSTGRES_PASSWORD` | `sub_pass` | PostgreSQL password |
| `POSTGRES_DB` | `sub_tracker` | PostgreSQL database name |

> **Warning:** Both compose files currently hardcode `SESSION_SECRET: supersecret`. This should be externalized for any non-local use.

### Local Development

-   **Backend:**
    ```bash
    cd backend
    npm install
    node src/index.js       # No "start" script exists yet
    ```
-   **Frontend:**
    ```bash
    cd frontend
    npm install
    npm run dev
    ```
    The Vite dev server does **not** proxy `/api` requests. For local frontend development, the backend must be running separately and CORS must allow the Vite dev server origin.

### Default Credentials

- **Email:** `user@test.com`
- **Password:** `password123`

## Technical Stack

### Backend
- **Runtime:** Node.js 22 (Alpine Docker image)
- **Framework:** Express 5.2
- **Module system:** CommonJS (`require`/`module.exports`)
- **Databases:** better-sqlite3 (SQLite), pg (PostgreSQL)
- **Sessions:** express-session with better-sqlite3-session-store or connect-pg-simple
- **Auth:** bcrypt password hashing
- **Validation:** express-validator

### Frontend
- **Framework:** Vue 3.5 with `<script setup>` (components do not use `lang="ts"` despite TypeScript being configured)
- **Build tool:** Vite 7
- **Router:** vue-router 5
- **State management:** Pinia 3 (installed but not used — state is local `ref()` per component)
- **Testing:** vitest (configured, no tests), Cypress (configured, placeholder test only)
- **Linting:** ESLint + oxlint + Prettier

## Development Conventions

-   **Database abstraction:** A factory in `backend/src/db/index.js` returns the SQLite or PostgreSQL adapter based on `DB_TYPE`. However, the abstraction is currently **leaky** — every route file contains `process.env.DB_TYPE` branches for SQL dialect differences (`?` vs `$1`, `AUTOINCREMENT` vs `SERIAL`, date functions, etc.).
-   **Authentication:** Session-based with cookies (`httpOnly`, `sameSite: lax`). Sessions are stored in the database. The frontend tracks login state via `localStorage.setItem('isLoggedIn', 'true')` which is checked by the Vue Router guard.
-   **API:** RESTful JSON API. All endpoints are prefixed with `/api`. The frontend uses a thin `fetch()` wrapper in `src/services/api.ts`.
-   **Validation:** Backend validates input using express-validator middleware. Frontend has minimal client-side validation (HTML `required` attributes).
-   **Seeding:** On first startup, if the `users` table is empty, a default user and 5 sample subscriptions are created automatically.

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/health` | No | Health check — returns `{ status: 'ok' }` |
| `POST` | `/api/login` | No | Authenticate with email + password |
| `POST` | `/api/logout` | Yes | Destroy session |
| `GET` | `/api/user` | Yes | Get current user profile |
| `PUT` | `/api/user` | Yes | Update user profile (email, name, zipcode) |
| `PUT` | `/api/user/password` | Yes | Change password (requires old password) |
| `GET` | `/api/subscriptions/active` | Yes | List active subscriptions + cost summary |
| `GET` | `/api/subscriptions/history` | Yes | List expired/inactive subscriptions |
| `POST` | `/api/subscriptions` | Yes | Create a new subscription |
| `PUT` | `/api/subscriptions/:id` | Yes | Update a subscription |
| `DELETE` | `/api/subscriptions/:id` | Yes | Delete a subscription |

## Database Schema

### `users`
| Column | SQLite | PostgreSQL |
|--------|--------|------------|
| `id` | `INTEGER PRIMARY KEY AUTOINCREMENT` | `SERIAL PRIMARY KEY` |
| `email` | `TEXT UNIQUE NOT NULL` | `TEXT UNIQUE NOT NULL` |
| `password` | `TEXT NOT NULL` | `TEXT NOT NULL` |
| `first_name` | `TEXT` | `TEXT` |
| `last_name` | `TEXT` | `TEXT` |
| `zipcode` | `TEXT` | `TEXT` |

### `subscriptions`
| Column | SQLite | PostgreSQL |
|--------|--------|------------|
| `id` | `INTEGER PRIMARY KEY AUTOINCREMENT` | `SERIAL PRIMARY KEY` |
| `user_id` | `INTEGER NOT NULL` (FK → users) | `INTEGER NOT NULL` (FK → users) |
| `company_name` | `TEXT NOT NULL` | `TEXT NOT NULL` |
| `description` | `TEXT` | `TEXT` |
| `price` | `REAL NOT NULL` | `NUMERIC(10,2) NOT NULL` |
| `subscription_type` | `TEXT NOT NULL` (monthly/yearly/lifetime) | same |
| `start_date` | `TEXT NOT NULL` | `DATE NOT NULL` |
| `created_at` | `TEXT DEFAULT CURRENT_TIMESTAMP` | `TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP` |
