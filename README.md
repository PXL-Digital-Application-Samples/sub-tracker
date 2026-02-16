# Subscription Tracker

A robust web application to help you track your subscriptions, supporting both SQLite and PostgreSQL with a fully automated, cross-platform testing suite.

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
- [Node.js 22+](https://nodejs.org/)

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

This project uses **NPM Workspaces** for task orchestration.

### Full Automated Suite
Run the comprehensive test suite (Linting + SQLite Tests + Postgres Tests + Frontend Unit + E2E) with one command from the root:
```bash
npm test
```
*This handles Docker lifecycles and service orchestration automatically.*

### Manual Commands
- **Root Lint:** `npm run lint`
- **Backend SQLite Tests:** `npm run test:backend:sqlite`
- **Backend Postgres Tests:** `npm run test:backend:postgres`
- **Frontend Unit:** `npm run test:frontend`
- **E2E Tests:** `npm run test:e2e`

## Architecture

- **Orchestration:** Platform-independent Node.js scripts for complex testing lifecycles.
- **Database:** Adapter pattern (`sqlite.js` / `postgres.js`) with hardened lazy initialization for perfect environmental isolation.
- **Security:** CSRF protection with token-per-session binding, secure cookie handling, and input validation.
- **State Management:** Reactive Pinia stores for Auth and Global state.
- **CI/CD Readiness:** Standardized ESLint configs and Vitest setups ensure local/CI parity.

## License

MIT
