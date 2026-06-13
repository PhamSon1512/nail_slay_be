import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { handleError, notFoundHandler } from '../errorHandler';
import { ValidationError } from '../errors';

// getConnInfo is no longer imported by errorHandler.ts (LOW-4 fix: IP removed from response)

// ─── Console mock ─────────────────────────────────────────────────────────────

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

// ─── Context factory ──────────────────────────────────────────────────────────

function makeCtx(
  overrides: {
    environment?: string;
    path?: string;
    method?: string;
    headers?: Record<string, string | null>;
  } = {},
): any {
  const jsonMock = vi.fn((body: any, status: any) => ({ body, status }));
  return {
    req: {
      header: (name: string) => overrides.headers?.[name] ?? null,
      path: overrides.path ?? '/test',
      method: overrides.method ?? 'GET',
      raw: { headers: new Headers() },
    },
    env: { ENVIRONMENT: overrides.environment ?? 'development' },
    var: {},
    header: vi.fn(),
    json: jsonMock,
    _json: jsonMock,
  };
}

// ─── handleError ─────────────────────────────────────────────────────────────

describe('handleError', () => {
  it('returns json response with error shape', () => {
    const c = makeCtx();
    const err = new ValidationError('invalid input');

    const result = handleError(c, err) as any;

    expect(result.status).toBe(400);
    expect(result.body.success).toBe(false);
    expect(result.body.error.code).toBe('VALIDATION_ERROR');
    expect(result.body.error.message).toBe('invalid input');
    expect(result.body.error.statusCode).toBe(400);
  });

  it('sets X-Error-Code response header', () => {
    const c = makeCtx();
    const err = new ValidationError('bad');

    handleError(c, err);

    expect(c.header).toHaveBeenCalledWith('X-Error-Code', 'VALIDATION_ERROR');
  });

  it('includes stack in development environment', () => {
    const c = makeCtx({ environment: 'development' });
    const err = new Error('boom');

    const result = handleError(c, err) as any;

    expect(result.body.error.stack).toBeDefined();
  });

  it('omits stack in production environment', () => {
    const c = makeCtx({ environment: 'production' });
    const err = new Error('boom');

    const result = handleError(c, err) as any;

    expect(result.body.error.stack).toBeUndefined();
  });

  it('includes requestId from cf-ray header', () => {
    const c = makeCtx({ headers: { 'cf-ray': 'ray-abc123' } });
    const err = new ValidationError('x');

    const result = handleError(c, err) as any;

    expect(result.body.error.requestId).toBe('ray-abc123');
  });

  it('does NOT include ip in meta (LOW-4: IP removed from response body)', () => {
    const c = makeCtx();
    const err = new ValidationError('x');

    const result = handleError(c, err) as any;

    // SEC fix: ip is no longer exposed in the response body
    expect(result.body.meta.ip).toBeUndefined();
  });

  it('includes cause string when error has cause', () => {
    const c = makeCtx();
    const err = Object.assign(new Error('wrapper'), { cause: 'UNIQUE constraint failed' });

    const result = handleError(c, err) as any;

    expect(result.body.error.cause).toBe('UNIQUE constraint failed');
  });

  it('sets cause to undefined when error has no cause', () => {
    const c = makeCtx();
    const err = new Error('plain');

    const result = handleError(c, err) as any;

    expect(result.body.error.cause).toBeUndefined();
  });

  it('falls back to default message when error.message is empty string', () => {
    const c = makeCtx();
    // Error with empty string message → || fallback kicks in
    const err = new Error('');

    const result = handleError(c, err) as any;

    expect(result.body.error.message).toBe('An unexpected error occurred');
  });
});

// ─── notFoundHandler ──────────────────────────────────────────────────────────

describe('notFoundHandler', () => {
  it('returns 404 json response with ROUTE_NOT_FOUND code', () => {
    const c = makeCtx({ path: '/api/missing', method: 'DELETE' });

    const result = notFoundHandler(c) as any;

    expect(result.status).toBe(404);
    expect(result.body.success).toBe(false);
    expect(result.body.error.code).toBe('ROUTE_NOT_FOUND');
    expect(result.body.error.statusCode).toBe(404);
  });

  it('includes correct path and method in error body', () => {
    const c = makeCtx({ path: '/api/ghost', method: 'PATCH' });

    const result = notFoundHandler(c) as any;

    expect(result.body.error.message).toContain('/api/ghost');
    expect(result.body.error.message).toContain('PATCH');
  });

  it('sets X-Error-Code header to ROUTE_NOT_FOUND', () => {
    const c = makeCtx();

    notFoundHandler(c);

    expect(c.header).toHaveBeenCalledWith('X-Error-Code', 'ROUTE_NOT_FOUND');
  });

  it('does NOT include ip in meta (LOW-4: IP removed from response body)', () => {
    const c = makeCtx({ environment: 'production' });

    const result = notFoundHandler(c) as any;

    // SEC fix: ip is no longer exposed in the response body
    expect(result.body.meta.ip).toBeUndefined();
    expect(result.body.meta.environment).toBe('production');
  });
});
