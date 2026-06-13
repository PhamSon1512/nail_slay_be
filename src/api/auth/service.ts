import type { HonoCtx } from '../../@types';
import type { z } from 'zod';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import { decode, sign, verify } from 'hono/jwt';
import dayjs from 'dayjs';
import { and, eq, isNull } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { omit } from 'ramda';
import { AuditAction, users } from '../../models';
import { Logger, throwError, writeAudit } from '../../utils';
import { sha256Hex } from '../../utils/crypto';
import { comparePassword, hashPassword } from '../../utils/password';
import { USER_SENSITIVE_FIELDS } from '../users/constants';
import { LoginBodySchema, RegisterBodySchema, SignupBodySchema, UpdateMeBodySchema } from './openapi';

const REMEMBER_ME_DAYS = 30;
const ACCESS_TOKEN_DAYS = 1;

function sanitizeUser(user: typeof users.$inferSelect) {
  return omit(USER_SENSITIVE_FIELDS, user);
}

function formatAuthResponse(token: string, user: typeof users.$inferSelect, exp: number) {
  const safe = sanitizeUser(user);
  return {
    access_token: token,
    token,
    user: {
      id: safe.id,
      email: safe.email,
      full_name: safe.fullName,
      phone: safe.phone,
      role: safe.role,
    },
    userId: user.id,
    exp,
  };
}

async function issueTokenPair(
  c: HonoCtx,
  user: { id: string; email: string; fullName: string | null; role: string | null },
  rememberMe = false,
) {
  const jti = nanoid(15);
  const tokenDays = rememberMe ? REMEMBER_ME_DAYS : ACCESS_TOKEN_DAYS;
  const tokenExpiration = dayjs().add(tokenDays, 'day').unix();
  const maxAge = tokenExpiration - dayjs().unix();

  const token = await sign(
    {
      id: user.id,
      roles: user.role ? [user.role] : [],
      email: user.email,
      fullName: user.fullName,
      exp: tokenExpiration,
      jti,
    },
    c.env.JWT_SECRET,
  );

  setCookie(c, 'token', token, { sameSite: 'Lax', maxAge, path: '/', httpOnly: true, secure: true });

  const refreshToken = await sign({ jti, exp: dayjs().add(90, 'day').unix() }, c.env.JWT_SECRET);
  const refreshTokenHash = await sha256Hex(refreshToken);
  await c.var.db.update(users).set({ refreshToken: refreshTokenHash, updatedAt: new Date() }).where(eq(users.id, user.id));

  return { token, userId: user.id, exp: tokenExpiration };
}

export async function login(c: HonoCtx, input: z.infer<typeof LoginBodySchema>) {
  const { email, password, remember_me: rememberMe } = input;

  const candidate = await c.var.db
    .select()
    .from(users)
    .where(and(eq(users.email, email), isNull(users.deletedAt)))
    .get();

  if (!candidate || !(await comparePassword(password, candidate.password))) {
    void writeAudit(c, {
      action: AuditAction.USER_LOGIN_FAILED,
      entityType: 'user',
      entityId: candidate?.id ?? null,
      oldValue: { email } as Record<string, unknown>,
      actor: null,
    });
    return throwError.badRequest('Tài khoản hoặc mật khẩu không đúng', { email });
  }

  const { token, exp } = await issueTokenPair(c, candidate, rememberMe ?? false);

  Logger.info(`User "${candidate.email}" login successful`, { userId: candidate.id, email: candidate.email }, c);

  void writeAudit(c, {
    action: AuditAction.USER_LOGIN,
    entityType: 'user',
    entityId: candidate.id,
    actor: { id: candidate.id, email: candidate.email },
  });

  return formatAuthResponse(token, candidate, exp);
}

