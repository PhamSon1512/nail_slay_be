import type { MiddlewareHandler } from 'hono';

/**
 * List routes are registered at `path: '/'` under each mount (e.g. `/products`).
 * Hono matches those without a trailing slash. Some clients call `/products/`.
 * Normalize by stripping a trailing slash and re-dispatching once.
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
    if (path.endsWith('/') && path.length > 1) {
      const bare = path.slice(0, -1);
      if (SLASH_ROOT_PATHS.has(bare)) {
        const url = new URL(c.req.url);
        url.pathname = bare;
        return fetchApp(new Request(url, c.req.raw), c.env, c.executionCtx);
      }
    }
    await next();
  };
