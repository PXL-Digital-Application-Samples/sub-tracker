#!/bin/bash
# test_postgres.sh - Run backend tests against PostgreSQL

echo "🐘 Running Backend Tests against PostgreSQL..."
echo "Note: Ensure you have a running Postgres instance (e.g., via 'docker compose -f compose.postgres.yaml up -d')"

cd backend
# Use the credentials from .env.example or your .env
export POSTGRES_HOST=localhost
export POSTGRES_PORT=5432
export POSTGRES_USER=sub_user
export POSTGRES_PASSWORD=password123
export POSTGRES_DB=sub_tracker

npm run test:postgres
