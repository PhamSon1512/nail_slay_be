import type { HonoCtx } from '../../@types';
import { and, asc, desc, eq, inArray, isNull, sql } from 'drizzle-orm';
import { articleCategories, articleCategoryMap, articles, articleTagMap, articleTags } from '../../models';
import { throwError } from '../../utils';
import { slugifyVi } from '../../utils/articleText';
import { optionalString, requiredString } from '../../utils/formParse';

export async function adminListArticleCategories(c: HonoCtx) {
  return c.var.db.select().from(articleCategories).orderBy(asc(articleCategories.name)).all();
}

export async function adminListPopularArticleCategories(c: HonoCtx, limit = 20) {
  const rows = await c.var.db
    .select({
      id: articleCategories.id,
      name: articleCategories.name,
      slug: articleCategories.slug,
      parentId: articleCategories.parentId,
      articleCount: sql<number>`count(${articles.id})`.as('article_count'),
    })
    .from(articleCategories)
    .innerJoin(articleCategoryMap, eq(articleCategoryMap.categoryId, articleCategories.id))
    .innerJoin(
      articles,
      and(
        eq(articles.id, articleCategoryMap.articleId),
        eq(articles.status, 'published'),
        eq(articles.visibility, 'public'),
        isNull(articles.deletedAt),
      ),
    )
    .groupBy(articleCategories.id)
    .orderBy(desc(sql`article_count`), asc(articleCategories.name))
    .limit(limit)
    .all();

  return rows.map(({ articleCount, ...rest }) => ({ ...rest, articleCount: Number(articleCount) }));
}

export async function adminListPopularArticleTags(c: HonoCtx, limit = 20) {
  const rows = await c.var.db
    .select({
      id: articleTags.id,
      name: articleTags.name,
      slug: articleTags.slug,
      articleCount: sql<number>`count(${articles.id})`.as('article_count'),
    })
    .from(articleTags)
    .innerJoin(articleTagMap, eq(articleTagMap.tagId, articleTags.id))
    .innerJoin(
      articles,
      and(
        eq(articles.id, articleTagMap.articleId),
        eq(articles.status, 'published'),
        eq(articles.visibility, 'public'),
        isNull(articles.deletedAt),
      ),
    )
    .groupBy(articleTags.id)
    .orderBy(desc(sql`article_count`), asc(articleTags.name))
    .limit(limit)
    .all();

  return rows.map(({ articleCount, ...rest }) => ({ ...rest, articleCount: Number(articleCount) }));
}

export async function adminCreateArticleCategory(c: HonoCtx, body: Record<string, unknown>) {
  const name = requiredString(body['name'], 'name');
  const slug = optionalString(body['slug']) ?? slugifyVi(name);
  const parentId = optionalString(body['parent_id']) ?? null;

  const existing = await c.var.db
    .select({ id: articleCategories.id })
    .from(articleCategories)
    .where(eq(articleCategories.slug, slug))
    .get();
  if (existing) return throwError.conflict('Slug danh mục đã tồn tại');

  const [created] = await c.var.db.insert(articleCategories).values({ name, slug, parentId, createdAt: new Date() }).returning();
  return created;
}

export async function adminListArticleTags(c: HonoCtx) {
  return c.var.db.select().from(articleTags).orderBy(asc(articleTags.name)).all();
}

export async function adminCreateArticleTag(c: HonoCtx, body: Record<string, unknown>) {
  const name = requiredString(body['name'], 'name');
  const slug = optionalString(body['slug']) ?? slugifyVi(name);

  const existing = await c.var.db.select({ id: articleTags.id }).from(articleTags).where(eq(articleTags.slug, slug)).get();
  if (existing) return throwError.conflict('Slug thẻ đã tồn tại');

  const [created] = await c.var.db.insert(articleTags).values({ name, slug, createdAt: new Date() }).returning();
  return created;
}

export async function getArticleCategoryIds(c: HonoCtx, articleId: string): Promise<string[]> {
  const rows = await c.var.db
    .select({ categoryId: articleCategoryMap.categoryId })
    .from(articleCategoryMap)
    .where(eq(articleCategoryMap.articleId, articleId))
    .all();
  return rows.map((r) => r.categoryId);
}

export async function getArticleTagIds(c: HonoCtx, articleId: string): Promise<string[]> {
  const rows = await c.var.db
    .select({ tagId: articleTagMap.tagId })
    .from(articleTagMap)
    .where(eq(articleTagMap.articleId, articleId))
    .all();
  return rows.map((r) => r.tagId);
}

export async function syncArticleCategories(c: HonoCtx, articleId: string, categoryIds: string[]) {
  await c.var.db.delete(articleCategoryMap).where(eq(articleCategoryMap.articleId, articleId));
  if (categoryIds.length === 0) return;
  const unique = [...new Set(categoryIds)];
  await c.var.db.insert(articleCategoryMap).values(unique.map((categoryId) => ({ articleId, categoryId })));
}

export async function syncArticleTags(c: HonoCtx, articleId: string, tagIds: string[]) {
  await c.var.db.delete(articleTagMap).where(eq(articleTagMap.articleId, articleId));
  if (tagIds.length === 0) return;
  const unique = [...new Set(tagIds)];
  await c.var.db.insert(articleTagMap).values(unique.map((tagId) => ({ articleId, tagId })));
}

export async function getArticleTaxonomyForPublic(c: HonoCtx, articleId: string) {
  const catMaps = await c.var.db
    .select({ id: articleCategories.id, name: articleCategories.name, slug: articleCategories.slug })
    .from(articleCategoryMap)
    .innerJoin(articleCategories, eq(articleCategoryMap.categoryId, articleCategories.id))
    .where(eq(articleCategoryMap.articleId, articleId))
    .all();

  const tagMaps = await c.var.db
    .select({ id: articleTags.id, name: articleTags.name, slug: articleTags.slug })
    .from(articleTagMap)
    .innerJoin(articleTags, eq(articleTagMap.tagId, articleTags.id))
    .where(eq(articleTagMap.articleId, articleId))
    .all();

  return { categories: catMaps, tags: tagMaps };
}

export async function ensureTagIdsByNames(c: HonoCtx, names: string[]): Promise<string[]> {
  const ids: string[] = [];
  for (const raw of names) {
    const name = raw.trim();
    if (!name) continue;
    const slug = slugifyVi(name);
    let row = await c.var.db.select({ id: articleTags.id }).from(articleTags).where(eq(articleTags.slug, slug)).get();
    if (!row) {
      const [created] = await c.var.db
        .insert(articleTags)
        .values({ name, slug, createdAt: new Date() })
        .returning({ id: articleTags.id });
      row = created;
    }
    ids.push(row.id);
  }
  return ids;
}

export async function validateCategoryIds(c: HonoCtx, categoryIds: string[]) {
  if (categoryIds.length === 0) return;
  const rows = await c.var.db
    .select({ id: articleCategories.id })
    .from(articleCategories)
    .where(inArray(articleCategories.id, categoryIds))
    .all();
  if (rows.length !== categoryIds.length) {
    return throwError.badRequest('Một hoặc nhiều danh mục không hợp lệ');
  }
}
