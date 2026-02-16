# Subscription Tracker

A robust web application to help you track your subscriptions, supporting both SQLite and PostgreSQL with a fully automated testing suite.

## Features

- **User Authentication:** Secure session-based authentication with rate limiting.
- **Subscription Management:** Full CRUD operations with soft-cancellation.
- **Dashboard:** Real-time analytics for monthly and yearly spending.
- **Multi-DB Support:** Seamlessly switch between SQLite and PostgreSQL.
- **Automated Quality Pipeline:** Mandatory linting and dual-database integration tests.
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

### Default Credentials

- **Email:** `user@test.com`
- **Password:** `password123`

## Development & Testing

### Full Automated Suite
Run the comprehensive test suite (Linting + SQLite + Postgres + Frontend Unit + E2E) with one command:
```bash
./test_all.sh
```
*This script automatically manages PostgreSQL Docker containers.*

### Manual Testing & Linting
- **Backend Lint:** `cd backend && npm run lint`
- **Backend Tests:** `cd backend && npm run test:sqlite` or `npm run test:postgres`
- **Frontend Lint:** `cd frontend && npm run lint`
- **Frontend Unit:** `cd frontend && npm run test:unit`
- **E2E Tests:** `cd frontend && npx cypress run`

## Architecture

- **Database:** Adapter pattern (`sqlite.js` / `postgres.js`) with lazy initialization.
- **Security:** Built-in CSRF protection, secure cookie handling, and input validation.
- **State Management:** reactive Pinia stores for Auth and Global state.
- **CI/CD Readiness:** Standardized ESLint configs for both layers to ensure local/CI parity.

## License

MIT
