# Gemini Code Assistant Context

This document provides context for the Gemini Code Assistant to understand and assist with the development of the **Subscription Tracker** project.

## Project Overview

The project is a web application designed to help users track their subscriptions. It consists of a Vue.js frontend and a Node.js (Express.js) backend. A key requirement is to support both SQLite and PostgreSQL databases, with the ability to switch between them using an environment variable (`DB_TYPE`).

The application will feature:
- User authentication (single-user system)
- User profile management
- Subscription management (CRUD operations)
- A dashboard to display subscription analytics
- Separation of active and inactive (expired) subscriptions

The entire application will be containerized using Docker and orchestrated with `compose.yaml`.

## Project Structure

The project is structured as a monorepo:

```
/
├── frontend/         # Vue 3 application
│   ├── Dockerfile
│   └── package.json
├── backend/          # Node.js + Express API
│   ├── Dockerfile
│   ├── package.json
│   └── .env.example  # Example environment variables
├── compose.yaml      # Docker Compose configuration (SQLite)
├── compose.postgres.yaml # Docker Compose configuration (Postgres)
├── README.md
└── REQUIREMENTS.md
```

## Building and Running

The application is designed to be run with Docker Compose.

### Environment Variables

The backend requires an `.env` file (copied from `backend/.env.example`). Key variables include:

- `DB_TYPE`: `sqlite` or `postgres`
- `SESSION_SECRET`: A secret string for session management
- `POSTGRES_*`: Connection details for PostgreSQL

### Running the Application

1.  **SQLite variant (default):**
    ```bash
    docker compose up --build
    ```
    The frontend will be available at `http://localhost:8080`.

2.  **PostgreSQL variant:**
    The command to run with Postgres is:
    ```bash
    docker compose -f compose.postgres.yaml up --build
    ```

### Local Development

-   **Backend:**
    ```bash
    cd backend
    npm install
    npm start # Or a dev script like `npm run dev`
    ```
-   **Frontend:**
    ```bash
    cd frontend
    npm install
    npm run dev
    ```

## Development Conventions

-   **Database:** The database logic is abstracted to support both SQLite and PostgreSQL. A factory pattern in `/backend/src/db/index.js` will provide the correct database adapter based on `DB_TYPE`.
-   **Authentication:** Session-based authentication is used, with sessions stored in the database to persist across restarts. Passwords must be hashed with `bcrypt`.
-   **API:** The backend provides a RESTful API for the frontend. All endpoints under `/api` are prefixed.
-   **Validation:** The backend is responsible for input validation (required fields, data types, password length).
-   **Seeding:** The database will be automatically seeded with a default user and sample subscriptions on first startup.

## API Endpoints

The backend will expose the following REST endpoints:

-   **Auth:**
    -   `POST /api/login`
    -   `POST /api/logout`
-   **User:**
    -   `GET /api/user`
    -   `PUT /api/user`
    -   `PUT /api/user/password`
-   **Subscriptions:**
    -   `GET /api/subscriptions/active`
    -   `GET /api/subscriptions/history`
    -   `POST /api/subscriptions`
    -   `PUT /api/subscriptions/:id`
    -   `DELETE /api/subscriptions/:id`
-   **Health Check:**
    -   `GET /api/health`
