import { HTTPException } from 'hono/http-exception';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthenticationError, NotFoundError, ValidationError } from '../errors';
import { Logger } from '../logger';

// ─── Console mock setup ───────────────────────────────────────────────────────
// In the Cloudflare Workers test environment, console methods are bound native
// functions that cannot be spied on with vi.spyOn. We replace the entire console
// object on globalThis with a vi.fn()-based mock instead.

const consoleMock = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
};

beforeEach(() => {
  vi.stubGlobal('console', consoleMock);
  consoleMock.info.mockClear();
  consoleMock.warn.mockClear();
  consoleMock.error.mockClear();
  consoleMock.debug.mockClear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeCtx(overrides: Record<string, any> = {}): any {
  return {
    env: { ENVIRONMENT: 'development', ...overrides.env },
    var: {
      jwtPayload: {
        id: 'u1',
        email: 'user@test.com',
        roles: ['admin'],
        ...overrides.jwtPayload,
      },
    },
    req: {
      raw: {
        headers: new Headers({ 'content-type': 'application/json', cookie: 'token=secret' }),
      },
    },
    ...overrides.ctx,
  };
}

// ─── Logger.info ──────────────────────────────────────────────────────────────

describe('Logger.info', () => {
  it('calls console.info with ℹ️ prefix', () => {
    Logger.info('hello', { key: 'val' });
    expect(consoleMock.info).toHaveBeenCalledWith(
      expect.stringContaining('ℹ️ hello'),
      expect.objectContaining({ timestamp: expect.any(String) }),
    );
  });

  it('includes context when provided', () => {
    Logger.info('with ctx', {}, makeCtx());
    expect(consoleMock.info).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ user: expect.any(Object) }));
  });

  it('logs without context', () => {
    Logger.info('no ctx');
    expect(consoleMock.info).toHaveBeenCalledOnce();
  });
});

// ─── Logger.warn ──────────────────────────────────────────────────────────────

describe('Logger.warn', () => {
  it('calls console.warn', () => {
    Logger.warn('warning msg', { detail: 1 });
    expect(consoleMock.warn).toHaveBeenCalledWith('warning msg', expect.objectContaining({ data: { detail: 1 } }));
  });
});

// ─── Logger.debug ─────────────────────────────────────────────────────────────

describe('Logger.debug', () => {
  it('logs in development environment', () => {
    Logger.debug({ foo: 'bar' }, makeCtx({ env: { ENVIRONMENT: 'development' } }));
    expect(consoleMock.debug).toHaveBeenCalledWith('🐛 DEBUG', expect.any(Object));
  });

  it('does not log in production environment', () => {
    Logger.debug({ foo: 'bar' }, makeCtx({ env: { ENVIRONMENT: 'production' } }));
    expect(consoleMock.debug).not.toHaveBeenCalled();
  });

  it('logs without context (treated as non-production)', () => {
    Logger.debug({ foo: 'bar' });
    expect(consoleMock.debug).toHaveBeenCalledOnce();
  });
});

// ─── Logger.error ─────────────────────────────────────────────────────────────

describe('Logger.error', () => {
  it('logs AppError with 🚨 prefix', () => {
    const err = new ValidationError('invalid input');
    Logger.error(err as any);
    expect(consoleMock.error).toHaveBeenCalledWith(
      expect.stringContaining('🚨'),
      expect.objectContaining({
        error: expect.objectContaining({
          code: 'VALIDATION_ERROR',
          statusCode: 400,
          isOperational: true,
        }),
      }),
    );
  });

  it('includes context when provided', () => {
    Logger.error(new NotFoundError('item') as any, makeCtx());
    expect(consoleMock.error).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ user: expect.any(Object) }));
  });
});

// ─── Logger.logCrudOperation ──────────────────────────────────────────────────

describe('Logger.logCrudOperation', () => {
  it('includes operation and model name in message', () => {
    Logger.logCrudOperation('CREATE', 'User', { recordId: 'u1' }, makeCtx());
    expect(consoleMock.info).toHaveBeenCalledWith(
      expect.stringContaining('CREATE'),
      expect.objectContaining({ operation: 'CREATE', model: 'User' }),
    );
  });

  it('works without context', () => {
    Logger.logCrudOperation('DELETE', 'Post', { recordId: 'p1' });
    expect(consoleMock.info).toHaveBeenCalledOnce();
  });
});

// ─── Logger.logPerformance ────────────────────────────────────────────────────

