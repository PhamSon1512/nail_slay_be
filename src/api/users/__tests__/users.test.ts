import { sign } from 'hono/jwt';
import { md5 } from 'hono/utils/crypto';
import { env } from 'cloudflare:test';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { users } from '../../../models';
import { getDb, jsonRequest, makeTestApp, USERS_DDL, USERS_IDX } from '../../../test/helpers';
import UserRoutes from '../index';

// ─── App (mounted at /users, uses production auth + casbin middleware) ────────

const app = makeTestApp('/users', UserRoutes);

// ─── Token helpers ────────────────────────────────────────────────────────────

async function adminToken(userId: string): Promise<string> {
  return sign(
    {
      id: userId,
      email: `${userId}@test.com`,
      roles: ['admin'],
      permissions: [],
      exp: Math.floor(Date.now() / 1000) + 3600,
      jti: `jti-${userId}`,
    },
    env.JWT_SECRET,
  );
}

async function fetchWithToken(path: string, token: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers as HeadersInit);
  headers.set('Authorization', `Bearer ${token}`);
  return app.fetch(new Request(`http://localhost${path}`, { ...init, headers }), env);
}

// ─── Seed helpers ─────────────────────────────────────────────────────────────

async function seedUser(id: string, email: string) {
  const hashed = await md5('testpass');
  await getDb().insert(users).values({ id, email, password: hashed! }).onConflictDoNothing();
}

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeAll(async () => {
  await env.DB.exec(USERS_DDL);
  for (const idx of USERS_IDX) await env.DB.exec(idx);
});

beforeEach(async () => {
  await getDb().delete(users);
});

// ─── GET /users/me ────────────────────────────────────────────────────────────

describe('GET /users/me', () => {
  it('200 — returns user without password field', async () => {
    await seedUser('user-test-id', 'me@test.com');
    const token = await adminToken('user-test-id');
    const res = await fetchWithToken('/users/me', token);
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.id).toBe('user-test-id');
    expect(body.email).toBe('me@test.com');
    expect(body.password).toBeUndefined();
  });

  it('401 — missing auth token returns 401', async () => {
    const res = await app.fetch(new Request('http://localhost/users/me'), env);
    expect(res.status).toBe(401);
  });

  it('404 — user id not found in DB', async () => {
    const token = await adminToken('nonexistent-id');
    const res = await fetchWithToken('/users/me', token);
    expect(res.status).toBe(404);
  });
});

// ─── POST /users ──────────────────────────────────────────────────────────────

describe('POST /users', () => {
  it('201 — creates user and returns id', async () => {
    const token = await adminToken('admin-user-id');
    const req = jsonRequest('POST', { email: 'new@test.com', password: 'pass1234' });
    const res = await fetchWithToken('/users', token, req);
    expect(res.status).toBe(201);
    const body = (await res.json()) as { id: string };
    expect(body.id).toBeTruthy();
  });

  it('409 — duplicate email', async () => {
    await seedUser('existing-id', 'taken@test.com');
    const token = await adminToken('admin-user-id');
    const req = jsonRequest('POST', { email: 'taken@test.com', password: 'pass1234' });
    const res = await fetchWithToken('/users', token, req);
    expect(res.status).toBe(409);
  });

  it('401 — missing auth returns 401', async () => {
    const req = jsonRequest('POST', { email: 'x@test.com', password: 'pass1234' });
    const res = await app.fetch(new Request('http://localhost/users', req), env);
    expect(res.status).toBe(401);
  });
});
