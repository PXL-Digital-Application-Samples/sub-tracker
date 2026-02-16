# Implementation Plan — Subscription Tracker

This document breaks the project into ordered phases. Each phase produces a working, testable increment.

---

## Phase 1: Project Scaffolding

**Goal:** Set up the monorepo structure, initialize both apps, and verify they run locally.

### Tasks

1. Create top-level directory structure:
   ```
   /frontend          — Vue 3 app
   /backend           — Node.js + Express API
   compose.yaml       — Docker Compose orchestration
   ```
2. **Backend init**
   - `npm init` inside `/backend`
   - Install dependencies: `express`, `cors`, `bcrypt`, `better-sqlite3`, `pg`, `dotenv`, `express-session`, `connect-pg-simple`, `better-sqlite3-session-store`
   - Create entry point `src/index.js`
   - Add a health-check route `GET /api/health` → `{ status: "ok" }`
   - Confirm the server starts on port `3000`
3. **Frontend init**
   - `npm create vue@latest` inside `/frontend` (Vue 3 + Vue Router)
   - Verify dev server starts and renders the default page
4. **Environment files**
   - Create `/backend/.env.example` with:
     ```
     DB_TYPE=sqlite
     SESSION_SECRET=supersecret
     PORT=3000
     POSTGRES_HOST=postgres
     POSTGRES_PORT=5432
     POSTGRES_USER=sub_user
     POSTGRES_PASSWORD=sub_pass
     POSTGRES_DB=sub_tracker
     ```
   - Add `.env` to `.gitignore`

### Done when

- `node backend/src/index.js` returns `{ status: "ok" }` on `/api/health`
- `npm run dev` in `/frontend` shows the Vue welcome page

---

## Phase 2: Database Layer

**Goal:** Implement a database abstraction that transparently supports SQLite and PostgreSQL, driven by `DB_TYPE`.

### Tasks

1. Create `/backend/src/db/index.js` — factory that reads `DB_TYPE` and returns the correct adapter.
2. **SQLite adapter** (`/backend/src/db/sqlite.js`)
   - Opens (or creates) `data/sub_tracker.db`
   - Exposes `query(sql, params)` and `run(sql, params)` helpers
3. **PostgreSQL adapter** (`/backend/src/db/postgres.js`)
   - Connects using `pg.Pool` with env vars
   - Exposes the same `query` / `run` interface
4. **Schema migration** (`/backend/src/db/schema.js`)
   - `users` table: `id`, `email`, `password`, `first_name`, `last_name`, `zipcode`
   - `subscriptions` table: `id`, `user_id`, `company_name`, `description`, `price`, `subscription_type` (monthly / yearly / lifetime), `start_date`, `created_at`
   - Run on startup (idempotent — use `IF NOT EXISTS`)
5. **Seed data** (`/backend/src/db/seed.js`)
   - Insert default user only if no users exist:
     - Email: `user@test.com` / Password: `password123` (bcrypt-hashed)
     - First name: Test, Last name: User, Zipcode: 1000
   - Insert 5 example subscriptions only if table is empty:
     - Netflix (monthly), Spotify (monthly), Gym membership (yearly), Phone subscription (monthly), ChatGPT Plus (monthly)
6. Wire up in `index.js`: init DB → run schema → seed → start server.

### Done when

- Server starts with `DB_TYPE=sqlite`, creates the file, seeds data, logs success.
- Server starts with `DB_TYPE=postgres` (local Postgres), seeds data, logs success.
- Switching `DB_TYPE` requires zero code changes.

---

## Phase 3: Authentication API

**Goal:** Implement session-based authentication endpoints.

### Tasks

1. Configure `express-session` middleware:
   - SQLite → use `better-sqlite3-session-store`
   - PostgreSQL → use `connect-pg-simple`
   - Session cookie must be `httpOnly`, `sameSite: 'lax'`
2. Create `/backend/src/routes/auth.js`:
   - `POST /api/login` — validate email + password (bcrypt compare), create session
   - `POST /api/logout` — destroy session
