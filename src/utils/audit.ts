import type { HonoCtx } from '../@types';
import type { DrizzleDb } from '../db';
import type { AuditActionType } from '../models';
import { auditLogs } from '../models';

/**
 * Input for writing a single audit log entry.
 */
export interface AuditInput {
  /** The action performed, e.g. AuditAction.ROLE_CREATE */
  action: AuditActionType;
  /** Type of the affected entity: "role", "permission", "user", "media", "order", ... */
  entityType: string;
  /** ID/slug of the affected entity — null for collection-level ops */
  entityId?: string | null;
  /** State before the action (omit for create / read-only events) */
  oldValue?: Record<string, unknown> | null;
  /** State after the action (omit for delete / read-only events) */
  newValue?: Record<string, unknown> | null;
  /**
   * Who performed the action — null for system / background actions.
   * When using the Hono context overload, defaults to actorFromContext(c).
   * Pass explicitly to override (e.g. login route where JWT is not yet set).
   */
  actor?: { id: string; email: string } | null;
  /** Raw request context — used to extract ip / user-agent. Auto-filled from c.req.raw when using the Hono overload. */
  request?: Request | null;
}

/**
 * Write a single audit log entry.
 *
 * ### Overload 1 — Hono context (preferred in route handlers / service functions)
 * `writeAudit(c, input)` — db, request and executionCtx are auto-extracted from `c`.
 * `actor` defaults to `actorFromContext(c)`; pass it explicitly to override
 * (e.g. login route, where no JWT payload exists yet).
 *
 * @example
 * // Service function — just pass c
 * void writeAudit(c, {
 *   action: AuditAction.ROLE_CREATE,
 *   entityType: 'role',
 *   entityId: role.slug,
 *   newValue: role,
 * });
 *
 * @example
 * // Login route — override actor explicitly (no JWT at this point)
 * void writeAudit(c, {
 *   action: AuditAction.USER_LOGIN,
 *   entityType: 'user',
 *   entityId: user.id,
 *   actor: { id: user.id, email: user.email },
 * });
 *
 * ### Overload 2 — explicit db + ctx (for background jobs / seeding outside a request)
 * `writeAudit(db, input, ctx?)`
 *
 * @example
 * void writeAudit(db, { action: AuditAction.RBAC_SEED, entityType: 'system', entityId: null });
 */
// Overload 1: Hono context
export function writeAudit(c: HonoCtx, input: Omit<AuditInput, 'request'>): void;
// Overload 2: explicit db/ctx (background jobs, seeding outside a request)
export function writeAudit(db: DrizzleDb, input: AuditInput, ctx?: ExecutionContext): void;
// Implementation
export function writeAudit(
  first: HonoCtx | DrizzleDb,
  input: AuditInput | Omit<AuditInput, 'request'>,
  ctx?: ExecutionContext,
): void {
  let db: DrizzleDb;
  let fullInput: AuditInput;

  if ('req' in (first as object)) {
    // Overload 1: HonoCtx
    const c = first as HonoCtx;
    db = c.var.db;
    const partial = input as Omit<AuditInput, 'request'>;
    fullInput = {
      ...partial,
      // Use explicit actor if caller provided the key; fall back to actorFromContext
      actor: 'actor' in partial ? partial.actor : actorFromContext(c),
      request: c.req.raw,
    };
    // executionCtx may be unavailable in test environments that use app.request()
    // instead of app.fetch(req, env). Gracefully degrade: the audit Promise still
    // runs, but won't be kept alive via waitUntil (acceptable outside CF Workers).
    try {
      ctx = c.executionCtx;
    } catch {
      ctx = undefined;
    }
  } else {
    // Overload 2: DrizzleDb
    db = first as DrizzleDb;
    fullInput = input as AuditInput;
  }

  // Get IP from Cloudflare headers first, then fall back to standard headers
  const ip =
    fullInput.request?.headers.get('cf-connecting-ip') ??
    fullInput.request?.headers.get('x-real-ip') ??
    fullInput.request?.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    null;

  const userAgent = fullInput.request?.headers.get('user-agent') ?? null;

  const insertPromise = db
    .insert(auditLogs)
    .values({
      action: fullInput.action,
      entityType: fullInput.entityType,
      entityId: fullInput.entityId ?? null,
      actorId: fullInput.actor?.id ?? null,
      actorEmail: fullInput.actor?.email ?? null,
      oldValue: sanitizeAuditSnapshot(fullInput.oldValue),
      newValue: sanitizeAuditSnapshot(fullInput.newValue),
      ip,
      userAgent,
    })
    .then(() => {
      // intentionally empty — success is silent
    })
    .catch((err: unknown) => {
      // Audit failure MUST NOT propagate — log to console only
      console.error('[audit] Failed to write audit log:', err, { action: fullInput.action, entityId: fullInput.entityId });
    });

  // CF Workers: ctx.waitUntil() keeps the Worker alive until the audit write
  // completes, even after the response has been sent. Without this, the runtime
  // may terminate the Worker before the Promise resolves — silently dropping logs.
  ctx?.waitUntil(insertPromise);
}

/**
 * Extract actor info from a Hono context.
 * Returns null if the request is unauthenticated (e.g. login / signup).
 */
export function actorFromContext(c: HonoCtx): { id: string; email: string } | null {
  const payload = c.var?.jwtPayload;
  if (!payload?.id || !payload?.email) return null;
  return { id: payload.id, email: payload.email };
}

/**
 * Field names that must never be persisted in audit snapshots.
 * Keep lowercase to make matching case-insensitive.
 */
const REDACTED_FIELDS = new Set([
  'password',
  'passcode',
  'pin',
  'otp',
  'token',
  'accesstoken',
  'access_token',
  'refreshtoken',
  'refresh_token',
  'refreshtokenhash',
  'secret',
  'apikey',
  'api_key',
  'authorization',
  'cookie',
  'cardpin',
  'card_pin',
  'bankaccountnumber',
  'bank_account_number',
  'accountnumber',
  'account_number',
  'nationalid',
  'national_id',
  'idnumber',
  'id_number',
  'idcard',
  'id_card',
  'phone',
  'email',
  'address',
  'avatarurl',
  'avatar_url',
  'paymentref',
  'payment_ref',
]);

const MAX_REDACTION_DEPTH = 8;

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value) && !(value instanceof Date);
}

function shouldRedactField(fieldName: string): boolean {
  const normalized = fieldName.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase();
  return REDACTED_FIELDS.has(normalized);
}

function redactValue(value: unknown, depth: number): unknown {
  if (depth > MAX_REDACTION_DEPTH) return '[MAX_DEPTH]';
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map((item) => redactValue(item, depth + 1));
  if (!isPlainRecord(value)) return value;

  return Object.fromEntries(
    Object.entries(value).map(([key, entryValue]) => [
      key,
      shouldRedactField(key) ? '[REDACTED]' : redactValue(entryValue, depth + 1),
    ]),
  );
}

export function sanitizeAuditSnapshot(value: Record<string, unknown> | null | undefined): Record<string, unknown> | null {
  if (!value) return null;
  return redactValue(value, 0) as Record<string, unknown>;
}

export function redact(obj: Record<string, unknown>): Record<string, unknown> {
  return sanitizeAuditSnapshot(obj) ?? {};
}
