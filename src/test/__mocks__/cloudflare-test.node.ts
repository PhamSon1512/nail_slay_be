import Database from 'better-sqlite3';
import { createSqliteD1 } from './d1-shim';

// Each test file runs in its own forked Node process (pool: 'forks'),
// so this module-level database is fully isolated per test file.
// DDL (CREATE TABLE) is run in beforeAll, cleanup in beforeEach — same
// pattern as the real CF pool tests.
const _sqlite = new Database(':memory:');

/**
 * Node-compatible mock for `cloudflare:test` env bindings.
 *
 * Aliased in vitest.coverage.config.mts via resolve.alias so that
 * `import { env } from 'cloudflare:test'` resolves to this file
 * when running the coverage test suite in Node (forks pool).
 */
export const env: {
  DB: ReturnType<typeof createSqliteD1>;
  JWT_SECRET: string;
  ENVIRONMENT: string;
  API_RATE_LIMITER: { limit: (_: { key: string }) => Promise<{ success: boolean }> };
} = {
  DB: createSqliteD1(_sqlite),
  // Must be ≥ 32 chars for JWT signing (HS256 minimum key length)
  JWT_SECRET: 'coverage-test-jwt-secret-minimum-32-chars!!',
  ENVIRONMENT: 'test',
  // Always allow — rate limiting is tested separately in rateLimit.test.ts
  API_RATE_LIMITER: { limit: async (_: { key: string }) => ({ success: true }) },
};

// Stub exports that some test files import but don't use in Node context
export const SELF = {} as any;
export const fetchMock = {} as any;
