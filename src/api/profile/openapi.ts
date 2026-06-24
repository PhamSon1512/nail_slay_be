import { createRoute, z } from '@hono/zod-openapi';
import { createInsertSchema, createSelectSchema } from 'drizzle-orm/zod';
import { users } from '../../models';
import { jsonSchemaBuilder } from '../../utils';
import { defaultResponseSchema } from '../../utils/schema';

const UserSchema = createSelectSchema(users);
// Drizzle JS object keys are camelCase — must match JS property names, not column names.
// SEC: role is omitted — users must NOT be able to change their own role via profile update.
export const UpdateUserSchema = createInsertSchema(users).partial().omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
  password: true,
  refreshToken: true,
  role: true,
});

export const ChangePasswordSchema = z
  .object({
    current_password: z.string().min(1),
    new_password: z.string().min(8),
    confirm_password: z.string().min(8),
  })
  .refine((data) => data.new_password === data.confirm_password, {
    message: 'Passwords do not match',
    path: ['confirm_password'],
  });

export const GetProfileOpenAPI = createRoute({
  method: 'get',
  tags: ['Profile'],
  path: '/me',
  security: [{ Bearer: [] }],
  responses: {
    200: jsonSchemaBuilder(
      UserSchema.omit({
        password: true,
        refreshToken: true,
        deletedAt: true,
      }),
    ),
    ...defaultResponseSchema,
  },
});

export const UpdateProfileOpenAPI = createRoute({
  method: 'put',
  tags: ['Profile'],
  path: '/',
  security: [{ Bearer: [] }],
  request: {
    body: jsonSchemaBuilder(UpdateUserSchema.openapi('UpdateProfileRequest'), 'Profile fields to update'),
  },
  responses: {
    200: jsonSchemaBuilder(
      UserSchema.omit({
        password: true,
        refreshToken: true,
        deletedAt: true,
      }),
    ),
    ...defaultResponseSchema,
  },
});

export const ChangePasswordOpenAPI = createRoute({
  method: 'post',
  tags: ['Profile'],
  path: '/change-password',
  security: [{ Bearer: [] }],
  request: {
    body: jsonSchemaBuilder(ChangePasswordSchema.openapi('ChangePasswordRequest')),
  },
  responses: {
    200: jsonSchemaBuilder(z.object({ success: z.boolean(), message: z.string() })),
    ...defaultResponseSchema,
  },
});
