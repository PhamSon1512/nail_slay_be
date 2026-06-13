import type { Bindings, Variables } from '../@types';
import { createMiddleware } from 'hono/factory';
import { throwError } from '../utils';

export const requireAdmin = createMiddleware<{ Bindings: Bindings; Variables: Variables }>(async (c, next) => {
  const roles = c.var.jwtPayload?.roles ?? [];
  if (!roles.includes('admin')) {
    return throwError.forbidden('Admin access required', { operation: 'admin_check' });
  }
  await next();
});
