import { createMiddleware } from 'hono/factory';
import { throwError } from '../utils';

export const rateLimit = createMiddleware(async (c, next) => {
  const key = c.req.header('Authorization') ?? c.req.header('cf-connecting-ip') ?? 'anonymous';
  const { success } = await c.env.API_RATE_LIMITER.limit({ key });

  if (!success) return throwError.rateLimit('Rate limit exceeded', { identifier: key, operation: 'rate_limit_check' });

  await next();
});
