#!/usr/bin/env node
/**
 * smoke-ci.mjs — CI runner cho smoke test.
 *
 * Tự động:
 *   1. Spin up `wrangler dev` (background)
 *   2. Đợi server ready (poll /openapi)
 *   3. Seed admin nếu cần
 *   4. Chạy smoke-test.mjs
 *   5. Kill wrangler, exit với code của smoke test
 *
 * Usage:
 *   npm run smoke:ci
 *   SEED_EMAIL=admin@example.com SEED_PASSWORD=Admin@123456 npm run smoke:ci
 */

import { spawn, execSync } from 'node:child_process';
import chalk from 'chalk';

const PORT = 8788; // port riêng để không đụng wrangler dev mặc định
const BASE_URL = `http://localhost:${PORT}`;
const TIMEOUT_MS = 30_000;

let wranglerProc = null;

// ─── Cleanup on exit ─────────────────────────────────────────────────────────

function cleanup() {
  if (wranglerProc && !wranglerProc.killed) {
    wranglerProc.kill('SIGTERM');
  }
}
process.on('exit', cleanup);
process.on('SIGINT', () => { cleanup(); process.exit(130); });
process.on('SIGTERM', () => { cleanup(); process.exit(143); });

// ─── Start wrangler dev ───────────────────────────────────────────────────────

console.log('');
console.log(chalk.bold('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
console.log(chalk.bold.white('  🚀 Smoke CI Runner'));
console.log(chalk.bold('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
console.log(`  ${chalk.dim('Port')} : ${chalk.cyan(PORT)}`);
console.log('');

console.log(chalk.dim('▶ Starting wrangler dev...'));
wranglerProc = spawn(
  'npx',
  ['wrangler', 'dev', '--local', '--port', String(PORT)],
  {
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env },
  },
);

wranglerProc.stdout.on('data', (d) => {
  const line = d.toString().trim();
  if (line) process.stdout.write(chalk.dim(`  [wrangler] ${line}\n`));
});
wranglerProc.stderr.on('data', (d) => {
  const line = d.toString().trim();
  if (line && !line.includes('WARN')) process.stderr.write(chalk.dim(`  [wrangler] ${line}\n`));
});

// ─── Wait for server ready ────────────────────────────────────────────────────

console.log(chalk.dim('⏳ Waiting for server to be ready...'));

const start = Date.now();
let ready = false;

while (Date.now() - start < TIMEOUT_MS) {
  try {
    const res = await fetch(`${BASE_URL}/openapi`);
    if (res.ok) { ready = true; break; }
  } catch {
    // not ready yet
  }
  await new Promise((r) => setTimeout(r, 500));
}

if (!ready) {
  console.error(chalk.red('\n❌ Server did not start in time.'));
  process.exit(1);
}

console.log(chalk.green('✓ Server ready.\n'));

// ─── Seed admin ───────────────────────────────────────────────────────────────

const email = process.env.SEED_EMAIL ?? 'admin@example.com';
const pass = process.env.SEED_PASSWORD ?? 'Admin@123456';

try {
  console.log(chalk.dim('▶ Seeding admin user...'));
  execSync(
    `SEED_EMAIL="${email}" SEED_PASSWORD="${pass}" node scripts/seed-admin.mjs --yes`,
    { stdio: 'pipe' },
  );
  console.log(chalk.green('✓ Admin seeded.\n'));
} catch {
  console.log(chalk.yellow('⚠ Admin seed skipped (may already exist).\n'));
}

// ─── Run smoke test ───────────────────────────────────────────────────────────

console.log(chalk.dim('▶ Running smoke tests...\n'));

let exitCode = 0;
try {
  execSync(
    `SEED_EMAIL="${email}" SEED_PASSWORD="${pass}" node scripts/smoke-test.mjs --url ${BASE_URL}`,
    { stdio: 'inherit' },
  );
} catch (err) {
  exitCode = err.status ?? 1;
}

// ─── Teardown ─────────────────────────────────────────────────────────────────

cleanup();
process.exit(exitCode);
