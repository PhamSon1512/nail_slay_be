import type { Bindings, Variables } from '../../@types';
import { OpenAPIHono } from '@hono/zod-openapi';
import { auth, casbinMiddleware, rateLimit, requireAdmin } from '../../middlewares';

/** Typed Hono application used across all API modules. */
export type HonoApp = OpenAPIHono<{ Bindings: Bindings; Variables: Variables }>;

/**
 * Create a bare router with typed Bindings/Variables.
 * Use for routes that manage their own auth (e.g. auth module with rate limiting).
 */
export function createRouter(): HonoApp {
  return new OpenAPIHono<{ Bindings: Bindings; Variables: Variables }>();
}

/**
 * Create a router with `auth` + `casbinMiddleware` pre-applied.
 * Use for all protected API routes.
 */
export function createAuthRouter(): HonoApp {
  const router = createRouter();
  router.use(auth);
  router.use(casbinMiddleware);
  return router;
}

/**
 * Create a router with `rateLimit` middleware pre-applied.
 * Use for public endpoints (login, register, forgot-password).
 */
export function createRateLimitedRouter(): HonoApp {
  const router = createRouter();
  router.use(rateLimit);
  return router;
}

/** Router with auth + admin role check + casbin policies. */
export function createAdminRouter(): HonoApp {
  const router = createRouter();
  router.use(auth);
  router.use(requireAdmin);
  router.use(casbinMiddleware);
  return router;
}
