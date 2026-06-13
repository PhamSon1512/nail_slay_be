import { NotFoundError } from './errors';

/**
 * Build an OpenAPI-compatible JSON response descriptor for use in route definitions.
 */
export function jsonSchemaBuilder(schema: any, description = '') {
  return { description, content: { 'application/json': { schema } } };
}

/**
 * Return true if a JWT `exp` claim (Unix seconds) has already passed.
 */
export function isExpired(exp: number): boolean {
  return exp < Date.now() / 1000;
}

/**
 * Assert that a value returned by Drizzle `.get()` exists.
 *
 * Uses TypeScript's assertion function signature (`asserts value is T`) so the
 * compiler narrows `T | undefined` to `T` immediately after the call — no
 * `!` non-null assertions or redundant checks needed downstream.
 *
 * @example
 * const user = await db.select().from(users).where(...).get();
 * assertFound(user, 'User not found', { userId });
 * // user is now `typeof user` (non-undefined) from here on
 */
export function assertFound<T>(
  value: T | undefined | null,
  message = 'Record not found',
  context?: Record<string, unknown>,
): asserts value is T {
  if (value == null) {
    throw new NotFoundError(message, 'NOT_FOUND', context);
  }
}

/**
 * Cursor-based pagination helper — unified DESC pattern for all tables.
 *
 * All list endpoints sort: ORDER BY id DESC.
 * Cursor is the `id` of the last item in the current page — unique, no collision,
 * no extra index beyond primary key.
 *
 * Query pattern (Drizzle):
 *   .where(and(...conditions, cursor ? lt(table.id, cursor) : undefined))
 *   .orderBy(desc(table.id))
 *   .limit(limit + 1)
 *
 * Tables with domain-specific sort (leaderboard by score, reminders by scheduledAt,
 * lead by lastActivityAt) are exempt and manage their own cursor logic.
 */
export function cursorPage<T extends { id: string }>(rows: T[], limit: number): { items: T[]; nextCursor: string | null } {
  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;
  const lastItem = items[items.length - 1];
  return { items, nextCursor: hasMore && lastItem ? lastItem.id : null };
}

/**
 * Parse and clamp a cursor-based pagination limit from a raw query string.
 * Defaults to 50, maximum capped at max (default 100).
 */
export function parseCursorLimit(raw?: string, max = 100, defaultVal = 50): number {
  const parsed = raw !== undefined ? parseInt(raw, 10) : defaultVal;
  return Math.min(Number.isFinite(parsed) ? parsed : defaultVal, max);
}

/**
 * Floor a VND amount down to the nearest 1,000đ.
 *
 * Apply ONLY to computed amounts (e.g. percentage-based discounts, tier-adjusted prices).
 * Do NOT apply to fixed amounts entered by admins/affiliates — those values are already
 * authoritative and must not be silently altered.
 *
 * @example
 * floorTo1000(89500)  // → 89000
 * floorTo1000(100999) // → 100000
 * floorTo1000(50000)  // → 50000
 */
export function floorTo1000(amount: number): number {
  return Math.floor(amount / 1000) * 1000;
}
