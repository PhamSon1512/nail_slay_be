#!/usr/bin/env node
/**
 * Security Test Suite — OWASP-aligned attack scenarios cho hono-boilerplate.
 *
 * Usage:
 *   npm run security
 *   npm run security -- --url https://api.you.workers.dev
 *
 * Prereqs: wrangler dev đang chạy (hoặc truyền --url).
 */

import chalk from 'chalk';
import { Command } from 'commander';

const program = new Command();
program
  .name('security-test')
  .option('--url <url>', 'Base URL', 'http://localhost:8787')
  .option('-e, --email <email>', 'Admin email', process.env.SEED_EMAIL ?? 'admin@example.com')
  .option('-p, --password <pass>', 'Admin password', process.env.SEED_PASSWORD ?? 'Admin@123456')
  .parse();

const { url: BASE_URL, email: ADMIN_EMAIL, password: ADMIN_PASSWORD } = program.opts();

// ─── Helpers ──────────────────────────────────────────────────────────────────

const results = [];

async function req(method, path, body, headers = {}) {
  const h = { 'Content-Type': 'application/json', Accept: 'application/json', ...headers };
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: h,
    body: body !== undefined ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined,
  });
  let data;
  try {
    const ct = res.headers.get('content-type') ?? '';
    data = ct.includes('json') ? await res.json() : await res.text();
  } catch { data = null; }
  return { status: res.status, data, headers: res.headers };
}

function check(label, status, expected, note = '') {
  const ok = Array.isArray(expected) ? expected.includes(status) : status === expected;
  // Security tests also fail if server 500s unexpectedly (indicates potential vuln exposure)
  const unexpectedCrash = status === 500 && !expected.includes?.(500) && expected !== 500;

  const final = ok && !unexpectedCrash;
  results.push({ label, ok: final, status, expected });

  const icon  = final ? chalk.green('✓') : chalk.red('✗');
  const sc    = final ? chalk.green(status) : chalk.red(status);
  const exp   = chalk.dim(`(expected ${Array.isArray(expected) ? expected.join('|') : expected})`);
  const n     = note ? chalk.dim(` — ${note}`) : '';
  console.log(`  ${icon} ${label} ${sc} ${exp}${n}`);
  return final;
}

