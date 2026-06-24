#!/usr/bin/env node
/**
 * API Smoke Test — chạy toàn bộ endpoints với admin credentials.
 *
 * Usage:
 *   node scripts/smoke-test.mjs                          # local (localhost:8787)
 *   node scripts/smoke-test.mjs --url https://api.you.workers.dev
 *   node scripts/smoke-test.mjs -e admin@example.com -p Admin@123456
 *
 * Prereqs: wrangler dev đang chạy (hoặc truyền --url để test remote).
 */

import chalk from 'chalk';
import { Command } from 'commander';

// ─── CLI ──────────────────────────────────────────────────────────────────────

const program = new Command();
program
  .name('smoke-test')
  .option('--url <url>', 'Base URL', 'http://localhost:8787')
  .option('-e, --email <email>', 'Admin email', process.env.SEED_EMAIL ?? 'admin@example.com')
  .option('-p, --password <pass>', 'Admin password', process.env.SEED_PASSWORD ?? 'Admin@123456')
  .option('--no-cleanup', 'Skip cleanup of created resources')
  .parse();

const { url: BASE_URL, email: ADMIN_EMAIL, password: ADMIN_PASSWORD, cleanup: CLEANUP } = program.opts();

// ─── Helpers ──────────────────────────────────────────────────────────────────

let token = '';
const results = [];

/** Tracked IDs for cleanup */
const created = { roleSlug: '', permissionId: '', userId: '', mediaId: '' };

async function req(method, path, body, opts = {}) {
  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...opts.headers,
  };

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  let data;
  const ct = res.headers.get('content-type') ?? '';
  try {
    data = ct.includes('json') ? await res.json() : await res.text();
  } catch {
    data = null;
  }

  return { status: res.status, data };
}

function check(label, status, expected, data) {
  const ok = Array.isArray(expected) ? expected.includes(status) : status === expected;
  results.push({ label, ok, status, expected });

  const icon = ok ? chalk.green('✓') : chalk.red('✗');
  const statusStr = ok ? chalk.green(status) : chalk.red(status);
  const expStr = chalk.dim(`(expected ${Array.isArray(expected) ? expected.join('|') : expected})`);
  console.log(`  ${icon} ${label} ${statusStr} ${expStr}`);

  if (!ok) {
    const detail = typeof data === 'object' ? JSON.stringify(data, null, 2) : data;
    console.log(chalk.red(`    → ${detail}`));
  }

  return ok;
}

// ─── Header ──────────────────────────────────────────────────────────────────