3. Create auth middleware (`/backend/src/middleware/auth.js`):
   - Check `req.session.userId`; return `401` if missing
4. Add logging:
   - Login success → `console.log("Login success: <email>")`
   - Login failure → `console.log("Login failed: <email>")`

### Done when

- Can log in via `curl` / Postman with seed credentials
- Protected routes return `401` without session
- Session survives server restart (stored in DB)

---

## Phase 4: User & Subscription API

**Goal:** Implement all remaining REST endpoints behind auth middleware.

### Tasks

1. **User routes** (`/backend/src/routes/user.js`):
   - `GET /api/user` — return logged-in user profile (no password)
   - `PUT /api/user` — update first_name, last_name, zipcode, email
   - `PUT /api/user/password` — verify old password, hash new password, update
2. **Subscription routes** (`/backend/src/routes/subscriptions.js`):
   - `GET /api/subscriptions/active` — return subscriptions where the user's subs are still active based on subscription logic:
     - monthly: `start_date + 1 month >= now`
     - yearly: `start_date + 1 year >= now`
     - lifetime: always active
   - `GET /api/subscriptions/history` — return inactive (expired) subscriptions
   - `POST /api/subscriptions` — create new subscription
   - `PUT /api/subscriptions/:id` — update subscription (must belong to user)
   - `DELETE /api/subscriptions/:id` — hard delete (must belong to user)
3. **Dashboard data** — include aggregates in the active endpoint response or create a dedicated `GET /api/dashboard`:
   - Total active subscriptions (count)
   - Total monthly cost (sum of active monthly subs)
   - Total yearly cost (sum of active yearly subs)
4. **Validation** (`/backend/src/middleware/validate.js`):
   - Required field checks
   - Price must be numeric & > 0
   - Email basic regex check
   - Password minimum 6 characters
5. Add logging for subscription create / delete.

### Done when

- All endpoints testable via `curl` / Postman
- Validation rejects bad input with `400` and clear messages
- Active / history separation is correct

---

## Phase 5: Frontend — Routing & Auth

**Goal:** Build the Vue app shell with routing and login functionality.

### Tasks

1. Set up Vue Router with the following routes:
   | Path | Component | Auth required |
   |---|---|---|
   | `/login` | LoginPage | No |
   | `/` | DashboardPage | Yes |
   | `/subscriptions` | SubscriptionsPage | Yes |
   | `/subscriptions/history` | HistoryPage | Yes |
   | `/subscriptions/:id/edit` | EditSubscriptionPage | Yes |
   | `/profile` | ProfilePage | Yes |
   | `/profile/password` | ChangePasswordPage | Yes |
2. Create a simple API service (`/frontend/src/services/api.js`) using `fetch` with `credentials: 'include'`.
3. Implement `LoginPage.vue`:
   - Email + password form
   - Call `POST /api/login`
   - Redirect to `/` on success
4. Add a navigation guard that redirects unauthenticated users to `/login`.
5. Add a basic layout component with navigation links and a logout button.

### Done when

- User can log in and is redirected to the dashboard
- Unauthenticated access redirects to login
- Logout works and redirects to login

---

## Phase 6: Frontend — Dashboard & Subscriptions

**Goal:** Implement all remaining pages.

### Tasks

1. **DashboardPage.vue**
   - Fetch and display: total active subs, total monthly cost, total yearly cost
   - List active subscriptions (company name, price, type, start date)
2. **SubscriptionsPage.vue**
   - List active subscriptions
   - "Add" button → inline form or modal
   - Each row has Edit / Delete actions
3. **EditSubscriptionPage.vue**
   - Pre-filled form for the subscription
   - Save → `PUT /api/subscriptions/:id`
4. **HistoryPage.vue**
   - List inactive (expired) subscriptions
5. **ProfilePage.vue**
   - Display and edit: first name, last name, zipcode, email
   - Save → `PUT /api/user`
6. **ChangePasswordPage.vue**
   - Old password + new password + confirm
   - Save → `PUT /api/user/password`
7. Add basic client-side form validation (required fields, email format, password length).

### Done when

