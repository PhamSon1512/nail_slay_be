import { createRoute } from '@hono/zod-openapi';
import { z } from 'zod';
import { jsonSchemaBuilder } from '../../utils';
import { defaultResponseSchema } from '../../utils/schema';

const CategorySchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  imageUrl: z.string().nullable(),
});

export const ListCategoriesOpenAPI = createRoute({
  method: 'get',
  tags: ['Categories'],
  path: '/list',
  responses: {
    200: jsonSchemaBuilder(z.array(CategorySchema)),
    ...defaultResponseSchema,
  },
});