console.log('');
console.log(chalk.bold('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
console.log(chalk.bold.white('  🔥 API Smoke Test'));
console.log(chalk.bold('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
console.log(`  ${chalk.dim('Target')} : ${chalk.cyan(BASE_URL)}`);
console.log(`  ${chalk.dim('Admin')}  : ${chalk.white(ADMIN_EMAIL)}`);
console.log(`  ${chalk.dim('Cleanup')}: ${CLEANUP ? chalk.green('yes') : chalk.yellow('no')}`);
console.log('');

// ─── Auth ─────────────────────────────────────────────────────────────────────

console.log(chalk.bold.blue('── Auth ──────────────────────────────────────'));

// 1. Login
{
  const { status, data } = await req('POST', '/auth/login', { email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  const ok = check('POST /auth/login', status, 200, data);
  if (!ok) {
    console.log(chalk.red('\n❌ Login failed — cannot continue.'));
    process.exit(1);
  }
  token = data.token;
}

// 2. Wrong credentials → 400
{
  const { status, data } = await req('POST', '/auth/login', { email: ADMIN_EMAIL, password: 'wrongpass' });
  check('POST /auth/login (bad creds)', status, 400, data);
}

// 3. Signup with unique test email
const testEmail = `smoke-${Date.now()}@test.local`;
{
  const { status, data } = await req('POST', '/auth/sign-up', { email: testEmail, password: 'Test@123456' });
  check('POST /auth/sign-up', status, 201, data);
}

// 4. Duplicate signup → 409
{
  const { status, data } = await req('POST', '/auth/sign-up', { email: testEmail, password: 'Test@123456' });
  check('POST /auth/sign-up (duplicate)', status, 409, data);
}

// 5. Generate (refresh) token
{
  const { status, data } = await req('GET', '/auth/token');
  check('GET /auth/token', status, 200, data);
}

// ─── Storefront (public) ──────────────────────────────────────────────────────

console.log('');
console.log(chalk.bold.blue('── Storefront (public) ───────────────────────'));

{
  const { status, data } = await req('GET', '/products?limit=1');
  check('GET /products?limit=1', status, 200, data);
}

{
  const { status, data } = await req('GET', '/articles?limit=1');
  check('GET /articles?limit=1', status, 200, data);
}

{
  const { status, data } = await req('GET', '/categories');
  check('GET /categories', status, 200, data);
}

{
  const { status, data } = await req('GET', '/cart');
  check('GET /cart', status, 200, data);
}

// ─── Profile ──────────────────────────────────────────────────────────────────

console.log('');
console.log(chalk.bold.blue('── Profile ───────────────────────────────────'));
{
  const { status, data } = await req('GET', '/profile');
  check('GET /profile', status, 200, data);
}

// 7. PUT /profile
{
  const { status, data } = await req('PUT', '/profile', { firstName: 'Smoke', lastName: 'Test' });
  check('PUT /profile', status, 200, data);
}

// ─── Users ────────────────────────────────────────────────────────────────────

console.log('');
console.log(chalk.bold.blue('── Users ─────────────────────────────────────'));

// 8. GET /users/me
{
  const { status, data } = await req('GET', '/users/me');
  check('GET /users/me', status, 200, data);
}

// 9. POST /users (admin create)
{
  const newEmail = `smoke-user-${Date.now()}@test.local`;
  const { status, data } = await req('POST', '/users', {
    email: newEmail,
    password: 'Test@123456',
    role: 'user',
  });
  const ok = check('POST /users', status, 201, data);
  if (ok) created.userId = data.id;
}

// ─── Media ───────────────────────────────────────────────────────────────────

console.log('');
console.log(chalk.bold.blue('── Media ─────────────────────────────────────'));

// Upload: multipart/form-data — phải dùng FormData, không dùng JSON
{
  const form = new FormData();
  form.append('file', new File(['smoke test content'], 'smoke.txt', { type: 'text/plain' }));
  const res = await fetch(`${BASE_URL}/media`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    body: form,
  });
  const data = await res.json();
  const ok = check('POST /media (upload)', res.status, 201, data);
  if (ok) created.mediaId = data.id;
}

// GET /media/:id — cần mediaId từ upload trên
if (created.mediaId) {
  const { status, data } = await req('GET', `/media/${created.mediaId}`);
  // 200 = file stream, 404 = not found — R2 local có thể không hoạt động đầy đủ
  check('GET /media/:id', status, [200, 404], data);
}

// ─── RBAC ─────────────────────────────────────────────────────────────────────

console.log('');
console.log(chalk.bold.blue('── RBAC ──────────────────────────────────────'));

// 10. GET /rbac/roles
{
  const { status, data } = await req('GET', '/rbac/roles');
  check('GET /rbac/roles', status, 200, data);
}

// 11. POST /rbac/roles
{
  const slug = `smoke-role-${Date.now()}`;
  const { status, data } = await req('POST', '/rbac/roles', { slug, name: 'Smoke Role', description: 'Smoke test' });
  const ok = check('POST /rbac/roles', status, 201, data);
  if (ok) created.roleSlug = data.slug;
}

// 12. PATCH /rbac/roles/:slug
if (created.roleSlug) {
  const { status, data } = await req('PATCH', `/rbac/roles/${created.roleSlug}`, { name: 'Smoke Updated' });
  check('PATCH /rbac/roles/:slug', status, 200, data);
}

// 13. GET /rbac/permissions
{
  const { status, data } = await req('GET', '/rbac/permissions');
  check('GET /rbac/permissions', status, 200, data);
}

// 14. POST /rbac/permissions
{
  const { status, data } = await req('POST', '/rbac/permissions', {
    resource: `/smoke-test-${Date.now()}`,
    action: 'GET',
    description: 'Smoke test permission',
  });
  const ok = check('POST /rbac/permissions', status, 201, data);
  if (ok) created.permissionId = data.id;
}

// 15. GET /rbac/roles/:slug/permissions
if (created.roleSlug) {
  const { status, data } = await req('GET', `/rbac/roles/${created.roleSlug}/permissions`);
  check('GET /rbac/roles/:slug/permissions', status, 200, data);
}

// 16. POST /rbac/roles/:slug/permissions (assign)
if (created.roleSlug && created.permissionId) {
  const { status, data } = await req('POST', `/rbac/roles/${created.roleSlug}/permissions`, {
    permissionId: created.permissionId,
  });
  check('POST /rbac/roles/:slug/permissions (assign)', status, 201, data);
}

// 17. PATCH /rbac/permissions/:id
if (created.permissionId) {
  const { status, data } = await req('PATCH', `/rbac/permissions/${created.permissionId}`, {
    description: 'Smoke test permission (updated)',
  });
  check('PATCH /rbac/permissions/:id', status, 200, data);
}

// 18. POST /rbac/seed (idempotent — safe to call anytime)
{
  const { status, data } = await req('POST', '/rbac/seed');
  check('POST /rbac/seed', status, 200, data);
}

// ─── Cleanup ──────────────────────────────────────────────────────────────────

if (CLEANUP) {
  console.log('');
  console.log(chalk.bold.blue('── Cleanup ───────────────────────────────────'));

  // Revoke permission from role first (FK constraint)
  if (created.roleSlug && created.permissionId) {
    const { status, data } = await req('DELETE', `/rbac/roles/${created.roleSlug}/permissions/${created.permissionId}`);
    check('DELETE /rbac/roles/:slug/permissions/:id (revoke)', status, 204, data);
  }

  // Delete role
  if (created.roleSlug) {
    const { status, data } = await req('DELETE', `/rbac/roles/${created.roleSlug}`);
    check('DELETE /rbac/roles/:slug', status, 204, data);
  }

  // Delete permission
  if (created.permissionId) {
    const { status, data } = await req('DELETE', `/rbac/permissions/${created.permissionId}`);
    check('DELETE /rbac/permissions/:id', status, 204, data);
  }
}

// ─── Summary ──────────────────────────────────────────────────────────────────

const passed = results.filter((r) => r.ok).length;
const failed = results.filter((r) => !r.ok).length;
const total = results.length;

console.log('');
console.log(chalk.bold('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
console.log(
  `  ${chalk.bold('Results')} : ${chalk.green(`${passed} passed`)} / ${failed > 0 ? chalk.red(`${failed} failed`) : chalk.dim('0 failed')} / ${chalk.dim(`${total} total`)}`,
);
console.log(chalk.bold('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
console.log('');

process.exit(failed > 0 ? 1 : 0);
