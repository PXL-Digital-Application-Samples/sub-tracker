#!/bin/bash
# test_all.sh - Verbose test runner with aggressive debugging

PROJECT_ROOT=$(pwd)
export NODE_ENV=test
export SESSION_SECRET=test-secret-123
export PORT=3000

echo "--------------------------------------------------"
echo "🚀 STARTING VERBOSE TEST SUITE"
echo "--------------------------------------------------"

# 1. Cleanup
echo "🧹 Cleaning up existing processes..."
fuser -k 3000/tcp 2>/dev/null || true
fuser -k 4173/tcp 2>/dev/null || true
rm -f "$PROJECT_ROOT/backend/data/sub_tracker.db"

# 2. Backend Tests
echo "🖥️  Running Backend Integration Tests..."
cd "$PROJECT_ROOT/backend"
if ! npm test; then
    echo "❌ Backend tests failed!"
    exit 1
fi

# 3. Frontend Unit Tests
echo "🧪 Running Frontend Unit Tests..."
cd "$PROJECT_ROOT/frontend"
if ! npm run test:unit -- --run; then
    echo "❌ Frontend unit tests failed!"
    exit 1
fi

# 4. Setup E2E
echo "🌐 Setting up E2E environment..."

# Start Backend
echo "📡 Starting Backend..."
cd "$PROJECT_ROOT/backend"
node src/index.js > /tmp/backend_e2e.log 2>&1 &
BACKEND_PID=$!

# Wait for Backend
echo "⏳ Waiting for Backend health check..."
for i in {1..15}; do
  if curl -s http://localhost:3000/api/health | grep -q "ok"; then
    echo "✅ Backend Health: OK"
    break
  fi
  [ $i -eq 15 ] && echo "❌ Backend failed to start!" && cat /tmp/backend_e2e.log && kill $BACKEND_PID && exit 1
  sleep 1
done

# Verify Seed Data via CURL
echo "🔍 Verifying backend seed data via CURL..."
COOKIE_JAR="/tmp/test_cookies.txt"
LOGIN_RES=$(curl -s -X POST http://localhost:3000/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@test.com", "password":"password123"}' \
  -c $COOKIE_JAR)

if echo "$LOGIN_RES" | grep -q "Login successful"; then
    echo "✅ Backend Auth: OK"
    SUBS_RES=$(curl -s -X GET http://localhost:3000/api/subscriptions/active -b $COOKIE_JAR)
    if echo "$SUBS_RES" | grep -q "Netflix"; then
        echo "✅ Backend Data (Netflix): FOUND"
    else
        echo "❌ Backend Data (Netflix): NOT FOUND!"
        echo "Response: $SUBS_RES"
        kill $BACKEND_PID
        exit 1
    fi
else
    echo "❌ Backend Auth FAILED!"
    echo "Response: $LOGIN_RES"
    kill $BACKEND_PID
    exit 1
fi

# Start Frontend Preview
echo "📦 Starting Frontend Preview..."
cd "$PROJECT_ROOT/frontend"
npm run build
npm run preview > /tmp/frontend_e2e.log 2>&1 &
FRONTEND_PID=$!

echo "⏳ Waiting for Frontend preview..."
for i in {1..15}; do
  if curl -s http://localhost:4173 | grep -q "html"; then
    echo "✅ Frontend Preview: READY"
    break
  fi
  [ $i -eq 15 ] && echo "❌ Frontend failed to start!" && cat /tmp/frontend_e2e.log && kill $BACKEND_PID && exit 1
  sleep 1
done

# 5. Run Cypress
echo "🦅 Running Cypress E2E..."
set +e
npx cypress run --e2e --browser electron
RESULT=$?
set -e

# 6. Final Report & Cleanup
echo "--------------------------------------------------"
if [ $RESULT -eq 0 ]; then
    echo "✨ ALL TESTS PASSED SUCCESSFULLY! ✨"
else
    echo "💥 E2E TESTS FAILED! (Exit Code: $RESULT)"
    echo "--- BACKEND LOGS ---"
    cat /tmp/backend_e2e.log
    echo "--- FRONTEND LOGS ---"
    cat /tmp/frontend_e2e.log
fi

echo "🧼 Cleaning up..."
kill $BACKEND_PID || true
kill $FRONTEND_PID || true
echo "--------------------------------------------------"

exit $RESULT
