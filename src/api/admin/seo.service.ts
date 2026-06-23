import type { HonoCtx } from '../../@types';
import { desc, eq } from 'drizzle-orm';
import { notFoundLogs, urlRedirects } from '../../models';
import { throwError } from '../../utils';
import { invalidateRedirectCache } from '../../utils/redirectLookup';

export async function adminListNotFoundLogs(c: HonoCtx) {
  return c.var.db.select().from(notFoundLogs).orderBy(desc(notFoundLogs.lastSeen)).limit(200).all();
}

export async function adminDeleteNotFoundLog(c: HonoCtx, id: string) {
  const existing = await c.var.db.select({ id: notFoundLogs.id }).from(notFoundLogs).where(eq(notFoundLogs.id, id)).get();
  if (!existing) return throwError.notFound('404 log not found', { id });
  await c.var.db.delete(notFoundLogs).where(eq(notFoundLogs.id, id));
  return { success: true };
}

export async function adminListRedirects(c: HonoCtx) {
  return c.var.db.select().from(urlRedirects).orderBy(desc(urlRedirects.createdAt)).all();
}

export async function adminCreateRedirect(
  c: HonoCtx,
  body: { fromPath: string; toPath: string; statusCode?: number; enabled?: boolean },
) {
  const fromPath = normalizePath(body.fromPath);
  const toPath = body.toPath.trim();
  if (!fromPath || !toPath) return throwError.badRequest('fromPath và toPath là bắt buộc');
  if (fromPath === toPath) return throwError.badRequest('fromPath và toPath không được trùng nhau');

  const statusCode = body.statusCode === 302 ? 302 : 301;
  const enabled = body.enabled === false ? 0 : 1;

  try {
    const [created] = await c.var.db
      .insert(urlRedirects)
      .values({ fromPath, toPath, statusCode, enabled, createdAt: new Date() })
      .returning();
    await invalidateRedirectCache(c, fromPath);
    return created;
  } catch {
    return throwError.conflict('Redirect cho path này đã tồn tại');
  }
}

export async function adminUpdateRedirect(
  c: HonoCtx,
  id: string,
  body: { fromPath?: string; toPath?: string; statusCode?: number; enabled?: boolean },
) {
  const existing = await c.var.db.select().from(urlRedirects).where(eq(urlRedirects.id, id)).get();
  if (!existing) return throwError.notFound('Redirect not found', { id });

  const fromPath = body.fromPath ? normalizePath(body.fromPath) : existing.fromPath;
  const toPath = body.toPath?.trim() ?? existing.toPath;
  if (fromPath === toPath) return throwError.badRequest('fromPath và toPath không được trùng nhau');

  const [updated] = await c.var.db
    .update(urlRedirects)
    .set({
      fromPath,
      toPath,
      statusCode: body.statusCode === 302 ? 302 : body.statusCode === 301 ? 301 : existing.statusCode,
      enabled: body.enabled === false ? 0 : body.enabled === true ? 1 : existing.enabled,
    })
    .where(eq(urlRedirects.id, id))
    .returning();

  await invalidateRedirectCache(c, existing.fromPath);
  if (fromPath !== existing.fromPath) await invalidateRedirectCache(c, fromPath);
  return updated;
}

export async function adminDeleteRedirect(c: HonoCtx, id: string) {
  const existing = await c.var.db.select().from(urlRedirects).where(eq(urlRedirects.id, id)).get();
  if (!existing) return throwError.notFound('Redirect not found', { id });
  await c.var.db.delete(urlRedirects).where(eq(urlRedirects.id, id));
  await invalidateRedirectCache(c, existing.fromPath);
  return { success: true };
}

function normalizePath(p: string): string {
  const trimmed = p.trim();
  if (!trimmed) return '';
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
}
