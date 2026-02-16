# Subscription Tracker

A web application to help you track your subscriptions, supporting both SQLite and PostgreSQL.

## Features

- User authentication (Session-based)
- Subscription management (CRUD)
- Dashboard with analytics (Monthly/Yearly costs)
- Separation of active and historical subscriptions
- Support for multiple database backends (SQLite, PostgreSQL)

## Getting Started

### Prerequisites

- [Docker](https://www.docker.com/)
- [Docker Compose](https://docs.docker.com/compose/)

### Running with SQLite (Default)

The simplest way to run the application is using the default SQLite database.

```bash
docker compose up --build
```

The frontend will be available at `http://localhost:8080`.

### Running with PostgreSQL

To use PostgreSQL, use the specific compose file:

```bash
docker compose -f compose.postgres.yaml up --build
```

The frontend will be available at `http://localhost:8080`.

### Default Credentials

- **Email:** `user@test.com`
- **Password:** `password123`

## API Endpoints

- **Auth:**
  - `POST /api/login`
  - `POST /api/logout`
- **User:**
  - `GET /api/user`
  - `PUT /api/user`
  - `PUT /api/user/password`
- **Subscriptions:**
  - `GET /api/subscriptions/active`
  - `GET /api/subscriptions/history`
  - `POST /api/subscriptions`
  - `PUT /api/subscriptions/:id`
  - `DELETE /api/subscriptions/:id`
- **Health:**
  - `GET /api/health`
