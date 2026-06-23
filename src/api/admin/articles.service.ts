import type { HonoCtx } from '../../@types';
import { and, desc, eq, isNull, like, ne, or, sql } from 'drizzle-orm';
import { articles } from '../../models';
import { throwError } from '../../utils';
import { calcReadingTimeMinutes } from '../../utils/articleText';
import {
  collectFormFile,
  optionalString,
  parseBooleanField,
  parseIntField,
  parseJsonField,
  requiredString,
} from '../../utils/formParse';
import { articlePublicUrl, pingIndexNow } from '../../utils/indexNow';
import { uploadContentAssetToR2, uploadUserFileToR2 } from '../../utils/r2Upload';
import {
  ensureTagIdsByNames,
  getArticleCategoryIds,
  getArticleTagIds,
  getArticleTaxonomyForPublic,
  syncArticleCategories,
  syncArticleTags,
  validateCategoryIds,
} from './articleTaxonomy.service';

function parseSeoFields(body: Record<string, unknown>, existing?: typeof articles.$inferSelect) {
  const metaTitle = 'meta_title' in body ? (optionalString(body['meta_title']) ?? null) : (existing?.metaTitle ?? null);
  const metaDescription =
    'meta_description' in body ? (optionalString(body['meta_description']) ?? null) : (existing?.metaDescription ?? null);
  const focusKeyword = 'focus_keyword' in body ? (optionalString(body['focus_keyword']) ?? null) : (existing?.focusKeyword ?? null);
  const canonicalUrl = 'canonical_url' in body ? (optionalString(body['canonical_url']) ?? null) : (existing?.canonicalUrl ?? null);
  const schemaType =
    'schema_type' in body ? (optionalString(body['schema_type']) ?? 'Article') : (existing?.schemaType ?? 'Article');
  const noIndex = 'no_index' in body ? (parseBooleanField(body['no_index']) ? 1 : 0) : (existing?.noIndex ?? 0);
  const seoScore = 'seo_score' in body ? (parseIntField(body['seo_score']) ?? null) : (existing?.seoScore ?? null);

  let ogImageUrl = existing?.ogImageUrl ?? null;
  if ('og_image_url' in body) {
    ogImageUrl = optionalString(body['og_image_url']) ?? null;
  }

  return { metaTitle, metaDescription, focusKeyword, ogImageUrl, canonicalUrl, schemaType, noIndex, seoScore };
}

function parseTaxonomyIds(body: Record<string, unknown>): { categoryIds: string[]; tagIds: string[] } {
  const categoryIds = parseJsonField<string[]>(body['category_ids'], []);
  const tagIds = parseJsonField<string[]>(body['tag_ids'], []);
  return { categoryIds, tagIds };
}

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

export async function adminGetArticleById(c: HonoCtx, id: string) {
  const article = await c.var.db
    .select()
    .from(articles)
    .where(and(eq(articles.id, id), isNull(articles.deletedAt)))
    .get();
  if (!article) return throwError.notFound('Article not found', { id });

  const categoryIds = await getArticleCategoryIds(c, id);
  const tagIds = await getArticleTagIds(c, id);
  const taxonomy = await getArticleTaxonomyForPublic(c, id);

  return { ...article, categoryIds, tagIds, tags: taxonomy.tags };
}

export async function adminCheckFocusKeyword(c: HonoCtx, keyword: string, excludeId?: string) {
  const trimmed = keyword.trim();
  if (!trimmed) return { isUnique: true, usedBy: null as string | null };

  const conditions = [isNull(articles.deletedAt), eq(articles.focusKeyword, trimmed)];
  if (excludeId) conditions.push(ne(articles.id, excludeId));

  const existing = await c.var.db
    .select({ id: articles.id, title: articles.title })
    .from(articles)
    .where(and(...conditions))
    .get();

  return { isUnique: !existing, usedBy: existing?.title ?? null };
}

