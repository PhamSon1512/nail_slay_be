import type { Bindings, Variables } from '../../@types';
import { OpenAPIHono } from '@hono/zod-openapi';
import { describe, expect, it } from 'vitest';
import { rateLimit } from '../rateLimit';

// ─── Mock factory ─────────────────────────────────────────────────────────────
// c.env immutable trong CF Workers runtime (rule: test.md #9).
// Inject API_RATE_LIMITER qua tham số thứ hai của app.fetch() — đây là env object
// được truyền vào worker, nên c.env.API_RATE_LIMITER sẽ được resolved đúng.

type MockLimiter = { limit: (opts: { key: string }) => Promise<{ success: boolean }> };

/** Tạo mock limiter luôn trả về `success` cố định. */
function mockLimiter(success: boolean): MockLimiter {
  return { limit: async () => ({ success }) };
}

/** Tạo mock limiter với callback để capture key. */
function spyLimiter(onKey: (key: string) => void, success = true): MockLimiter {
  return {
    limit: async ({ key }: { key: string }) => {
      onKey(key);
      return { success };
    },
  };
}

/** Env object chứa mock limiter — truyền vào app.fetch() làm tham số thứ hai. */
function makeMockEnv(limiter: MockLimiter): Record<string, unknown> {
  return { API_RATE_LIMITER: limiter };
}

/** Tạo minimal app với rateLimit middleware. */
function makeApp() {
  const app = new OpenAPIHono<{ Bindings: Bindings; Variables: Variables }>();
  app.use('*', rateLimit);
  app.get('*', (c) => c.json({ ok: true }));
  app.post('*', (c) => c.json({ ok: true }));
  app.onError((err, c) => {
    const status = (err as any).statusCode ?? (err as any).status ?? 500;
    return c.json({ message: err.message, code: (err as any).code }, status as any);
  });
  return app;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('rateLimit middleware', () => {
  // ── 1. Rate limit exceeded → 429 ──────────────────────────────────────────

  it('429 — rate limiter trả success: false → trả về 429 RATE_LIMIT_EXCEEDED', async () => {
    const app = makeApp();
    const res = await app.fetch(new Request('http://localhost/api/test'), makeMockEnv(mockLimiter(false)) as any);
    expect(res.status).toBe(429);
    const body = (await res.json()) as { message: string; code: string };
    expect(body.message).toContain('Rate limit exceeded');
    expect(body.code).toBe('RATE_LIMIT_EXCEEDED');
  });

  // ── 2. Under rate limit → pass → 200 ──────────────────────────────────────

  it('200 — rate limiter trả success: true → request pass qua', async () => {
    const app = makeApp();
    const res = await app.fetch(new Request('http://localhost/api/test'), makeMockEnv(mockLimiter(true)) as any);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean };
    expect(body.ok).toBe(true);
  });

  // ── 3. Key = Authorization header ─────────────────────────────────────────

  it('dùng Authorization header làm rate limit key khi có', async () => {
    const capturedKeys: string[] = [];
    const app = makeApp();

    await app.fetch(
      new Request('http://localhost/api/test', {
        headers: { Authorization: 'Bearer my-token-xyz' },
      }),
      makeMockEnv(spyLimiter((k) => capturedKeys.push(k))) as any,
    );

    expect(capturedKeys[0]).toBe('Bearer my-token-xyz');
  });

  // ── 4. Key = cf-connecting-ip khi không có Authorization ──────────────────

  it('dùng cf-connecting-ip làm key khi không có Authorization', async () => {
    const capturedKeys: string[] = [];
    const app = makeApp();

    await app.fetch(
      new Request('http://localhost/api/test', {
        headers: { 'cf-connecting-ip': '1.2.3.4' },
      }),
      makeMockEnv(spyLimiter((k) => capturedKeys.push(k))) as any,
    );

    expect(capturedKeys[0]).toBe('1.2.3.4');
  });

  // ── 5. Key = 'anonymous' khi cả 2 header đều vắng ─────────────────────────

  it("dùng 'anonymous' khi không có Authorization và cf-connecting-ip", async () => {
    const capturedKeys: string[] = [];
    const app = makeApp();

    // Request không có header nào
    await app.fetch(new Request('http://localhost/api/test'), makeMockEnv(spyLimiter((k) => capturedKeys.push(k))) as any);

    expect(capturedKeys[0]).toBe('anonymous');
  });

  // ── 6. Authorization ưu tiên hơn cf-connecting-ip ─────────────────────────

  it('Authorization header được ưu tiên hơn cf-connecting-ip khi cả 2 đều có mặt', async () => {
    const capturedKeys: string[] = [];
    const app = makeApp();

    await app.fetch(
      new Request('http://localhost/api/test', {
        headers: {
          Authorization: 'Bearer token-abc',
          'cf-connecting-ip': '9.9.9.9',
        },
      }),
      makeMockEnv(spyLimiter((k) => capturedKeys.push(k))) as any,
    );

    expect(capturedKeys[0]).toBe('Bearer token-abc');
  });

  // ── 7. POST cũng bị rate limit ────────────────────────────────────────────

  it('429 — POST request cũng bị rate limit khi success: false', async () => {
    const app = makeApp();
    const res = await app.fetch(
      new Request('http://localhost/api/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      }),
      makeMockEnv(mockLimiter(false)) as any,
    );
    expect(res.status).toBe(429);
  });
});
