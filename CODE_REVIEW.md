# Code Review — Subscription Tracker

**Date:** 2026-02-16  
**Scope:** Full codebase review — backend, frontend, infrastructure, testing

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Project Structure & Organisation](#1-project-structure--organisation)
3. [Infrastructure & Configuration](#2-infrastructure--configuration)
4. [Backend — Critical Bugs](#3-backend--critical-bugs)
5. [Backend — Code Smells & Design Issues](#4-backend--code-smells--design-issues)
6. [Frontend — Rendering / UI Breakage](#5-frontend--rendering--ui-breakage)
7. [Frontend — Code Quality Issues](#6-frontend--code-quality-issues)
8. [Security Concerns](#7-security-concerns)
9. [Logical / Domain Model Flaws](#8-logical--domain-model-flaws)
10. [Testing](#9-testing)
11. [Prioritized Improvement List](#10-prioritized-improvement-list)

---

## Executive Summary

The Subscription Tracker is a Vue 3 + Express monorepo supporting SQLite and PostgreSQL. While the overall architecture is sound, the codebase has **critical bugs** that prevent core functionality from working, a **broken frontend layout** caused by leftover scaffolding CSS, **PostgreSQL support that has clearly never been tested** (missing session table, broken result handling), **zero test coverage**, and a **broken smoke test**. The issues below are ordered from most to least critical.

---

## 1. Project Structure & Organisation

### 1.1 Unused Scaffolding Files

The following files are leftover from the `create-vue` scaffolding and serve no purpose in the application:

| File | Issue |
|------|-------|
| `src/components/TheWelcome.vue` | Vue starter template, never rendered |
| `src/components/WelcomeItem.vue` | Vue starter template, never rendered |
| `src/components/icons/Icon*.vue` (5 files) | Icon components for the starter template |
| `src/stores/counter.ts` | Default Pinia counter store, unused |

These files add confusion about what is real application code vs. boilerplate.

### 1.2 Missing Referenced Files

- `REQUIREMENTS.md` is referenced in the `GEMINI.md` project structure tree but **does not exist**.
- `backend/.env.example` exists but is never referenced in the actual `README.md` — only `GEMINI.md` mentions it.

### 1.3 Inconsistent File Conventions

- Backend uses **CommonJS** (`require`/`module.exports`) — appropriate for the dependency set but should be noted.
- Frontend Vue components use `<script setup>` **without `lang="ts"`** despite the project being a TypeScript project with `vue-tsc`, `tsconfig`, etc. This means **no type checking occurs inside any Vue component**, defeating the purpose of the TypeScript setup.
- `api.ts` uses `any` for every parameter type, providing zero type safety.

### 1.4 No `.env.example` for Frontend

The frontend has no documentation of required environment variables or API base URL configuration.

---

## 2. Infrastructure & Configuration

### 2.1 Port Inconsistency (HIGH)

Three different configurations expose the frontend on different ports:

| Source | Port |
|--------|------|
| `compose.yaml` (SQLite) | **8090** |
| `compose.postgres.yaml` | **8080** |
| `README.md` (docs for both) | **8080** |

The README is wrong for the SQLite variant. Users following the docs will hit nothing on port 8080 when using the default compose file.

### 2.2 Smoke Test Uses Wrong Port (CRITICAL — test always fails)

`smoke_test.sh` hits `http://localhost:4567/api` but the backend listens on port **3000** (default) and is never mapped to 4567 in any configuration. **The smoke test has never passed.**

```bash
# smoke_test.sh line 4
API_URL="http://localhost:4567/api"  # ← wrong, should be 3000
```

### 2.3 Backend Has No Start Script

`package.json` only has `"test": "echo \"Error: no test specified\" && exit 1"`. There is no `start` or `dev` script, despite `GEMINI.md` referencing `npm start`. Running locally requires knowing to call `node src/index.js` directly.

### 2.4 `index.html` Title is Generic

```html
<title>Vite App</title>  <!-- Should be "Subscription Tracker" -->
```

### 2.5 CORS Origins Hardcoded

```js
origin: ['http://localhost:8080', 'http://localhost:8090'],
```

This breaks if deployed to any real domain. Should be configurable via environment variable.

---

## 3. Backend — Critical Bugs

### 3.1 Update/Delete 404 Check Never Works (CRITICAL)

In `routes/subscriptions.js`, both the PUT and DELETE routes check:

```js
if (result.changes === 0 && result.rowCount === 0) {
  return res.status(404).json({ message: 'Subscription not found...' });
}
```

**This condition is always `false` on both databases:**

- **SQLite:** `run()` returns `{ changes: N, lastInsertRowid }`. `result.rowCount` is `undefined`. `undefined === 0` → `false`. The `&&` short-circuits to `false`.
- **PostgreSQL:** `run()` returns a `pg.Result` object. `result.changes` is `undefined`. `undefined === 0` → `false`. The `&&` short-circuits to `false`.

**Fix:** Change `&&` to `||`:
```js
if ((result.changes ?? result.rowCount) === 0) { ... }
```

### 3.2 PostgreSQL Session Table Not Created (CRITICAL — Postgres crashes on start)

`connect-pg-simple` requires a `session` table in PostgreSQL. Neither `schema.js` nor the session store configuration creates it. The app will crash immediately when using `DB_TYPE=postgres` with:

```
Error: Failed to connect to session store / relation "session" does not exist
```

**Fix:** Add `createTableIfMissing: true` to the PgSession configuration:
```js
new PgSession({ pool: db.pool, createTableIfMissing: true })
```

### 3.3 PostgreSQL `run()` Return Value Inconsistency

The `postgres.js` `run()` function returns the full `pg.Result` object, while `query()` returns only `result.rows`. In `routes/subscriptions.js` POST handler:

```js
if (process.env.DB_TYPE === 'postgres') {
  res.status(201).json(result.rows[0]);  // ← accesses .rows on the Result object — works
}
```

This happens to work because `run()` returns the full Result, but it's fragile and inconsistent. The intent of having separate `query()` and `run()` functions is unclear when they both execute queries with different return shapes.

### 3.4 SQLite Functions Are Synchronous, Used As Async

`sqlite.js` exports synchronous `query()` and `run()` functions. The rest of the codebase uses `await` on them. While this technically works (awaiting a non-Promise resolves immediately), it:
- Hides the fact that errors will throw synchronously, not reject as promises
- Makes the SQLite and Postgres adapters behave differently in error scenarios
- Could mask bugs in error handling

---

## 4. Backend — Code Smells & Design Issues

### 4.1 Scattered `process.env.DB_TYPE` Checks (Design Smell)

Every route file and the schema/seed files contain `process.env.DB_TYPE === 'postgres' ? pgQuery : sqliteQuery` branches. This is the **#1 code smell** in the backend. The database abstraction layer (`db/index.js`) should fully abstract SQL dialect differences, but it only abstracts the connection — every query still has to know which database it's talking to.

**Impact:** Adding a third database or changing a query requires editing 10+ locations across the codebase.

**Fix:** Move all queries into the database adapter modules (`sqlite.js`, `postgres.js`) as named methods (e.g., `findUserByEmail(email)`, `getActiveSubscriptions(userId)`), so route files are database-agnostic.

### 4.2 No Parameterized Query Abstraction

The placeholder syntax (`$1` vs `?`) differs between PostgreSQL and SQLite. This is another consequence of the leaky abstraction — the adapter layer should handle parameter placeholder translation.

### 4.3 Error Swallowing in Schema/Seed

```js
// schema.js
} catch (error) {
  console.error('Error creating tables:', error);
  // ← does NOT re-throw. Server continues with no tables!
}
```

If table creation fails, the server starts anyway in a broken state. Same issue in `seed.js`.

### 4.4 No Logging Framework

All logging uses `console.log`/`console.error`. A structured logger (e.g., `pino`, `winston`) would provide log levels, timestamps, and structured output.

### 4.5 Graceful Shutdown Is Broken

```js
process.on('exit', () => {
  if (db && db.close) {
    db.close();  // ← postgres close() is async, but 'exit' handler can't do async work
  }
});
```

Should use `SIGTERM`/`SIGINT` handlers with proper async cleanup before calling `process.exit()`.

### 4.6 Express 5 Used But No Async Error Handling Pattern

The project uses Express 5.2.1 which has built-in async error handling, but there's no global error handler middleware. If any async route throws unexpectedly, the response hangs.

---

## 5. Frontend — Rendering / UI Breakage

### 5.1 Scaffolding CSS Destroys the Layout (CRITICAL — root cause of ugly rendering)

`src/assets/main.css` contains this media query from the Vue starter template:

```css
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

**Effects on screens ≥ 1024px:**
- `body` becomes a flex container centered vertically/horizontally — the app floats in the middle of the viewport instead of filling it
- `#app` becomes a **2-column grid** — the navigation header and `<main>` content sit **side by side** instead of stacked vertically
- Tables, forms, and the dashboard all get crammed into half the viewport width

This is the **primary reason the app looks broken**. The scaffolding CSS was designed for the `TheWelcome.vue` two-column demo layout, not for a real application.

**Fix:** Remove the entire `@media (min-width: 1024px)` block from `main.css`.

### 5.2 Dark Mode Color Conflicts

`base.css` enables dark mode via `@media (prefers-color-scheme: dark)`, setting dark backgrounds and light text. However, several components use hardcoded light colors:

| Component | Hardcoded Color | Conflict |
|-----------|----------------|----------|
| `SubscriptionModal.vue` | `background: white` | White modal on dark background |
| `App.vue` header | `background-color: #f8f9fa` | Light gray header on dark page |
| `App.vue` header border | `border-bottom: 1px solid #dee2e6` | Nearly invisible border |
| Tables (`border: 1px solid #ccc`) | Light gray borders | Low contrast in dark mode |

### 5.3 No Global Form/Button Styling

All forms use raw, unstyled browser-default `<input>`, `<button>`, `<select>` elements. There is no consistent design system — every page styles its own form elements (or doesn't).

### 5.4 No Responsive/Mobile Design

Tables in `SubscriptionsPage.vue` and `HistoryPage.vue` have no responsive behavior — they overflow horizontally on small screens. The navigation has no hamburger menu or mobile adaptation.

### 5.5 Competing `v-if` States Show Simultaneously

In `DashboardPage.vue`, `SubscriptionsPage.vue`, `HistoryPage.vue`, and `ProfilePage.vue`, loading/error/data states are independent `v-if` checks:

```html
<div v-if="loading">Loading...</div>
<div v-if="error">{{ error }}</div>
<div v-if="data">...</div>
```

When loading finishes with an error and stale data exists, **all three show at once**. These should be an `v-if` / `v-else-if` / `v-else` chain.

---

## 6. Frontend — Code Quality Issues

### 6.1 `defineProps`/`defineEmits` Explicitly Imported

In `SubscriptionModal.vue` and `SubscriptionsPage.vue`:

```js
import { ref, watch, defineProps, defineEmits } from 'vue';
```

`defineProps` and `defineEmits` are **compiler macros** since Vue 3.3 — they are auto-available in `<script setup>` and should **not** be imported. This generates deprecation warnings.

### 6.2 Duplicate `formatDate` Function

The exact same function is copy-pasted into three components:

- `DashboardPage.vue`
- `SubscriptionsPage.vue`
- `HistoryPage.vue`

```js
const formatDate = (dateString) => {
  const options = { year: 'numeric', month: 'long', day: 'numeric' };
  return new Date(dateString).toLocaleDateString(undefined, options);
};
```

Should be extracted to a shared utility (`utils/format.ts`).

### 6.3 `needsAuth` Property Defined but Never Used

In `api.ts`:
```ts
interface FetchOptions extends RequestInit {
  needsAuth?: boolean;  // ← defined
}
```

The `fetchApi` function never checks `needsAuth`. It's dead code.

### 6.4 Aggressive Redirect on 401

```ts
if (response.status === 401) {
  window.location.href = '/login';  // ← hard page reload
  throw new Error('Unauthorized');
}
```

Uses `window.location.href` instead of the Vue Router, causing a full page reload and loss of app state. Should use the router's `push('/login')`.

### 6.5 `any` Types Everywhere in `api.ts`

```ts
login: (credentials: any) => ...
updateUser: (userData: any) => ...
updatePassword: (passwords: any) => ...
createSubscription: (subData: any) => ...
updateSubscription: (id: string | number, subData: any) => ...
```

No TypeScript interfaces/types are defined for API request/response shapes. The entire API layer provides zero type safety.

### 6.6 Authentication State via `localStorage`

```ts
localStorage.setItem('isLoggedIn', 'true');
```

This can be trivially spoofed (`localStorage.setItem('isLoggedIn', 'true')` in the console). While the backend still validates the session cookie, it means the router guard offers no real protection — a user can navigate to "protected" pages and see empty/error states instead of being properly redirected.

### 6.7 Pinia Installed But Not Used

Pinia is installed and initialized in `main.ts` but no store is used by any component. The only store file (`counter.ts`) is scaffolding. Auth state, subscription data, and user data are all managed with local `ref()` in each component — a good use case for Pinia stores to share state.

---

## 7. Security Concerns

### 7.1 Hardcoded Session Secret (HIGH)

Both compose files use `SESSION_SECRET: supersecret`. This should be a strong, randomly generated value injected at deploy time.

### 7.2 Hardcoded Database Credentials (HIGH)

```yaml
POSTGRES_USER: sub_user
POSTGRES_PASSWORD: sub_pass
```

Should use Docker secrets or environment variable injection.

### 7.3 No Rate Limiting on Login (MEDIUM)

The login endpoint has no rate limiting, enabling brute-force attacks. Use `express-rate-limit` or similar.

### 7.4 No CSRF Protection (MEDIUM)

Session-based auth without CSRF tokens is vulnerable to cross-site request forgery. While `sameSite: 'lax'` provides some protection, it's not sufficient for POST/PUT/DELETE from other origins.

### 7.5 Cookie Not Marked `secure` (LOW)

The session cookie doesn't set `secure: true` when served over HTTPS (in production). Should be conditional:
```js
secure: process.env.NODE_ENV === 'production'
```

### 7.6 User Email Logged on Failed Login (LOW)

```js
console.log(`Login failed: ${email}`);
```

In production logs, this leaks which email addresses attempted login.

---

## 8. Logical / Domain Model Flaws

### 8.1 Subscription "Active" Logic Is Fundamentally Wrong (HIGH)

The current active/expired logic:
```sql
subscription_type = 'monthly' AND start_date + interval '1 month' >= NOW()
```

This means a monthly subscription started on 2024-01-15 becomes "expired" on 2024-02-15, regardless of whether the user cancelled it. **Recurring subscriptions don't work this way** — they renew until explicitly cancelled.

**The model is missing:**
- A `cancelled_at` or `end_date` column
- Renewal tracking
- The concept of "active until cancelled"

With the current model, every subscription automatically expires after one period and moves to history.

### 8.2 No User Registration

The app seeds a single user. There is no registration endpoint. This is documented in the requirements as a "single-user system" but the database schema supports multiple users (`user_id` foreign key). The design is inconsistent.

### 8.3 Price Stored as `REAL` in SQLite

SQLite's `REAL` type uses IEEE 754 floating point, which cannot precisely represent values like `19.99`. This can cause display issues like `$19.990000000000002`. PostgreSQL correctly uses `NUMERIC(10,2)`.

### 8.4 No Timezone Handling

- SQLite stores dates as `TEXT` with `CURRENT_TIMESTAMP`
- PostgreSQL stores dates as `TIMESTAMP WITH TIME ZONE`
- The frontend creates dates with `new Date(dateString)` which is timezone-dependent
- No consistent timezone strategy exists

---

## 9. Testing

### 9.1 Current State: Zero Test Coverage

| Category | Status |
|----------|--------|
| Backend unit tests | **None** — no test framework installed |
| Backend integration tests | **None** |
| Frontend unit tests (vitest) | **Configured but zero test files exist** |
| Frontend E2E tests (cypress) | **One scaffolding test** that asserts `h1` contains "You did it!" — this text is never rendered by the app |
| Smoke test | **Broken** — uses wrong port (4567 vs 3000) |

### 9.2 Backend Testing Recommendations

1. **Install a test framework:** Add `vitest` or `jest` to the backend.
2. **Unit test the database adapters:** Test `sqlite.js` and `postgres.js` query/run functions independently (use a test database or in-memory SQLite).
3. **Unit test middleware:** Test `requireAuth` with mocked req/res objects.
4. **Unit test validation:** Test all validation rules with valid/invalid inputs.
5. **Integration test routes with supertest:**
   - Auth: login with valid/invalid credentials, logout, session persistence
   - User: get/update profile, change password
   - Subscriptions: full CRUD, authorization checks (can't edit other user's subs)
6. **Test both database backends:** Run the full suite against both SQLite and PostgreSQL (e.g., using a matrix in CI).
7. **Add a `test` script** to `package.json` that actually runs tests.

### 9.3 Frontend Testing Recommendations

1. **Component tests with vitest + @vue/test-utils:**
   - `LoginPage.vue`: form validation, error display, successful login redirect
   - `SubscriptionModal.vue`: add vs. edit mode, form submission, emit events
   - `DashboardPage.vue`: loading/error/data states, summary calculations
   - `SubscriptionsPage.vue`: table rendering, delete confirmation, modal open/close
   - `ProfilePage.vue`: form population, validation, success message
2. **Mock `api.ts`** in component tests using `vi.mock()`.
3. **E2E tests with Cypress:** Replace the scaffolding test with real flows:
   - Login → see dashboard → verify subscription count
   - Add subscription → verify it appears in the list
   - Edit subscription → verify changes persist
   - Delete subscription → verify removal
   - Profile update flow
   - Password change flow
   - Logout → verify redirect to login

### 9.4 Testing Infrastructure

1. **Add CI/CD pipeline** (GitHub Actions) to run lint, type-check, unit tests, and E2E tests on every PR.
2. **Add code coverage reporting** for both backend and frontend.
3. **Fix the smoke test** — correct the port and ensure it runs as part of CI.

---

## 10. Prioritized Improvement List

### P0 — Critical (App is broken / data integrity at risk)

| # | Issue | Location | Effort |
|---|-------|----------|--------|
| 1 | **Remove scaffolding CSS** — `grid-template-columns: 1fr 1fr` and `body { display: flex; place-items: center }` destroy the layout on desktop | `frontend/src/assets/main.css` | 5 min |
| 2 | **Fix update/delete 404 check** — `&&` should be `||` (or use nullish coalescing) | `backend/src/routes/subscriptions.js` (2 locations) | 5 min |
| 3 | **Add PostgreSQL session table creation** — `createTableIfMissing: true` | `backend/src/index.js` | 5 min |
| 4 | **Fix smoke test port** — change 4567 to 3000 | `smoke_test.sh` | 1 min |
| 5 | **Fix port inconsistency** — align `compose.yaml` port with docs and postgres variant | `compose.yaml`, `README.md` | 2 min |

### P1 — High (Major code quality / security / correctness)

| # | Issue | Location | Effort |
|---|-------|----------|--------|
| 6 | **Abstract SQL dialect differences into adapters** — remove all `process.env.DB_TYPE` checks from routes/schema/seed | `backend/src/db/*.js`, all routes | 2-3 hrs |
| 7 | **Re-throw errors in schema/seed** — don't let the server start with no tables | `backend/src/db/schema.js`, `seed.js` | 10 min |
| 8 | **Fix dark mode color conflicts** — use CSS variables instead of hardcoded colors in components | All `.vue` files with hardcoded colors | 30 min |
| 9 | **Fix `v-if` state chains** — use `v-if`/`v-else-if`/`v-else` for loading/error/data | 4 view components | 15 min |
| 10 | **Remove `defineProps`/`defineEmits` imports** — they are compiler macros | `SubscriptionModal.vue`, `SubscriptionsPage.vue` | 5 min |
| 11 | **Externalize session secret** — use env var or Docker secrets, not hardcoded values | `compose.yaml`, `compose.postgres.yaml` | 10 min |
| 12 | **Add rate limiting to login** | `backend/src/routes/auth.js` | 15 min |
| 13 | **Make SQLite adapter async** — wrap in Promises for consistent behavior with postgres | `backend/src/db/sqlite.js` | 20 min |

### P2 — Medium (Code smells / maintainability / DX)

| # | Issue | Location | Effort |
|---|-------|----------|--------|
| 14 | **Add TypeScript to Vue components** — add `lang="ts"` and proper types | All `.vue` files | 1-2 hrs |
| 15 | **Define API types** — replace `any` with interfaces in `api.ts` | `frontend/src/services/api.ts` | 30 min |
| 16 | **Extract `formatDate` to utility** | `frontend/src/utils/format.ts` | 10 min |
| 17 | **Remove unused scaffolding files** — TheWelcome, WelcomeItem, icons, counter store | `frontend/src/components/`, `frontend/src/stores/` | 5 min |
| 18 | **Add `start`/`dev` scripts to backend** | `backend/package.json` | 2 min |
| 19 | **Use Vue Router for 401 redirect** instead of `window.location.href` | `frontend/src/services/api.ts` | 15 min |
| 20 | **Use Pinia for shared state** — auth state, user data, subscription cache | Create proper stores | 1-2 hrs |
| 21 | **Make CORS origins configurable** via environment variable | `backend/src/index.js` | 10 min |
| 22 | **Add proper graceful shutdown** — handle SIGTERM/SIGINT | `backend/src/index.js` | 15 min |
| 23 | **Remove `needsAuth` dead code** from FetchOptions | `frontend/src/services/api.ts` | 2 min |
| 24 | **Fix HTML title** | `frontend/index.html` | 1 min |
| 25 | **Add global error handler middleware** to Express | `backend/src/index.js` | 10 min |

### P3 — Low (Nice-to-have / polish)

| # | Issue | Location | Effort |
|---|-------|----------|--------|
| 26 | **Add form/button styling** — consistent design system | `frontend/src/assets/` | 1-2 hrs |
| 27 | **Add responsive design** — mobile-friendly tables, hamburger nav | Frontend views | 2-3 hrs |
| 28 | **Fix subscription domain model** — add `end_date`/`cancelled_at` | DB schema, backend, frontend | 3-4 hrs |
| 29 | **Use NUMERIC for SQLite prices** or store as integer cents | Backend schema, seed | 30 min |
| 30 | **Add structured logging** (pino/winston) | Backend | 30 min |
| 31 | **Add CSRF protection** | Backend (csurf or similar) | 1 hr |
| 32 | **Add pagination** to subscription lists | Backend + frontend | 1-2 hrs |

### P4 — Testing (Foundational — should run in parallel with above)

| # | Issue | Location | Effort |
|---|-------|----------|--------|
| 33 | **Install backend test framework** (vitest + supertest) | `backend/package.json` | 15 min |
| 34 | **Write backend route integration tests** | `backend/src/__tests__/` | 3-4 hrs |
| 35 | **Write frontend component tests** | `frontend/src/__tests__/` | 3-4 hrs |
| 36 | **Replace Cypress scaffolding test with real E2E flows** | `frontend/cypress/e2e/` | 2-3 hrs |
| 37 | **Add GitHub Actions CI pipeline** | `.github/workflows/` | 1-2 hrs |
| 38 | **Test PostgreSQL variant in CI** (docker compose based) | CI pipeline | 1 hr |

---

## Summary Statistics

| Category | Count |
|----------|-------|
| Critical bugs (P0) | 5 |
| High-priority issues (P1) | 8 |
| Medium-priority issues (P2) | 12 |
| Low-priority issues (P3) | 7 |
| Testing gaps (P4) | 6 |
| **Total** | **38** |

**Estimated total effort to remediate all issues: ~25–35 developer hours**

The top 5 fixes (P0) can be completed in under 20 minutes and would make the application functional. The P1 items should follow immediately to establish code quality standards before further feature development.