// Get admin token for tests that need auth
const loginRes = await req('POST', '/auth/login', { email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
if (loginRes.status !== 200) {
  console.error(chalk.red('\n❌ Cannot login — abort.'));
  process.exit(1);
}
const ADMIN_TOKEN = loginRes.data.token;

// ─── Header ──────────────────────────────────────────────────────────────────

console.log('');
console.log(chalk.bold('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
console.log(chalk.bold.white('  🛡️  Security Test Suite'));
console.log(chalk.bold('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
console.log(`  ${chalk.dim('Target')} : ${chalk.cyan(BASE_URL)}`);
console.log('');

// ─── A01: Broken Access Control ──────────────────────────────────────────────

console.log(chalk.bold.blue('── A01: Broken Access Control ────────────────'));

// No token
{
  const { status } = await req('GET', '/profile');
  check('No auth token → 401', status, 401, 'unauthenticated request must be rejected');
}

// Completely wrong token
{
  const { status } = await req('GET', '/profile', undefined, { Authorization: 'Bearer not-a-jwt' });
  check('Garbage token → 400|401', status, [400, 401]);
}

// Tampered JWT (flip last char of signature)
{
  const parts = ADMIN_TOKEN.split('.');
  const tampered = [...parts.slice(0, 2), parts[2].slice(0, -1) + (parts[2].slice(-1) === 'A' ? 'B' : 'A')].join('.');
  const { status } = await req('GET', '/profile', undefined, { Authorization: `Bearer ${tampered}` });
  check('Tampered JWT signature → 401', status, 401);
}

// JWT with none algorithm (algorithm confusion attack)
{
  const header  = btoa(JSON.stringify({ alg: 'none', typ: 'JWT' })).replace(/=/g, '');
  const payload = btoa(JSON.stringify({ id: 'attacker', roles: ['admin'], exp: 9999999999 })).replace(/=/g, '');
  const noneJwt = `${header}.${payload}.`;
  const { status } = await req('GET', '/profile', undefined, { Authorization: `Bearer ${noneJwt}` });
  check('JWT alg:none (algorithm confusion) → 400|401', status, [400, 401]);
}

// IDOR: try to access a non-existent user ID directly
{
  const { status } = await req('GET', '/users/nonexistent-id-12345', undefined, {
    Authorization: `Bearer ${ADMIN_TOKEN}`,
  });
  check('IDOR — non-existent user ID → 404|405', status, [404, 405]);
}

// ─── A02: Cryptographic Failures ─────────────────────────────────────────────

console.log('');
console.log(chalk.bold.blue('── A02: Cryptographic Failures ───────────────'));

// Token in query string (should not be supported)
{
  const { status } = await req('GET', `/profile?token=${ADMIN_TOKEN}`);
  check('Token in query param → 401 (not accepted)', status, 401, 'tokens should only come from Authorization header or cookie');
}

// ─── A03: Injection ───────────────────────────────────────────────────────────

console.log('');
console.log(chalk.bold.blue('── A03: Injection ────────────────────────────'));

// SQL injection in email field (Drizzle uses parameterized queries — should be safe)
{
  const { status } = await req('POST', '/auth/login', {
    email: "' OR '1'='1",
    password: 'anything',
  });
  check("SQL injection in email → 400 (not 200/500)", status, [400, 401, 422], 'parameterized queries must prevent SQL injection');
}

// NoSQL/JSON injection in body
{
  const { status } = await req('POST', '/auth/login', {
    email: { '$gt': '' },
    password: { '$gt': '' },
  });
  check('JSON injection in email → 400|422', status, [400, 422]);
}

// XSS payload in profile update (stored XSS attempt)
{
  const { status, data } = await req('PUT', '/profile',
    { firstName: '<script>alert(1)</script>', lastName: 'Test' },
    { Authorization: `Bearer ${ADMIN_TOKEN}` },
  );
  check('XSS payload in body → not 500', status, [200, 400, 422], 'must not crash on XSS input');
  // If 200: verify the XSS was not executed server-side (it's stored as-is, harmless in JSON API)
}

// Path traversal
{
  const { status } = await req('GET', '/media/../../../etc/passwd', undefined, {
    Authorization: `Bearer ${ADMIN_TOKEN}`,
  });
  check('Path traversal → 404|400', status, [404, 400]);
}

// Null byte injection
{
  const { status } = await req('POST', '/auth/login', {
    email: `admin\x00@example.com`,
    password: ADMIN_PASSWORD,
  });
  check('Null byte in email → 400|401', status, [400, 401, 422]);
}

// ─── A04: Insecure Design / Business Logic ────────────────────────────────────

console.log('');
console.log(chalk.bold.blue('── A04: Business Logic ───────────────────────'));

// Signup with role field (privilege escalation attempt)
{
  const { status, data } = await req('POST', '/auth/sign-up', {
    email: `sec-test-${Date.now()}@test.local`,
    password: 'Test@123456',
    role: 'admin', // should be ignored
  });
  check('Signup with role:admin (privilege escalation) → 201 or 400', status, [201, 400, 422]);
  if (status === 201) {
    // Verify the user was NOT given admin role — requires DB check, we verify by trying protected endpoint
    // (This is a smoke-level check only)
    console.log(chalk.dim('    → Created, role escalation must be verified manually (DB check)'));
  }
}

// ─── A05: Security Misconfiguration ──────────────────────────────────────────

console.log('');
console.log(chalk.bold.blue('── A05: Security Misconfiguration ────────────'));

// OPTIONS request (preflight) — should not expose forbidden methods
{
  const res = await fetch(`${BASE_URL}/profile`, { method: 'OPTIONS' });
  // 200/204 = CORS handler enabled; 404 = no OPTIONS handler (acceptable for pure API backends);
  // 405 = method not allowed; 401 = BAD (auth should not block CORS preflight)
  check('OPTIONS preflight → not 401', res.status, [200, 204, 404, 405]);
}

// Unsupported HTTP method on auth endpoint
{
  const { status } = await req('DELETE', '/auth/login');
  check('DELETE /auth/login → 405|404', status, [404, 405]);
}

// ─── A07: Identification & Authentication Failures ────────────────────────────

console.log('');
console.log(chalk.bold.blue('── A07: Auth Failures ────────────────────────'));

// Wrong password
{
  const { status } = await req('POST', '/auth/login', {
    email: ADMIN_EMAIL,
    password: 'WrongPassword123!',
  });
  check('Wrong password → 400|401', status, [400, 401]);
}

// Non-existent user
{
  const { status } = await req('POST', '/auth/login', {
    email: 'nobody@notreal.xyz',
    password: 'Whatever123!',
  });
  check('Non-existent user login → 400|401', status, [400, 401]);
}

// ─── A08: Software & Data Integrity — Oversized payloads ─────────────────────

console.log('');
console.log(chalk.bold.blue('── A08: Oversized Payloads ───────────────────'));

// 1MB JSON body bomb
{
  const huge = JSON.stringify({ email: 'a@b.com', password: 'x'.repeat(1_000_000) });
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: huge,
  });
  check('1 MB payload → 400|413|422 (not 500)', res.status, [400, 413, 422]);
}

// ─── Summary ──────────────────────────────────────────────────────────────────

const passed  = results.filter((r) => r.ok).length;
const failed  = results.filter((r) => !r.ok).length;

console.log('');
console.log(chalk.bold('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
console.log(
  `  ${chalk.bold('Results')} : ${chalk.green(`${passed} passed`)} / ${failed > 0 ? chalk.red(`${failed} failed`) : chalk.dim('0 failed')} / ${chalk.dim(`${results.length} total`)}`,
);
if (failed > 0) {
  console.log(chalk.red('\n  ⚠️  Security issues found — review failures above.\n'));
}
console.log(chalk.bold('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
console.log('');

process.exit(failed > 0 ? 1 : 0);
