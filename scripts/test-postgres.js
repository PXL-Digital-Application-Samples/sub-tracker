const { spawnSync, execSync } = require('child_process');
const path = require('path');

console.log('🏗️  Building backend with --no-cache for Postgres tests...');

// 1. Force rebuild to ensure code parity
const build = spawnSync('docker', ['compose', '-f', 'compose.postgres.yaml', 'build', '--no-cache', '--build-arg', 'NODE_ENV=test', 'backend'], { stdio: 'inherit' });
if (build.status !== 0) process.exit(1);

console.log('🐘 Starting PostgreSQL...');

// 2. Start Postgres
const up = spawnSync('docker', ['compose', '-f', 'compose.postgres.yaml', 'up', '-d', 'postgres'], { stdio: 'inherit' });
if (up.status !== 0) process.exit(1);

// 3. Resolve container ID
console.log('⏳ Waiting for PostgreSQL to be ready...');
let containerId = '';
try {
  containerId = execSync('docker compose -f compose.postgres.yaml ps -q postgres').toString().trim();
} catch (e) {
  console.error('❌ Could not find postgres container');
  process.exit(1);
}

// 4. Wait for readiness
let ready = false;
for (let i = 0; i < 30; i++) {
  const check = spawnSync('docker', ['exec', containerId, 'pg_isready', '-U', 'sub_user', '-d', 'sub_tracker'], { stdio: 'ignore' });
  if (check.status === 0) {
    ready = true;
    break;
  }
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 1000); // Sleep 1s
}

if (!ready) {
  console.error('❌ PostgreSQL failed to start.');
  process.exit(1);
}

console.log('✅ PostgreSQL is ready!');

// 5. Run tests via Docker Compose Run
const runTests = spawnSync('docker', [
  'compose', '-f', 'compose.postgres.yaml', 'run', '--rm',
  '-e', 'DB_TYPE=postgres',
  '-e', 'SESSION_SECRET=test-secret-123',
  '-e', 'NODE_ENV=test',
  '-e', 'POSTGRES_HOST=postgres',
  '-e', 'POSTGRES_PORT=5432',
  '-e', 'POSTGRES_USER=sub_user',
  '-e', 'POSTGRES_PASSWORD=change-me',
  '-e', 'POSTGRES_DB=sub_tracker',
  'backend', 'npm', 'run', 'test:postgres'
], { stdio: 'inherit' });

// 6. Cleanup
console.log('🧹 Cleaning up Postgres...');
spawnSync('docker', ['compose', '-f', 'compose.postgres.yaml', 'down', '-v'], { stdio: 'inherit' });

process.exit(runTests.status);
