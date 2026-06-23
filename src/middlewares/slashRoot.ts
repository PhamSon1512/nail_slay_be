import type { MiddlewareHandler } from 'hono';

/**
 * Sub-routers registered with OpenAPI `path: '/'` only match requests that include a
 * trailing slash (e.g. GET /profile/). Clients (axios, fetch) call /profile without it.
 * Re-dispatch exact root paths once with a trailing slash before route matching.
 */
const SLASH_ROOT_PATHS = new Set([
  '/addresses',
  '/articles',
  '/cart',
  '/categories',
  '/checkout',
  '/media',
  '/orders',
  '/products',
  '/profile',
  '/reviews',
  '/settings',
  '/users',
]);

export const slashRootPaths =
  (fetchApp: (request: Request, ...rest: unknown[]) => Response | Promise<Response>): MiddlewareHandler =>
  async (c, next) => {
    const path = c.req.path;
    if (!SLASH_ROOT_PATHS.has(path)) {
      await next();
      return;
    }

    const url = new URL(c.req.url);
    url.pathname = `${path}/`;
    return fetchApp(new Request(url, c.req.raw), c.env, c.executionCtx);
  };
