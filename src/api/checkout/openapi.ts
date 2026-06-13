import { createRoute, z } from '@hono/zod-openapi';
import { jsonSchemaBuilder } from '../../utils';
import { defaultResponseSchema } from '../../utils/schema';

export const CheckoutBodySchema = z.object({
  address_id: z.string(),
  payment_method: z.enum(['BANK_TRANSFER']).default('BANK_TRANSFER'),
});

export const CheckoutOpenAPI = createRoute({
  method: 'post',
  tags: ['Checkout'],
  path: '/',
  security: [{ Bearer: [] }],
  request: { body: jsonSchemaBuilder(CheckoutBodySchema) },
  responses: { 201: jsonSchemaBuilder(z.record(z.string(), z.unknown())), ...defaultResponseSchema },
});
