import { env } from 'cloudflare:test';
import { eq, sql } from 'drizzle-orm';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { users } from '../../../models';
import { bearerHeader, getDb, jsonRequest, makeTestApp, USERS_DDL, USERS_IDX } from '../../../test/helpers';
import AuthRoutes from '../index';

// ─── App ──────────────────────────────────────────────────────────────────────

const app = makeTestApp('/auth', AuthRoutes);

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function clearUsers() {
  await getDb().delete(users);
}

/**
 * Registers a user via the signup endpoint and returns the userId.
 */
async function signupUser(email: string, password: string): Promise<string> {
  // Use app.fetch(req, env) so that c.env.JWT_SECRET is available inside the route handler
  const res = await app.fetch(new Request('http://localhost/auth/sign-up', jsonRequest('POST', { email, password })), env);
  const body = (await res.json()) as { id: string };
  return body.id;
}

/**
 * Logs in and returns the token + userId.
 */
async function loginUser(email: string, password: string) {
  // Use app.fetch(req, env) so that c.env.JWT_SECRET is available inside the route handler
  const res = await app.fetch(new Request('http://localhost/auth/login', jsonRequest('POST', { email, password })), env);
  return res.json() as Promise<{ token: string; userId: string; exp: number }>;
}

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeAll(async () => {
  await env.DB.exec(USERS_DDL);
  for (const idx of USERS_IDX) await env.DB.exec(idx);
});

beforeEach(async () => {
  await clearUsers();
});

// ─── POST /auth/sign-up ───────────────────────────────────────────────────────

describe('POST /auth/sign-up', () => {
  it('201 — creates user and returns id', async () => {
    const res = await app.fetch(
      new Request('http://localhost/auth/sign-up', jsonRequest('POST', { email: 'test@example.com', password: 'pass1234' })),
      env,
    );
    expect(res.status).toBe(201);
    const body = (await res.json()) as { id: string };
    expect(body.id).toBeTruthy();
  });

  it('409 — duplicate email returns conflict', async () => {
    await signupUser('dup@example.com', 'pass1234');
    const res = await app.fetch(
      new Request('http://localhost/auth/sign-up', jsonRequest('POST', { email: 'dup@example.com', password: 'pass1234' })),
      env,
    );
    expect(res.status).toBe(409);
  });

  it('400 — invalid email format', async () => {
    const res = await app.fetch(
      new Request('http://localhost/auth/sign-up', jsonRequest('POST', { email: 'not-an-email', password: 'pass1234' })),
      env,
    );
    expect(res.status).toBe(400);
  });

  it('400 — password shorter than 8 chars', async () => {
    const res = await app.fetch(
      new Request('http://localhost/auth/sign-up', jsonRequest('POST', { email: 'ok@example.com', password: 'short' })),
      env,
    );
    expect(res.status).toBe(400);
  });
});

// ─── POST /auth/login ─────────────────────────────────────────────────────────

describe('POST /auth/login', () => {
  beforeEach(async () => {
    await signupUser('user@example.com', 'mypassword');
  });

  it('200 — valid credentials return token, userId, exp', async () => {
    const res = await app.fetch(
      new Request('http://localhost/auth/login', jsonRequest('POST', { email: 'user@example.com', password: 'mypassword' })),
      env,
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { token: string; userId: string; exp: number };
    expect(body.token).toBeTruthy();
    expect(body.userId).toBeTruthy();
    expect(body.exp).toBeGreaterThan(Date.now() / 1000);
  });

  it('200 — sets cookie "token" on successful login', async () => {
    const res = await app.fetch(
      new Request('http://localhost/auth/login', jsonRequest('POST', { email: 'user@example.com', password: 'mypassword' })),
      env,
    );
    expect(res.status).toBe(200);
    const setCookie = res.headers.get('set-cookie') ?? '';
    expect(setCookie).toContain('token=');
  });

  it('400 — wrong password returns 400', async () => {
    const res = await app.fetch(
      new Request('http://localhost/auth/login', jsonRequest('POST', { email: 'user@example.com', password: 'wrongpassword' })),
      env,
    );
    expect(res.status).toBe(400);
  });

  it('400 — non-existent user returns 400', async () => {
    const res = await app.fetch(
      new Request('http://localhost/auth/login', jsonRequest('POST', { email: 'ghost@example.com', password: 'anything' })),
      env,
    );
    expect(res.status).toBe(400);
  });

  it('400 — missing password field', async () => {
    const res = await app.fetch(
      new Request('http://localhost/auth/login', jsonRequest('POST', { email: 'user@example.com' })),
      env,
    );
    expect(res.status).toBe(400);
  });
});

// ─── GET /auth/token ─────────────────────────────────────────────────────────

describe('GET /auth/token', () => {
  let existingToken: string;
  let userId: string;

  beforeEach(async () => {
    await signupUser('refresh@example.com', 'password123');
    const { token, userId: uid } = await loginUser('refresh@example.com', 'password123');
    existingToken = token;
    userId = uid;
  });

  it('200 — valid token returns a new access token', async () => {
    const res = await app.fetch(
      new Request('http://localhost/auth/token', {
        method: 'GET',
        headers: bearerHeader(existingToken),
      }),
      env,
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { token: string };
    expect(body.token).toBeTruthy();
  });

  it('401 — no token header returns 401', async () => {
    const res = await app.fetch(new Request('http://localhost/auth/token', { method: 'GET' }), env);
    expect(res.status).toBe(401);
  });

  it('200 — /auth/token sets cookie với Max-Age header', async () => {
    const res = await app.fetch(
      new Request('http://localhost/auth/token', {
        method: 'GET',
        headers: bearerHeader(existingToken),
      }),
      env,
    );
    expect(res.status).toBe(200);
    const setCookieHeader = res.headers.get('set-cookie') ?? '';
    expect(setCookieHeader).toMatch(/[Mm]ax-[Aa]ge=/);
  });

  it('200 — /auth/token trả về token MỚI khác với token cũ (jti rotation)', async () => {
    const res = await app.fetch(
      new Request('http://localhost/auth/token', {
        method: 'GET',
        headers: bearerHeader(existingToken),
      }),
      env,
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { token: string };
    expect(body.token).not.toBe(existingToken);
  });

  it('401 — when refresh_token cleared in DB, returns 401', async () => {
    // D1 không accept null trực tiếp — phải dùng sql`NULL` (rule: test.md #4)
    await getDb()
      .update(users)
      .set({ refreshToken: sql`NULL` })
      .where(eq(users.id, userId));

    const res = await app.fetch(
      new Request('http://localhost/auth/token', {
        method: 'GET',
        headers: bearerHeader(existingToken),
      }),
      env,
    );
    expect(res.status).toBe(401);
  });
});
