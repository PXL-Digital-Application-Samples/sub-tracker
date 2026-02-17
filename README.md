# Subscription Tracker

A robust web application to help you track your subscriptions, supporting both SQLite and PostgreSQL with a fully automated, cross-platform testing suite.

## Features

- **User Authentication:** Secure session-based authentication with **session fixation protection** and POST-login CSRF token regeneration.
- **Subscription Management:** Full CRUD operations with soft-cancellation, history tracking, and **paginated views**.
- **Dashboard:** Real-time analytics for monthly and yearly spending.
- **Multi-DB Support:** Seamlessly switch between SQLite and PostgreSQL with normalized adapter interfaces.
- **Automated Quality Pipeline:** Mandatory linting and dedicated test setups for each database engine.
- **Responsive & Accessible Design:** Automatic Dark Mode, mobile-first UI, and **ARIA-compliant accessible modals**.
- **Euro-first Localization:** Currency defaults to **€ (EUR)** with localized formatting.

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

- **Email:** `user@test.com` (Configurable via `INITIAL_USER_EMAIL`)
- **Password:** `password123` (Configurable via `INITIAL_USER_PASSWORD`)

*Note: In production, it is highly recommended to set these via environment variables or change the password immediately after first login.*

## Development & Testing

This project uses **NPM Workspaces** for task orchestration.

### Full Automated Suite
Run the primary test suite (Linting + SQLite Tests + Postgres Tests + Frontend Unit) with one command from the root:
```bash
npm test
```
*This handles Docker lifecycles and service orchestration automatically. E2E tests are excluded from this suite for speed and should be run manually.*

### Manual Commands
- **Root Lint:** `npm run lint`
- **Backend SQLite Tests:** `npm run test:backend:sqlite` (Isolated via temporary databases with automatic cleanup)
- **Backend Postgres Tests:** `npm run test:backend:postgres`
- **Frontend Unit:** `npm run test:frontend` (Non-interactive)
- **E2E Tests:** `npm run test:e2e` (Manual Cypress suite)

## Continuous Integration & Packages

Each successful run of the **CI Pipeline** publishes Docker images to the **GitHub Container Registry (GHCR)**. These images are tagged with `:latest` and the specific `:git-sha`.

### How to use CI Packages:
1. Authenticate with GHCR (if the repository is private):
   ```bash
   echo $GITHUB_TOKEN | docker login ghcr.io -u YOUR_USERNAME --password-stdin
   ```
2. Pull the latest images:
   ```bash
   docker pull ghcr.io/pxl-digital-application-samples/sub-tracker/backend:latest
   docker pull ghcr.io/pxl-digital-application-samples/sub-tracker/frontend:latest
   ```
3. Run them using Docker Compose:
   Update your `compose.yaml` to point to these images instead of building locally, or run them manually:
   ```bash
   docker run -p 3000:3000 ghcr.io/pxl-digital-application-samples/sub-tracker/backend:latest
   ```

## Architecture

- **Orchestration:** Platform-independent Node.js scripts for complex testing lifecycles.
- **Database:** Adapter pattern (`sqlite.js` / `postgres.js`) with normalized return shapes and hardened lazy initialization for perfect environmental isolation.
- **Security:** 
    - CSRF protection with token-per-session binding.
    - Session ID regeneration on authentication.
    - Centralized configuration with mandatory production secrets.
    - Strict input length limits and type validation.
- **State Management:** Reactive Pinia stores for Auth and Global state.
- **Health Monitoring:** DB-aware health checks for robust Docker orchestration.
- **CI/CD Readiness:** Standardized ESLint configs and Vitest setups ensure local/CI parity. Optimized Docker builds with strict `.dockerignore` patterns.

## License

MIT
