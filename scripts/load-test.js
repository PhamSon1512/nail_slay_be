/**
 * k6 Load Test — hono-boilerplate
 *
 * Install k6: brew install k6
 * Run:        npm run load
 * Run heavy:  npm run load -- --vus 100 --duration 60s
 *
 * Scenarios:
 *   - browse : GET-heavy (unauthenticated first, then profiling)
 *   - write  : POST/PATCH against RBAC-protected endpoints
 *   - auth   : login flood (simulate concurrent sign-in)
 */

import { check, group, sleep } from 'k6';
import http from 'k6/http';
import { Counter, Rate, Trend } from 'k6/metrics';

// ─── Custom metrics ───────────────────────────────────────────────────────────

const loginDuration = new Trend('login_duration', true);
const profileDuration = new Trend('profile_duration', true);
const errorRate = new Rate('errors');
const rbacFails = new Counter('rbac_403s');

// ─── Options / thresholds ─────────────────────────────────────────────────────

export const options = {
  scenarios: {
    // Light ramp-up: 0 → 20 VUs in 10s, hold 30s, ramp down
    browse: {
      executor: 'ramping-vus',
      stages: [
        { duration: '10s', target: 20 },
        { duration: '30s', target: 20 },
        { duration: '10s', target: 0 },
      ],
      gracefulRampDown: '5s',
      exec: 'browseScenario',
    },
    // Write scenario: constant 5 VUs, offset start to avoid cold-start interference
    write: {
      executor: 'constant-vus',
      vus: 5,
      duration: '40s',
      startTime: '10s',
      exec: 'writeScenario',
    },
    // Auth flood: simulate concurrent logins (common real-world attack surface)
    auth: {
      executor: 'constant-arrival-rate',
      rate: 10, // 10 iterations/sec
      timeUnit: '1s',
      duration: '30s',
      preAllocatedVUs: 10,
      startTime: '5s',
      exec: 'authScenario',
    },
  },

  thresholds: {
    // P95 under 500ms for all requests (CF Workers cold start included)
    http_req_duration: ['p(95)<500'],
    // P99 under 1s
    'http_req_duration{name:profile}': ['p(99)<1000'],
    // Error rate under 1%
    http_req_failed: ['rate<0.01'],
    errors: ['rate<0.01'],
    // Login should be fast
    login_duration: ['p(95)<300'],
  },
};

// ─── Base URL & shared headers ────────────────────────────────────────────────

const BASE = __ENV.BASE_URL || 'http://localhost:8787';
const ADMIN_EMAIL = __ENV.SEED_EMAIL || 'admin@example.com';
const ADMIN_PASSWORD = __ENV.SEED_PASSWORD || 'Admin@123456';

function authHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
}

// ─── Setup: login once and share token ───────────────────────────────────────

export function setup() {
  const res = http.post(`${BASE}/auth/login`, JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }), {
    headers: { 'Content-Type': 'application/json' },
  });

  check(res, { 'setup: login 200': (r) => r.status === 200 });

  const body = JSON.parse(res.body);
  return { token: body.token };
}

// ─── Scenario: browse (GET-heavy) ────────────────────────────────────────────

export function browseScenario(data) {
  const h = authHeaders(data.token);

  group('browse', () => {
    group('profile', () => {
      const start = Date.now();
      const res = http.get(`${BASE}/profile`, { headers: h, tags: { name: 'profile' } });
      loginDuration.add(Date.now() - start);
      profileDuration.add(res.timings.duration);
      const ok = check(res, { 'GET /profile 200': (r) => r.status === 200 });
      if (!ok) errorRate.add(1);
      if (res.status === 403) rbacFails.add(1);
    });

    group('rbac', () => {
      const res = http.get(`${BASE}/rbac/roles`, { headers: h, tags: { name: 'rbac-roles' } });
      const ok = check(res, { 'GET /rbac/roles 200': (r) => r.status === 200 });
      if (!ok) errorRate.add(1);
    });

    group('users/me', () => {
      const res = http.get(`${BASE}/users/me`, { headers: h, tags: { name: 'users-me' } });
      const ok = check(res, { 'GET /users/me 200': (r) => r.status === 200 });
      if (!ok) errorRate.add(1);
    });
  });

  sleep(0.5);
}

// ─── Scenario: write (POST/PATCH mix) ────────────────────────────────────────

export function writeScenario(data) {
  const h = authHeaders(data.token);
  const ts = Date.now();

  group('write', () => {
    // Create role
    const createRes = http.post(`${BASE}/rbac/roles`, JSON.stringify({ slug: `load-${ts}-${__VU}`, name: 'Load Test Role' }), {
      headers: h,
      tags: { name: 'create-role' },
    });
    const created = check(createRes, { 'POST /rbac/roles 201': (r) => r.status === 201 });
    if (!created) {
      errorRate.add(1);
      return;
    }

    const slug = JSON.parse(createRes.body).slug;

    // Update role
    const patchRes = http.patch(`${BASE}/rbac/roles/${slug}`, JSON.stringify({ name: 'Load Updated' }), {
      headers: h,
      tags: { name: 'patch-role' },
    });
    check(patchRes, { 'PATCH /rbac/roles/:slug 200': (r) => r.status === 200 });

    // Delete role (cleanup)
    const delRes = http.del(`${BASE}/rbac/roles/${slug}`, null, { headers: h, tags: { name: 'delete-role' } });
    check(delRes, { 'DELETE /rbac/roles/:slug 204': (r) => r.status === 204 });
  });

  sleep(1);
}

// ─── Scenario: auth flood ─────────────────────────────────────────────────────

export function authScenario() {
  group('auth', () => {
    const start = Date.now();
    const res = http.post(`${BASE}/auth/login`, JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }), {
      headers: { 'Content-Type': 'application/json' },
      tags: { name: 'login' },
    });
    loginDuration.add(Date.now() - start);
    const ok = check(res, { 'POST /auth/login 200': (r) => r.status === 200 });
    if (!ok) errorRate.add(1);
  });

  sleep(0.1);
}
