
## Critical & High-Priority Issues

### C1 — CI PostgreSQL Test Job Runs SQLite Tests Instead

**Severity: CRITICAL** | File: `.github/workflows/ci.yml` (line 96) + `backend/package.json` (line 9)

In the CI workflow, the `backend-test-postgres` job runs:

```yaml
- name: Run Postgres Integration Tests
  run: cd backend && npm test
```

But `npm test` in `backend/package.json` resolves to:

```json
"test": "npm run test:sqlite"
```

Which expands to:

```sh
DB_TYPE=sqlite vitest run -c vitest.sqlite.js
```

The inline `DB_TYPE=sqlite` **overrides** the job-level `DB_TYPE: postgres` environment variable. This means the CI's PostgreSQL job is silently running SQLite tests against a SQLite in-memory database, while the PostgreSQL service sits idle and unused.

**Fix:** Change the CI step to `cd backend && npm run test:postgres`.

---

### C2 — Session Not Regenerated on Login (Session Fixation)

**Severity: HIGH** | File: `backend/src/routes/auth.js` (line 32)

After successful authentication, the server sets `req.session.userId = user.id` on the existing session without calling `req.session.regenerate()`. This means the session ID remains the same from before login, which enables **session fixation attacks** — an attacker who sets a known session ID cookie before the victim logs in can hijack the authenticated session.

The CSRF token is regenerated post-login (good), but the session itself is not.

**Fix:**

```js
req.session.regenerate((err) => {
  if (err) return res.status(500).json({ message: 'Session error.' });
  req.session.userId = user.id;
  const token = generateCsrfToken(req, res);
  res.json({ message: 'Login successful.', token });
});
```

---

### C3 — SQLite Adapter Missing COALESCE in Summaries Query

**Severity: HIGH** | File: `backend/src/db/sqlite.js` (line 122–131)

The SQLite `getSubscriptionSummaries` function does not wrap `SUM()` in `COALESCE()`:

```sql
SUM(CASE WHEN subscription_type = 'monthly' THEN price ELSE 0 END) as total_monthly_cost
```

When there are no matching rows, `SUM()` returns `null` in SQLite. The PostgreSQL adapter correctly uses `COALESCE(..., 0)`. This means the frontend receives `null` instead of `0` for users with no active subscriptions, potentially causing display issues or runtime errors.

**Fix:** Add `COALESCE()` wrappers matching the PostgreSQL adapter, and return parsed integers.

---

## Security Issues

### S1 — Hardcoded Fallback Session Secret

**File:** `backend/src/index.js` (line 20), `backend/src/middleware/csrf.js` (line 3)

```js
const sessionSecret = process.env.SESSION_SECRET || 'test-secret';
```

If `SESSION_SECRET` is not set in production, the app silently falls back to `'test-secret'`. This makes all sessions predictable and forgeable. The Docker Compose files require `SESSION_SECRET` via `${SESSION_SECRET:?...}`, but running the app outside Docker (e.g., `node src/index.js`) has no such guard.

**Recommendation:** Throw an error at startup if `SESSION_SECRET` is not set and `NODE_ENV === 'production'`. Also, the secret is duplicated in `index.js` and `csrf.js` — it should be defined once and shared.

### S7 — No Input Length Limits on Backend

**File:** `backend/src/middleware/validate.js`

Validation checks format (email, date, enum) but not length. Fields like `company_name`, `description`, and `zipcode` have no maximum length constraint, allowing potentially very large payloads to be stored.

---

## Bugs & Logical Flaws

### B1 — Inconsistent Return Values Between DB Adapters

**Files:** `backend/src/db/sqlite.js`, `backend/src/db/postgres.js`

| Function | SQLite returns | PostgreSQL returns |
|---|---|---|
| `run()` | `{ changes, lastInsertRowid }` | Full `pg` result `{ rows, rowCount, ... }` |
| `insertUser()` | Result of `findUserById()` | `result.rows[0]` via RETURNING |
| `insertSubscription()` | Result of separate SELECT | `result.rows[0]` via RETURNING |
| `countActiveSubscriptions()` | Raw integer | `parseInt(rows[0].count)` |

Route handlers compensate with `(result.changes ?? result.rowCount)`, which works but is fragile. If a new adapter is added or the pg driver changes return shapes, this logic breaks silently.

**Recommendation:** Normalize return values via a common interface in each adapter.

### B2 — `SubscriptionCreate` Type Includes `cancelled_at`

**File:** `frontend/src/types/index.ts` (line 55)

