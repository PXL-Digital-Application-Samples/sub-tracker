Understood. I will keep this simple, explicit, and strict. No unnecessary complexity.

Below is the complete `REQUIREMENTS.md` content.

---

# Subscription Tracker Deployment Assignment

## Overview

Students must develop and containerize a Subscription Tracker web application consisting of:

* A Vue frontend (separate container)
* A Node.js backend (separate container)
* A database container (SQLite or PostgreSQL depending on configuration)

The application must support two deployment variants:

1. SQLite version

   * 2 containers total:

     * frontend
     * backend
   * SQLite used as file-based storage inside backend container
   * Data must survive container restarts (volume required)

2. PostgreSQL version

   * 3 containers total:

     * frontend
     * backend
     * postgres
   * Database connection selected via environment variable
   * Data must survive container restarts (volume required)

Database type must be switchable using an environment variable without changing application code.

---

## Technology Stack

Backend:

* Node.js (LTS version)
* Express.js (required)
* bcrypt for password hashing
* Simple logging via console.log

Frontend:

* Vue 3 (required)
* Must be served via its own container (e.g., nginx or node-based static server)

Database:

* SQLite (file-based)
* PostgreSQL (official postgres image)

Containerization:

* Dockerfiles required
* Must use `compose.yaml` (NOT docker-compose.yaml)
* Must support both variants via environment configuration

No ORM required. Direct SQL queries are acceptable. Simplicity is preferred.

---

## Application Features

### Authentication

Single user system.

Required behavior:

* Login with email + password
* Password must be hashed using bcrypt
* Session must persist across container restarts
* No registration endpoint required
* User created through seed data

---

### User Profile Management

User must be able to:

* View profile
* Edit:

  * First name
  * Last name
  * Zipcode
  * Email address
* Change password

Security requirements:

* Password hashing required
* No advanced security mechanisms required
* Basic input validation required

---

### Dashboard

After login, user lands on Dashboard page.

Dashboard must show:

* Total active subscriptions
* Total monthly cost (calculated from monthly subscriptions)
* Total yearly cost (calculated from yearly subscriptions)
* Active subscriptions list

---

### Subscription Management

User must be able to:

Create subscription with fields:

* Company Name (string, required)
* Description (string)
* Price (decimal number, required)
* Subscription Type:

  * monthly
  * yearly
  * lifetime
* Start Date (date, required)

Edit subscription:

* All fields editable

Delete subscription:

* Hard delete is acceptable

---

### Subscription Logic

A subscription is considered:

Active:

* monthly: current date <= start date + 1 month
* yearly: current date <= start date + 1 year
* lifetime: always active

Inactive:

* If expired (monthly/yearly)
* Must be shown on separate "History" page

---

### Pages Required

* Login page
* Dashboard page
* Subscriptions page (active)
* Subscription history page (inactive)
* Edit subscription page
* User profile page
* Change password page

Frontend must communicate with backend via REST API.

---

## Database Requirements

Must support two modes:

Environment variable:

```
DB_TYPE=sqlite
```

or

```
DB_TYPE=postgres
```

When:

* DB_TYPE=sqlite → use SQLite file storage
* DB_TYPE=postgres → use PostgreSQL connection

No code modification allowed between variants.

---

### Persistence

SQLite:

* Database file stored in mounted volume

PostgreSQL:

* Data directory stored in mounted volume

Data must survive container restart.

---

## Seed Data

Application must automatically seed database on first startup:

* 1 default user:

  * Email: [user@test.com](mailto:user@test.com)
  * Password: password123 (hashed)
  * First name: Test
  * Last name: User
  * Zipcode: 1000

* At least 5 example subscriptions:

  * Netflix (monthly)
  * Spotify (monthly)
  * Gym membership (yearly)
  * Phone subscription (monthly)
  * ChatGPT Plus (monthly)

Seeding must work for both SQLite and PostgreSQL.

---

## API Requirements

Must implement REST endpoints for:

Authentication:

* POST /api/login
* POST /api/logout

User:

* GET /api/user
* PUT /api/user
* PUT /api/user/password

Subscriptions:

* GET /api/subscriptions/active
* GET /api/subscriptions/history
* POST /api/subscriptions
* PUT /api/subscriptions/:id
* DELETE /api/subscriptions/:id

JSON only.

---

## Container Requirements

Required containers:

Frontend container:

* Vue production build
* Served via nginx or node

Backend container:

* Node + Express
* Exposes API port

PostgreSQL container:

* Official postgres image
* Only used in postgres variant

compose.yaml must:

* Define services
* Define volumes
* Define environment variables
* Define network
* Allow switching DB variant via environment

No manual steps after `compose up`.

---

## Logging

Backend must log:

* Server startup
* Database connection status
* Login attempts (success/failure)
* Subscription creation/deletion

Simple console logging is sufficient.

---

## Basic Validation Requirements

Backend must validate:

* Required fields
* Price must be numeric
* Email format basic validation
* Password minimum length 6

Frontend may implement basic form validation.

---

## Project Structure

Example structure:

```
/frontend
  Dockerfile
  package.json
/backend
  Dockerfile
  package.json
compose.yaml
README.md
REQUIREMENTS.md
```

---

## Acceptance Criteria

The project is considered complete when:

* Both variants run using compose
* Data survives restart
* Login works
* Password is hashed
* Subscriptions can be created, edited, deleted
* Active and inactive subscriptions separated correctly
* Seed data present on first startup
* Switching DB via ENV works without code change

---

If you want, I can now:

* Tighten this further into a grading rubric
* Or reduce it even more for weaker students
* Or increase strictness (architecture constraints, patterns, etc.)