export async function adminCreateArticle(c: HonoCtx, body: Record<string, unknown>) {
  const title = requiredString(body['title'], 'title');
  const slug = requiredString(body['slug'], 'slug');
  const excerpt = optionalString(body['excerpt']) ?? '';
  const content = optionalString(body['content']) ?? '';
  const status = optionalString(body['status']) === 'published' ? 'published' : 'draft';
  const visibility = optionalString(body['visibility']) === 'private' ? 'private' : 'public';
  const seo = parseSeoFields(body);
  const { categoryIds, tagIds } = parseTaxonomyIds(body);

  await assertSlugAvailable(c, slug);
  await validateCategoryIds(c, categoryIds);

  let coverImageUrl: string | null = null;
  const coverFile = collectFormFile(body, 'cover');
  if (coverFile) {
    const { publicUrl } = await uploadUserFileToR2(c.var.db, c.env, c.var.jwtPayload.id, 'articles', coverFile);
    coverImageUrl = publicUrl;
  }

  let ogImageUrl = seo.ogImageUrl;
  const ogFile = collectFormFile(body, 'og_image');
  if (ogFile) {
    const { publicUrl } = await uploadUserFileToR2(c.var.db, c.env, c.var.jwtPayload.id, 'articles/og', ogFile);
    ogImageUrl = publicUrl;
  }

  const readingTime = calcReadingTimeMinutes(content);
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
      visibility,
      publishedAt: status === 'published' ? now : null,
      createdAt: now,
      metaTitle: seo.metaTitle,
      metaDescription: seo.metaDescription,
      focusKeyword: seo.focusKeyword,
      ogImageUrl,
      canonicalUrl: seo.canonicalUrl,
      schemaType: seo.schemaType,
      noIndex: seo.noIndex,
      readingTime,
      seoScore: seo.seoScore,
    })
    .returning();

  const finalTagIds = tagIds.length > 0 ? tagIds : await ensureTagIdsByNames(c, parseJsonField<string[]>(body['tag_names'], []));
  await syncArticleCategories(c, created.id, categoryIds);
  await syncArticleTags(c, created.id, finalTagIds);

  if (status === 'published' && visibility === 'public') {
    c.executionCtx.waitUntil(pingIndexNow(c.env, [articlePublicUrl(c.env, slug)]));
  }

  return adminGetArticleById(c, created.id);
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
  const visibility =
    'visibility' in body
      ? optionalString(body['visibility']) === 'private'
        ? 'private'
        : 'public'
      : (existing.visibility ?? 'public');
  const seo = parseSeoFields(body, existing);

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

  let ogImageUrl = seo.ogImageUrl;
  if (body['remove_og_image'] === 'true' || body['remove_og_image'] === true) {
    ogImageUrl = null;
  }
  const ogFile = collectFormFile(body, 'og_image');
  if (ogFile) {
    const { publicUrl } = await uploadUserFileToR2(c.var.db, c.env, c.var.jwtPayload.id, 'articles/og', ogFile);
    ogImageUrl = publicUrl;
  }

  let publishedAt = existing.publishedAt;
  if (status === 'published' && existing.status !== 'published') {
    publishedAt = new Date();
  }
  if (status === 'draft') {
    publishedAt = null;
  }

  const readingTime = calcReadingTimeMinutes(content);

  await c.var.db
    .update(articles)
    .set({
      title,
      slug,
      excerpt,
      content,
      coverImageUrl,
      status,
      visibility,
      publishedAt,
      updatedAt: new Date(),
      metaTitle: seo.metaTitle,
      metaDescription: seo.metaDescription,
      focusKeyword: seo.focusKeyword,
      ogImageUrl,
      canonicalUrl: seo.canonicalUrl,
      schemaType: seo.schemaType,
      noIndex: seo.noIndex,
      readingTime,
      seoScore: seo.seoScore,
    })
    .where(eq(articles.id, id));

  if ('category_ids' in body) {
    const { categoryIds } = parseTaxonomyIds(body);
    await validateCategoryIds(c, categoryIds);
    await syncArticleCategories(c, id, categoryIds);
  }

  if ('tag_ids' in body || 'tag_names' in body) {
    const { tagIds } = parseTaxonomyIds(body);
    const finalTagIds = tagIds.length > 0 ? tagIds : await ensureTagIdsByNames(c, parseJsonField<string[]>(body['tag_names'], []));
    await syncArticleTags(c, id, finalTagIds);
  }

  const shouldPing =
    status === 'published' &&
    visibility === 'public' &&
    (existing.status !== 'published' || existing.visibility !== 'public' || slug !== existing.slug);
  if (shouldPing) {
    c.executionCtx.waitUntil(pingIndexNow(c.env, [articlePublicUrl(c.env, slug)]));
  }

  return adminGetArticleById(c, id);
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

export async function adminUploadContentAsset(c: HonoCtx, body: Record<string, unknown>) {
  const file = collectFormFile(body, 'file') ?? collectFormFile(body, 'image');
  if (!file) return throwError.badRequest('File is required (field `file`)');

  const uploaded = await uploadContentAssetToR2(c.var.db, c.env, c.var.jwtPayload.id, 'content', file);
  return { url: uploaded.publicUrl, mimeType: uploaded.mimeType, fileName: uploaded.fileName };
}
