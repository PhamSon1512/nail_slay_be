import type { HonoCtx } from '../../@types';
import { and, desc, eq, isNull, like, or, sql } from 'drizzle-orm';
import { articles } from '../../models';
import { throwError } from '../../utils';
import { collectFormFile, optionalString, requiredString } from '../../utils/formParse';
import { uploadUserFileToR2 } from '../../utils/r2Upload';

export async function adminListArticles(c: HonoCtx, query: { page?: string; limit?: string; search?: string }) {
  const page = Math.max(1, Number(query.page ?? 1));
  const limit = Math.min(100, Math.max(1, Number(query.limit ?? 20)));
  const offset = (page - 1) * limit;

  const conditions = [isNull(articles.deletedAt)];
  if (query.search) {
    const term = `%${query.search}%`;
    conditions.push(or(like(articles.title, term), like(articles.slug, term), like(articles.excerpt, term))!);
  }

  const whereClause = and(...conditions);
  const [{ count }] = await c.var.db
    .select({ count: sql<number>`count(*)` })
    .from(articles)
    .where(whereClause)
    .all();

  const items = await c.var.db
    .select()
    .from(articles)
    .where(whereClause)
    .orderBy(desc(articles.createdAt))
    .limit(limit)
    .offset(offset)
    .all();

  return {
    items,
    pagination: { total: Number(count), page, limit, totalPages: Math.ceil(Number(count) / limit) },
  };
}

async function assertSlugAvailable(c: HonoCtx, slug: string, excludeId?: string) {
  const existing = await c.var.db
    .select({ id: articles.id })
    .from(articles)
    .where(and(eq(articles.slug, slug), isNull(articles.deletedAt)))
    .get();
  if (existing && existing.id !== excludeId) {
    return throwError.conflict('Slug bài viết đã tồn tại');
  }
}

export async function adminCreateArticle(c: HonoCtx, body: Record<string, unknown>) {
  const title = requiredString(body['title'], 'title');
  const slug = requiredString(body['slug'], 'slug');
  const excerpt = optionalString(body['excerpt']) ?? '';
  const content = optionalString(body['content']) ?? '';
  const status = optionalString(body['status']) === 'published' ? 'published' : 'draft';

  await assertSlugAvailable(c, slug);

  let coverImageUrl: string | null = null;
  const coverFile = collectFormFile(body, 'cover');
  if (coverFile) {
    const { publicUrl } = await uploadUserFileToR2(c.var.db, c.env, c.var.jwtPayload.id, 'articles', coverFile);
    coverImageUrl = publicUrl;
  }

  const now = new Date();
  const [created] = await c.var.db
    .insert(articles)
    .values({
      title,
      slug,
      excerpt,
      content,
      coverImageUrl,
      authorId: c.var.jwtPayload.id,
      status,
      publishedAt: status === 'published' ? now : null,
      createdAt: now,
    })
    .returning();

  return created;
}

export async function adminUpdateArticle(c: HonoCtx, id: string, body: Record<string, unknown>) {
  const existing = await c.var.db
    .select()
    .from(articles)
    .where(and(eq(articles.id, id), isNull(articles.deletedAt)))
    .get();
  if (!existing) return throwError.notFound('Article not found', { id });

  const title = 'title' in body ? requiredString(body['title'], 'title') : existing.title;
  const slug = 'slug' in body ? requiredString(body['slug'], 'slug') : existing.slug;
  const excerpt = 'excerpt' in body ? (optionalString(body['excerpt']) ?? '') : existing.excerpt;
  const content = 'content' in body ? (optionalString(body['content']) ?? '') : existing.content;
  const status = 'status' in body ? (optionalString(body['status']) === 'published' ? 'published' : 'draft') : existing.status;

  if (slug !== existing.slug) await assertSlugAvailable(c, slug, id);

  let coverImageUrl = existing.coverImageUrl;
  if (body['remove_cover'] === 'true' || body['remove_cover'] === true) {
    coverImageUrl = null;
  }
  const coverFile = collectFormFile(body, 'cover');
  if (coverFile) {
    const { publicUrl } = await uploadUserFileToR2(c.var.db, c.env, c.var.jwtPayload.id, 'articles', coverFile);
    coverImageUrl = publicUrl;
  }

  let publishedAt = existing.publishedAt;
  if (status === 'published' && existing.status !== 'published') {
    publishedAt = new Date();
  }
  if (status === 'draft') {
    publishedAt = null;
  }

  const [updated] = await c.var.db
    .update(articles)
    .set({
      title,
      slug,
      excerpt,
      content,
      coverImageUrl,
      status,
      publishedAt,
      updatedAt: new Date(),
    })
    .where(eq(articles.id, id))
    .returning();

  return updated;
}

export async function adminDeleteArticle(c: HonoCtx, id: string) {
  const existing = await c.var.db
    .select()
    .from(articles)
    .where(and(eq(articles.id, id), isNull(articles.deletedAt)))
    .get();
  if (!existing) return throwError.notFound('Article not found', { id });

  const suffix = Date.now();
  await c.var.db
    .update(articles)
    .set({
      deletedAt: new Date(),
      slug: `${existing.slug}__deleted__${suffix}`,
      updatedAt: new Date(),
    })
    .where(eq(articles.id, id));

  return { success: true };
}

export async function adminUploadContentImage(c: HonoCtx, body: Record<string, unknown>) {
  const imageFile = collectFormFile(body, 'image');
  if (!imageFile) return throwError.badRequest('Image file is required (field `image`)');

  const { publicUrl } = await uploadUserFileToR2(c.var.db, c.env, c.var.jwtPayload.id, 'content', imageFile);
  return { url: publicUrl };
}