```ts
export type SubscriptionCreate = Omit<Subscription, 'id' | 'user_id' | 'created_at'>;
```

This type still includes `cancelled_at`, which should never be set during creation. When editing an existing subscription via the modal, `form.value` is spread (which may contain `cancelled_at` from the source subscription), sending it to the backend.

**Fix:** `Omit<Subscription, 'id' | 'user_id' | 'created_at' | 'cancelled_at'>`

### B5 — No Pagination in History Page

**File:** `frontend/src/views/HistoryPage.vue`

The `HistoryPage` fetches subscription history without pagination controls, even though the backend supports pagination via `?page=` and `?limit=` queries. If a user has many cancelled subscriptions, all are fetched on a single page.


---

## Code Smells & Quality Issues

### Q1 — Duplicate Session Secret Definition

**Files:** `backend/src/index.js` (line 20), `backend/src/middleware/csrf.js` (line 3)

The session secret is independently read from `process.env` in two files with the same fallback. This is a DRY violation and a maintenance hazard — changing the fallback in one file but not the other would cause subtle CSRF failures.

**Fix:** Define it once in a shared config module.

### Q2 — ESLint Config Uses Jest Globals

**File:** `backend/eslint.config.mjs` (line 6)

```js
{languageOptions: { globals: {...globals.node, ...globals.jest} }}
```

The project uses Vitest, not Jest. While Vitest's globals are similar, this should reference `globals.vitest` or use `vitest/globals` for correctness.

### Q3 — Inconsistent Template Indentation in SubscriptionsPage

**File:** `frontend/src/views/SubscriptionsPage.vue` (lines 30–44)

The template has severely inconsistent indentation — some sections use 2 spaces, others jump to 16+ spaces:

```vue
          </tbody>
                        </table>
                      </div>
                      <p v-else>No active subscriptions.</p>
                
                      <div class="pagination" v-if="totalPages > 1">
```

This suggests copy-paste formatting issues and makes the template hard to read.

### Q4 — Unused `from` Parameter in Router Guard

**File:** `frontend/src/router/index.ts` (line 67)

```ts
router.beforeEach((to, from, next) => {
```

The `from` parameter is declared but never used. Should use `_from` or destructure only needed params.

### Q5 — Frontend Version is `"0.0.0"`

**File:** `frontend/package.json` (line 3)

The backend is at `"1.0.0"` while the frontend is at `"0.0.0"`. For a monorepo, versions should be consistent or at least meaningful.

### Q7 — `vite-plugin-vue-devtools` Active in Production Builds

**File:** `frontend/vite.config.ts` (line 12)

```ts
plugins: [vue(), vueJsx(), vueDevTools()]
```

The Vue DevTools plugin is unconditionally included. It should only be enabled in development mode to reduce bundle size and prevent information leakage.

### Q8 — Hardcoded `$` Currency Symbol

**Files:** `DashboardPage.vue`, `SubscriptionsPage.vue`, `HistoryPage.vue`

Currency is hardcoded as `$` in templates. No internationalization or localization support exists. The `formatPrice` utility could incorporate a currency parameter.

default should be euro symbol

### Q9 — Sleep Hack in test-postgres.js

**File:** `scripts/test-postgres.js` (line 31)

```js
spawnSync('node', ['-e', 'setTimeout(()=>{}, 1000)']); // Sleep 1s
```

Using a Node.js subprocess to sleep is inelegant. A simple synchronous delay or `Atomics.wait` would be cleaner:

```js
Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 1000);
```


---

## Testing Gaps

### T1 — Empty Middleware Test Directory

**Directory:** `backend/src/__tests__/middleware/`

No tests exist for:
- `auth.js` (requireAuth middleware)
- `csrf.js` (CSRF configuration)
- `rateLimit.js` (rate limiter configuration)
- `validate.js` (validation rules and middleware)

These are security-critical middleware components that deserve direct unit tests.

### T2 — No Backend Test Cleanup for Route Tests

**File:** `backend/src/__tests__/setup.js`

The test setup creates a temporary database at `data/test_${Date.now()}.db` but has no `afterAll` hook to close the DB or delete the file. Only `sqlite.test.js` properly cleans up its test database. Failed test runs will leave orphaned database files in `backend/data/`.

### T3 — No Tests for Edge Cases

Missing test coverage for:
- Updating/deleting a non-existent subscription (invalid ID)
- Accessing subscriptions of another user (authorization boundary)
- Concurrent requests / race conditions
- Very long input strings
- SQL injection attempts (parameterized queries should handle this, but worth verifying)
- NotFoundPage component
- Expired session behavior

