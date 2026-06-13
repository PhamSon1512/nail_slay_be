import { createRoute } from '@hono/zod-openapi';
import { z } from 'zod';
import { jsonSchemaBuilder } from '../../utils';
import { defaultResponseSchema } from '../../utils/schema';

export const LoginBodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  remember_me: z.boolean().optional(),
});

export const SignupBodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  full_name: z.string().optional(),
  phone: z.string().optional(),
});

export const RegisterBodySchema = SignupBodySchema.extend({
  remember_me: z.boolean().optional(),
});

export const ForgotPasswordBodySchema = z.object({
  email: z.string().email(),
});

export const UpdateMeBodySchema = z.object({
  fullName: z.string().optional(),
  phone: z.string().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
});

const AuthUserSchema = z.object({
  id: z.string(),
  email: z.string(),
  full_name: z.string().nullable(),
  phone: z.string().nullable(),
  role: z.string().nullable(),
});

const AuthResponseSchema = z.object({
  access_token: z.string(),
  token: z.string(),
  user: AuthUserSchema,
  userId: z.string(),
  exp: z.number(),
});

export const LoginOpenAPI = createRoute({
  method: 'post',
  tags: ['Auth'],
  path: '/login',
  request: { body: jsonSchemaBuilder(LoginBodySchema) },
  responses: {
    200: jsonSchemaBuilder(AuthResponseSchema, 'Success'),
    ...defaultResponseSchema,
  },
});

export const RegisterOpenAPI = createRoute({
  method: 'post',
  tags: ['Auth'],
  path: '/register',
  request: { body: jsonSchemaBuilder(RegisterBodySchema) },
  responses: {
    201: jsonSchemaBuilder(AuthResponseSchema, 'Registered'),
    ...defaultResponseSchema,
  },
});

export const SignupOpenAPI = createRoute({
  method: 'post',
  tags: ['Auth'],
  path: '/sign-up',
  request: { body: jsonSchemaBuilder(SignupBodySchema) },
  responses: {
    201: jsonSchemaBuilder(z.object({ id: z.string() }), 'User created'),
    ...defaultResponseSchema,
  },
});

export const LogoutOpenAPI = createRoute({
  method: 'post',
  tags: ['Auth'],
  path: '/logout',
  security: [{ Bearer: [] }],
  responses: {
    200: jsonSchemaBuilder(z.object({ success: z.boolean(), message: z.string() })),
    ...defaultResponseSchema,
  },
});

export const GetMeOpenAPI = createRoute({
  method: 'get',
  tags: ['Auth'],
  path: '/me',
  security: [{ Bearer: [] }],
  responses: {
    200: jsonSchemaBuilder(z.record(z.string(), z.unknown())),
    ...defaultResponseSchema,
  },
});

export const UpdateMeOpenAPI = createRoute({
  method: 'put',
  tags: ['Auth'],
  path: '/me',
  security: [{ Bearer: [] }],
  request: { body: jsonSchemaBuilder(UpdateMeBodySchema) },
  responses: {
    200: jsonSchemaBuilder(z.record(z.string(), z.unknown())),
    ...defaultResponseSchema,
  },
});

export const ForgotPasswordOpenAPI = createRoute({
  method: 'post',
  tags: ['Auth'],
  path: '/forgot-password',
  summary: 'Yêu cầu đặt lại mật khẩu (sườn — chưa gửi email)',
  request: { body: jsonSchemaBuilder(ForgotPasswordBodySchema) },
  responses: {
    202: jsonSchemaBuilder(
      z.object({
        success: z.boolean(),
        message: z.string(),
      }),
      'Request accepted',
    ),
    ...defaultResponseSchema,
  },
});

export const GenerateTokenOpenAPI = createRoute({
  method: 'get',
  tags: ['Auth'],
  path: '/token',
  security: [{ Bearer: [] }],
  responses: {
    200: jsonSchemaBuilder(AuthResponseSchema, 'Success'),
    ...defaultResponseSchema,
  },
});
