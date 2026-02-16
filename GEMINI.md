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
- **Automated Dual-DB Test Suite:** Backend integration tests run against both SQLite and PostgreSQL.
- **Dedicated Test Setups:** Isolated environments using `vitest.sqlite.js` and `vitest.postgres.js`.
- **Architectural Verification:** Specific tests for DB Factory logic and CSRF token regeneration.
- **Full E2E Coverage:** Cypress tests cover Auth, Dashboard, Profile, and Subscriptions.
- **Mandatory Linting:** ESLint + Prettier enforced for local and CI parity.

## Project Structure

The project is structured as a monorepo:

```
/
├── frontend/                    # Vue 3 + Vite + TypeScript application
│   ├── cypress/
│   │   └── e2e/                 # E2E test files
│   └── src/
│       ├── __tests__/           # Vitest component tests
│       └── ...
├── backend/                     # Node.js + Express 5 API
│   ├── vitest.sqlite.js         # Dedicated setup for SQLite integration tests
│   ├── vitest.postgres.js       # Dedicated setup for PostgreSQL integration tests
│   ├── eslint.config.mjs        # ESLint 9+ Flat Config
│   ├── .prettierrc              # Prettier config
│   └── src/
│       ├── __tests__/           # Backend integration & architectural tests
│       └── db/
│           ├── sqlite.js        # SQLite adapter (Hardened lazy-loading)
│           ├── postgres.js      # PostgreSQL adapter
│           └── ...
├── test_all.sh                  # Fully automated dual-DB test suite
├── compose.yaml                 # Docker Compose — SQLite variant
├── compose.postgres.yaml        # Docker Compose — PostgreSQL variant
└── ...
```

## Building and Running

### Docker Compose (recommended)

1.  **Preparation:** `cp .env.example .env` and set `SESSION_SECRET` / `POSTGRES_PASSWORD`.
2.  **Run (SQLite):** `docker compose up --build`
3.  **Run (Postgres):** `docker compose -f compose.postgres.yaml up --build`

## Testing & Quality Assurance

The project enforces high code quality through isolated, environment-aware testing.

### Full Automated Suite
Run the following command to execute the entire quality pipeline:
```bash
./test_all.sh
```
*Note: This script handles Docker `build --no-cache` and container lifecycles automatically.*

### Backend Tests
- **Architectural Isolation:** `src/__tests__/db/factory.test.js` verifies DB switching logic.
- **SQLite:** `npm run test:sqlite` (Uses `vitest.sqlite.js`).
- **PostgreSQL:** `npm run test:postgres` (Uses `vitest.postgres.js` inside Docker).

### Frontend Tests
- **Linting:** `cd frontend && npm run lint` (ESLint + oxlint).
- **Unit/Component:** `cd frontend && npm run test:unit`.
- **E2E (Cypress):** `cd frontend && npx cypress run`.

## Development Conventions

-   **Database abstraction:** All SQL is encapsulated within `backend/src/db/sqlite.js` and `backend/src/db/postgres.js`.
-   **PostgreSQL Connection:** Supports both individual environment variables and a single `DATABASE_URL` connection string (ideal for RDS).
-   **Hardened Lazy Loading:** `sqlite.js` throw an error if accessed while `DB_TYPE` is not `sqlite`.
-   **CSRF Security:** Fresh tokens are generated and returned upon successful login to bind to the new session.
-   **Stable Results:** All database queries in tests use `ORDER BY id ASC`.

## API Endpoints
(See README.md for full list)
