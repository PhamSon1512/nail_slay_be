import { createRoute, z } from '@hono/zod-openapi';
import { jsonSchemaBuilder } from '../../utils';
import { defaultResponseSchema } from '../../utils/schema';

export const ProductListQuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  category_slug: z.string().optional(),
  q: z.string().optional(),
  sort: z.enum(['price_asc', 'price_desc', 'newest']).optional(),
});

const ProductSchema = z.object({
  id: z.string(),
  categoryId: z.string(),
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  price: z.number(),
  stock: z.number(),
  imageUrls: z.array(z.string()),
  createdAt: z.coerce.date().optional(),
});

export const ListProductsOpenAPI = createRoute({
  method: 'get',
  tags: ['Products'],
  path: '/',
  request: { query: ProductListQuerySchema },
  responses: {
    200: jsonSchemaBuilder(
      z.object({
        items: z.array(ProductSchema),
        pagination: z.object({ total: z.number(), page: z.number(), limit: z.number(), totalPages: z.number() }),
      }),
    ),
    ...defaultResponseSchema,
  },
});

export const GetProductOpenAPI = createRoute({
  method: 'get',
  tags: ['Products'],
  path: '/{slug}',
  request: { params: z.object({ slug: z.string() }) },
  responses: {
    200: jsonSchemaBuilder(z.record(z.string(), z.unknown())),
    ...defaultResponseSchema,
  },
});
