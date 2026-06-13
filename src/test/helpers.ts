/**
 * Shared test helpers for API integration tests.
 *
 * All integration tests boot a real OpenAPIHono app against the
 * in-memory D1 instance provided by @cloudflare/vitest-pool-workers.
 */

import type { Bindings, Variables } from '../@types';
import { OpenAPIHono } from '@hono/zod-openapi';
import { env } from 'cloudflare:test';
import { drizzle } from 'drizzle-orm/d1';
import { schemaRelations } from '../models/relations';

export type DrizzleDb = ReturnType<typeof getDb>;

// ─── DB factory ───────────────────────────────────────────────────────────────

export function getDb() {
  return drizzle(env.DB, { relations: schemaRelations, casing: 'snake_case' });
}

// ─── App factory ──────────────────────────────────────────────────────────────

export function makeTestApp(
  mountPath: string,
  routes: OpenAPIHono<{ Bindings: Bindings; Variables: Variables }>,
): OpenAPIHono<{ Bindings: Bindings; Variables: Variables }> {
  const app = new OpenAPIHono<{ Bindings: Bindings; Variables: Variables }>();

  app.use('*', async (c, next) => {
    c.set('db', getDb());
    await next();
  });

  app.route(mountPath, routes);

  app.onError((err, c) => {
    const status: number = (err as any).statusCode ?? (err as any).status ?? 500;
    return c.json({ message: err.message, code: (err as any).code }, status as any);
  });

  return app;
}

// ─── DDL ──────────────────────────────────────────────────────────────────────

// No FK to roles table — role is a plain text field validated by casbinPolicies at runtime.
export const USERS_DDL = `CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY NOT NULL, email TEXT NOT NULL, password TEXT NOT NULL, first_name TEXT, last_name TEXT, full_name TEXT, phone TEXT, role TEXT DEFAULT 'user', refresh_token TEXT, created_at INTEGER NOT NULL, updated_at INTEGER, deleted_at INTEGER)`;
export const USERS_IDX = [
  `CREATE INDEX IF NOT EXISTS user_deleted_at_idx ON users (deleted_at)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS users_email_active_udx ON users (email) WHERE deleted_at IS NULL`,
  `CREATE INDEX IF NOT EXISTS users_refresh_token_idx ON users (refresh_token)`,
];

export const AUDIT_LOGS_DDL = `CREATE TABLE IF NOT EXISTS audit_logs (id INTEGER PRIMARY KEY AUTOINCREMENT, actor_id TEXT, actor_email TEXT, action TEXT NOT NULL, entity_type TEXT NOT NULL, entity_id TEXT, old_value TEXT, new_value TEXT, ip TEXT, user_agent TEXT, created_at INTEGER NOT NULL, CONSTRAINT fk_audit_logs_actor_id_users_id_fk FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE SET NULL)`;

export const MEDIA_DDL = [
  `CREATE TABLE IF NOT EXISTS media (id TEXT PRIMARY KEY NOT NULL, file_name TEXT NOT NULL, file_type TEXT NOT NULL, file_size INTEGER NOT NULL CHECK(file_size > 0), bucket_key TEXT NOT NULL UNIQUE, title TEXT, description TEXT, tags TEXT, created_by TEXT, updated_by TEXT, deleted_by TEXT, created_at INTEGER NOT NULL, updated_at INTEGER, deleted_at INTEGER)`,
  `CREATE INDEX IF NOT EXISTS media_created_by_idx ON media (created_by)`,
  `CREATE INDEX IF NOT EXISTS media_updated_by_idx ON media (updated_by)`,
  `CREATE INDEX IF NOT EXISTS media_deleted_by_idx ON media (deleted_by)`,
  `CREATE INDEX IF NOT EXISTS media_deleted_at_idx ON media (deleted_at)`,
];

// ─── JSON request helper ──────────────────────────────────────────────────────

export function jsonRequest(method: string, body: Record<string, unknown>, headers: Record<string, string> = {}): RequestInit {
  return {
    method,
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  };
}

// ─── Auth header helper ───────────────────────────────────────────────────────

export function bearerHeader(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}` };
}
