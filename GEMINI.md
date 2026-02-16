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
- **Full E2E Coverage:** Cypress tests cover Auth, Dashboard analytics, Profile updates, and Subscription CRUD.
- **Mandatory Linting:** ESLint + Prettier enforced for both Frontend and Backend to ensure CI parity.
- Secure practices (CSRF protection, Rate limiting, Structured logging)

## Project Structure

The project is structured as a monorepo:

```
/
├── frontend/                    # Vue 3 + Vite + TypeScript application
│   ├── cypress/
│   │   └── e2e/                 # E2E test files (auth, dashboard, profile, subscriptions)
│   └── src/
│       ├── __tests__/           # Vitest component tests
│       └── ...
├── backend/                     # Node.js + Express 5 API
│   ├── vitest.sqlite.js         # SQLite-specific test config
│   ├── vitest.postgres.js       # PostgreSQL-specific test config
│   ├── eslint.config.mjs        # ESLint 9+ Flat Config
│   ├── .prettierrc              # Prettier config
│   └── src/
│       ├── __tests__/           # Backend integration tests
│       └── db/
│           ├── sqlite.js        # SQLite adapter (Lazy-loaded)
│           ├── postgres.js      # PostgreSQL adapter
│           └── ...
├── test_all.sh                  # Fully automated test runner (Build + Lint + SQLite + Postgres + E2E)
├── compose.yaml                 # Docker Compose — SQLite variant (port 8080)
├── compose.postgres.yaml        # Docker Compose — PostgreSQL variant (port 8080)
└── ...
```

## Building and Running

### Docker Compose (recommended)

1.  **Preparation:** `cp .env.example .env` and set `SESSION_SECRET` / `POSTGRES_PASSWORD`.
2.  **Run (SQLite):** `docker compose up --build`
3.  **Run (Postgres):** `docker compose -f compose.postgres.yaml up --build`

## Testing & Quality Assurance

The project enforces high code quality through a mandatory automated pipeline.

### Full Automated Suite
Run the following command to execute the entire quality pipeline (Linting → SQLite Tests → Postgres Tests → Frontend Unit → E2E):
```bash
./test_all.sh
```
*Note: This script handles Docker container lifecycles for PostgreSQL automatically.*

### Backend Tests
- **Linting:** `cd backend && npm run lint`
- **SQLite:** `cd backend && npm run test:sqlite`
- **PostgreSQL:** `cd backend && npm run test:postgres` (requires running container)

### Frontend Tests
- **Linting:** `cd frontend && npm run lint`
- **Unit/Component:** `cd frontend && npm run test:unit`
- **E2E (Cypress):** `cd frontend && npx cypress run`

## Development Conventions

-   **Database abstraction:** All SQL is encapsulated within `backend/src/db/sqlite.js` and `backend/src/db/postgres.js`.
-   **Lazy Loading:** Database adapters are lazy-loaded to prevent side effects (e.g., SQLite file creation) when running in a different environment.
-   **Stable Tests:** All database queries in tests use `ORDER BY id ASC` to ensure consistent results across different engines.
-   **CSRF:** Frontend must include `x-csrf-token` header for state-changing requests.

## API Endpoints
(See README.md for full list)
