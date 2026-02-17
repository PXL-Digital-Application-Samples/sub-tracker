# Subscription Tracker

A web application for tracking your subscriptions and monitoring spending. Built with a Vue 3 frontend, Express backend, and support for SQLite or PostgreSQL.

## Getting Started

### Prerequisites

- [Docker](https://www.docker.com/) and [Docker Compose](https://docs.docker.com/compose/)
- [Node.js 22+](https://nodejs.org/) (only needed for local development without Docker)

### 1. Set Up Environment Variables

```bash
cp .env.example .env
```

Open `.env` and set at minimum:
- `SESSION_SECRET` - any random string used to sign sessions
- `POSTGRES_PASSWORD` - only needed if using PostgreSQL

### 2. Start the Application

**With SQLite (default, simplest):**

```bash
docker compose up --build
```

**With PostgreSQL:**

```bash
docker compose -f compose.postgres.yaml up --build
```

The app will be available at **http://localhost:8080**.

### 3. Log In

A default user is created on first startup:

| Field    | Default Value  | Environment Variable       |
| -------- | -------------- | -------------------------- |
| Email    | user@test.com  | `INITIAL_USER_EMAIL`       |
| Password | password123    | `INITIAL_USER_PASSWORD`    |

Change these in `.env` or update the password after logging in.

## Features

- **Subscription management** - create, edit, cancel, and view history
- **Dashboard** - monthly and yearly spending overview
- **Authentication** - session-based login with CSRF protection
- **Dark mode** - automatic, based on system preference
- **Currency** - defaults to € (EUR)

## Choosing a Database

The `DB_TYPE` environment variable controls which database is used. There are two options:

| Database   | `DB_TYPE` value | Docker Compose file         | Best for                |
| ---------- | --------------- | --------------------------- | ----------------------- |
| SQLite     | `sqlite`        | `compose.yaml` (default)    | Development, single user |
| PostgreSQL | `postgres`      | `compose.postgres.yaml`     | Production, multi-user   |

### Running without Docker

If you prefer to run the app directly on your machine:

1. Install dependencies from the repository root:
   ```bash
   npm run install:all
   ```

2. Configure your `.env` file (in the repository root):
   ```env
   # SQLite (no extra config needed)
   DB_TYPE=sqlite

   # OR PostgreSQL (requires a running PostgreSQL server)
   DB_TYPE=postgres
   POSTGRES_HOST=localhost
   POSTGRES_USER=sub_user
   POSTGRES_PASSWORD=your_password
   POSTGRES_DB=sub_tracker
   ```

3. Start the backend and frontend separately:
   ```bash
   # Terminal 1 — backend (http://localhost:3000)
   npm run dev --workspace=backend

   # Terminal 2 — frontend (http://localhost:5173)
   npm run dev --workspace=frontend
   ```

## Development & Testing

The project uses [NPM Workspaces](https://docs.npmjs.com/cli/using-npm/workspaces) - run all commands from the repository root.

### Run All Tests

```bash
npm test
```

This runs linting, backend tests (SQLite + PostgreSQL), and frontend unit tests. Docker containers for PostgreSQL are managed automatically.

### Individual Commands

| Command                       | What it does                          |
| ----------------------------- | ------------------------------------- |
| `npm run lint`                | Lint frontend and backend             |
| `npm run test:backend:sqlite` | Backend unit tests against SQLite     |
| `npm run test:backend:postgres` | Backend unit tests against PostgreSQL |
| `npm run test:frontend`       | Frontend unit tests (Vitest)          |
| `npm run test:e2e`            | End-to-end tests (Cypress)            |

> E2E tests are not included in `npm test` and must be run separately.

## Project Structure

```
sub-tracker/
├── frontend/          Vue 3 + Vite + Pinia
├── backend/           Express + SQLite/PostgreSQL
├── scripts/           Test orchestration helpers
├── compose.yaml       Docker Compose (SQLite)
└── compose.postgres.yaml  Docker Compose (PostgreSQL)
```

## Deploying with Pre-built Images

The CI pipeline publishes Docker images to the [GitHub Container Registry (GHCR)](https://ghcr.io) on each successful build. You can use these instead of building locally.

### Quick setup

Create a `compose.yaml` on your server:

```yaml
services:
  frontend:
    image: ghcr.io/pxl-digital-application-samples/sub-tracker/frontend:latest
    ports:
      - "8080:80"
    depends_on:
      backend:
        condition: service_healthy
    restart: unless-stopped

  backend:
    image: ghcr.io/pxl-digital-application-samples/sub-tracker/backend:latest
    ports:
      - "3000:3000"
    environment:
      DB_TYPE: postgres
      SESSION_SECRET: ${SESSION_SECRET}
      POSTGRES_HOST: postgres
      POSTGRES_USER: ${POSTGRES_USER:-sub_user}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB:-sub_tracker}
      NODE_ENV: production
    depends_on:
      postgres:
        condition: service_healthy
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:3000/api/health"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 10s

  postgres:
    image: postgres:17-alpine
    environment:
      POSTGRES_USER: ${POSTGRES_USER:-sub_user}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB:-sub_tracker}
    volumes:
      - pg-data:/var/lib/postgresql/data
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER:-sub_user} -d ${POSTGRES_DB:-sub_tracker}"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 10s

volumes:
  pg-data:
```

Then create a `.env` file next to it:

```env
SESSION_SECRET=change-me-to-a-long-random-string
POSTGRES_PASSWORD=change-me
```

And start everything:

```bash
docker compose up -d
```

### Backend environment variables

| Variable               | Required | Default          | Description                          |
| ---------------------- | -------- | ---------------- | ------------------------------------ |
| `SESSION_SECRET`       | Yes      | —                | Secret for signing session cookies   |
| `DB_TYPE`              | No       | `sqlite`         | `sqlite` or `postgres`              |
| `POSTGRES_HOST`        | If PG    | —                | PostgreSQL hostname                  |
| `POSTGRES_USER`        | If PG    | —                | PostgreSQL username                  |
| `POSTGRES_PASSWORD`    | If PG    | —                | PostgreSQL password                  |
| `POSTGRES_DB`          | If PG    | —                | PostgreSQL database name             |
| `PORT`                 | No       | `3000`           | Port the backend listens on          |
| `CORS_ORIGINS`         | No       | `http://localhost:8080` | Comma-separated allowed origins |
| `NODE_ENV`             | No       | —                | Set to `production` for deployments  |
| `INITIAL_USER_EMAIL`   | No       | `user@test.com`  | Email for the default user           |
| `INITIAL_USER_PASSWORD`| No       | `password123`    | Password for the default user        |

### Networking note

The frontend container's nginx config proxies all `/api` requests to `http://backend:3000`. This means the backend service **must** be named `backend` in your Docker Compose file (or you must provide a custom nginx config).

### Deploying to the cloud

Cloud platforms run each container as a separate service. The main steps are: provision a database, deploy the backend, deploy the frontend with a custom nginx config pointing at the backend.

#### 1. Set up a managed PostgreSQL database

SQLite stores data on disk, which is lost when cloud containers restart. Use a managed database instead:

- **AWS:** [Amazon RDS for PostgreSQL](https://aws.amazon.com/rds/postgresql/)
- **Azure:** [Azure Database for PostgreSQL](https://azure.microsoft.com/en-us/products/postgresql)

Note the hostname, username, password, and database name — you'll need them in the next step.

#### 2. Deploy the backend

| Platform | Service | How to deploy |
| -------- | ------- | ------------- |
| **AWS**  | [App Runner](https://aws.amazon.com/apprunner/) or [ECS on Fargate](https://aws.amazon.com/fargate/) | Point at the GHCR image, set environment variables, expose port 3000 |
| **Azure** | [Azure Container Apps](https://azure.microsoft.com/en-us/products/container-apps) | Point at the GHCR image, set environment variables, expose port 3000 |

Set these environment variables on the backend service:

```env
DB_TYPE=postgres
SESSION_SECRET=<random-string>
POSTGRES_HOST=<your-managed-db-host>
POSTGRES_USER=<db-user>
POSTGRES_PASSWORD=<db-password>
POSTGRES_DB=<db-name>
CORS_ORIGINS=https://your-frontend-url.example.com
NODE_ENV=production
```

Note the URL your platform assigns to the backend (e.g. `https://backend-abc123.azurecontainerapps.io`).

#### 3. Deploy the frontend

The frontend image serves static files via nginx. By default, its nginx config proxies `/api` to `http://backend:3000`, which only works in Docker Compose. For cloud deployments, replace the nginx config to point at your backend's public URL.

Create a custom `nginx.conf`:

```nginx
server {
    listen 80;

    location / {
        root   /usr/share/nginx/html;
        index  index.html;
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass https://your-backend-url.example.com;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Build a custom frontend image and push it to your registry:

```dockerfile
FROM ghcr.io/pxl-digital-application-samples/sub-tracker/frontend:latest
COPY nginx.conf /etc/nginx/conf.d/default.conf
```

Then deploy this image to the same platform (App Runner / ECS / Azure Container Apps), exposing port 80.

#### Alternative: host the frontend on a CDN

Since the frontend is just static files, you can skip the frontend container and host the built files on **AWS CloudFront + S3** or **Azure Static Web Apps**. Configure rewrite rules to forward `/api/*` requests to your backend URL.

## License

MIT
