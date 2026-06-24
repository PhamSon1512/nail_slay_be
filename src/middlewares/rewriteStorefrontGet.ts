/** Reserved second path segments used by storefront route aliases. */
const RESERVED_SEGMENTS = new Set(['list', 'item', 'current', 'me']);

/** Single-segment GET paths rewritten to two-segment aliases (Workers router quirk). */
const SINGLE_SEGMENT_ALIASES: Record<string, string> = {
  '/products': '/products/list',
  '/articles': '/articles/list',
  '/categories': '/categories/list',
  '/cart': '/cart/current',
  '/profile': '/profile/me',
  '/orders': '/orders/list',
  '/addresses': '/addresses/list',
};

const SLUG_PREFIX_ALIASES = [
  { from: '/products/', to: '/products/item/' },
  { from: '/articles/', to: '/articles/item/' },
] as const;

/**
 * Cloudflare Workers + Hono: GET routes with exactly one path segment (e.g. `/products`)
 * do not match at runtime. Rewrite to two-segment aliases so the FE can keep calling `/products`.
 */
export function rewriteStorefrontGet(request: Request): Request {
  if (request.method !== 'GET') {
    return request;
  }

  const url = new URL(request.url);
  const path = url.pathname;

  const singleAlias = SINGLE_SEGMENT_ALIASES[path];
  if (singleAlias) {
    url.pathname = singleAlias;
    return new Request(url, request);
  }

  for (const { from, to } of SLUG_PREFIX_ALIASES) {
    if (!path.startsWith(from)) continue;
    const slug = path.slice(from.length);
    if (!slug || slug.includes('/') || RESERVED_SEGMENTS.has(slug)) continue;
    url.pathname = `${to}${slug}`;
    return new Request(url, request);
  }

  return request;
}