describe('Logger.logPerformance', () => {
  it('uses ✅ emoji for fast operations (<100ms)', () => {
    Logger.logPerformance('READ', 'Product', { executionTime: 50 }, makeCtx());
    expect(consoleMock.info).toHaveBeenCalledWith(
      expect.stringContaining('✅'),
      expect.objectContaining({ metrics: expect.objectContaining({ performanceGrade: 'A' }) }),
    );
  });

  it('uses ⚠️ emoji for slow operations (>1000ms)', () => {
    Logger.logPerformance('READ', 'Product', { executionTime: 2000 }, makeCtx());
    expect(consoleMock.info).toHaveBeenCalledWith(
      expect.stringContaining('⚠️'),
      expect.objectContaining({ metrics: expect.objectContaining({ performanceGrade: 'D' }) }),
    );
  });

  it('uses 🐌 emoji for critical operations (>5000ms)', () => {
    Logger.logPerformance('READ', 'Product', { executionTime: 6000 }, makeCtx());
    expect(consoleMock.info).toHaveBeenCalledWith(
      expect.stringContaining('🐌'),
      expect.objectContaining({ metrics: expect.objectContaining({ performanceGrade: 'F' }) }),
    );
  });

  it('computes cache hit rate when both hits and misses are provided', () => {
    Logger.logPerformance('READ', 'Cache', { executionTime: 10, cacheHits: 80, cacheMisses: 20 });
    expect(consoleMock.info).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ metrics: expect.objectContaining({ cacheHitRate: '80.00%' }) }),
    );
  });
});

// ─── Logger.getFilteredHeaders ────────────────────────────────────────────────

describe('Logger.getFilteredHeaders', () => {
  it('strips cookie header', () => {
    const headers = Logger.getFilteredHeaders(makeCtx());
    expect(headers['cookie']).toBeUndefined();
    expect(headers['content-type']).toBe('application/json');
  });
});

// ─── Logger.getUserInfo ───────────────────────────────────────────────────────

describe('Logger.getUserInfo', () => {
  it('returns user info from jwtPayload', () => {
    const info = Logger.getUserInfo(makeCtx());
    expect(info).toMatchObject({ id: 'u1', email: 'user@test.com', roles: ['admin'] });
  });

  it('returns null when jwtPayload is absent', () => {
    const ctx = makeCtx();
    ctx.var.jwtPayload = undefined;
    expect(Logger.getUserInfo(ctx)).toBeNull();
  });
});

// ─── Logger.getStatusCode ─────────────────────────────────────────────────────

describe('Logger.getStatusCode', () => {
  it('returns AppError statusCode', () => {
    expect(Logger.getStatusCode(new NotFoundError('x'))).toBe(404);
    expect(Logger.getStatusCode(new AuthenticationError('x'))).toBe(401);
  });

  it('returns HTTPException status', () => {
    expect(Logger.getStatusCode(new HTTPException(403))).toBe(403);
  });

  it('returns 409 for UNIQUE constraint DB errors', () => {
    const err = Object.assign(new Error('fail'), { cause: 'UNIQUE constraint failed: users.email' });
    expect(Logger.getStatusCode(err)).toBe(409);
  });

  it('returns 400 for FOREIGN KEY constraint DB errors', () => {
    const err = Object.assign(new Error('fail'), { cause: 'FOREIGN KEY constraint failed' });
    expect(Logger.getStatusCode(err)).toBe(400);
  });

  it('returns 401 for JWT errors', () => {
    const err = Object.assign(new Error('expired'), { name: 'JwtTokenExpired' });
    expect(Logger.getStatusCode(err)).toBe(401);
  });

  it('returns 500 for unknown errors', () => {
    expect(Logger.getStatusCode(new Error('mystery'))).toBe(500);
  });
});

// ─── Logger.getErrorCode ──────────────────────────────────────────────────────

describe('Logger.getErrorCode', () => {
  it('returns AppError code', () => {
    expect(Logger.getErrorCode(new ValidationError('bad'))).toBe('VALIDATION_ERROR');
  });

  it('returns HTTP_403 for HTTPException', () => {
    expect(Logger.getErrorCode(new HTTPException(403) as any)).toBe('HTTP_403');
  });

  it('returns DB_UNIQUE_CONSTRAINT for unique violations', () => {
    const err = Object.assign(new Error('fail'), { cause: 'UNIQUE constraint failed: users.email' });
    expect(Logger.getErrorCode(err)).toBe('DB_UNIQUE_CONSTRAINT');
  });

  it('returns TYPE_ERROR for TypeError', () => {
    expect(Logger.getErrorCode(new TypeError('bad type') as any)).toBe('TYPE_ERROR');
  });

  it('returns INTERNAL_SERVER_ERROR as default', () => {
    expect(Logger.getErrorCode(new Error('mystery') as any)).toBe('INTERNAL_SERVER_ERROR');
  });
});
