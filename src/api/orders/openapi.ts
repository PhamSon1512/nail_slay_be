import { createRoute, z } from '@hono/zod-openapi';
import { jsonSchemaBuilder } from '../../utils';
import { defaultResponseSchema, IdParamSchema } from '../../utils/schema';

export const UpdateOrderStatusSchema = z.object({
  status: z.enum(['RECEIVED', 'COMPLAINED']),
  reason: z.string().optional(),
  image_urls: z.array(z.string()).optional(),
});

export const ListOrdersOpenAPI = createRoute({
  method: 'get',
  tags: ['Orders'],
  path: '/list',
  security: [{ Bearer: [] }],
  responses: { 200: jsonSchemaBuilder(z.array(z.record(z.string(), z.unknown()))), ...defaultResponseSchema },
});

export const GetOrderOpenAPI = createRoute({
  method: 'get',
  tags: ['Orders'],
  path: '/{id}',
  security: [{ Bearer: [] }],
  request: { params: IdParamSchema },
  responses: { 200: jsonSchemaBuilder(z.record(z.string(), z.unknown())), ...defaultResponseSchema },
});

export const UpdateOrderStatusOpenAPI = createRoute({
  method: 'post',
  tags: ['Orders'],
  path: '/{id}/status',
  security: [{ Bearer: [] }],
  request: { params: IdParamSchema, body: jsonSchemaBuilder(UpdateOrderStatusSchema) },
  responses: { 200: jsonSchemaBuilder(z.record(z.string(), z.unknown())), ...defaultResponseSchema },
});
