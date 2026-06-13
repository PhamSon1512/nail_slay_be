/**
 * Static Casbin-style RBAC policies for the boilerplate.
 *
 * Format: [sub, obj, act]
 *   - sub: role slug
 *   - obj: URL path (supports * glob suffix and :param style segments)
 *   - act: HTTP method or "*" for all methods
 */

export type Policy = [string, string, string];

export const ROLE_INHERITANCE: [string, string][] = [
  ['user', 'guest'],
  ['admin', 'user'],
];

export function getPolicies(): Policy[] {
  return [
    // ── Profile ───────────────────────────────────────────────────────────────
    ['user', '/profile', 'GET'],
    ['user', '/profile', 'PATCH'],
    ['user', '/profile', 'PUT'],
    ['user', '/profile/change-password', 'POST'],

    // ── Auth (protected) ──────────────────────────────────────────────────────
    ['user', '/auth/logout', 'POST'],
    ['user', '/auth/me', 'GET'],
    ['user', '/auth/me', 'PUT'],

    // ── Media ─────────────────────────────────────────────────────────────────
    ['user', '/media', 'GET'],
    ['user', '/media', 'POST'],
    ['user', '/media/:id', 'GET'],
    ['user', '/media/:id', 'DELETE'],

    // ── Public catalog (guest) ────────────────────────────────────────────────
    ['guest', '/categories', 'GET'],
    ['guest', '/products', 'GET'],
    ['guest', '/products/*', 'GET'],
    ['guest', '/settings/public', 'GET'],

    // ── User e-commerce ───────────────────────────────────────────────────────
    ['user', '/cart', 'GET'],
    ['user', '/cart', 'POST'],
    ['user', '/cart/:id', 'PUT'],
    ['user', '/cart/:id', 'DELETE'],
    ['user', '/checkout', 'POST'],
    ['user', '/orders', 'GET'],
    ['user', '/orders/:id', 'GET'],
    ['user', '/orders/:id/status', 'POST'],
    ['user', '/addresses', 'GET'],
    ['user', '/addresses', 'POST'],
    ['user', '/addresses/:id', 'PUT'],
    ['user', '/addresses/:id', 'DELETE'],
    ['user', '/upload/complaints', 'POST'],

    // ── Users (admin only) ────────────────────────────────────────────────────
    ['admin', '/users', 'GET'],
    ['admin', '/users', 'POST'],
    ['admin', '/users/:id', 'GET'],
    ['admin', '/users/:id', 'PATCH'],
    ['admin', '/users/:id', 'DELETE'],
    ['admin', '/users/:id/reset-password', 'POST'],

    // ── Admin e-commerce ──────────────────────────────────────────────────────
    ['admin', '/admin/*', '*'],

    // ── Admin wildcard ────────────────────────────────────────────────────────
    ['admin', '*', '*'],
  ];
}
