# Implementation Plan — Subscription Tracker Remediation

This plan outlines the steps required to address the issues identified in `CODE_REVIEW.md`, organized into phases based on priority and logical grouping.

## Phase 1: Stabilization & Security (Priority 1)
*Goal: Fix critical bugs, security holes, and the most jarring visual issues.*

- [x] **DB Adapter Lazy Loading (S1):** Refactor `backend/src/db/index.js` to conditionally require `sqlite.js` or `postgres.js` based on `DB_TYPE`.
- [x] **Graceful Shutdown (B2):** Update `backend/src/index.js` to properly await `server.close()` before closing the DB and calling `process.exit()`.
- [x] **Frontend CSS Cleanup (F1):** Remove leftover Vue template styles (`a, .green` and unused variables) from `main.css` and `base.css`.
- [x] **Page-Level Styling (F2, F4, F5, F6):**
    - Add basic container/card styling to `LoginPage`, `DashboardPage`, `ProfilePage`, and `ChangePasswordPage`.
    - Add variant styles for destructive buttons (Cancel/Delete).
    - Ensure login errors use the `.error` class.
    - Fix dark mode link contrast in `App.vue`.
- [x] **Template Indentation (F3):** Fix broken indentation and tag structure in `SubscriptionsPage.vue` and `HistoryPage.vue`.
- [x] **CSRF Race Condition (F7):** Await `initCsrf()` in `frontend/src/main.ts` before mounting the Vue application.
- [x] **Test Security (SEC1, T5):** Re-enable `doubleCsrfProtection` in test mode and update backend tests to properly fetch and include CSRF tokens.

## Phase 2: Reliability & Core Logic (Priority 2)
*Goal: Improve data integrity, performance, and basic UX consistency.*

- [x] **Cost Aggregation (B1):** Update `getActiveSubscriptions` route to use SQL `SUM` for totals instead of fetching and reducing all rows in memory.
- [x] **Session Synchronization (F8):** Implement a `checkSession` method in the auth store to validate the session with the backend on app initialization.
- [x] **Email Uniqueness (B4):** Add a check/conflict handling for email updates in `PUT /api/user` to return a 409 status on duplication.
- [x] **Docker Resilience (D3, D4):**
    - Add healthchecks to backend and postgres services in `compose.yaml` files.
    - Use `condition: service_healthy` for `depends_on`.
    - Add `restart: unless-stopped` policy.
- [x] **History Metadata (F10, B5):**
    - Add `cancelled_at` to the frontend `Subscription` type.
    - Display cancellation dates on the History page.
    - Ensure consistent insert return behavior between DB adapters.
- [x] **Production Safety (B3):** Gate `seedData()` execution behind `NODE_ENV !== 'production'`.

## Phase 3: Expanding Coverage & Features (Priority 3)
*Goal: Fill testing gaps and add missing standard web features.*

- [x] **Backend Testing Gaps (T1, T2, T3, T4, T7, T8):**
    - Add tests for `user` routes.
    - Add tests for `history`, `delete`, and `update` subscription endpoints.
    - Add unit tests for DB adapters and middleware (auth, validation, rate limit).
    - Add global error handler tests.
- [x] **Frontend Testing Gaps (T9, T10):**
    - Add component tests for `SubscriptionsPage`, `HistoryPage`, `ProfilePage`, and `ChangePasswordPage`.
    - Add unit tests for `auth` store, router guards, and `format` utilities.
- [x] **E2E & CI Improvements (D5, D7, T11):**
    - Integrate Cypress E2E tests into the GitHub Actions CI pipeline.
    - (Partial) Add test coverage reporting for both frontend and backend.
    - Implement proper test isolation (setup/teardown) to prevent state leakage.
- [x] **Navigation & Pagination (F9, F11):**
    - Implement a 404 Catch-all route.
    - Add basic pagination controls to the Subscriptions and History pages.

## Phase 4: Best Practices & Polish (Priority 4)
*Goal: Long-term maintainability, security hardening, and architectural cleanup.*

- [ ] **Docker Optimization (D1, D2):**
    - Use `npm ci` for backend builds.
    - Optimize backend Dockerfile to skip SQLite-specific build tools when not needed.
- [ ] **Security Hardening (SEC2, SEC3, SEC4, SEC5):**
    - Separate CSRF secret from Session secret.
    - Remove insecure session secret fallbacks.
    - Switch to a Redis-backed rate limiter (optional/infrastructure-dependent).
    - Implement basic input sanitization as defense-in-depth.
- [ ] **Code Quality (CS1, CS2, CS4, S2, S3, S4):**
    - Extract magic numbers to constants.
    - Standardize validation on the login route.
    - Consolidate DB schemas to avoid duplication.
    - Refactor session store initialization into the DB adapter.
    - (Optional) Introduce API versioning (`/api/v1/`).
- [ ] **Test DRYing (T11/38):** Create a Cypress custom command for login.
