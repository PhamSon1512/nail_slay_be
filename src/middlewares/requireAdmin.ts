import type { Bindings, Variables } from '../@types';
import { createMiddleware } from 'hono/factory';
import { and, eq, isNull } from 'drizzle-orm';
import { users } from '../models/user';
import { throwError } from '../utils';

export const requireAdmin = createMiddleware<{ Bindings: Bindings; Variables: Variables }>(async (c, next) => {
  const userId = c.var.jwtPayload?.id;
  if (!userId) {
    return throwError.forbidden('Admin access required', { operation: 'admin_check' });
  }

  const user = await c.var.db
    .select({ role: users.role, accountStatus: users.accountStatus })
    .from(users)
    .where(and(eq(users.id, userId), isNull(users.deletedAt)))
    .get();

  if (!user || user.role !== 'admin' || user.accountStatus === 'blocked') {
    return throwError.forbidden('Admin access required', { operation: 'admin_check' });
  }

  await next();
});
