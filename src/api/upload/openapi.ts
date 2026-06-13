import { createRoute } from '@hono/zod-openapi';
import { z } from 'zod';
import { jsonSchemaBuilder } from '../../utils';
import { defaultResponseSchema } from '../../utils/schema';

export const UploadComplaintOpenAPI = createRoute({
  method: 'post',
  tags: ['Upload'],
  path: '/complaints',
  security: [{ Bearer: [] }],
  responses: {
    201: jsonSchemaBuilder(z.object({ url: z.string(), fileName: z.string(), fileType: z.string() })),
    ...defaultResponseSchema,
  },
});
