import { createRoute, z } from '@hono/zod-openapi';
import { jsonSchemaBuilder } from '../../utils';
import { defaultResponseSchema } from '../../utils/schema';

export const ArticleListQuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  q: z.string().optional(),
  sort: z.enum(['title_asc', 'title_desc', 'newest', 'oldest']).optional(),
});

const ArticleListItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  slug: z.string(),
  excerpt: z.string().nullable(),
  coverImageUrl: z.string().nullable(),
  publishedAt: z.coerce.date().nullable().optional(),
  createdAt: z.coerce.date().optional(),
});

export const ListArticlesOpenAPI = createRoute({
  method: 'get',
  tags: ['Articles'],
  path: '/',
  request: { query: ArticleListQuerySchema },
  responses: {
    200: jsonSchemaBuilder(
      z.object({
        items: z.array(ArticleListItemSchema),
        pagination: z.object({ total: z.number(), page: z.number(), limit: z.number(), totalPages: z.number() }),
      }),
    ),
    ...defaultResponseSchema,
  },
});

export const GetArticleOpenAPI = createRoute({
  method: 'get',
  tags: ['Articles'],
  path: '/{slug}',
  request: { params: z.object({ slug: z.string() }) },
  responses: {
    200: jsonSchemaBuilder(z.record(z.string(), z.unknown())),
    ...defaultResponseSchema,
  },
});
