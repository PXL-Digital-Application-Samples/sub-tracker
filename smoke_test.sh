#!/bin/bash

# Configuration
API_URL="http://localhost:3000/api"
COOKIE_FILE="/tmp/sub_tracker_cookies.txt"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo "Starting Smoke Test..."

# 1. Start backend in background
cd backend
node src/index.js > /tmp/backend.log 2>&1 &
BACKEND_PID=$!

# Function to cleanup on exit
cleanup() {
  echo "Cleaning up..."
  kill $BACKEND_PID
  rm -f $COOKIE_FILE
}
trap cleanup EXIT

# 2. Wait for backend to be ready
echo "Waiting for backend to start..."
for i in {1..15}; do
  RESPONSE=$(curl -s "$API_URL/health")
  echo "Health check response: $RESPONSE"
  if echo "$RESPONSE" | grep -q "ok"; then
    echo -e "${GREEN}Backend is up!${NC}"
    break
  fi
  if [ $i -eq 15 ]; then
    echo -e "${RED}Backend failed to start. Check /tmp/backend.log${NC}"
    cat /tmp/backend.log
    exit 1
  fi
  sleep 1
done

# 3. Test Login
echo "Testing Login..."
LOGIN_RESPONSE=$(curl -v -s -X POST "$API_URL/login" -H "Content-Type: application/json" -d '{"email":"user@test.com", "password":"password123"}' -c $COOKIE_FILE 2>&1)

if echo "$LOGIN_RESPONSE" | grep -q "Login successful"; then
  echo -e "${GREEN}Login successful!${NC}"
else
  echo -e "${RED}Login failed! Response: $LOGIN_RESPONSE${NC}"
  echo "Backend log:"
  cat /tmp/backend.log
  exit 1
fi

# 4. Test Protected Route (Get User)
echo "Testing Protected Route (Get User)..."
USER_RESPONSE=$(curl -s -X GET "$API_URL/user" -b $COOKIE_FILE)

if echo "$USER_RESPONSE" | grep -q "user@test.com"; then
  echo -e "${GREEN}Successfully fetched user profile!${NC}"
else
  echo -e "${RED}Failed to fetch user profile! Response: $USER_RESPONSE${NC}"
  exit 1
fi

# 5. Test Active Subscriptions
echo "Testing Active Subscriptions..."
SUBS_RESPONSE=$(curl -s -X GET "$API_URL/subscriptions/active" -b $COOKIE_FILE)

if echo "$SUBS_RESPONSE" | grep -q "Netflix"; then
  echo -e "${GREEN}Successfully fetched active subscriptions!${NC}"
else
  echo -e "${RED}Failed to fetch active subscriptions! Response: $SUBS_RESPONSE${NC}"
  exit 1
fi

echo -e "${GREEN}Smoke test passed successfully!${NC}"
