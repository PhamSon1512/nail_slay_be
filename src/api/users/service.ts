import type { HonoCtx } from '../../@types';
import type { z } from 'zod';
import { and, eq, isNull } from 'drizzle-orm';
import { AuditAction, users } from '../../models';
import { throwError, writeAudit } from '../../utils';
import { hashPassword } from '../../utils/password';
import { AdminCreateUserSchema } from './openapi';

// Re-export getProfile from profile service — single source of truth, avoids drift
export { getProfile } from '../profile/service';

export async function createUser(c: HonoCtx, payload: z.infer<typeof AdminCreateUserSchema>) {
  const { email, password } = payload;

  // WARN-1: only block if an ACTIVE (not soft-deleted) user owns this email
  const userExist = await c.var.db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.email, email), isNull(users.deletedAt)))
    .get();

  if (userExist) return throwError.conflict('Email already in use', { email, existingUserId: userExist.id });

  // Hash password using PBKDF2 (SEC-2: replaces MD5)
  const hashedPassword = await hashPassword(password);

  // SEC-CRIT-3: wrap insert in try/catch to handle race condition:
  // check-then-insert is not atomic — concurrent requests with same email
  // will pass the check then hit UNIQUE constraint → catch gives 409 instead of 500
  try {
    const user = await c.var.db
      .insert(users)
      .values({ ...payload, password: hashedPassword })
      .returning({ id: users.id, email: users.email })
      .get();

    void writeAudit(c, {
      action: AuditAction.USER_CREATE,
      entityType: 'user',
      entityId: user.id,
      newValue: { email: user.email } as Record<string, unknown>,
    });

    return { id: user.id };
  } catch (err: any) {
    if (err?.message?.includes('UNIQUE constraint failed')) {
      return throwError.conflict('Email already in use', { email, existingUserId: undefined });
    }
    throw err;
  }
}
