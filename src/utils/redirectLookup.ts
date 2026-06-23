import type { HonoCtx } from '../@types';
import { and, eq } from 'drizzle-orm';
import { urlRedirects } from '../models';

const CACHE_TTL = 300;

export async function findRedirect(c: HonoCtx, path: string): Promise<{ toPath: string; statusCode: number } | null> {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  const cacheKey = `redirect:${normalized}`;
  const cached = await c.env.CACHE.get(cacheKey);
  if (cached === 'none') return null;
  if (cached) {
    try {
      return JSON.parse(cached) as { toPath: string; statusCode: number };
    } catch {
      // ignore bad cache
    }
  }

  const row = await c.var.db
    .select()
    .from(urlRedirects)
    .where(and(eq(urlRedirects.fromPath, normalized), eq(urlRedirects.enabled, 1)))
    .get();

  if (!row) {
    await c.env.CACHE.put(cacheKey, 'none', { expirationTtl: 60 });
    return null;
  }

  const result = { toPath: row.toPath, statusCode: row.statusCode };
  await c.env.CACHE.put(cacheKey, JSON.stringify(result), { expirationTtl: CACHE_TTL });
  return result;
}

export async function invalidateRedirectCache(c: HonoCtx, fromPath: string) {
  const normalized = fromPath.startsWith('/') ? fromPath : `/${fromPath}`;
  await c.env.CACHE.delete(`redirect:${normalized}`);
}