export async function refreshToken(c: HonoCtx) {
  const authorization = c.req.header('Authorization');
  const oldToken = getCookie(c, 'token') || authorization?.replace('Bearer ', '');

  if (!oldToken) return throwError.unauthorized('No token provided', { operation: 'token_refresh' });

  try {
    await verify(oldToken, c.env.JWT_SECRET, 'HS256');
  } catch (err) {
    if ((err as Error).name !== 'JwtTokenExpired') {
      return throwError.unauthorized('Invalid token', { operation: 'token_refresh' });
    }
  }

  const { payload: oldTokenPayload } = decode(oldToken);
  const userId = oldTokenPayload.id as string;

  const user = await c.var.db
    .select()
    .from(users)
    .where(and(eq(users.id, userId), isNull(users.deletedAt)))
    .get();

  if (!user?.refreshToken) return throwError.unauthorized('Token expired', { userId, operation: 'token_refresh' });

  if (!oldTokenPayload?.jti) {
    return throwError.unauthorized('Token expired', { userId, operation: 'token_refresh', reason: 'missing_jti' });
  }

  const { token, exp } = await issueTokenPair(c, user);

  Logger.info(`Token generation successful for user "${user.email}"`, { userId, operation: 'token_refresh' }, c);

  void writeAudit(c, {
    action: AuditAction.USER_TOKEN_REFRESH,
    entityType: 'user',
    entityId: userId,
    actor: { id: user.id, email: user.email },
  });

  return formatAuthResponse(token, user, exp);
}

export async function signup(c: HonoCtx, input: z.infer<typeof SignupBodySchema>) {
  const { email, password, full_name: fullName, phone } = input;

  const userExist = await c.var.db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.email, email), isNull(users.deletedAt)))
    .get();

  if (userExist) return throwError.conflict('Đăng ký thất bại - Email này đã được sử dụng', { email, operation: 'signup' });

  const hashedPassword = await hashPassword(password);

  try {
    const user = await c.var.db
      .insert(users)
      .values({ email, password: hashedPassword, fullName: fullName ?? null, phone: phone ?? null })
      .returning()
      .get();

    void writeAudit(c, {
      action: AuditAction.USER_SIGNUP,
      entityType: 'user',
      entityId: user.id,
      newValue: { email } as Record<string, unknown>,
    });

    return { id: user.id };
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes('UNIQUE constraint failed')) {
      return throwError.conflict('Đăng ký thất bại - Email này đã được sử dụng', { email, operation: 'signup' });
    }
    throw err;
  }
}

export async function register(c: HonoCtx, input: z.infer<typeof RegisterBodySchema>) {
  const result = await signup(c, input);
  const user = await c.var.db.select().from(users).where(eq(users.id, result.id)).get();
  if (!user) return throwError.internal('User creation failed');

  const { token, exp } = await issueTokenPair(c, user, input.remember_me ?? false);
  return formatAuthResponse(token, user, exp);
}

/** Skeleton: accepts email, always returns success (email delivery TBD). */
export async function forgotPassword(c: HonoCtx, input: { email: string }) {
  const candidate = await c.var.db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.email, input.email), isNull(users.deletedAt)))
    .get();

  if (!candidate) {
    return {
      success: true,
      message: 'If an account exists for this email, password reset instructions will be sent when the feature is enabled.',
    };
  }

  return {
    success: true,
    message: 'Password reset request received. Email delivery is not configured yet — contact support if you need help.',
  };
}

export async function logout(c: HonoCtx) {
  const userId = c.var.jwtPayload?.id;
  if (userId) {
    await c.var.db.update(users).set({ refreshToken: null, updatedAt: new Date() }).where(eq(users.id, userId));
  }
  deleteCookie(c, 'token', { path: '/' });
  return { success: true, message: 'Logged out successfully' };
}

export async function getMe(c: HonoCtx) {
  const userId = c.var.jwtPayload.id!;
  const result = await c.var.db
    .select()
    .from(users)
    .where(and(eq(users.id, userId), isNull(users.deletedAt)))
    .get();

  if (!result) return throwError.notFound('User not found', { userId });
  return sanitizeUser(result);
}

export async function updateMe(c: HonoCtx, payload: z.infer<typeof UpdateMeBodySchema>) {
  const userId = c.var.jwtPayload.id!;

  const existingUser = await c.var.db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.id, userId), isNull(users.deletedAt)))
    .get();
  if (!existingUser) return throwError.notFound('User not found', { userId });

  const [updated] = await c.var.db
    .update(users)
    .set({ ...payload, updatedAt: new Date() })
    .where(and(eq(users.id, userId), isNull(users.deletedAt)))
    .returning();

  return sanitizeUser(updated);
}
