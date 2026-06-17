import { createRoute, z } from '@hono/zod-openapi';
import { jsonSchemaBuilder } from '../../utils';
import { defaultResponseSchema } from '../../utils/schema';
import { AdminReplyRequestSchema, CreateReviewRequestSchema, ReviewSchema, ReviewWithUserSchema } from './schema';

export const CreateReviewOpenAPI = createRoute({
  method: 'post',
  tags: ['Reviews'],
  path: '/',
  security: [{ Bearer: [] }],
  summary: 'Tạo đánh giá sản phẩm',
  description: 'User tạo đánh giá cho sản phẩm. Yêu cầu user đã mua sản phẩm này.',
  request: {
    body: {
      content: {
        'application/json': {
          schema: CreateReviewRequestSchema,
        },
      },
    },
  },
  responses: {
    201: jsonSchemaBuilder(ReviewSchema, 'Created'),
    ...defaultResponseSchema,
  },
});

export const ListProductReviewsOpenAPI = createRoute({
  method: 'get',
  tags: ['Reviews'],
  path: '/product/{productId}',
  summary: 'Lấy danh sách đánh giá của sản phẩm',
  request: {
    params: z.object({
      productId: z.string(),
    }),
    query: z.object({
      limit: z.string().optional().default('10'),
      offset: z.string().optional().default('0'),
    }),
  },
  responses: {
    200: jsonSchemaBuilder(
      z.object({
        data: z.array(ReviewWithUserSchema),
        pagination: z.object({
          limit: z.number(),
          offset: z.number(),
          total: z.number(),
        }),
      }),
      'Success',
    ),
    ...defaultResponseSchema,
  },
});

export const AdminReplyReviewOpenAPI = createRoute({
  method: 'put',
  tags: ['Reviews'],
  path: '/{id}/reply',
  security: [{ Bearer: [] }],
  summary: 'Admin trả lời đánh giá',
  request: {
    params: z.object({ id: z.string() }),
    body: {
      content: {
        'application/json': {
          schema: AdminReplyRequestSchema,
        },
      },
    },
  },
  responses: {
    200: jsonSchemaBuilder(ReviewSchema, 'Success'),
    ...defaultResponseSchema,
  },
});
