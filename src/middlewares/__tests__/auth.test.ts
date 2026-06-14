import type { Bindings, Variables } from '../../@types';
import { sign } from 'hono/jwt';
import { OpenAPIHono } from '@hono/zod-openapi';
import { env } from 'cloudflare:test';
import dayjs from 'dayjs';
import { eq, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { schemaRelations, users } from '../../models';
import { USERS_DDL, USERS_IDX } from '../../test/helpers';
import { sha256Hex } from '../../utils/crypto';
import { auth } from '../auth';

const SECRET = () => env.JWT_SECRET;

// ─── DB helpers ───────────────────────────────────────────────────────────────

function getDb() {
  return drizzle(env.DB, { relations: schemaRelations, casing: 'snake_case' });
}

async function clearAll() {
  await getDb().delete(users);
}

/** Seed user with hashed refresh_token (sha256 of raw token). */
async function seedUser(id: string, rawRefreshToken?: string) {
  const refreshToken = rawRefreshToken ? await sha256Hex(rawRefreshToken) : undefined;
  const values: typeof users.$inferInsert = {
    id,
    email: `${id}@example.com`,
    password: 'hashed',
    ...(refreshToken !== undefined ? { refreshToken } : {}),
  };
  await getDb().insert(users).values(values);
}

// ─── Token factories ──────────────────────────────────────────────────────────

async function makeToken(extra: Record<string, unknown> = {}) {
  return sign(
    {
      id: 'user-1',
      email: 'test@example.com',
      roles: ['user'],
      exp: dayjs().add(1, 'day').unix(),
      jti: 'test-jti-11111',
      ...extra,
    },
    SECRET(),
  );
}

async function makeExpiredToken(extra: Record<string, unknown> = {}) {
  return sign(
    {
      id: 'user-1',
      email: 'test@example.com',
      roles: ['user'],
      exp: dayjs().subtract(1, 'day').unix(),
      jti: 'test-jti-11111',
      ...extra,
    },
    SECRET(),
  );
}

// ─── App factory ──────────────────────────────────────────────────────────────

function makeApp() {
  const app = new OpenAPIHono<{ Bindings: Bindings; Variables: Variables }>();

  app.use('*', (c, next) => {
    c.set('db', getDb());
    return next();
  });

  app.use('*', auth);

  app.get('*', (c) => c.json({ ok: true }));
  app.post('*', (c) => c.json({ ok: true }));

  app.onError((err, c) => {
    const e = err as { statusCode?: number; status?: number; code?: string };
    return c.json({ message: err.message, code: e.code }, (e.statusCode ?? e.status ?? 500) as any);
  });

  return app;
}

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeAll(async () => {
  await env.DB.exec(USERS_DDL);
  for (const idx of USERS_IDX) await env.DB.exec(idx);
});

beforeEach(async () => {
  await clearAll();
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('auth middleware', () => {
  // ── 1. Missing token ───────────────────────────────────────────────────────

  it('401 — không có Authorization header và không có cookie', async () => {
    const app = makeApp();
    const res = await app.fetch(new Request('http://localhost/api/test'), env);
    expect(res.status).toBe(401);
    const body = (await res.json()) as { message: string };
    expect(body.message).toContain('Authentication token required');
  });

  // ── 2. Invalid token format ────────────────────────────────────────────────

  it('400 — token chứa ký tự không hợp lệ (spaces, !@#)', async () => {
    const app = makeApp();
    const res = await app.fetch(
      new Request('http://localhost/api/test', {
        headers: { Authorization: 'Bearer invalid token with spaces!@#' },
      }),
      env,
    );
    expect(res.status).toBe(400);
    const body = (await res.json()) as { message: string };
    expect(body.message).toContain('Invalid token format');
  });

  // ── 3. Signature mismatch (token bị giả mạo) ─────────────────────────────

  it('401 — token ký bằng secret khác → JwtTokenSignatureMismatched', async () => {
    const app = makeApp();
    const fakeToken = await sign({ id: 'evil', exp: dayjs().add(1, 'day').unix() }, 'wrong-secret');
    const res = await app.fetch(
      new Request('http://localhost/api/test', {
        headers: { Authorization: `Bearer ${fakeToken}` },
      }),
      env,
    );
    expect(res.status).toBe(401);
    const body = (await res.json()) as { message: string };
    expect(body.message).toContain('Invalid token signature');
  });

  // ── 4. Token hợp lệ → 200 ──────────────────────────────────────────────────

  it('200 — token hợp lệ, trả về 200', async () => {
    const token = await makeToken();
    const app = makeApp();

    const res = await app.fetch(
      new Request('http://localhost/api/test', {
        headers: { Authorization: `Bearer ${token}` },
      }),
      env,
    );
    expect(res.status).toBe(200);
  });

  // ── 5. Token hợp lệ qua cookie ───────────────────────────────────────────

  it('200 — token hợp lệ qua Cookie header → trả về 200', async () => {
    const token = await makeToken();
    const app = makeApp();

    const res = await app.fetch(
      new Request('http://localhost/api/test', {
        headers: { Cookie: `token=${token}` },
      }),
      env,
    );
    expect(res.status).toBe(200);
  });

  // ── 6. Expired token — user không tồn tại trong DB ───────────────────────

  it('401 — token expired, userId không tồn tại trong DB', async () => {
    const expiredToken = await makeExpiredToken({ id: 'ghost-user' });
    const app = makeApp();

    const res = await app.fetch(
      new Request('http://localhost/api/test', {
        headers: { Authorization: `Bearer ${expiredToken}` },
      }),
      env,
    );
    expect(res.status).toBe(401);
  });

  // ── 7. Expired token — user không có refresh_token ────────────────────────

  it('401 — token expired, user không có refresh_token trong DB', async () => {
    await seedUser('user-1');
    const expiredToken = await makeExpiredToken({ id: 'user-1' });
    const app = makeApp();

    const res = await app.fetch(
      new Request('http://localhost/api/test', {
        headers: { Authorization: `Bearer ${expiredToken}` },
      }),
      env,
    );
    expect(res.status).toBe(401);
    const body = (await res.json()) as { message: string };
    expect(body.message).toContain('Session expired, please log in again');
  });

  // ── 8. Expired token — jti null trong old token ─────────────────────────

  it('401 — token expired, old access token không có jti', async () => {
    const rawRefresh = await sign({ exp: dayjs().add(7, 'day').unix() }, SECRET());
    await seedUser('user-1', rawRefresh);

    const expiredToken = await makeExpiredToken({ id: 'user-1', jti: undefined });
    const app = makeApp();

    const res = await app.fetch(
      new Request('http://localhost/api/test', {
        headers: { Authorization: `Bearer ${expiredToken}` },
      }),
      env,
    );
    expect(res.status).toBe(401);
    const body = (await res.json()) as { message: string };
    expect(body.message).toContain('Session expired, please log in again');
  });

  // ── 9. Expired token — refreshToken hash xóa khỏi DB (revoked session) ──

  it('401 — token expired, refreshToken hash bị xóa khỏi DB', async () => {
    const rawRefresh = await sign({ jti: 11111, exp: dayjs().add(7, 'day').unix() }, SECRET());
    await seedUser('user-1', rawRefresh);

    await getDb()
      .update(users)
      .set({ refreshToken: sql`NULL` })
      .where(eq(users.id, 'user-1'));

    const expiredToken = await makeExpiredToken({ id: 'user-1', jti: 11111 });
    const app = makeApp();

    const res = await app.fetch(
      new Request('http://localhost/api/test', {
        headers: { Authorization: `Bearer ${expiredToken}` },
      }),
      env,
    );
    expect(res.status).toBe(401);
    const body = (await res.json()) as { message: string };
    expect(body.message).toContain('Session expired, please log in again');
  });

  // ── 10. Expired token — refresh thành công → cookie mới được set ─────────

  it('set-cookie — token expired nhưng refresh_token hợp lệ → response có cookie token mới', async () => {
    const jti = 77777;
    const rawRefreshToken = await sign({ jti, exp: dayjs().add(7, 'day').unix() }, SECRET());
    await seedUser('user-1', rawRefreshToken);

    const expiredToken = await makeExpiredToken({ id: 'user-1', jti });
    const app = makeApp();

    const res = await app.fetch(
      new Request('http://localhost/api/test', {
        headers: {
          Authorization: `Bearer ${expiredToken}`,
          Cookie: `refresh_token=${rawRefreshToken}`,
        },
      }),
      env,
    );

    const setCookie = res.headers.get('set-cookie') ?? '';
    expect(setCookie).toContain('token=');
  });

  // ── 11. Soft-deleted user — auto-refresh must reject ───────────────────────

  it('401 — token expired, user đã bị soft-delete không được auto-refresh', async () => {
    const rawRefresh = await sign({ jti: 'soft-delete-jti', exp: dayjs().add(7, 'day').unix() }, SECRET());
    await seedUser('user-soft-deleted', rawRefresh);

    await getDb().update(users).set({ deletedAt: new Date() }).where(eq(users.id, 'user-soft-deleted'));

    const expiredToken = await makeExpiredToken({ id: 'user-soft-deleted', jti: 'soft-delete-jti' });
    const app = makeApp();

    const res = await app.fetch(
      new Request('http://localhost/api/test', {
        headers: { Authorization: `Bearer ${expiredToken}` },
      }),
      env,
    );
    expect(res.status).toBe(401);
    const body = (await res.json()) as { message: string };
    expect(body.message).toContain('Session expired, please log in again');
  });
});
