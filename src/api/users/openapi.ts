import { createRoute } from '@hono/zod-openapi';
import { createInsertSchema, createSelectSchema } from 'drizzle-orm/zod';
import { z } from 'zod';
import { users } from '../../models';
import { jsonSchemaBuilder } from '../../utils';
import { defaultResponseSchema } from '../../utils/schema';

const UserSchema = createSelectSchema(users);
const UserInsertSchema = createInsertSchema(users);

// Admin-only: create user with optional role assignment.
// password is excluded from Drizzle schema and replaced by a plain-text z.string input
// which gets hashed server-side before storage.
export const AdminCreateUserSchema = UserInsertSchema.omit({
  id: true,
  refreshToken: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
  password: true,
}).extend({
  password: z.string().min(8),
});

export const ProfileOpenAPI = createRoute({
  method: 'get',
  tags: ['Users'],
  path: '/me',
  security: [{ Bearer: [] }],
  responses: {
    200: jsonSchemaBuilder(UserSchema.omit({ password: true, refreshToken: true })),
    ...defaultResponseSchema,
  },
});

export const CreateOpenAPI = createRoute({
  method: 'post',
  tags: ['Users'],
  path: '/',
  security: [{ Bearer: [] }],
  request: {
    body: jsonSchemaBuilder(AdminCreateUserSchema, 'New user data (admin only)'),
  },
  responses: {
    201: jsonSchemaBuilder(z.object({ id: z.string() }), 'User created'),
    ...defaultResponseSchema,
  },
});