- All 7 pages render and function correctly
- CRUD operations on subscriptions work end-to-end
- Profile and password changes persist

---

## Phase 7: Containerization

**Goal:** Dockerize both apps and orchestrate with `compose.yaml`.

### Tasks

1. **Backend Dockerfile** (`/backend/Dockerfile`):
   - Base: `node:22-alpine`
   - Copy `package*.json`, `npm ci --production`, copy source
   - Expose port `3000`
   - `CMD ["node", "src/index.js"]`
2. **Frontend Dockerfile** (`/frontend/Dockerfile`):
   - Stage 1 (build): `node:22-alpine`, `npm ci`, `npm run build`
   - Stage 2 (serve): `nginx:alpine`, copy built files to `/usr/share/nginx/html`
   - Add `nginx.conf` that proxies `/api` requests to the backend service
3. **compose.yaml** — SQLite variant:
   ```yaml
   services:
     frontend:
       build: ./frontend
       ports: ["8080:80"]
       depends_on: [backend]
     backend:
       build: ./backend
       environment:
         DB_TYPE: sqlite
         SESSION_SECRET: supersecret
       volumes:
         - backend-data:/app/data
   volumes:
     backend-data:
   ```
4. **compose.yaml** — PostgreSQL variant (override or env-driven):
   ```yaml
   services:
     frontend: ...
     backend:
       environment:
         DB_TYPE: postgres
         POSTGRES_HOST: postgres
         POSTGRES_PORT: 5432
         POSTGRES_USER: sub_user
         POSTGRES_PASSWORD: sub_pass
         POSTGRES_DB: sub_tracker
       depends_on: [postgres]
     postgres:
       image: postgres:17-alpine
       environment:
         POSTGRES_USER: sub_user
         POSTGRES_PASSWORD: sub_pass
         POSTGRES_DB: sub_tracker
       volumes:
         - pg-data:/var/lib/postgresql/data
   volumes:
     backend-data:
     pg-data:
   ```
5. Implement variant switching: use an `.env` file or environment variable to control which profile/services are active (e.g., `docker compose --profile postgres up`).

### Done when

- `docker compose up` (SQLite) → app accessible at `http://localhost:8080`
- `docker compose --profile postgres up` → app accessible, data in Postgres
- Data survives `docker compose down && docker compose up` (volumes persist)
- No manual steps after `compose up`

---

## Phase 8: Testing & Polish

**Goal:** Verify all acceptance criteria, fix edge cases, and clean up.

### Tasks

1. **Acceptance checklist** — manually verify each item:
   - [ ] SQLite variant runs with `compose up`
   - [ ] PostgreSQL variant runs with `compose up`
   - [ ] Data survives container restart
   - [ ] Login works with seed credentials
   - [ ] Password is bcrypt-hashed in DB
   - [ ] Subscriptions: create, edit, delete all work
   - [ ] Active vs. inactive separation is correct
   - [ ] Seed data present on first startup
   - [ ] Switching `DB_TYPE` works without code changes
2. **Edge cases**:
   - Expired subscription appears in history, not active list
   - Lifetime subscription never expires
   - Deleting the only subscription leaves an empty list (no crash)
   - Changing email doesn't break login
3. **Logging review**: confirm all required log statements are present.
4. **README.md** — update with:
   - Project description
   - How to run (both variants)
   - Default credentials
   - API endpoint reference

### Done when

- All acceptance criteria checkboxes are ticked
- README gives a new user everything they need to run the app

---

## Summary of Phases

| # | Phase | Key Deliverable |
|---|---|---|
| 1 | Project Scaffolding | Running backend + frontend locally |
| 2 | Database Layer | Dual-DB support (SQLite + Postgres), schema, seed |
| 3 | Authentication API | Login / logout / session middleware |
| 4 | User & Subscription API | All REST endpoints with validation |
| 5 | Frontend — Auth | Vue app shell, login page, route guards |
| 6 | Frontend — Pages | All 7 pages functional |
| 7 | Containerization | Dockerfiles + compose.yaml, both variants |
| 8 | Testing & Polish | Acceptance criteria verified, README complete |
