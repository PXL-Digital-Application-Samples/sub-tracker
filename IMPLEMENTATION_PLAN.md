# Implementation Plan — Subscription Tracker

**Date:** 2026-02-16
**Based on:** [CODE_REVIEW.md](CODE_REVIEW.md)
**Total estimated effort:** 25–35 developer hours across 6 phases

---

## Table of Contents

- [Phase 0 — Critical Fixes (P0)](#phase-0--critical-fixes-p0) — ~20 min
- [Phase 1 — High-Priority Fixes (P1)](#phase-1--high-priority-fixes-p1) — ~4 hrs
- [Phase 2 — Code Quality & DX (P2)](#phase-2--code-quality--dx-p2) — ~5 hrs
- [Phase 3 — Polish & Domain Model (P3)](#phase-3--polish--domain-model-p3) — ~9 hrs
- [Phase 4 — Testing (P4)](#phase-4--testing-p4) — ~12 hrs
- [Dependency Graph](#dependency-graph)

Each task includes the review item number (e.g. `CR #1`), the exact files to touch, the specific code changes required, and acceptance criteria.

---

## Phase 0 — Critical Fixes (P0)

> **Goal:** Make the app boot, render correctly, and pass basic smoke testing.
> **Time:** ~20 minutes total. All 5 tasks are independent and can be done in parallel.

---

### Task 0.1 — Remove Scaffolding CSS (CR #1)

**Review ref:** §5.1 — Scaffolding CSS Destroys the Layout

**File:** `frontend/src/assets/main.css`

**Action:** Delete the entire `@media (min-width: 1024px)` block at the bottom of the file:

```css
/* DELETE THIS ENTIRE BLOCK */
@media (min-width: 1024px) {
  body {
    display: flex;
    place-items: center;
  }

  #app {
    display: grid;
    grid-template-columns: 1fr 1fr;
    padding: 0 2rem;
  }
}
```

**Acceptance criteria:**
- On a ≥1024px screen, the app displays as a single-column layout
- The header nav spans the full width above the `<main>` content
- Tables and forms are no longer cramped into half the viewport

---

### Task 0.2 — Fix Update/Delete 404 Check (CR #2)

**Review ref:** §3.1 — Update/Delete 404 Check Never Works

**File:** `backend/src/routes/subscriptions.js`

**Action:** Fix two locations — the `PUT /subscriptions/:id` handler and the `DELETE /subscriptions/:id` handler.

**Location 1 — PUT handler (around line 107):**
```js
// BEFORE (broken — always false)
if (result.changes === 0 && result.rowCount === 0) {

// AFTER (correct — works on both SQLite and PostgreSQL)
if ((result.changes ?? result.rowCount) === 0) {
```

**Location 2 — DELETE handler (around line 123):**
```js
// BEFORE (broken — always false)
if (result.changes === 0 && result.rowCount === 0) {

// AFTER (correct — works on both SQLite and PostgreSQL)
if ((result.changes ?? result.rowCount) === 0) {
```

**Acceptance criteria:**
- `PUT /api/subscriptions/99999` returns `404` (non-existent ID)
- `DELETE /api/subscriptions/99999` returns `404`
- Valid PUT/DELETE still return `200`/`204`
- Works on both SQLite and PostgreSQL

---

### Task 0.3 — Add PostgreSQL Session Table Creation (CR #3)

**Review ref:** §3.2 — PostgreSQL Session Table Not Created

**File:** `backend/src/index.js`

**Action:** Add `createTableIfMissing: true` to the `PgSession` constructor options.

```js
// BEFORE
const sessionStore = process.env.DB_TYPE === 'postgres'
  ? new PgSession({ pool: db.pool })
  : new SqliteStore({ client: db.db });

// AFTER
const sessionStore = process.env.DB_TYPE === 'postgres'
  ? new PgSession({ pool: db.pool, createTableIfMissing: true })
  : new SqliteStore({ client: db.db });
```

**Acceptance criteria:**
- `docker compose -f compose.postgres.yaml up --build` starts without crashing
- Login works against the PostgreSQL backend
- A `session` table exists in the PostgreSQL database after first boot

---

### Task 0.4 — Fix Smoke Test Port (CR #4)

**Review ref:** §2.2 — Smoke Test Uses Wrong Port

**File:** `smoke_test.sh`

**Action:** Change port from 4567 to 3000 on line 4:

```bash
# BEFORE
API_URL="http://localhost:4567/api"

# AFTER
API_URL="http://localhost:3000/api"
```

**Acceptance criteria:**
- `bash smoke_test.sh` reaches the backend health endpoint
- With the backend running on port 3000, the full smoke test passes end-to-end

---

### Task 0.5 — Fix Port Inconsistency (CR #5)

**Review ref:** §2.1 — Port Inconsistency

**Files:** `compose.yaml`, `README.md`

**Action 1 — `compose.yaml`:** Change the frontend port mapping from 8090 to 8080:
```yaml
# BEFORE
    ports:
      - "8090:80"

# AFTER
    ports:
      - "8080:80"
```

**Action 2 — `README.md`:** Verify the documentation says `http://localhost:8080` for both variants (it already does — no change needed after fixing `compose.yaml`).

**Acceptance criteria:**
- `docker compose up --build` serves the frontend on port 8080
- `docker compose -f compose.postgres.yaml up --build` also serves on port 8080
- `README.md` instructions are correct for both variants

---

## Phase 1 — High-Priority Fixes (P1)

> **Goal:** Fix security issues, error handling, consistency, and code correctness.
> **Time:** ~4 hours. Tasks 1.1–1.3 are independent. Task 1.4 depends on 1.1.

---

### Task 1.1 — Abstract SQL Dialect Into Database Adapters (CR #6)

**Review ref:** §4.1 — Scattered `process.env.DB_TYPE` Checks, §4.2 — No Parameterized Query Abstraction

**Files to modify:**
- `backend/src/db/sqlite.js` — add named query methods
- `backend/src/db/postgres.js` — add named query methods
- `backend/src/db/index.js` — keep as-is (factory remains valid)
- `backend/src/db/schema.js` — remove DB_TYPE branching
- `backend/src/db/seed.js` — remove DB_TYPE branching
- `backend/src/routes/auth.js` — remove DB_TYPE branching
- `backend/src/routes/user.js` — remove DB_TYPE branching
- `backend/src/routes/subscriptions.js` — remove DB_TYPE branching

**Approach:**

1. Define a shared interface (via JSDoc or a comment contract) that both adapters must implement:

```js
// Each adapter must export:
module.exports = {
  // Low-level (keep for flexibility)
  query(sql, params),
  run(sql, params),
  close(),

  // Schema & seed
  createUsersTable(),
  createSubscriptionsTable(),

  // Users
  findUserByEmail(email),
  findUserById(id),
  updateUser(id, { email, first_name, last_name, zipcode }),
  getUserPassword(id),
  updatePassword(id, hashedPassword),

  // Subscriptions
  getActiveSubscriptions(userId),
  getHistorySubscriptions(userId),
  insertSubscription(userId, { company_name, description, price, subscription_type, start_date }),
  updateSubscription(id, userId, { company_name, description, price, subscription_type, start_date }),
  deleteSubscription(id, userId),

  // For session store
  pool,  // postgres only
  db,    // sqlite only
};
```

2. Implement each method in `sqlite.js` using `?` placeholders and synchronous `better-sqlite3` calls wrapped in Promises (see Task 1.6).

3. Implement each method in `postgres.js` using `$1` placeholders and async `pg` calls.

4. Refactor `schema.js` to call `db.createUsersTable()` and `db.createSubscriptionsTable()` instead of embedding SQL.

5. Refactor `seed.js` to call `db.findUserByEmail()`, `db.run(insertQuery)` etc. via adapter methods.

6. Refactor all three route files to call adapter methods. For example:

```js
// BEFORE (routes/auth.js)
const userQuery = process.env.DB_TYPE === 'postgres'
  ? 'SELECT * FROM users WHERE email = $1'
  : 'SELECT * FROM users WHERE email = ?';
const users = await db.query(userQuery, [email]);

// AFTER
const users = await db.findUserByEmail(email);
```

**Acceptance criteria:**
- `grep -r "DB_TYPE" backend/src/routes/` returns zero results
- `grep -r "DB_TYPE" backend/src/db/schema.js backend/src/db/seed.js` returns zero results
- The only `DB_TYPE` reference is in `backend/src/db/index.js` (factory) and `backend/src/index.js` (session store selection)
- All existing functionality works identically on both SQLite and PostgreSQL

---

### Task 1.2 — Re-throw Errors in Schema/Seed (CR #7)

**Review ref:** §4.3 — Error Swallowing in Schema/Seed

**Files:** `backend/src/db/schema.js`, `backend/src/db/seed.js`

**Action — `schema.js`:**
```js
// BEFORE
} catch (error) {
  console.error('Error creating tables:', error);
}

// AFTER
} catch (error) {
  console.error('Error creating tables:', error);
  throw error;
}
```

**Action — `seed.js`:**
```js
// BEFORE
} catch (error) {
  console.error('Error seeding database:', error);
}

// AFTER
} catch (error) {
  console.error('Error seeding database:', error);
  throw error;
}
```

**Acceptance criteria:**
- If the database is unreachable, the server process exits with a non-zero code instead of starting silently broken
- Normal startup still works (tables created/exist, seed runs/skips)

---

### Task 1.3 — Fix Dark Mode Color Conflicts (CR #8)

**Review ref:** §5.2 — Dark Mode Color Conflicts

**Files:**
- `frontend/src/assets/base.css` — add new CSS variables for component colors
- `frontend/src/App.vue` — replace hardcoded colors with CSS variables
- `frontend/src/components/SubscriptionModal.vue` — replace `background: white`
- `frontend/src/views/SubscriptionsPage.vue` — replace `border: 1px solid #ccc`
- `frontend/src/views/HistoryPage.vue` — replace `border: 1px solid #ccc`

**Step 1 — Add CSS variables to `base.css`:**

Add to the `:root` block:
```css
--color-header-bg: var(--vt-c-white-soft);
--color-header-border: var(--vt-c-divider-light-2);
--color-surface: var(--vt-c-white);
--color-table-border: var(--vt-c-divider-light-1);
```

Add to the `@media (prefers-color-scheme: dark)` block:
```css
--color-header-bg: var(--vt-c-black-soft);
--color-header-border: var(--vt-c-divider-dark-2);
--color-surface: var(--vt-c-black-soft);
--color-table-border: var(--vt-c-divider-dark-1);
```

**Step 2 — Update components to use variables:**

| File | Replace | With |
|------|---------|------|
| `App.vue` `<style>` | `background-color: #f8f9fa` | `background-color: var(--color-header-bg)` |
| `App.vue` `<style>` | `border-bottom: 1px solid #dee2e6` | `border-bottom: 1px solid var(--color-header-border)` |
| `SubscriptionModal.vue` | `background: white` | `background: var(--color-surface)` |
| `SubscriptionsPage.vue` | `border: 1px solid #ccc` | `border: 1px solid var(--color-table-border)` |
| `HistoryPage.vue` | `border: 1px solid #ccc` | `border: 1px solid var(--color-table-border)` |

**Acceptance criteria:**
- With `prefers-color-scheme: dark`, the modal background, header, and table borders all use dark-friendly colors
- Light mode appearance is visually unchanged

---

### Task 1.4 — Fix `v-if` State Chains (CR #9)

**Review ref:** §5.5 — Competing `v-if` States Show Simultaneously

**Files:** `DashboardPage.vue`, `SubscriptionsPage.vue`, `HistoryPage.vue`, `ProfilePage.vue`

**Pattern to apply in each file:**

```html
<!-- BEFORE -->
<div v-if="loading">Loading...</div>
<div v-if="error">{{ error }}</div>
<div v-if="data">...</div>

<!-- AFTER -->
<div v-if="loading">Loading...</div>
<div v-else-if="error">{{ error }}</div>
<div v-else-if="data">...</div>
```

**Note for `SubscriptionsPage.vue`:** The condition checks `subscriptions.length` not `data`, and there's a `<p v-else>No active subscriptions.</p>` that should be outside loading/error:

```html
<div v-if="loading">Loading...</div>
<div v-else-if="error">{{ error }}</div>
<template v-else>
  <table v-if="subscriptions.length">...</table>
  <p v-else>No active subscriptions.</p>
</template>
```

**Acceptance criteria:**
- When API returns an error, only the error message is shown — not stale data
- When loading, only "Loading..." is shown
- Normal display of data still works

---

### Task 1.5 — Remove `defineProps`/`defineEmits` Imports (CR #10)

**Review ref:** §6.1 — `defineProps`/`defineEmits` Explicitly Imported

**Files:**
- `frontend/src/components/SubscriptionModal.vue`
- `frontend/src/views/SubscriptionsPage.vue`

**Action — `SubscriptionModal.vue`:**
```js
// BEFORE
import { ref, watch, defineProps, defineEmits } from 'vue';

// AFTER
import { ref, watch } from 'vue';
```

**Action — `SubscriptionsPage.vue`:**
```js
// BEFORE
import { ref, onMounted, defineProps } from 'vue';

// AFTER
import { ref, onMounted } from 'vue';
```

**Acceptance criteria:**
- No deprecation warnings in the browser console related to `defineProps`/`defineEmits`
- Components still function identically

---

### Task 1.6 — Make SQLite Adapter Async (CR #13)

**Review ref:** §3.4 — SQLite Functions Are Synchronous, Used As Async

**File:** `backend/src/db/sqlite.js`

**Action:** Wrap the synchronous `better-sqlite3` calls in Promises:

```js
// BEFORE
function query(sql, params = []) {
  return db.prepare(sql).all(params);
}

function run(sql, params = []) {
  return db.prepare(sql).run(params);
}

// AFTER
async function query(sql, params = []) {
  return db.prepare(sql).all(params);
}

async function run(sql, params = []) {
  return db.prepare(sql).run(params);
}

async function close() {
  db.close();
}
```

While `async` on a synchronous function still returns immediately, it ensures:
- Errors reject as Promises (caught by `try/catch` with `await`), matching PostgreSQL behavior
- The contract is consistent: callers always deal with Promises

**Acceptance criteria:**
- `typeof db.query('SELECT 1').then === 'function'` (returns a thenable)
- All existing routes continue to work with `await db.query(...)`
- Errors in queries are caught by `try/catch` blocks in route handlers

---

### Task 1.7 — Externalize Session Secret (CR #11)

**Review ref:** §7.1 — Hardcoded Session Secret

**Files:** `compose.yaml`, `compose.postgres.yaml`, `README.md`

**Action 1 — `compose.yaml`:**
```yaml
# BEFORE
    environment:
      DB_TYPE: sqlite
      SESSION_SECRET: supersecret

# AFTER
    environment:
      DB_TYPE: sqlite
      SESSION_SECRET: ${SESSION_SECRET:?SESSION_SECRET is required}
```

**Action 2 — `compose.postgres.yaml`:** Same pattern for both `SESSION_SECRET` and the Postgres credentials:
```yaml
    environment:
      DB_TYPE: postgres
      SESSION_SECRET: ${SESSION_SECRET:?SESSION_SECRET is required}
      POSTGRES_HOST: postgres
      POSTGRES_USER: ${POSTGRES_USER:-sub_user}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:?POSTGRES_PASSWORD is required}
      POSTGRES_DB: ${POSTGRES_DB:-sub_tracker}
```

**Action 3 — Add `.env.example` at project root:**
```env
SESSION_SECRET=change-me-to-a-random-string
POSTGRES_USER=sub_user
POSTGRES_PASSWORD=change-me
POSTGRES_DB=sub_tracker
```

**Action 4 — Update `README.md`** to instruct users to copy `.env.example` to `.env` before running:
```markdown
### Quick Start
1. `cp .env.example .env` and edit the values
2. `docker compose up --build`
```

**Acceptance criteria:**
- `docker compose up` fails with a clear error if `SESSION_SECRET` is not set
- With a `.env` file containing the secret, the app starts normally
- No hardcoded secrets remain in compose files

---

### Task 1.8 — Add Rate Limiting to Login (CR #12)

**Review ref:** §7.3 — No Rate Limiting on Login

**Action 1 — Install dependency:**
```bash
cd backend && npm install express-rate-limit
```

**Action 2 — Create `backend/src/middleware/rateLimit.js`:**
```js
const rateLimit = require('express-rate-limit');

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,                   // max 10 attempts per window
  message: { message: 'Too many login attempts. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = { loginLimiter };
```

**Action 3 — Apply to login route in `backend/src/routes/auth.js`:**
```js
const { loginLimiter } = require('../middleware/rateLimit');

router.post('/login', loginLimiter, async (req, res) => {
  // ... existing handler
});
```

**Acceptance criteria:**
- After 10 failed login attempts within 15 minutes, the 11th returns `429 Too Many Requests`
- Successful logins are also counted (prevents enumeration)
- Rate limit headers (`RateLimit-*`) are present in responses

---

## Phase 2 — Code Quality & DX (P2)

> **Goal:** Improve developer experience, type safety, and code maintainability.
> **Time:** ~5 hours. All tasks are independent unless noted.

---

### Task 2.1 — Add TypeScript to Vue Components (CR #14)

**Review ref:** §1.3 — Inconsistent File Conventions

**Files:** All `.vue` files in `frontend/src/`

**Action:** Add `lang="ts"` to every `<script setup>` tag:

```html
<!-- BEFORE -->
<script setup>

<!-- AFTER -->
<script setup lang="ts">
```

**Files to update:**
1. `App.vue`
2. `views/LoginPage.vue`
3. `views/DashboardPage.vue`
4. `views/SubscriptionsPage.vue`
5. `views/HistoryPage.vue`
6. `views/ProfilePage.vue`
7. `views/ChangePasswordPage.vue`
8. `components/SubscriptionModal.vue`

**After adding `lang="ts"`, fix any type errors that surface:**
- Add type annotations to `ref()` calls where the type isn't inferrable
- Import and use the types defined in Task 2.2
- Type event handler parameters

**Acceptance criteria:**
- `npm run type-check` passes with zero errors
- All components still function correctly at runtime

---

### Task 2.2 — Define API Types (CR #15)

**Review ref:** §6.5 — `any` Types Everywhere in `api.ts`

**File:** `frontend/src/services/api.ts`

**Action 1 — Create `frontend/src/types/index.ts`:**

```ts
export interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  zipcode: string;
}

export interface Subscription {
  id: number;
  user_id: number;
  company_name: string;
  description: string;
  price: number;
  subscription_type: 'monthly' | 'yearly' | 'lifetime';
  start_date: string;
  created_at: string;
}

export interface ActiveSubscriptionsResponse {
  subscriptions: Subscription[];
  total_active: number;
  total_monthly_cost: number;
  total_yearly_cost: number;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface PasswordUpdate {
  oldPassword: string;
  newPassword: string;
}

export type UserUpdate = Omit<User, 'id'>;
export type SubscriptionCreate = Omit<Subscription, 'id' | 'user_id' | 'created_at'>;
```

**Action 2 — Update `api.ts` with proper types:**

```ts
import type {
  User, Subscription, ActiveSubscriptionsResponse,
  LoginCredentials, PasswordUpdate, UserUpdate, SubscriptionCreate
} from '../types';

export default {
  login: (credentials: LoginCredentials) => fetchApi('/login', { ... }),
  getUser: () => fetchApi('/user') as Promise<User>,
  updateUser: (userData: UserUpdate) => fetchApi('/user', { ... }),
  updatePassword: (passwords: PasswordUpdate) => fetchApi('/user/password', { ... }),
  getActiveSubscriptions: () => fetchApi('/subscriptions/active') as Promise<ActiveSubscriptionsResponse>,
  getSubscriptionHistory: () => fetchApi('/subscriptions/history') as Promise<Subscription[]>,
  createSubscription: (subData: SubscriptionCreate) => fetchApi('/subscriptions', { ... }),
  updateSubscription: (id: number, subData: SubscriptionCreate) => fetchApi(`/subscriptions/${id}`, { ... }),
  deleteSubscription: (id: number) => fetchApi(`/subscriptions/${id}`, { method: 'DELETE' }),
};
```

**Action 3 — Remove the `needsAuth` dead code:**
```ts
// BEFORE
interface FetchOptions extends RequestInit {
  needsAuth?: boolean;
}

// AFTER
type FetchOptions = RequestInit;
```

Also remove the `needsAuth: false` from the `login` call.

**Acceptance criteria:**
- No `any` types remain in `api.ts`
- `npm run type-check` passes
- IDE autocomplete works for API response shapes

---

### Task 2.3 — Extract `formatDate` to Utility (CR #16)

**Review ref:** §6.2 — Duplicate `formatDate` Function

**Action 1 — Create `frontend/src/utils/format.ts`:**

```ts
export function formatDate(dateString: string): string {
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  };
  return new Date(dateString).toLocaleDateString(undefined, options);
}
```

**Action 2 — Update the three consuming files:**

In `DashboardPage.vue`, `SubscriptionsPage.vue`, `HistoryPage.vue`:
```ts
// BEFORE
const formatDate = (dateString) => {
  const options = { year: 'numeric', month: 'long', day: 'numeric' };
  return new Date(dateString).toLocaleDateString(undefined, options);
};

// AFTER
import { formatDate } from '../utils/format';
```

**Acceptance criteria:**
- `grep -r "toLocaleDateString" frontend/src/views/` returns zero results
- Dates still display correctly in dashboard, subscriptions, and history views

---

### Task 2.4 — Remove Unused Scaffolding Files (CR #17)

**Review ref:** §1.1 — Unused Scaffolding Files

**Action:** Delete the following files:

```bash
rm frontend/src/components/TheWelcome.vue
rm frontend/src/components/WelcomeItem.vue
rm frontend/src/components/icons/IconCommunity.vue
rm frontend/src/components/icons/IconDocumentation.vue
rm frontend/src/components/icons/IconEcosystem.vue
rm frontend/src/components/icons/IconSupport.vue
rm frontend/src/components/icons/IconTooling.vue
rm frontend/src/stores/counter.ts
rmdir frontend/src/components/icons
```

**Acceptance criteria:**
- The app builds and runs without errors
- No imports reference the deleted files
- `frontend/src/components/icons/` directory no longer exists

---

### Task 2.5 — Add Backend Start/Dev Scripts (CR #18)

**Review ref:** §2.3 — Backend Has No Start Script

**File:** `backend/package.json`

**Action:** Add `start` and `dev` scripts. Install `nodemon` as a dev dependency for hot-reload:

```bash
cd backend && npm install --save-dev nodemon
```

```json
"scripts": {
  "start": "node src/index.js",
  "dev": "nodemon src/index.js",
  "test": "echo \"Error: no test specified\" && exit 1"
}
```

**Acceptance criteria:**
- `cd backend && npm start` boots the server
- `cd backend && npm run dev` boots with hot-reload
- `GEMINI.md` instructions (`npm start`) now work

---

### Task 2.6 — Use Vue Router for 401 Redirect (CR #19)

**Review ref:** §6.4 — Aggressive Redirect on 401

**File:** `frontend/src/services/api.ts`

**Approach:** The API module can't directly import the router instance without creating a circular dependency. Use a callback pattern:

**Action 1 — Add a configurable handler in `api.ts`:**

```ts
let onUnauthorized: (() => void) | null = null;

export function setUnauthorizedHandler(handler: () => void) {
  onUnauthorized = handler;
}

async function fetchApi(path: string, options: FetchOptions = {}) {
  // ...
  if (response.status === 401) {
    if (onUnauthorized) {
      onUnauthorized();
    }
    throw new Error('Unauthorized');
  }
  // ...
}
```

**Action 2 — Wire it up in `main.ts`:**

```ts
import { setUnauthorizedHandler } from './services/api';

// After router is created:
setUnauthorizedHandler(() => {
  localStorage.removeItem('isLoggedIn');
  router.push('/login');
});
```

**Acceptance criteria:**
- 401 responses cause a Vue Router navigation (no full page reload)
- App state is preserved (Pinia store, component state) during redirect
- Login page is shown after redirect

---

### Task 2.7 — Use Pinia for Shared State (CR #20)

**Review ref:** §6.7 — Pinia Installed But Not Used

**Action 1 — Create `frontend/src/stores/auth.ts`:**

```ts
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export const useAuthStore = defineStore('auth', () => {
  const isLoggedIn = ref(!!localStorage.getItem('isLoggedIn'));

  function login() {
    localStorage.setItem('isLoggedIn', 'true');
    isLoggedIn.value = true;
  }

  function logout() {
    localStorage.removeItem('isLoggedIn');
    isLoggedIn.value = false;
  }

  return { isLoggedIn, login, logout };
});
```

**Action 2 — Update `App.vue`, `LoginPage.vue`, router guard, and `api.ts` 401 handler** to use `useAuthStore()` instead of directly reading/writing `localStorage`.

**Action 3 — Delete `frontend/src/stores/counter.ts`** (already covered in Task 2.4).

**Acceptance criteria:**
- Auth state is reactive across all components via Pinia
- `localStorage` is only accessed inside the `auth` store — nowhere else
- Login, logout, route guard, and 401 handler all use the store

---

### Task 2.8 — Make CORS Origins Configurable (CR #21)

**Review ref:** §2.5 — CORS Origins Hardcoded

**File:** `backend/src/index.js`

**Action:**
```js
// BEFORE
app.use(cors({
  origin: ['http://localhost:8080', 'http://localhost:8090'],
  credentials: true,
}));

// AFTER
const allowedOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',')
  : ['http://localhost:8080'];

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
}));
```

Add `CORS_ORIGINS` to `.env.example`:
```env
CORS_ORIGINS=http://localhost:8080
```

**Acceptance criteria:**
- Default (no env var) allows `http://localhost:8080`
- Setting `CORS_ORIGINS=https://app.example.com,http://localhost:3000` allows both
- Cross-origin requests from unlisted origins are blocked

---

### Task 2.9 — Add Proper Graceful Shutdown (CR #22)

**Review ref:** §4.5 — Graceful Shutdown Is Broken

**File:** `backend/src/index.js`

**Action:** Replace the `process.on('exit')` handler:

```js
// BEFORE
process.on('exit', () => {
  if (db && db.close) {
    db.close();
    console.log('Database connection closed.');
  }
});

// AFTER
let server; // Capture the server reference from app.listen()

async function shutdown(signal) {
  console.log(`\n${signal} received. Shutting down gracefully...`);
  if (server) {
    server.close(() => {
      console.log('HTTP server closed.');
    });
  }
  if (db && db.close) {
    await db.close();
    console.log('Database connection closed.');
  }
  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
```

Update `startServer()` to capture the return value:
```js
server = app.listen(port, () => { ... });
```

**Acceptance criteria:**
- `Ctrl+C` during local dev cleanly closes DB connections and exits
- Docker `docker compose down` triggers SIGTERM and the app shuts down cleanly
- No "connection terminated unexpectedly" errors in PostgreSQL logs

---

### Task 2.10 — Fix HTML Title (CR #24)

**Review ref:** §2.4 — `index.html` Title is Generic

**File:** `frontend/index.html`

```html
<!-- BEFORE -->
<title>Vite App</title>

<!-- AFTER -->
<title>Subscription Tracker</title>
```

**Acceptance criteria:**
- Browser tab shows "Subscription Tracker"

---

### Task 2.11 — Add Global Error Handler Middleware (CR #25)

**Review ref:** §4.6 — Express 5 Used But No Async Error Handling Pattern

**File:** `backend/src/index.js`

**Action:** Add an error-handling middleware as the **last** `app.use()` call:

```js
// After all route registrations:
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(err.status || 500).json({
    message: process.env.NODE_ENV === 'production'
      ? 'Internal server error.'
      : err.message,
  });
});
```

**Acceptance criteria:**
- Unhandled errors in async route handlers return a 500 JSON response instead of hanging
- In development, the error message is included; in production, a generic message is returned

---

## Phase 3 — Polish & Domain Model (P3)

> **Goal:** Improve UX, fix domain modeling, and harden the application.
> **Time:** ~9 hours.

---

### Task 3.1 — Add Global Form/Button Styling (CR #26)

**Review ref:** §5.3 — No Global Form/Button Styling

**File:** `frontend/src/assets/base.css`

**Action:** Add consistent global styles for form elements at the bottom of `base.css`:

```css
/* Form elements */
input,
select,
textarea {
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  background-color: var(--color-background);
  color: var(--color-text);
  font-size: 1rem;
  line-height: 1.5;
  width: 100%;
}

input:focus,
select:focus,
textarea:focus {
  outline: none;
  border-color: #007bff;
  box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
}

button {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  background-color: #007bff;
  color: white;
  font-size: 1rem;
  cursor: pointer;
  transition: background-color 0.2s;
}

button:hover {
  background-color: #0056b3;
}

button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

label {
  display: block;
  margin-bottom: 0.25rem;
  font-weight: 500;
}

form > div,
form > fieldset {
  margin-bottom: 1rem;
}

.error {
  color: #dc3545;
}

.success {
  color: #28a745;
}
```

**After this, remove duplicate form styling** from scoped `<style>` blocks in:
- `SubscriptionModal.vue` (label, input, select styling)
- `ProfilePage.vue` (form div margin)
- `ChangePasswordPage.vue` (form div margin, error/success colors)

**Acceptance criteria:**
- All forms across the app have consistent visual styling
- Buttons, inputs, selects look cohesive
- Dark mode compatibility is maintained via CSS variables

---

### Task 3.2 — Add Responsive Design (CR #27)

**Review ref:** §5.4 — No Responsive/Mobile Design

**Files:** `App.vue`, `SubscriptionsPage.vue`, `HistoryPage.vue`, `base.css`

**Action 1 — Responsive navigation in `App.vue`:**

Add a hamburger toggle for mobile:

```html
<header v-if="isLoggedIn">
  <nav>
    <button class="nav-toggle" @click="navOpen = !navOpen">☰</button>
    <div class="nav-links" :class="{ open: navOpen }">
      <RouterLink to="/" @click="navOpen = false">Dashboard</RouterLink>
      <!-- ... other links ... -->
      <button @click="handleLogout">Logout</button>
    </div>
  </nav>
</header>
```

Add responsive styles:
```css
@media (max-width: 768px) {
  .nav-links {
    display: none;
    flex-direction: column;
  }
  .nav-links.open {
    display: flex;
  }
  .nav-toggle {
    display: block;
  }
}
@media (min-width: 769px) {
  .nav-toggle {
    display: none;
  }
}
```

**Action 2 — Responsive tables in `SubscriptionsPage.vue` and `HistoryPage.vue`:**

Wrap tables in a scrollable container:
```html
<div class="table-container">
  <table>...</table>
</div>
```

```css
.table-container {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}
```

**Acceptance criteria:**
- On mobile (< 768px), navigation collapses behind a hamburger button
- Tables scroll horizontally instead of breaking the layout
- All pages are usable on a 375px-wide screen

---

### Task 3.3 — Fix Subscription Domain Model (CR #28)

**Review ref:** §8.1 — Subscription "Active" Logic Is Fundamentally Wrong

**Files:** DB schema, seed, backend routes, frontend views

**Action 1 — Add `cancelled_at` column to the subscriptions table:**

In `sqlite.js` adapter:
```sql
CREATE TABLE IF NOT EXISTS subscriptions (
  ...existing columns...,
  cancelled_at TEXT DEFAULT NULL
);
```

In `postgres.js` adapter:
```sql
CREATE TABLE IF NOT EXISTS subscriptions (
  ...existing columns...,
  cancelled_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
);
```

**Action 2 — Update active/history queries:**

Active subscriptions = `cancelled_at IS NULL`
History subscriptions = `cancelled_at IS NOT NULL`

```sql
-- Active
SELECT * FROM subscriptions WHERE user_id = ? AND cancelled_at IS NULL

-- History
SELECT * FROM subscriptions WHERE user_id = ? AND cancelled_at IS NOT NULL
```

**Action 3 — Add a "Cancel" action** in the frontend (sets `cancelled_at` to now) instead of relying on date math.

**Action 4 — Add backend endpoint** `POST /api/subscriptions/:id/cancel`:
```js
router.post('/subscriptions/:id/cancel', async (req, res) => {
  await db.cancelSubscription(req.params.id, req.session.userId);
  res.json({ message: 'Subscription cancelled.' });
});
```

**Action 5 — Update frontend** to show a "Cancel" button next to "Edit" and "Delete", and add a reactivation option in the history view.

**Acceptance criteria:**
- A monthly subscription remains "active" indefinitely until the user cancels it
- Cancelled subscriptions appear in the history view with a cancellation date
- Existing seed data still works (no cancelled_at → active)
- The DELETE endpoint still fully removes a record; Cancel soft-archives it

---

### Task 3.4 — Use Integer Cents for Prices (CR #29)

**Review ref:** §8.3 — Price Stored as `REAL` in SQLite

**Files:** Schema, seed, routes, frontend display

**Option chosen:** Store prices as integer cents (e.g., `1999` for `$19.99`). This avoids floating-point issues on both databases.

**Action 1 — Schema change:**
```sql
-- SQLite
price INTEGER NOT NULL  -- cents

-- PostgreSQL (alternative: keep NUMERIC(10,2), both work)
price INTEGER NOT NULL  -- cents
```

**Action 2 — Seed data change:**
```js
{ name: 'Netflix', price: 1999, ... }  // was 19.99
```

**Action 3 — Backend:** Remove `parseFloat(price)` calls in routes; prices arrive as integers.

**Action 4 — Frontend:** Format prices in display:
```ts
function formatPrice(cents: number): string {
  return (cents / 100).toFixed(2);
}
```

**Action 5 — Migration strategy for existing data:**
Add a migration step in `startServer()` that checks if prices need conversion (if max price < 1000, likely needs conversion). Alternatively, wipe and re-seed (acceptable for dev).

**Acceptance criteria:**
- `$19.99` displays correctly, never `$19.990000000000002`
- API accepts and returns prices in cents
- Both SQLite and PostgreSQL store identical integer values

---

### Task 3.5 — Add Structured Logging (CR #30)

**Review ref:** §4.4 — No Logging Framework

**Action 1 — Install pino:**
```bash
cd backend && npm install pino
```

**Action 2 — Create `backend/src/logger.js`:**
```js
const pino = require('pino');

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: process.env.NODE_ENV !== 'production'
    ? { target: 'pino/file', options: { destination: 1 } }
    : undefined,
});

module.exports = logger;
```

**Action 3 — Replace all `console.log`/`console.error` calls** across the backend with `logger.info()`/`logger.error()`.

**Action 4 — Remove PII from log messages:**
```js
// BEFORE
console.log(`Login failed: ${email}`);

// AFTER
logger.warn({ event: 'login_failed' }, 'Login attempt failed');
```

**Acceptance criteria:**
- All log output is structured JSON in production
- Log levels can be controlled via `LOG_LEVEL` env var
- No email addresses appear in log output

---

### Task 3.6 — Add CSRF Protection (CR #31)

**Review ref:** §7.4 — No CSRF Protection

**Action 1 — Install a CSRF library:**
```bash
cd backend && npm install csrf-csrf
```

**Action 2 — Configure in `index.js`:**
```js
const { doubleCsrf } = require('csrf-csrf');

const { doubleCsrfProtection, generateToken } = doubleCsrf({
  getSecret: () => process.env.SESSION_SECRET,
  cookieName: '_csrf',
  cookieOptions: { sameSite: 'lax', secure: process.env.NODE_ENV === 'production' },
});

// Apply to all state-changing routes
app.use('/api/subscriptions', doubleCsrfProtection);
app.use('/api/user', doubleCsrfProtection);
```

**Action 3 — Add a `/api/csrf-token` endpoint** that returns the token:
```js
app.get('/api/csrf-token', (req, res) => {
  res.json({ token: generateToken(req, res) });
});
```

**Action 4 — Frontend:** Fetch the CSRF token on app init and include it in headers:
```ts
// In api.ts fetchApi function
headers: {
  'Content-Type': 'application/json',
  'x-csrf-token': csrfToken,
}
```

**Acceptance criteria:**
- POST/PUT/DELETE requests without a valid CSRF token return 403
- The frontend automatically fetches and includes the token
- Login works (login endpoint is exempt from CSRF since there's no session yet)

---

### Task 3.7 — Add Pagination (CR #32)

**Review ref:** No specific section — good practice for list endpoints

**Files:** Backend subscription routes, frontend views

**Action 1 — Backend:** Add `page` and `limit` query params to `GET /subscriptions/active` and `GET /subscriptions/history`:

```js
router.get('/subscriptions/active', async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const offset = (page - 1) * limit;

  const subscriptions = await db.getActiveSubscriptions(userId, limit, offset);
  const total = await db.countActiveSubscriptions(userId);

  res.json({
    subscriptions,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    // ...existing summary fields
  });
});
```

**Action 2 — Frontend:** Add pagination controls (Previous / Next / page number) to subscription list and history views.

**Acceptance criteria:**
- API returns paginated results with metadata
- Frontend shows page controls when total > limit
- Default behavior (no params) returns first 20 results

---

## Phase 4 — Testing (P4)

> **Goal:** Achieve meaningful test coverage across backend and frontend.
> **Time:** ~12 hours. Tasks can largely run in parallel across developers.

---

### Task 4.1 — Install Backend Test Framework (CR #33)

**Action:**
```bash
cd backend
npm install --save-dev vitest supertest
```

**Update `backend/package.json`:**
```json
"scripts": {
  "start": "node src/index.js",
  "dev": "nodemon src/index.js",
  "test": "vitest run",
  "test:watch": "vitest"
}
```

**Create `backend/vitest.config.js`:**
```js
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
  },
});
```

**Create directory structure:**
```
backend/src/__tests__/
  middleware/
    auth.test.js
    validate.test.js
  routes/
    auth.test.js
    user.test.js
    subscriptions.test.js
  db/
    sqlite.test.js
```

**Acceptance criteria:**
- `cd backend && npm test` runs vitest and reports results
- Test directory structure mirrors source structure

---

### Task 4.2 — Write Backend Integration Tests (CR #34)

**File:** `backend/src/__tests__/routes/`

**Approach:** Use `supertest` to test the Express app. Use an in-memory SQLite database for speed. Set up a test helper that:
1. Creates a fresh database before each test suite
2. Seeds test data
3. Provides a logged-in agent (with session cookie)

**Test helper — `backend/src/__tests__/setup.js`:**
```js
const { app } = require('../../src/index'); // Need to refactor index.js to export app
const supertest = require('supertest');

async function createTestAgent() {
  const agent = supertest.agent(app);
  await agent
    .post('/api/login')
    .send({ email: 'user@test.com', password: 'password123' });
  return agent;
}

module.exports = { createTestAgent };
```

**Note:** This requires refactoring `index.js` to export the `app` instance and separate the `app.listen()` call so tests can use the app without starting a server.

**Test cases to implement:**

**`routes/auth.test.js`:**
| Test | Expected |
|------|----------|
| POST /login with valid credentials | 200 + session cookie set |
| POST /login with wrong password | 401 |
| POST /login with non-existent email | 401 |
| POST /login with missing fields | 400 |
| POST /logout | 200 + session destroyed |
| Access protected route without session | 401 |

**`routes/user.test.js`:**
| Test | Expected |
|------|----------|
| GET /user (authenticated) | 200 + user data (no password) |
| PUT /user with valid data | 200 |
| PUT /user with invalid email | 400 |
| PUT /user/password with correct old password | 200 |
| PUT /user/password with wrong old password | 401 |
| PUT /user/password with short new password | 400 |

**`routes/subscriptions.test.js`:**
| Test | Expected |
|------|----------|
| GET /subscriptions/active | 200 + subscriptions array + totals |
| GET /subscriptions/history | 200 + array |
| POST /subscriptions with valid data | 201 + created subscription |
| POST /subscriptions with missing company_name | 400 |
| POST /subscriptions with negative price | 400 |
| PUT /subscriptions/:id with valid data | 200 |
| PUT /subscriptions/:nonexistent with valid data | 404 |
| DELETE /subscriptions/:id | 204 |
| DELETE /subscriptions/:nonexistent | 404 |

**`middleware/auth.test.js`:**
| Test | Expected |
|------|----------|
| Request with no session | 401 |
| Request with valid session | calls next() |

**`middleware/validate.test.js`:**
| Test | Expected |
|------|----------|
| Valid email passes emailValidation | no errors |
| Invalid email fails emailValidation | error array |
| Password < 6 chars fails passwordValidation | error array |
| Valid subscription data passes | no errors |
| Missing fields fail subscriptionValidation | error array |

**Acceptance criteria:**
- `npm test` runs 25+ tests
- All tests pass on SQLite
- Tests complete in < 10 seconds

---

### Task 4.3 — Write Frontend Component Tests (CR #35)

**File:** `frontend/src/__tests__/` or co-located `*.spec.ts` files

**Setup:** Tests use `vitest` + `@vue/test-utils` (already installed) with `vi.mock()` to mock `api.ts`.

**Test cases to implement:**

**`LoginPage.spec.ts`:**
| Test | Expected |
|------|----------|
| Renders login form | email + password inputs + button visible |
| Submits form and redirects on success | `api.login` called, router.push('/') called |
| Shows error on failed login | error message displayed |
| Requires email and password fields | button does not submit with empty fields |

**`DashboardPage.spec.ts`:**
| Test | Expected |
|------|----------|
| Shows loading state | "Loading..." visible |
| Shows subscription summary | total_active, costs displayed |
| Shows subscription list | each sub rendered in list |
| Shows error state | error message displayed |

**`SubscriptionsPage.spec.ts`:**
| Test | Expected |
|------|----------|
| Renders table with subscriptions | rows for each sub |
| Opens add modal | clicking "Add" shows modal |
| Opens edit modal | clicking "Edit" shows pre-filled modal |
| Confirms before delete | window.confirm called |
| Refreshes after delete | fetchSubscriptions called again |

**`SubscriptionModal.spec.ts`:**
| Test | Expected |
|------|----------|
| Renders in "Add" mode when no subscription prop | title says "Add", form is empty |
| Renders in "Edit" mode with subscription prop | title says "Edit", form pre-filled |
| Emits 'saved' and 'close' on successful submit | events emitted |
| Shows validation error on API failure | error message shown |
| Backdrop click emits 'close' | event emitted |

**`ProfilePage.spec.ts`:**
| Test | Expected |
|------|----------|
| Loads and displays user data | fields populated |
| Shows success message on update | message visible |
| Shows error on failed update | error visible |

**`ChangePasswordPage.spec.ts`:**
| Test | Expected |
|------|----------|
| Validates passwords match | error when mismatch |
| Validates password length | error when < 6 chars |
| Shows success on password change | message visible |

**Acceptance criteria:**
- `cd frontend && npm run test:unit` runs 20+ tests
- All tests pass
- Tests complete in < 5 seconds

---

### Task 4.4 — Replace Cypress E2E Test (CR #36)

**File:** `frontend/cypress/e2e/`

**Action 1 — Delete `example.cy.ts`**

**Action 2 — Create test files:**

**`cypress/e2e/auth.cy.ts`:**
```ts
describe('Authentication', () => {
  it('redirects to login when not authenticated', () => {
    cy.visit('/');
    cy.url().should('include', '/login');
  });

  it('logs in with valid credentials', () => {
    cy.visit('/login');
    cy.get('input[type="email"]').type('user@test.com');
    cy.get('input[type="password"]').type('password123');
    cy.get('button[type="submit"]').click();
    cy.url().should('eq', Cypress.config().baseUrl + '/');
    cy.contains('Dashboard');
  });

  it('shows error with invalid credentials', () => {
    cy.visit('/login');
    cy.get('input[type="email"]').type('wrong@test.com');
    cy.get('input[type="password"]').type('wrongpassword');
    cy.get('button[type="submit"]').click();
    cy.contains('Invalid credentials');
  });

  it('logs out successfully', () => {
    // login first, then click logout
    cy.visit('/login');
    cy.get('input[type="email"]').type('user@test.com');
    cy.get('input[type="password"]').type('password123');
    cy.get('button[type="submit"]').click();
    cy.contains('Logout').click();
    cy.url().should('include', '/login');
  });
});
```

**`cypress/e2e/subscriptions.cy.ts`:**
```ts
describe('Subscriptions', () => {
  beforeEach(() => {
    // Login before each test
    cy.visit('/login');
    cy.get('input[type="email"]').type('user@test.com');
    cy.get('input[type="password"]').type('password123');
    cy.get('button[type="submit"]').click();
    cy.visit('/subscriptions');
  });

  it('displays active subscriptions', () => {
    cy.contains('Netflix');
    cy.contains('Spotify');
  });

  it('adds a new subscription', () => {
    cy.contains('Add Subscription').click();
    cy.get('input').first().type('Test Service');
    // ... fill remaining fields
    cy.contains('Create').click();
    cy.contains('Test Service');
  });

  it('edits a subscription', () => {
    cy.contains('Edit').first().click();
    // ... modify fields
    cy.contains('Save').click();
  });

  it('deletes a subscription', () => {
    cy.contains('Delete').first().click();
    // Confirm dialog handled by cy.on('window:confirm', () => true)
  });
});
```

**`cypress/e2e/dashboard.cy.ts`:**
```ts
describe('Dashboard', () => {
  beforeEach(() => {
    cy.visit('/login');
    cy.get('input[type="email"]').type('user@test.com');
    cy.get('input[type="password"]').type('password123');
    cy.get('button[type="submit"]').click();
  });

  it('shows subscription summary', () => {
    cy.contains('Total Active Subscriptions');
    cy.contains('Total Monthly Cost');
    cy.contains('Total Yearly Cost');
  });

  it('lists active subscriptions', () => {
    cy.contains('Netflix');
  });
});
```

**`cypress/e2e/profile.cy.ts`:**
```ts
describe('Profile', () => {
  beforeEach(() => {
    cy.visit('/login');
    cy.get('input[type="email"]').type('user@test.com');
    cy.get('input[type="password"]').type('password123');
    cy.get('button[type="submit"]').click();
    cy.visit('/profile');
  });

  it('displays user profile', () => {
    cy.get('input[type="email"]').should('have.value', 'user@test.com');
  });

  it('updates profile', () => {
    cy.get('input[type="email"]').clear().type('updated@test.com');
    cy.contains('Save').click();
    cy.contains('Profile updated');
  });
});
```

**Pre-requisite for E2E tests:** The backend must be running with a seeded database. Update `cypress.config.ts` to reflect the correct `baseUrl` (should match the frontend dev server or container port).

**Acceptance criteria:**
- `npm run test:e2e` runs 10+ E2E tests
- Tests cover auth flow, subscription CRUD, dashboard, and profile
- Tests can run in CI (headless)

---

### Task 4.5 — Add GitHub Actions CI Pipeline (CR #37)

**File:** `.github/workflows/ci.yml`

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  backend-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
          cache-dependency-path: backend/package-lock.json
      - run: cd backend && npm ci
      - run: cd backend && npm test

  frontend-lint-typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
          cache-dependency-path: frontend/package-lock.json
      - run: cd frontend && npm ci
      - run: cd frontend && npm run type-check
      - run: cd frontend && npm run lint

  frontend-unit-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
          cache-dependency-path: frontend/package-lock.json
      - run: cd frontend && npm ci
      - run: cd frontend && npm run test:unit -- --run

  frontend-e2e:
    runs-on: ubuntu-latest
    needs: [backend-test, frontend-unit-test]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - run: cd backend && npm ci
      - run: cd frontend && npm ci
      - run: cd backend && node src/index.js &
      - run: cd frontend && npm run test:e2e
```

**Acceptance criteria:**
- Pushes to `main` and all PRs trigger the CI pipeline
- Pipeline runs: backend tests, frontend lint + type-check, frontend unit tests, E2E tests
- Pipeline fails if any step fails
- Badge can be added to README

---

### Task 4.6 — Test PostgreSQL Variant in CI (CR #38)

**File:** `.github/workflows/ci.yml` — add a `postgres-test` job

```yaml
  backend-test-postgres:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:17-alpine
        env:
          POSTGRES_USER: sub_user
          POSTGRES_PASSWORD: sub_pass
          POSTGRES_DB: sub_tracker_test
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    env:
      DB_TYPE: postgres
      POSTGRES_HOST: localhost
      POSTGRES_PORT: 5432
      POSTGRES_USER: sub_user
      POSTGRES_PASSWORD: sub_pass
      POSTGRES_DB: sub_tracker_test
      SESSION_SECRET: ci-test-secret
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
          cache-dependency-path: backend/package-lock.json
      - run: cd backend && npm ci
      - run: cd backend && npm test
```

**Acceptance criteria:**
- Backend tests run against a real PostgreSQL instance in CI
- Tests pass on both SQLite (default) and PostgreSQL
- Any SQL dialect issues surface immediately

---

## Dependency Graph

```
Phase 0 (all parallel)
  ├── 0.1 Remove scaffolding CSS
  ├── 0.2 Fix 404 check
  ├── 0.3 Fix PG session table
  ├── 0.4 Fix smoke test port
  └── 0.5 Fix port inconsistency

Phase 1 (after Phase 0)
  ├── 1.1 Abstract SQL into adapters ←── largest task, blocks nothing
  ├── 1.2 Re-throw errors in schema/seed (independent)
  ├── 1.3 Fix dark mode colors (independent)
  ├── 1.4 Fix v-if chains (independent)
  ├── 1.5 Remove defineProps imports (independent)
  ├── 1.6 Make SQLite async (feeds into 1.1)
  ├── 1.7 Externalize secrets (independent)
  └── 1.8 Add rate limiting (independent)

Phase 2 (after Phase 1)
  ├── 2.1 Add TypeScript to components ←── depends on 2.2 (types)
  ├── 2.2 Define API types (independent)
  ├── 2.3 Extract formatDate (independent)
  ├── 2.4 Remove scaffolding files (independent)
  ├── 2.5 Add backend scripts (independent)
  ├── 2.6 Use router for 401 redirect (independent)
  ├── 2.7 Pinia for shared state ←── depends on 2.6 (401 handler)
  ├── 2.8 Configurable CORS (independent)
  ├── 2.9 Graceful shutdown (independent)
  ├── 2.10 Fix HTML title (independent)
  └── 2.11 Global error handler (independent)

Phase 3 (after Phase 2)
  ├── 3.1 Form/button styling (independent)
  ├── 3.2 Responsive design ←── depends on 3.1 (styling exists)
  ├── 3.3 Fix domain model ←── depends on 1.1 (adapter pattern)
  ├── 3.4 Integer cents ←── depends on 1.1 (adapter pattern)
  ├── 3.5 Structured logging (independent)
  ├── 3.6 CSRF protection (independent)
  └── 3.7 Pagination ←── depends on 1.1 (adapter pattern)

Phase 4 (can start during Phase 1)
  ├── 4.1 Install backend test framework (independent)
  ├── 4.2 Backend integration tests ←── depends on 4.1
  ├── 4.3 Frontend component tests (independent)
  ├── 4.4 Cypress E2E tests ←── depends on 4.2 (backend stable)
  ├── 4.5 GitHub Actions CI ←── depends on 4.1-4.4
  └── 4.6 PostgreSQL CI tests ←── depends on 4.5
```

---

## Summary

| Phase | Tasks | Effort | Outcome |
|-------|-------|--------|---------|
| Phase 0 | 5 | ~20 min | App boots and renders correctly |
| Phase 1 | 8 | ~4 hrs | Correct behavior, security basics, consistent adapters |
| Phase 2 | 11 | ~5 hrs | Type safety, DX, maintainability |
| Phase 3 | 7 | ~9 hrs | Production-ready polish and domain accuracy |
| Phase 4 | 6 | ~12 hrs | Full test coverage and CI/CD |
| **Total** | **37** | **~30 hrs** | **Production-quality application** |

**Recommended approach:** Complete Phase 0 first (20 min), then work Phase 1 and Phase 4.1–4.2 in parallel. This gives the fastest path to a working, tested application.
