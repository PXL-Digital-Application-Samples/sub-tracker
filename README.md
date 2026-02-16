# Subscription Tracker

A robust web application to help you track your subscriptions, supporting both SQLite and PostgreSQL with a fully automated, dual-database testing suite.

## Features

- **User Authentication:** Secure session-based authentication with POST-login CSRF token regeneration.
- **Subscription Management:** Full CRUD operations with soft-cancellation and history tracking.
- **Dashboard:** Real-time analytics for monthly and yearly spending.
- **Multi-DB Support:** Seamlessly switch between SQLite and PostgreSQL.
- **Automated Quality Pipeline:** Mandatory linting and dedicated test setups for each database engine.
- **Responsive Design:** Automatic Dark Mode and mobile-first UI.

## Getting Started

### Prerequisites

- [Docker](https://www.docker.com/) and [Docker Compose](https://docs.docker.com/compose/)

### Quick Start

1.  **Environment Setup:**
    ```bash
    cp .env.example .env
    # Open .env and set SESSION_SECRET and POSTGRES_PASSWORD
    ```

2.  **Run with SQLite (Default):**
    ```bash
    docker compose up --build
    ```

3.  **Run with PostgreSQL:**
    ```bash
    docker compose -f compose.postgres.yaml up --build
    ```
    The app is available at `http://localhost:8080`.

### Production Deployment

For production deployments (e.g., AWS RDS, Heroku, DigitalOcean):
1.  **Build Images:** Use the provided `Dockerfile`s in `frontend/` and `backend/`.
2.  **External Database:** Set `DB_TYPE=postgres` and provide a `DATABASE_URL` connection string (e.g., `postgres://user:password@rds-endpoint:5432/dbname`).
3.  **Security:** Ensure `SESSION_SECRET` is a long random string and `CORS_ORIGINS` is set to your production domain.

### Default Credentials

- **Email:** `user@test.com`
- **Password:** `password123`

## Development & Testing

### Full Automated Suite
Run the comprehensive test suite (Linting + SQLite Tests + Postgres Tests + Frontend Unit + E2E) with one command:
```bash
./test_all.sh
```
*This script automatically builds images with `--no-cache` and manages PostgreSQL containers.*

### Manual Commands
- **Backend Lint:** `cd backend && npm run lint`
- **Backend SQLite Tests:** `cd backend && npm run test:sqlite`
- **Backend Postgres Tests:** `cd backend && npm run test:postgres` (requires running container)
- **Frontend Unit:** `cd frontend && npm run test:unit`
- **E2E Tests:** `cd frontend && npx cypress run`

## Architecture

- **Database:** Adapter pattern (`sqlite.js` / `postgres.js`) with hardened lazy initialization for perfect environmental isolation.
- **Security:** CSRF protection with token-per-session binding, secure cookie handling, and input validation.
- **State Management:** Reactive Pinia stores for Auth and Global state.
- **CI/CD Readiness:** Dedicated Vitest configurations (`vitest.sqlite.js`, `vitest.postgres.js`) ensure local/CI parity.

## License

MIT
