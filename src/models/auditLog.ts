import { index, integer, sqliteTable as table, text } from 'drizzle-orm/sqlite-core';
import { users } from './user';

/**
 * Audit log — immutable append-only record of every security-sensitive action.
 *
 * Design decisions:
 * - actorEmail is DENORMALIZED: snapshot of email at action time.
 *   Users can be deleted/renamed; the log must remain historically accurate.
 * - actorId uses ON DELETE SET NULL so log rows survive user hard-deletes.
 * - oldValue / newValue are nullable JSON snapshots (text). Omit for read-only events.
 * - NO updatedAt / deletedAt — rows are immutable. Never update or soft-delete audit rows.
 * - ip / userAgent are stored for forensic tracing; may be null for internal/system actions.
 */
export const auditLogs = table(
  'audit_logs',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),

    // Who — nullable because system/automated actions have no actor
    actorId: text('actor_id').references(() => users.id, { onDelete: 'set null' }),
    // Snapshot: preserved even after user deletion
    actorEmail: text('actor_email'),

    // What — dot-namespaced: "role.create", "permission.assign", "user.login", etc.
    action: text('action').notNull(),

    // Which entity was affected
    entityType: text('entity_type').notNull(), // e.g. "role", "permission", "user", "media"
    entityId: text('entity_id'), // slug for roles, CUID for others, null for list-level ops

    // State snapshots — stored as JSON string; null if not applicable
    oldValue: text('old_value', { mode: 'json' }).$type<Record<string, unknown> | null>(),
    newValue: text('new_value', { mode: 'json' }).$type<Record<string, unknown> | null>(),

    // REQUEST CONTEXT: null for background/system actions.
    // SECURITY: ip must be validated at app layer (IPv4/IPv6 format check)
    // before insert — raw user-agent/ip should never be rendered in UI without escaping.
    ip: text('ip'),
    userAgent: text('user_agent'),

    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .$default(() => new Date()),
  },
  (t) => [
    // Most queries filter by actor or entity
    index('audit_logs_actor_id_idx').on(t.actorId),
    index('audit_logs_entity_idx').on(t.entityType, t.entityId),
    index('audit_logs_action_idx').on(t.action),
    index('audit_logs_created_at_idx').on(t.createdAt),
  ],
);

// ─── Action constants ─────────────────────────────────────────────────────────
// Central registry — import from here to avoid typos across the codebase.

export const AuditAction = {
  // Auth — wired in src/api/auth/index.ts
  USER_LOGIN: 'user.login',
  USER_LOGIN_FAILED: 'user.login_failed',
  USER_SIGNUP: 'user.signup',
  USER_TOKEN_REFRESH: 'user.token_refresh',

  // User management — wired in src/api/users/index.ts
  USER_CREATE: 'user.create',
  // TODO: wire USER_UPDATE / USER_DELETE when those routes are implemented
  USER_UPDATE: 'user.update',
  USER_DELETE: 'user.delete',

  // Media — MEDIA_UPLOAD wired in src/api/media/index.ts
  // TODO: wire MEDIA_DELETE when soft-delete route is implemented
  MEDIA_UPLOAD: 'media.upload',
  MEDIA_DELETE: 'media.delete',
} as const;

export type AuditActionType = (typeof AuditAction)[keyof typeof AuditAction];
