import { createRoute } from '@hono/zod-openapi';
import { z } from 'zod';
import { jsonSchemaBuilder } from '../../utils';
import { defaultResponseSchema } from '../../utils/schema';

export const GetPublicSettingsOpenAPI = createRoute({
  method: 'get',
  tags: ['Settings'],
  path: '/public',
  responses: {
    200: jsonSchemaBuilder(
      z.object({
        banner: z.unknown().nullable(),
        homepage: z.unknown().nullable(),
        contact_info: z.unknown().nullable(),
        qr_code_url: z.unknown().nullable(),
        bank_info: z.unknown().nullable(),
      }),
    ),
    ...defaultResponseSchema,
  },
});
