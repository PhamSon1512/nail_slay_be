import type { HonoCtx } from '../../@types';
import type { ArticleListQuerySchema } from './openapi';
import type { z } from 'zod';
import { and, asc, desc, eq, isNull, like, or, sql } from 'drizzle-orm';
import { articles, users } from '../../models';
import { throwError } from '../../utils';
import { getArticleTaxonomyForPublic } from '../admin/articleTaxonomy.service';

export async function listArticles(c: HonoCtx, query: z.infer<typeof ArticleListQuerySchema>) {
  const page = Math.max(1, Number(query.page ?? 1));
  const limit = Math.min(50, Math.max(1, Number(query.limit ?? 12)));
  const offset = (page - 1) * limit;

  const conditions = [isNull(articles.deletedAt), eq(articles.status, 'published'), eq(articles.visibility, 'public')];

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
      author: {
        id: users.id,
        name: users.fullName,
      },
    })
    .from(articles)
    .leftJoin(users, eq(articles.authorId, users.id))
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
    .select({
      id: articles.id,
      title: articles.title,
      slug: articles.slug,
      excerpt: articles.excerpt,
      content: articles.content,
      coverImageUrl: articles.coverImageUrl,
      status: articles.status,
      publishedAt: articles.publishedAt,
      createdAt: articles.createdAt,
      updatedAt: articles.updatedAt,
      metaTitle: articles.metaTitle,
      metaDescription: articles.metaDescription,
      focusKeyword: articles.focusKeyword,
      ogImageUrl: articles.ogImageUrl,
      canonicalUrl: articles.canonicalUrl,
      schemaType: articles.schemaType,
      noIndex: articles.noIndex,
      readingTime: articles.readingTime,
      author: {
        id: users.id,
        name: users.fullName,
      },
    })
    .from(articles)
    .leftJoin(users, eq(articles.authorId, users.id))
    .where(
      and(eq(articles.slug, slug), isNull(articles.deletedAt), eq(articles.status, 'published'), eq(articles.visibility, 'public')),
    )
    .get();

  if (!article) return throwError.notFound('Article not found', { slug });

  const taxonomy = await getArticleTaxonomyForPublic(c, article.id);

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
    .where(
      and(
        isNull(articles.deletedAt),
        eq(articles.status, 'published'),
        eq(articles.visibility, 'public'),
        sql`${articles.id} != ${article.id}`,
      ),
    )
    .orderBy(desc(articles.publishedAt))
    .limit(4)
    .all();

  return { article: { ...article, ...taxonomy }, similar };
}
