import { createRoute } from '@hono/zod-openapi';
import { createSelectSchema } from 'drizzle-orm/zod';
import { z } from 'zod';
import { media } from '../../models';
import { jsonSchemaBuilder } from '../../utils';
import { defaultResponseSchema } from '../../utils/schema';

// Override `tags` field: text({ mode: 'json' }) generates z.unknown() which is not OpenAPI-serializable.
const MediaSchema = createSelectSchema(media, {
  tags: z.array(z.string()).nullable(),
});

export const UploadOpenAPI = createRoute({
  method: 'post',
  tags: ['Media'],
  path: '/',
  security: [{ Bearer: [] }],
  request: {
    body: {
      content: {
        'multipart/form-data': {
          // z.instanceof(File) is a Zod custom type — not serializable to JSON Schema.
          // Use z.string().openapi({ format: 'binary' }) instead for OpenAPI compatibility.
          schema: z.object({
            // z.any() accepts File object at runtime (from FormData parseBody).
            // .openapi() override provides correct JSON Schema for docs (format: binary).
            // z.instanceof(File) and z.union cannot serialize to OpenAPI JSON Schema.
            file: z.any().openapi({ type: 'string', format: 'binary', description: 'File to upload' }),
          }),
        },
      },
    },
  },
  responses: {
    201: jsonSchemaBuilder(MediaSchema, 'Success'),
    ...defaultResponseSchema,
  },
});

export const DownloadOpenAPI = createRoute({
  method: 'get',
  tags: ['Media'],
  path: '/:id',
  security: [{ Bearer: [] }],
  request: {
    params: z.object({
      id: z.string().openapi({ param: { name: 'id', in: 'path' }, example: 'cm9abc123' }),
    }),
  },
  responses: {
    200: {
      content: {
        'application/octet-stream': {
          schema: z.any().openapi({ type: 'string', format: 'binary' }),
        },
      },
      description: 'File downloaded successfully',
    },
    ...defaultResponseSchema,
  },
});
