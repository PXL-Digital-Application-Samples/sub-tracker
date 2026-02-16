# Code Review — Subscription Tracker

**Reviewer:** GitHub Copilot  
**Date:** 2026-02-16  
**Scope:** Full codebase review — architecture, backend, frontend, testing, infrastructure

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Architecture & Project Structure](#architecture--project-structure)
3. [Backend Issues](#backend-issues)
4. [Frontend Issues](#frontend-issues)
5. [Testing Issues](#testing-issues)
6. [Infrastructure & DevOps Issues](#infrastructure--devops-issues)
7. [Security Issues](#security-issues)
8. [Prioritized Improvement List](#prioritized-improvement-list)

---

## Executive Summary

The Subscription Tracker is a functional CRUD application with a sound high-level architecture (Vue 3 + Express 5 + DB adapter pattern). However, the codebase has **significant problems across every layer** that would prevent it from being production-ready. The most impactful issues are:

- The **frontend renders poorly** due to nearly absent page-level styling and conflicting CSS inherited from the default Vue template.
- The **database adapter pattern is broken** — both SQLite and PostgreSQL modules are always loaded and initialized, even when only one is configured.
- **PostgreSQL support has never been properly tested** — the adapter leaks implementation details and the CI job likely fails silently.
- **CSRF protection is completely disabled in tests**, meaning this critical security feature is effectively untested.
- **Test coverage is shallow** — empty test directories, skipped tests, and large portions of the API (user routes, history, delete, update) have zero test coverage.

---

## Architecture & Project Structure

### What's Good

- Clean monorepo structure with clear `frontend/` and `backend/` separation.
- Database adapter pattern (`sqlite.js` / `postgres.js`) is a solid idea for multi-DB support.
- Session-based auth with CSRF protection is the right pattern for this kind of app.
- Multi-stage Docker build for frontend (Node build → Nginx) is efficient.
- CI pipeline exists with separate jobs for backend, frontend lint, and frontend tests.

### Structural Problems

#### S1. Database Adapter Eagerly Loads Both Drivers (Critical)

**File:** `backend/src/db/index.js`

```js
const sqlite = require('./sqlite');
const postgres = require('./postgres');
```

Both modules are `require()`d at the top level. Since `sqlite.js` line 5 executes `new Database(dbPath)` on import, **a SQLite database file is always created** — even when `DB_TYPE=postgres`. Similarly, when using SQLite, the `pg` Pool constructor runs and may attempt a TCP connection to a non-existent PostgreSQL server.

**Fix:** Use lazy/conditional loading:
```js
function getDb() {
  if (process.env.DB_TYPE === 'postgres') {
    return require('./postgres');
  }
  return require('./sqlite');
}
module.exports = getDb();
```

#### S2. Schema Duplication Across Adapter Files

The `createUsersTable()` and `createSubscriptionsTable()` functions are duplicated in both `sqlite.js` and `postgres.js`. When the schema changes, both files must be updated in lockstep. These should either:
- Live in `schema.js` with dialect-aware SQL, or
- Use a migration tool (e.g., `knex`, `drizzle-orm`).

#### S3. Session Store Initialization Leaks Adapter Internals

**File:** `backend/src/index.js` (lines 40-42)

```js
const sessionStore = process.env.DB_TYPE === 'postgres'
  ? new PgSession({ pool: db.pool, createTableIfMissing: true })
  : new SqliteStore({ client: db.db });
```

This references `db.pool` and `db.db`, which are raw database handles leaked through the adapter. The adapter should provide a `getSessionStore()` factory method instead.

#### S4. No API Versioning

All routes are under `/api/` with no version prefix (`/api/v1/`). This makes non-breaking API evolution difficult.

---

## Backend Issues

### Bugs

#### B1. `getActiveSubscriptions` Endpoint Fetches All Data Twice (Performance Bug)

**File:** `backend/src/routes/subscriptions.js` (lines 22-25)

```js
const allActive = await db.getActiveSubscriptions(req.session.userId, 1000, 0);
const total_monthly_cost = allActive.reduce(...)
const total_yearly_cost = allActive.reduce(...)
```

After fetching the paginated subscriptions, the endpoint fetches **all** active subscriptions again (limit 1000) just to compute cost summaries. This is:
- An N+1 style performance problem.
- Incorrect beyond 1000 subscriptions.
- Should use SQL aggregation: `SELECT SUM(price) ... WHERE subscription_type = 'monthly'`.

#### B2. `shutdown()` Doesn't Await Graceful Close

**File:** `backend/src/index.js` (lines 98-106)

```js
async function shutdown(signal) {
  if (server) {
    server.close(() => { ... });  // Callback-based, not awaited
  }
  if (db && db.close) {
    await db.close();             // DB closed before server finishes draining
  }
  process.exit(0);                // Exit before close callback fires
}
```

`process.exit(0)` is called immediately without waiting for `server.close()` to finish. Active requests will be terminated mid-flight and the DB connection closes before in-flight queries complete.

#### B3. Seed Data Always Runs in Production

**File:** `backend/src/index.js` (line 88)

```js
await seedData();
```

`seedData()` runs on every server start, including production. While it checks for existing data, production servers should not run seed logic. This should be gated by `NODE_ENV !== 'production'` or behind a CLI command.

#### B4. User Update Doesn't Handle Email Uniqueness

**File:** `backend/src/routes/user.js` (line 35)

`PUT /user` updates the email without checking if the new email is already taken by another user. This will cause an unhandled database UNIQUE constraint error, returning a raw 500 instead of a meaningful 409 Conflict.

#### B5. `insertSubscription` Return Inconsistency Between Adapters

- **SQLite (`sqlite.js`):** Does a second `SELECT` query using `result.lastInsertRowid` to return the inserted row.
- **PostgreSQL (`postgres.js`):** Uses `RETURNING *` in the INSERT statement and accesses `result.rows[0]`.

Both work, but the inconsistency means adapter-specific bugs could lurk. The SQLite approach also has a race condition risk in high-concurrency scenarios (though SQLite is single-writer by default).

### Code Smells

#### CS1. Magic Numbers Everywhere

- `10` for bcrypt rounds (auth.js, seed.js, user.js)
- `1000 * 60 * 60 * 24 * 7` for session max age
- `1000` for the "fetch all" limit in subscriptions
- `15 * 60 * 1000` and `10` for rate limit config

These should be named constants or config values.

#### CS2. No Input Validation on Login

**File:** `backend/src/routes/auth.js`

The login route only checks for presence of email and password (`if (!email || !password)`) but doesn't use `express-validator` for email format validation like other routes do.

#### CS3. `err: any` Used Extensively

Both backend and frontend catch errors typed as `any`, losing type information and error context.

#### CS4. Vitest Config Uses ESM in CommonJS Project

**File:** `backend/vitest.config.js`

```js
import { defineConfig } from 'vitest/config';
```

The backend uses `"type": "commonjs"` in package.json but the vitest config uses ESM `import`. This works because Vitest has its own module resolution, but it's inconsistent and confusing.

---

## Frontend Issues

### Critical Visual/Rendering Problems

These are the reasons the app "renders very ugly":

#### F1. Conflicting Default Vue Template CSS (Root Cause)

**File:** `frontend/src/assets/main.css` (lines 11-13)

```css
a,
.green {
  text-decoration: none;
  color: hsla(160, 100%, 37%, 1);  /* Bright green from Vue template */
  ...
}
```

This is **leftover CSS from the default Vue `create-vue` scaffold**. It makes ALL links (including nav links, "Change Password" link, etc.) bright green, conflicting with the blue `#007bff` theme used by buttons and the `nav a` rule in `App.vue`. The result: green links everywhere except in the nav (which has a more specific rule), creating a jarring visual inconsistency.

The `.green` class is never used anywhere in the codebase. The `--section-gap: 160px` variable in `base.css` is also unused Vue template boilerplate.

**Fix:** Remove the entire `a, .green` block and the unused `--section-gap` variable.

#### F2. Almost Zero Page-Level Styling

The following components have **completely empty** `<style scoped>` blocks or no styles at all:

| Component | Styles |
|---|---|
| `LoginPage.vue` | No `<style>` section |
| `DashboardPage.vue` | No `<style>` section |
| `ProfilePage.vue` | Empty `<style scoped>` |
| `ChangePasswordPage.vue` | Empty `<style scoped>` |

This means:
- The login form has no max-width, centering, or card-like container.
- The dashboard summary is plain unstyled text with a basic `<ul>`.
- Profile and password forms stretch to full width with no visual structure.
- No visual cards, panels, or containers to group content.

#### F3. Severely Broken Template Indentation

**Files:** `SubscriptionsPage.vue` (lines 10-36), `HistoryPage.vue` (lines 10-28)

These files have severely inconsistent indentation — mixing 2-space, 8-space, and 10-space indentation within the same template. This suggests copy-paste errors and makes the code very hard to read. Example from HistoryPage.vue:

```html
        <thead>
          <tr>            <!-- 10 spaces -->
            <th>Company</th>
        </thead>
                <tbody>   <!-- 16 spaces! -->
                  <tr ...>
                </tbody>                </table>
              </div>
              <p v-else>No historical subscriptions.</p>
            </template>  </div>  <!-- closing tags crammed together -->
```

#### F4. No Button Variants

All buttons use the same blue `#007bff` style from `base.css`. The "Cancel" and "Delete" buttons on the subscriptions page look identical to "Add" and "Edit". Destructive actions need visual differentiation (red/danger styling).

#### F5. Error Message on Login Not Styled

**File:** `LoginPage.vue` (line 16)

```html
<p v-if="error">{{ error }}</p>
```

The error paragraph doesn't use the `.error` CSS class defined in `base.css`, so errors appear as plain unstyled text.

#### F6. Dark Mode Link Colors Are Hardcoded

**File:** `App.vue` (line 80)

```css
nav a { color: #007bff; }
nav a.router-link-exact-active { color: #0056b3; }
```

These colors don't change in dark mode, creating poor contrast on dark backgrounds. They should use CSS variables.

### Logical/Functional Bugs

#### F7. `initCsrf()` Is Called But Not Awaited

**File:** `frontend/src/main.ts` (line 23)

```ts
initCsrf();  // async function, not awaited
```

`initCsrf()` is async (makes a fetch call) but is called without `await`. If the user interacts with the app before the CSRF token arrives, the first mutating request will fail with a CSRF validation error. This is a race condition.

#### F8. Auth State Is Client-Only (Out-of-Sync Risk)

**File:** `frontend/src/stores/auth.ts`

```ts
const isLoggedIn = ref(!!localStorage.getItem('isLoggedIn'));
```

Authentication state is stored purely in `localStorage`. There is no server-side session validation on app load. If the server session expires (after 7 days) but the user returns within that window, the app thinks they're logged in, renders the dashboard, and then immediately gets a 401 on the first API call — causing a flash of authenticated content before redirect.

**Fix:** Add a `checkSession()` method that calls `GET /api/user` on app init with `skip401Redirect: true`, clearing `isLoggedIn` if it fails.

#### F9. Pagination Is Never Used

The API supports pagination (`page`, `limit` query params) but the frontend service functions (`getActiveSubscriptions()`, `getSubscriptionHistory()`) never send pagination parameters. The UI always shows only the first 20 results with no pagination controls.

#### F10. `Subscription` Type Missing `cancelled_at`

**File:** `frontend/src/types/index.ts`

The `Subscription` interface doesn't include `cancelled_at`, so the History page can't display when a subscription was cancelled — a key piece of information for that view.

#### F11. No 404 / Catch-All Route

**File:** `frontend/src/router/index.ts`

There's no catch-all route for invalid URLs. Navigating to `/nonexistent` shows a blank page instead of a proper 404.

#### F12. `fetchApi` Header Merge Bug

**File:** `frontend/src/services/api.ts` (lines 36-46)

```ts
const defaultOptions: RequestInit = {
  credentials: 'include',
  headers,         // Local headers object
  ...fetchOptions, // Could override headers entirely
};
```

If any caller passes `headers` in options, it completely replaces the CSRF and Content-Type headers rather than merging them. While no current callers do this, the API is fragile.

---

## Testing Issues

### Backend Testing Gaps

#### T1. Empty Test Directories

`backend/src/__tests__/db/` and `backend/src/__tests__/middleware/` are **completely empty**. Zero tests for:
- Database adapter functions (query, insert, update, delete for both SQLite and PostgreSQL)
- `requireAuth` middleware
- `validate` middleware and validation rules
- `loginLimiter` rate limiting

#### T2. No User Route Tests

`GET /api/user`, `PUT /api/user`, and `PUT /api/user/password` have **no test coverage at all**. These are critical authenticated endpoints.

#### T3. No History Endpoint Tests

`GET /api/subscriptions/history` is fully implemented but never tested.

#### T4. No Update/Delete Subscription Tests

`PUT /api/subscriptions/:id` and `DELETE /api/subscriptions/:id` — zero tests.

#### T5. CSRF Test Is Skipped

**File:** `backend/src/__tests__/routes/subscriptions.test.js` (line 48)

```js
it.skip('POST /api/subscriptions - missing CSRF', async () => {
```

The test for CSRF enforcement is explicitly skipped. Since CSRF is completely disabled in test mode (`NODE_ENV=test` bypasses `doubleCsrfProtection` in `index.js`), CSRF protection has **never been verified** by any automated test.

#### T6. Poor Test Isolation

- All tests share a single database instance that persists between runs.
- `startServer()` is called once and cached (the `serverStarted` flag).
- No teardown/cleanup between test files or suites.
- Tests depend on seed data rather than creating isolated test fixtures.

This means tests can pass/fail depending on run order and leftover state.

#### T7. PostgreSQL Is Likely Untested

While CI has a `backend-test-postgres` job, the issue from S1 (both DB modules loading eagerly) means the SQLite `Database` constructor fires even when `DB_TYPE=postgres`. If `better-sqlite3` can't find its native module (common in CI), this job likely fails. Even if it passes, no tests specifically verify PostgreSQL-specific behavior (e.g., `RETURNING *`, `NOW()`, `parseInt` for count, `$1` placeholders).

#### T8. No Error Handler Test

The global error handler middleware in `index.js` is never tested. There's no test verifying that unhandled errors return proper 500 responses with appropriate message hiding in production.

### Frontend Testing Gaps

#### T9. Only 3 of 7 Views/Components Tested

| Component | Has Tests? |
|---|---|
| LoginPage | ✅ |
| DashboardPage | ✅ |
| SubscriptionModal | ✅ |
| SubscriptionsPage | ❌ |
| HistoryPage | ❌ |
| ProfilePage | ❌ |
| ChangePasswordPage | ❌ |
| App.vue (nav/logout) | ❌ |

#### T10. No Tests for Core Infrastructure

- **Router guard** (`beforeEach` in `router/index.ts`) — untested.
- **Auth store** (`stores/auth.ts`) — untested.
- **Format utilities** (`utils/format.ts`) — `formatDate` and `formatPrice` are completely untested despite being pure functions (the easiest things to test).
- **API service** (`services/api.ts`) — untested (CSRF logic, 401 handler, error handling).

#### T11. E2E Tests Minimal and Not in CI

- Only 2 Cypress spec files with 5 total tests.
- **E2E tests are not run in the GitHub Actions CI pipeline** — they only run via the local `test_all.sh` script.
- No Cypress custom `login` command despite login being repeated in every test.
- E2E tests don't clean up created data, so repeated runs may see stale state.

---

## Infrastructure & DevOps Issues

### Docker

#### D1. Backend Dockerfile Uses `npm install` Instead of `npm ci`

**File:** `backend/Dockerfile` (line 14)

`npm install` respects semver ranges and can produce different results on different builds. `npm ci` uses the exact lockfile for reproducible builds.

#### D2. Backend Dockerfile Installs SQLite Build Dependencies Unconditionally

**File:** `backend/Dockerfile` (line 4)

```dockerfile
RUN apk add --no-cache python3 make g++
```

These are needed for `better-sqlite3` native compilation, but they're installed even when using PostgreSQL. With proper lazy loading (S1 fix), the PostgreSQL image wouldn't need `better-sqlite3` at all, saving ~200MB in image size. Alternatively, separate Dockerfiles per DB type could be used.

#### D3. No Health Checks in Compose Files

Neither `compose.yaml` nor `compose.postgres.yaml` defines a `healthcheck` for the backend service. The frontend `depends_on: backend` only waits for the container to start, not for the HTTP server to be ready. This can cause the Nginx proxy to return 502 errors during startup.

The PostgreSQL compose also lacks a `depends_on` condition to wait for the Postgres health check:

```yaml
# Should be:
depends_on:
  postgres:
    condition: service_healthy
```

#### D4. No Restart Policy

Neither compose file sets `restart: unless-stopped` or similar, meaning containers that crash stay down.

### CI/CD

#### D5. No E2E Tests in CI

The GitHub Actions workflow runs backend tests, frontend lint, type-check, and unit tests — but **not** Cypress E2E tests. This is the most valuable test layer for a web app and it's only available locally.

#### D6. No Docker Build Verification in CI

CI doesn't verify that `docker compose build` succeeds, so Dockerfile regressions aren't caught.

#### D7. No Test Coverage Reporting

No coverage configuration or reporting in either backend or frontend test setups.

---

## Security Issues

#### SEC1. CSRF Protection Completely Bypassed in Tests

**File:** `backend/src/index.js` (lines 72-73)

```js
app.use('/api', process.env.NODE_ENV === 'test' ? (req, res, next) => next() : doubleCsrfProtection, userRouter);
```

When `NODE_ENV=test`, CSRF protection is replaced with a no-op passthrough. This means:
- CSRF protection is never tested.
- Bugs in CSRF configuration won't be caught until production.

**Fix:** Test against the real CSRF middleware. Update test setup to fetch and use CSRF tokens (the `createTestAgent` setup already fetches one but it's unused because protection is disabled).

#### SEC2. CSRF Secret Reuses Session Secret

**File:** `backend/src/index.js` (line 57)

```js
getSecret: () => sessionSecret,
```

The CSRF secret is the session secret. These should be independent secrets. If the session secret is compromised, CSRF protection is also broken.

#### SEC3. Session Secret Has Insecure Fallback

**File:** `backend/src/index.js` (line 20)

```js
const sessionSecret = process.env.SESSION_SECRET || 'test-secret';
```

If `SESSION_SECRET` is not set (e.g., misconfigured deployment), the app silently falls back to `'test-secret'`. The compose files use `${SESSION_SECRET:?...}` which prevents this, but running outside Docker could expose this.

#### SEC4. Rate Limiter Uses In-Memory Store

**File:** `backend/src/middleware/rateLimit.js`

`express-rate-limit` defaults to an in-memory store. In a multi-instance deployment (behind a load balancer), each instance has its own counter, effectively multiplying the limit by the instance count. Should use a Redis-backed store for production.

#### SEC5. No Input Sanitization

Validation exists (via `express-validator`) but there's no HTML/XSS sanitization. While Vue automatically escapes template interpolations (`{{ }}`), any future use of `v-html` or raw HTML rendering could introduce XSS. Adding sanitization at the API layer provides defense-in-depth.

---

## Prioritized Improvement List

### Priority 1 — Critical (Broken Functionality / Security)

| # | Issue | Category | Refs |
|---|---|---|---|
| 1 | Fix database adapter eager loading — both drivers initialize regardless of DB_TYPE | Bug | S1 |
| 2 | Fix frontend CSS — remove Vue template boilerplate (`a, .green` rule), add page-level styles for all views | Visual Bug | F1, F2, F4 |
| 3 | Fix template indentation in SubscriptionsPage.vue and HistoryPage.vue | Code Quality | F3 |
| 4 | Await `initCsrf()` before mounting the app to prevent CSRF race condition | Bug | F7 |
| 5 | Re-enable CSRF protection in tests instead of bypassing it | Security | SEC1, T5 |
| 6 | Add `.error` class to LoginPage error message | Visual Bug | F5 |
| 7 | Fix `shutdown()` to properly await server close before exiting | Bug | B2 |

### Priority 2 — High (Data Integrity / Reliability)

| # | Issue | Category | Refs |
|---|---|---|---|
| 8 | Use SQL aggregation for subscription cost summaries instead of fetching all rows | Performance | B1 |
| 9 | Add server-side session check on frontend app init | Auth Bug | F8 |
| 10 | Handle email uniqueness conflict in user update route (return 409) | Bug | B4 |
| 11 | Guard seed data behind `NODE_ENV !== 'production'` | Operational | B3 |
| 12 | Add health checks and `depends_on` conditions in Docker compose files | Infrastructure | D3 |
| 13 | Fix dark mode hardcoded link colors in nav | Visual Bug | F6 |
| 14 | Add `cancelled_at` to the frontend `Subscription` type and display it in history | Missing Feature | F10 |

### Priority 3 — Medium (Test Coverage / Quality)

| # | Issue | Category | Refs |
|---|---|---|---|
| 15 | Add tests for user routes (GET, PUT /user, PUT /user/password) | Testing | T2 |
| 16 | Add tests for subscription history, update, and delete endpoints | Testing | T3, T4 |
| 17 | Add tests for database adapter functions | Testing | T1 |
| 18 | Add tests for middleware (auth, validation, rate limiting) | Testing | T1 |
| 19 | Add frontend tests for SubscriptionsPage, HistoryPage, ProfilePage, ChangePasswordPage | Testing | T9 |
| 20 | Add tests for auth store, router guard, and format utilities | Testing | T10 |
| 21 | Add E2E tests to CI pipeline | CI/CD | D5, T11 |
| 22 | Improve test isolation — proper setup/teardown, no shared state | Testing | T6 |
| 23 | Add a 404 catch-all route | Missing Feature | F11 |
| 24 | Add frontend pagination controls | Missing Feature | F9 |

### Priority 4 — Low (Best Practices / Polish)

| # | Issue | Category | Refs |
|---|---|---|---|
| 25 | Use `npm ci` in backend Dockerfile | Best Practice | D1 |
| 26 | Separate CSRF secret from session secret | Security | SEC2 |
| 27 | Remove session secret fallback — fail fast if not set | Security | SEC3 |
| 28 | Extract magic numbers into named constants or config | Code Smell | CS1 |
| 29 | Add consistent email validation on login route | Code Smell | CS2 |
| 30 | Add TypeScript to the backend | Best Practice | CS4 |
| 31 | Eliminate schema duplication between sqlite.js and postgres.js | Architecture | S2 |
| 32 | Refactor session store init into the DB adapter | Architecture | S3 |
| 33 | Add API versioning (`/api/v1/`) | Architecture | S4 |
| 34 | Add restart policy to Docker compose files | Infrastructure | D4 |
| 35 | Optimize backend Docker image for PostgreSQL (skip SQLite deps) | Infrastructure | D2 |
| 36 | Add test coverage reporting | CI/CD | D7 |
| 37 | Add Docker build test to CI | CI/CD | D6 |
| 38 | Create Cypress `login` custom command to DRY up E2E tests | Testing | T11 |
| 39 | Use a Redis-backed rate limiter for multi-instance deployments | Security | SEC4 |
| 40 | Fix `fetchApi` header merge to properly deep-merge headers | Code Quality | F12 |

---

## Summary Statistics

| Category | Count |
|---|---|
| Critical issues | 7 |
| High priority issues | 7 |
| Medium priority issues | 10 |
| Low priority issues | 16 |
| **Total issues found** | **40** |

| Area | Issues |
|---|---|
| Backend bugs & smells | 10 |
| Frontend visual/rendering | 6 |
| Frontend logic bugs | 6 |
| Testing gaps | 11 |
| Security | 5 |
| Infrastructure/DevOps | 7 |
