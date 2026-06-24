import { createRoute, z } from '@hono/zod-openapi';
import { jsonSchemaBuilder } from '../../utils';
import { defaultResponseSchema, IdParamSchema } from '../../utils/schema';

export const AddCartItemSchema = z.object({
  product_id: z.string(),
  variant_id: z.string().optional(),
  quantity: z.number().int().min(1),
});

export const UpdateCartItemSchema = z.object({
  quantity: z.number().int().min(1),
});

export const GetCartOpenAPI = createRoute({
  method: 'get',
  tags: ['Cart'],
  path: '/current',
  security: [{ Bearer: [] }],
  responses: { 200: jsonSchemaBuilder(z.record(z.string(), z.unknown())), ...defaultResponseSchema },
});

export const AddCartItemOpenAPI = createRoute({
  method: 'post',
  tags: ['Cart'],
  path: '/',
  security: [{ Bearer: [] }],
  request: { body: jsonSchemaBuilder(AddCartItemSchema) },
  responses: { 201: jsonSchemaBuilder(z.record(z.string(), z.unknown())), ...defaultResponseSchema },
});

export const UpdateCartItemOpenAPI = createRoute({
  method: 'put',
  tags: ['Cart'],
  path: '/{id}',
  security: [{ Bearer: [] }],
  request: { params: IdParamSchema, body: jsonSchemaBuilder(UpdateCartItemSchema) },
  responses: { 200: jsonSchemaBuilder(z.record(z.string(), z.unknown())), ...defaultResponseSchema },
});

export const DeleteCartItemOpenAPI = createRoute({
  method: 'delete',
  tags: ['Cart'],
  path: '/{id}',
  security: [{ Bearer: [] }],
  request: { params: IdParamSchema },
  responses: { 200: jsonSchemaBuilder(z.object({ success: z.boolean() })), ...defaultResponseSchema },
});
