import { createRoute, z } from '@hono/zod-openapi';
import { jsonSchemaBuilder } from '../../utils';
import { defaultResponseSchema, IdParamSchema } from '../../utils/schema';

export const CreateAddressSchema = z.object({
  detail: z.string().min(1),
  isDefault: z.boolean().optional(),
});

export const UpdateAddressSchema = z.object({
  detail: z.string().min(1).optional(),
  isDefault: z.boolean().optional(),
});

const AddressSchema = z.object({
  id: z.string(),
  userId: z.string(),
  detail: z.string(),
  isDefault: z.boolean(),
});

export const ListAddressesOpenAPI = createRoute({
  method: 'get',
  tags: ['Addresses'],
  path: '/list',
  security: [{ Bearer: [] }],
  responses: { 200: jsonSchemaBuilder(z.array(AddressSchema)), ...defaultResponseSchema },
});

export const CreateAddressOpenAPI = createRoute({
  method: 'post',
  tags: ['Addresses'],
  path: '/',
  security: [{ Bearer: [] }],
  request: { body: jsonSchemaBuilder(CreateAddressSchema) },
  responses: { 201: jsonSchemaBuilder(AddressSchema), ...defaultResponseSchema },
});

export const UpdateAddressOpenAPI = createRoute({
  method: 'put',
  tags: ['Addresses'],
  path: '/{id}',
  security: [{ Bearer: [] }],
  request: { params: IdParamSchema, body: jsonSchemaBuilder(UpdateAddressSchema) },
  responses: { 200: jsonSchemaBuilder(AddressSchema), ...defaultResponseSchema },
});

export const DeleteAddressOpenAPI = createRoute({
  method: 'delete',
  tags: ['Addresses'],
  path: '/{id}',
  security: [{ Bearer: [] }],
  request: { params: IdParamSchema },
  responses: { 200: jsonSchemaBuilder(z.object({ success: z.boolean() })), ...defaultResponseSchema },
});
