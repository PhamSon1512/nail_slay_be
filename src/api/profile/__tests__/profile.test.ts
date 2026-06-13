import { sign } from 'hono/jwt';
import { md5 } from 'hono/utils/crypto';
import { env } from 'cloudflare:test';
import { eq } from 'drizzle-orm';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { users } from '../../../models';
import { getDb, jsonRequest, makeTestApp, USERS_DDL, USERS_IDX } from '../../../test/helpers';
import ProfileRoutes from '../index';

// ─── App (mounted at /profile, uses production auth + casbin middleware) ──────

const app = makeTestApp('/profile', ProfileRoutes);

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

// ─── GET /profile ─────────────────────────────────────────────────────────────

describe('GET /profile', () => {
  it('200 — returns profile without sensitive fields', async () => {
    await seedUser('profile-user-id', 'profile@test.com');
    const token = await adminToken('profile-user-id');
    const res = await fetchWithToken('/profile', token);
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.id).toBe('profile-user-id');
    expect(body.password).toBeUndefined();
    expect(body.refreshToken).toBeUndefined();
    expect(body.deletedAt).toBeUndefined();
  });

  it('401 — missing auth token returns 401', async () => {
    const res = await app.fetch(new Request('http://localhost/profile'), env);
    expect(res.status).toBe(401);
  });

  it('404 — user not in DB', async () => {
    const token = await adminToken('ghost-id');
    const res = await fetchWithToken('/profile', token);
    expect(res.status).toBe(404);
  });
});

// ─── PUT /profile ─────────────────────────────────────────────────────────────

describe('PUT /profile', () => {
  it('200 — updates profile fields', async () => {
    await seedUser('profile-user-id', 'profile@test.com');
    const token = await adminToken('profile-user-id');
    const req = jsonRequest('PUT', { firstName: 'John', lastName: 'Doe' });
    const res = await fetchWithToken('/profile', token, req);
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    // API-8: PUT /profile now returns the updated user object (not {success, message})
    expect(body.id).toBe('profile-user-id');
    expect(body.firstName).toBe('John');
    expect(body.lastName).toBe('Doe');
    expect(body.fullName).toBe('John Doe'); // LOGIC-22: auto-computed
    expect(body.password).toBeUndefined(); // sensitive fields stripped
    expect(body.refreshToken).toBeUndefined();

    // Verify DB was actually updated
    const updated = await getDb().select().from(users).where(eq(users.id, 'profile-user-id')).get();
    expect(updated?.firstName).toBe('John');
    expect(updated?.lastName).toBe('Doe');
  });

  it('404 — user not in DB', async () => {
    const token = await adminToken('ghost-id');
    const req = jsonRequest('PUT', { firstName: 'X' });
    const res = await fetchWithToken('/profile', token, req);
    expect(res.status).toBe(404);
  });
});