### T4 — No Frontend Integration Tests for Error States

Frontend tests mock API calls but don't test:
- Network failure scenarios (fetch throws)
- Non-JSON error responses
- Session expiry during use (401 handler)
- CSRF token refresh flow

### T5 — E2E Tests Mutate Shared State Without Isolation

**Files:** `frontend/cypress/e2e/subscriptions.cy.ts`, `profile.cy.ts`

E2E tests modify shared data (rename Netflix, cancel Spotify, change password) and rely on manual cleanup within the same test. If a test fails mid-execution, cleanup doesn't happen, breaking subsequent tests. Tests should either use isolated data or have a `beforeEach` reset mechanism.

### T6 — Pagination Test Assertion May Be Fragile

**File:** `backend/src/__tests__/routes/subscriptions.test.js` (line 25–40)

The pagination test creates 5 subscriptions and then requests page 2 with limit 5, asserting that `subscriptions.length === 5`. This only works if there are already at least 5 subscriptions from the seed data — a brittle coupling to seed state.

---

## DevOps & Infrastructure

### D1 — Two Inconsistent `.env.example` Files

**Files:** `.env.example`, `backend/.env.example`

| Variable | Root | Backend |
|---|---|---|
| `SESSION_SECRET` | `change-me-to-a-random-string` | `supersecret` |
| `CORS_ORIGINS` | Present | Missing |
| `PORT` | Present | Present |
| `POSTGRES_PASSWORD` | `change-me` | `sub_pass` |

Developers may use either file and get different defaults. The root version is more complete and should be canonical.

**Recommendation:** Remove `backend/.env.example` or keep it as a symlink.

### D2 — Backend Docker Image Includes Dev Dependencies

**File:** `backend/Dockerfile`

```dockerfile
RUN npm install
```

This installs both production and dev dependencies (including vitest, eslint, nodemon, etc.) in the production image. Should be:

```dockerfile
RUN npm ci --omit=dev
```

### D3 — No `.dockerignore` Visible

Docker builds likely copy `node_modules`, test files, and other unnecessary files into the image context, slowing builds and increasing image size.

### D4 — Docker Compose Backend Port Exposure Inconsistency

- `compose.yaml` maps port `3000:3000`
- `compose.postgres.yaml` does **not** map backend ports

This inconsistency means direct API access works with SQLite compose but not Postgres compose. Both should be consistent (either both expose or neither does).

---

## Frontend-Specific Issues

### F1 — `updateUser` Sends Full User Object Including `id`

**File:** `frontend/src/views/ProfilePage.vue` (line 62)

```ts
await api.updateUser(user.value);
```

This sends the full `User` object (including `id`) to the API. While the backend ignores `id` in the update, the `UserUpdate` type is `Omit<User, 'id'>` — so this is also a TypeScript type violation that isn't caught because the `User` type is structurally compatible.

### F2 — No Modal Accessibility

**File:** `frontend/src/components/SubscriptionModal.vue`

The modal lacks:
- `role="dialog"` and `aria-modal="true"` attributes
- Focus trapping (focus can escape to elements behind the backdrop)
- Keyboard support (Escape key to close)
- Screen reader announcements

### F3 — `confirm()` Used for Delete/Cancel Actions

**Files:** `SubscriptionsPage.vue`, `HistoryPage.vue`

Native `window.confirm()` is used for destructive actions. This is non-customizable, blocks the thread, and has no consistent styling with the rest of the app. A custom confirmation modal would be more appropriate.

---

## Backend-Specific Issues

### BE1 — Health Check Doesn't Verify Database

**File:** `backend/src/index.js` (line 35–37)

```js
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});
```

The health check always returns OK regardless of database state. Docker Compose and load balancers use this to determine readiness, so a DB failure won't be detected.

**Fix:** Add a simple DB query (e.g., `SELECT 1`) to verify connectivity.

### BE2 — No Graceful Handling of Database Connection Loss

If the database connection drops during runtime, every request will fail with an unhandled error. There's no reconnection logic, circuit breaker, or connection pool health monitoring.

### BE3 — `express-validator` Body Import Unused in Context

**File:** `backend/src/routes/user.js` (line 3)

```js
const { body } = require('express-validator');
```

The `body` import is used in `userUpdateValidation` but was also imported in `validate.js`. While not technically unused here, the validation rules for the user route are split across two files, making the validation pipeline harder to follow.

---

