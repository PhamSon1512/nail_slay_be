import type { HonoCtx } from '../../@types';
import type { ArticleListQuerySchema } from './openapi';
import type { z } from 'zod';
import { and, asc, desc, eq, isNull, like, or, sql } from 'drizzle-orm';
import { articles } from '../../models';
import { throwError } from '../../utils';

export async function listArticles(c: HonoCtx, query: z.infer<typeof ArticleListQuerySchema>) {
  const page = Math.max(1, Number(query.page ?? 1));
  const limit = Math.min(50, Math.max(1, Number(query.limit ?? 12)));
  const offset = (page - 1) * limit;

  const conditions = [isNull(articles.deletedAt), eq(articles.status, 'published')];

  if (query.q) {
    const term = `%${query.q}%`;
    conditions.push(or(like(articles.title, term), like(articles.excerpt, term))!);
  }

  const whereClause = and(...conditions);

  const [{ count }] = await c.var.db
    .select({ count: sql<number>`count(*)` })
    .from(articles)
    .where(whereClause)
    .all();

  const total = Number(count ?? 0);

  let orderBy;
  switch (query.sort) {
    case 'title_asc':
      orderBy = asc(articles.title);
      break;
    case 'title_desc':
      orderBy = desc(articles.title);
      break;
    case 'oldest':
      orderBy = asc(articles.publishedAt);
      break;
    case 'newest':
    default:
      orderBy = desc(articles.publishedAt);
      break;
  }

  const items = await c.var.db
    .select({
      id: articles.id,
      title: articles.title,
      slug: articles.slug,
      excerpt: articles.excerpt,
      coverImageUrl: articles.coverImageUrl,
      publishedAt: articles.publishedAt,
      createdAt: articles.createdAt,
    })
    .from(articles)
    .where(whereClause)
    .orderBy(orderBy)
    .limit(limit)
    .offset(offset)
    .all();

  return {
    items,
    pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
  };
}

export async function getArticleBySlug(c: HonoCtx, slug: string) {
  const article = await c.var.db
    .select()
    .from(articles)
    .where(and(eq(articles.slug, slug), isNull(articles.deletedAt), eq(articles.status, 'published')))
    .get();

  if (!article) return throwError.notFound('Article not found', { slug });

  const similar = await c.var.db
    .select({
      id: articles.id,
      title: articles.title,
      slug: articles.slug,
      excerpt: articles.excerpt,
      coverImageUrl: articles.coverImageUrl,
      publishedAt: articles.publishedAt,
    })
    .from(articles)
    .where(and(isNull(articles.deletedAt), eq(articles.status, 'published'), sql`${articles.id} != ${article.id}`))
    .orderBy(desc(articles.publishedAt))
    .limit(4)
    .all();

  return { article, similar };
}
