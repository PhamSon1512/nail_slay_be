import type { HonoCtx } from '../@types';
import { eq } from 'drizzle-orm';
import { notFoundLogs } from '../models';

const DEBOUNCE_SECONDS = 60;

export async function logNotFoundHit(c: HonoCtx, path: string) {
  if (!path || path.startsWith('/admin') || path.startsWith('/doc') || path.startsWith('/ref')) return;

  const cacheKey = `404:${path}`;
  const recent = await c.env.CACHE.get(cacheKey);
  if (recent) return;

  const referrer = c.req.header('referer') ?? null;
  const userAgent = c.req.header('user-agent') ?? null;
  const now = new Date();

  const existing = await c.var.db.select().from(notFoundLogs).where(eq(notFoundLogs.path, path)).get();

  if (existing) {
    await c.var.db
      .update(notFoundLogs)
      .set({
        hitCount: existing.hitCount + 1,
        lastSeen: now,
        referrer: referrer ?? existing.referrer,
        userAgent: userAgent ?? existing.userAgent,
      })
      .where(eq(notFoundLogs.id, existing.id));
  } else {
    await c.var.db.insert(notFoundLogs).values({
      path,
      referrer,
      userAgent,
      hitCount: 1,
      firstSeen: now,
      lastSeen: now,
    });
  }

  await c.env.CACHE.put(cacheKey, '1', { expirationTtl: DEBOUNCE_SECONDS });
}
