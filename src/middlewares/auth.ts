import type { Bindings, Variables } from '../@types';
import { getCookie, setCookie } from 'hono/cookie';
import { createMiddleware } from 'hono/factory';
import { decode, sign, verify } from 'hono/jwt';
import dayjs from 'dayjs';
import { and, eq, isNull } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { users } from '../models/user';
import { throwError } from '../utils';
import { sha256Hex } from '../utils/crypto';
import { Logger } from '../utils/logger';

/**
 * Authentication middleware: verify JWT and attach the verified payload.
 * Supports transparent access-token refresh when the token is expired.
 *
 * Authorization (RBAC) is applied separately via casbinMiddleware on routers
 * that require it — keeping auth and authz concerns cleanly separated.
 */
export const auth = createMiddleware<{ Bindings: Bindings; Variables: Variables }>(async (c, next) => {
  // OPTIONS preflight must not require auth
  if (c.req.method === 'OPTIONS') {
    await next();
    return;
  }

  const authorization = c.req.header('Authorization');
  const token = getCookie(c, 'token') || authorization?.replace('Bearer ', '');
  const tokenRegex = /^[A-Za-z0-9._~+\/-]+=*$/;

  if (!token) {
    Logger.warn('Auth: missing token', { path: c.req.path, method: c.req.method });
    return throwError.unauthorized('Authentication token required', { operation: 'auth_check' });
  }
  if (!tokenRegex.test(token)) {
    Logger.warn('Auth: invalid token format', { tokenPreview: token.substring(0, 10) + '...' });
    return throwError.badRequest('Invalid token format', { token: token.substring(0, 10) + '...', operation: 'auth_check' });
  }

  try {
    const payload = await verify(token, c.env.JWT_SECRET, 'HS256');
    const userId = payload.id as string;
    const user = await c.var.db
      .select({ accountStatus: users.accountStatus, blockReason: users.blockReason })
      .from(users)
      .where(and(eq(users.id, userId), isNull(users.deletedAt)))
      .get();
    if (user?.accountStatus === 'blocked') {
      return throwError.forbidden('Tài khoản đã bị chặn', {
        reason: user.blockReason ?? 'Liên hệ admin để biết thêm chi tiết.',
      });
    }
    c.set('jwtPayload', payload as unknown as Variables['jwtPayload']);
    await next();
  } catch (error) {
    if ((error as Error).name !== 'JwtTokenExpired') {
      return handleJwtError(error, token);
    }

    // Transparent token refresh when access token is expired
    try {
      const { payload: oldPayload } = decode(token);
      const userId = oldPayload.id as string;

      const [user] = await c.var.db
        .select()
        .from(users)
        .where(and(eq(users.id, userId), isNull(users.deletedAt)))
        .limit(1);

      if (!user?.refreshToken) {
        return throwError.unauthorized('Session expired, please log in again', { userId, operation: 'token_refresh' });
      }

      if (user.accountStatus === 'blocked') {
        return throwError.forbidden('Tài khoản đã bị chặn', {
          reason: user.blockReason ?? 'Liên hệ admin để biết thêm chi tiết.',
        });
      }

      const oldJti = oldPayload?.jti;
      if (!oldJti) {
        return throwError.unauthorized('Session expired, please log in again', {
          userId,
          operation: 'token_refresh',
          reason: 'missing_jti',
        });
      }

      const tokenExpiration = dayjs().add(1, 'day').unix();
      const newJti = nanoid(15);
      const newPayload = {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        roles: user.role ? [user.role] : [],
        exp: tokenExpiration,
        jti: newJti,
      };
      const newToken = await sign(newPayload, c.env.JWT_SECRET);

      setCookie(c, 'token', newToken, {
        sameSite: 'Lax',
        path: '/',
        httpOnly: true,
        secure: true,
        maxAge: tokenExpiration - dayjs().unix(),
      });

      // Rotate refresh token — invalidates previous session
      const newRefreshToken = await sign({ jti: newJti, exp: dayjs().add(90, 'day').unix() }, c.env.JWT_SECRET);
      await c.var.db
        .update(users)
        .set({ refreshToken: await sha256Hex(newRefreshToken), updatedAt: new Date() })
        .where(eq(users.id, user.id));

      c.set('jwtPayload', newPayload);
      await next();
    } catch (refreshError) {
      const name = (refreshError as Error)?.name ?? '';
      const jwtErrors = [
        'JwtTokenExpired',
        'JwtTokenSignatureMismatched',
        'JwtAlgorithmNotImplemented',
        'JwtTokenInvalid',
        'JwtTokenNotBefore',
        'JwtTokenIssuedAt',
        'JwtHeaderInvalid',
        'JwtHeaderRequiresKid',
      ];
      if (jwtErrors.includes(name)) return handleJwtError(refreshError, token);
      throw refreshError;
    }
  }
});

// ─── JWT error handler ────────────────────────────────────────────────────────

const handleJwtError = (error: unknown, token: string) => {
  const name = (error as Error)?.name ?? '';
  const tokenPreview = token.substring(0, 10) + '...';
  Logger.warn(`JWT validation failed: ${name}`, { tokenPreview, errorName: name });
  switch (name) {
    case 'JwtTokenExpired':
      return throwError.unauthorized(`Token expired: ${tokenPreview}`, { operation: 'jwt_validation' });
    case 'JwtTokenSignatureMismatched':
      return throwError.unauthorized(`Invalid token signature: ${tokenPreview}`, { operation: 'jwt_validation' });
    case 'JwtAlgorithmNotImplemented':
      return throwError.unauthorized('Unsupported JWT algorithm', { operation: 'jwt_validation' });
    case 'JwtTokenInvalid':
      return throwError.unauthorized(`Invalid JWT format: ${tokenPreview}`, { operation: 'jwt_validation' });
    case 'JwtTokenNotBefore':
      return throwError.unauthorized(`Token not yet valid: ${tokenPreview}`, { operation: 'jwt_validation' });
    case 'JwtTokenIssuedAt':
      return throwError.unauthorized('Invalid token issue time', { operation: 'jwt_validation' });
    case 'JwtHeaderInvalid':
      return throwError.unauthorized('Invalid JWT header', { operation: 'jwt_validation' });
    case 'JwtHeaderRequiresKid':
      return throwError.unauthorized('Missing required kid in JWT header', { operation: 'jwt_validation' });
    default:
      return throwError.unauthorized('Invalid authentication token', { operation: 'jwt_validation' });
  }
};
