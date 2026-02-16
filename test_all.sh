#!/bin/bash
# test_all.sh - AUTOMATED COMPREHENSIVE TEST SUITE

PROJECT_ROOT=$(pwd)
export NODE_ENV=test
export SESSION_SECRET=test-secret-123
export PORT=3000

echo "--------------------------------------------------"
echo "🚀 STARTING AUTOMATED TEST SUITE (LINT + SQLITE + POSTGRES + E2E)"
echo "--------------------------------------------------"

# 1. Cleanup
echo "🧹 Cleaning up..."
fuser -k 3000/tcp 2>/dev/null || true
fuser -k 4173/tcp 2>/dev/null || true
rm -f "$PROJECT_ROOT/backend/data/sub_tracker.db"
docker compose -f compose.postgres.yaml down -v 2>/dev/null || true

# 2. Linting (Mandatory)
echo "🔍 Running Linters..."
(cd backend && npm run lint) || { echo "❌ Backend linting failed!"; exit 1; }
(cd frontend && npm run lint) || { echo "❌ Frontend linting failed!"; exit 1; }
echo "✅ Linting Passed"

# 3. Backend Tests - SQLite
echo "🖥️  Running Backend Tests (SQLite)..."
cd "$PROJECT_ROOT/backend"
npm run test:sqlite || { echo "❌ SQLite backend tests failed!"; exit 1; }

# 4. Backend Tests - PostgreSQL
echo "🖥️  Running Backend Tests (PostgreSQL)..."
cd "$PROJECT_ROOT"
# FORCE REBUILD TO SYNC CODE CHANGES
docker compose -f compose.postgres.yaml build --no-cache backend
docker compose -f compose.postgres.yaml up -d postgres

echo "⏳ Waiting for PostgreSQL..."
for i in {1..30}; do
  if docker exec $(docker ps -q -f name=postgres) pg_isready -U sub_user -d sub_tracker >/dev/null 2>&1; then
    echo "✅ PostgreSQL is ready!"
    break
  fi
  [ $i -eq 30 ] && echo "❌ PostgreSQL failed to start!" && exit 1
  sleep 1
done

echo "🐘 Executing Postgres tests (via DATABASE_URL)..."
docker compose -f compose.postgres.yaml run --rm \
  -e DB_TYPE=postgres \
  -e SESSION_SECRET=test-secret-123 \
  -e NODE_ENV=test \
  -e DATABASE_URL=postgres://sub_user:change-me@postgres:5432/sub_tracker \
  backend npm run test:postgres || { echo "❌ PostgreSQL DATABASE_URL tests failed!"; exit 1; }

# 5. Frontend Unit Tests
echo "🧪 Running Frontend Unit Tests..."
cd "$PROJECT_ROOT/frontend"
npm run test:unit -- --run || { echo "❌ Frontend unit tests failed!"; exit 1; }

# 6. E2E Tests (Cypress)
echo "🌐 Running E2E Tests (SQLite baseline)..."
cd "$PROJECT_ROOT/backend"
DB_TYPE=sqlite node src/index.js > /tmp/backend_e2e.log 2>&1 &
BACKEND_PID=$!

echo "⏳ Waiting for Services..."
for i in {1..15}; do
  if curl -s http://localhost:3000/api/health | grep -q "ok"; then
    echo "✅ Backend Ready"
    break
  fi
  sleep 1
done

cd "$PROJECT_ROOT/frontend"
npm run build && npm run preview > /tmp/frontend_e2e.log 2>&1 &
FRONTEND_PID=$!

for i in {1..15}; do
  if curl -s http://localhost:4173 | grep -q "html"; then
    echo "✅ Frontend Ready"
    break
  fi
  sleep 1
done

echo "🦅 Running Cypress..."
npx cypress run --e2e --browser electron
RESULT=$?

# 7. Cleanup
echo "--------------------------------------------------"
if [ $RESULT -eq 0 ]; then
    echo "✨ ALL TESTS PASSED! ✨"
else
    echo "💥 TESTS FAILED! (Exit Code: $RESULT)"
fi

echo "🧼 Final cleanup..."
kill $BACKEND_PID || true
kill $FRONTEND_PID || true
docker compose -f compose.postgres.yaml down -v
echo "--------------------------------------------------"

exit $RESULT
