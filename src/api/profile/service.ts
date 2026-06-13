import type { HonoCtx } from '../../@types';
import type { z } from 'zod';
import { and, eq, isNull } from 'drizzle-orm';
import { omit } from 'ramda';
import { users } from '../../models';
import { throwError } from '../../utils';
import { comparePassword, hashPassword } from '../../utils/password';
import { USER_SENSITIVE_FIELDS } from '../users/constants';
import { ChangePasswordSchema, UpdateUserSchema } from './openapi';

export async function getProfile(c: HonoCtx) {
  const userId = c.var.jwtPayload.id!;

  // LOGIC-8: exclude soft-deleted users
  const result = await c.var.db
    .select()
    .from(users)
    .where(and(eq(users.id, userId), isNull(users.deletedAt)))
    .get();

  if (!result) return throwError.notFound('User profile not found', { userId });

  return omit(USER_SENSITIVE_FIELDS, result);
}

export async function updateProfile(c: HonoCtx, payload: z.infer<typeof UpdateUserSchema>) {
  const userId = c.var.jwtPayload.id!;

  // LOGIC-8: exclude soft-deleted users. Fetch name fields for fullName sync (LOGIC-22).
  const existingUser = await c.var.db
    .select({ id: users.id, firstName: users.firstName, lastName: users.lastName })
    .from(users)
    .where(and(eq(users.id, userId), isNull(users.deletedAt)))
    .get();
  if (!existingUser) return throwError.notFound('User not found for profile update', { userId });

  // LOGIC-22: auto-sync fullName when firstName or lastName changes.
  // If user explicitly provides fullName in the payload, that takes precedence.
  const newFirstName = 'firstName' in payload ? payload.firstName : existingUser.firstName;
  const newLastName = 'lastName' in payload ? payload.lastName : existingUser.lastName;
  const nameParts = [newFirstName, newLastName].filter(Boolean);
  const computedFullName = 'fullName' in payload ? payload.fullName : nameParts.length > 0 ? nameParts.join(' ') : null;

  // LOGIC-7: auto-set updatedAt.
  // API-3: WHERE includes isNull(deletedAt) to guard against soft-delete race condition.
  const [updated] = await c.var.db
    .update(users)
    .set({ ...payload, fullName: computedFullName, updatedAt: new Date() })
    .where(and(eq(users.id, userId), isNull(users.deletedAt)))
    .returning();

  // API-8: return updated user object to match OpenAPI response schema
  return omit(USER_SENSITIVE_FIELDS, updated);
}

export async function changePassword(c: HonoCtx, payload: z.infer<typeof ChangePasswordSchema>) {
  const userId = c.var.jwtPayload.id!;
  const { current_password: currentPassword, new_password: newPassword, confirm_password: confirmPassword } = payload;

  if (newPassword !== confirmPassword) {
    return throwError.badRequest('New password and confirmation do not match');
  }

  const user = await c.var.db
    .select()
    .from(users)
    .where(and(eq(users.id, userId), isNull(users.deletedAt)))
    .get();

  if (!user) return throwError.notFound('User not found', { userId });

  if (!(await comparePassword(currentPassword, user.password))) {
    return throwError.badRequest('Current password is incorrect');
  }

  const hashedPassword = await hashPassword(newPassword);
  await c.var.db
    .update(users)
    .set({ password: hashedPassword, refreshToken: null, updatedAt: new Date() })
    .where(eq(users.id, userId));

  return { success: true, message: 'Password changed successfully' };
}
