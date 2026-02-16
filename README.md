# Subscription Tracker

A robust web application to help you track your subscriptions, supporting both SQLite and PostgreSQL.

## Features

- **User Authentication:** Secure session-based authentication with rate limiting on login.
- **Subscription Management:** Full CRUD operations plus soft-cancellation/archiving.
- **Dashboard:** At-a-glance analytics for your monthly and yearly subscription costs.
- **History:** Separate tracking for active and cancelled subscriptions.
- **Responsive Design:** Fully usable on mobile and desktop with automatic Dark Mode support.
- **Multi-DB Support:** Seamlessly switch between SQLite and PostgreSQL.
- **Security:** Built-in CSRF protection, structured logging, and input validation.

## Getting Started

### Prerequisites

- [Docker](https://www.docker.com/) and [Docker Compose](https://docs.docker.com/compose/)

### Quick Start

1.  **Environment Setup:**
    ```bash
    cp .env.example .env
    # Open .env and set your secrets, especially SESSION_SECRET and POSTGRES_PASSWORD
    ```

2.  **Run with SQLite (Default):**
    ```bash
    docker compose up --build
    ```
    The app will be available at `http://localhost:8080`.

3.  **Run with PostgreSQL:**
    ```bash
    docker compose -f compose.postgres.yaml up --build
    ```
    The app will be available at `http://localhost:8080`.

### Default Credentials

- **Email:** `user@test.com`
- **Password:** `password123`

## Development

### Backend
The backend is a Node.js Express 5 API.
```bash
cd backend
npm install
npm run dev # Starts with nodemon
npm test    # Runs Vitest integration tests
```

### Frontend
The frontend is a Vue 3 application built with TypeScript and Vite.
```bash
cd frontend
npm install
npm run dev        # Starts Vite dev server
npm run test:unit  # Runs component tests
npm run type-check # Validates TypeScript
```

### Full Test Suite
Run all tests (Backend, Frontend Unit, and Cypress E2E) with one command:
```bash
./test_all.sh
```

## Architecture

- **Database:** Abstracted through an adapter pattern (`sqlite.js` / `postgres.js`).
- **State Management:** Pinia store for reactive authentication state.
- **API:** Centralized `api.ts` service with automatic CSRF token handling and error management.
- **CI/CD:** Automated testing and linting via GitHub Actions.

## License

MIT
