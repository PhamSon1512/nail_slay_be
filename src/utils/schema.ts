import { z } from 'zod';
import { jsonSchemaBuilder } from './helpers';

export const CountResponseSchema = z.object({
  total: z.number(),
});

export const IdParamSchema = z.object({
  id: z.string(),
});

export const PaginationSchema = z.object({
  total: z.number(),
  page: z.number(),
  limit: z.number(),
  totalPages: z.number(),
});

export const AddressSchema = z.object({
  id: z.number().optional(),
  customer_id: z.number().optional(),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  company: z.string().optional(),
  address1: z.string().optional(),
  address2: z.string().optional(),
  city: z.string().optional(),
  province: z.string().optional(),
  country: z.string().optional(),
  zip: z.string().optional(),
  phone: z.string().optional(),
  name: z.string().optional(),
  province_code: z.string().optional(),
  country_code: z.string().optional(),
  country_name: z.string().optional(),
  default: z.boolean().optional(),
});

export const QuerySchema = z.object({
  page: z.string().optional().default('1'),
  limit: z.string().optional().default('50'),
  search: z.string().optional(),
  fields: z.string().optional(),
  exclude_fields: z.string().optional(),
  sort_by: z.string().optional().default('created_at'),
  order: z.enum(['asc', 'desc']).optional().default('desc'),
  include_deleted: z.enum(['true', 'false']).optional().default('false'),
  created_at_min: z.string().optional(),
  created_at_max: z.string().optional(),
  updated_at_min: z.string().optional(),
  updated_at_max: z.string().optional(),
  token: z.string().optional(),
});

export type iQuery = z.infer<typeof QuerySchema>;

export const SuccessResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});

// Error response schema matching handleError function structure
const ErrorResponseSchema = z.object({
  success: z.literal(false),
  error: z.object({
    name: z.string(),
    message: z.string(),
    code: z.string(),
    statusCode: z.number(),
    timestamp: z.string(),
    requestId: z.string(),
    path: z.string(),
    method: z.string(),
    details: z.any().openapi({}).optional(),
    stack: z.string().optional(),
    cause: z.string().optional(),
  }),
  meta: z.object({
    userAgent: z.string().optional(),
    ip: z.string().optional(),
    environment: z.string(),
  }),
});

export const defaultResponseSchema = {
  400: jsonSchemaBuilder(ErrorResponseSchema, 'Bad Request'),
  401: jsonSchemaBuilder(ErrorResponseSchema, 'Unauthorized'),
  403: jsonSchemaBuilder(ErrorResponseSchema, 'Forbidden'),
  404: jsonSchemaBuilder(ErrorResponseSchema, 'Not found'),
  405: jsonSchemaBuilder(ErrorResponseSchema, 'Method Not Allowed'),
  500: jsonSchemaBuilder(ErrorResponseSchema, 'Internal Server Error'),
};
