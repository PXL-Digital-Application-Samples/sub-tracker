const { spawn } = require('child_process');
const path = require('path');
const waitOn = require('wait-on');

async function runE2E() {
  console.log('🌐 Setting up E2E environment...');

  // 1. Build Frontend
  console.log('📦 Building frontend...');
  const build = spawn('npm', ['run', 'build', '--workspace=frontend'], { stdio: 'inherit', shell: true });
  await new Promise((resolve) => build.on('close', resolve));

  // 2. Start Backend
  console.log('📡 Starting Backend...');
  const backend = spawn('npm', ['run', 'start', '--workspace=backend'], {
    env: { ...process.env, DB_TYPE: 'sqlite', NODE_ENV: 'test', SESSION_SECRET: 'test-secret-123' },
    shell: true
  });

  // 3. Start Frontend Preview
  console.log('📦 Starting Frontend Preview...');
  const frontend = spawn('npm', ['run', 'preview', '--workspace=frontend'], { shell: true });

  try {
    // 4. Wait for services
    console.log('⏳ Waiting for services to be ready...');
    await waitOn({
      resources: ['http://localhost:3000/api/health', 'http://localhost:4173'],
      timeout: 30000,
    });
    console.log('✅ Services are ready!');

    // 5. Run Cypress
    console.log('🦅 Running Cypress...');
    const cypress = spawn('npx', ['cypress', 'run', '--project', './frontend'], { stdio: 'inherit', shell: true });
    
    const exitCode = await new Promise((resolve) => cypress.on('close', resolve));
    
    if (exitCode !== 0) {
      process.exit(exitCode);
    }
  } catch (err) {
    console.error('❌ E2E Setup failed:', err);
    process.exit(1);
  } finally {
    console.log('🧹 Cleaning up E2E processes...');
    backend.kill();
    frontend.kill();
  }
}

runE2E();
