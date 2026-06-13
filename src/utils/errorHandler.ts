import type { iContext } from '../@types';
import { getErrorCode, getStatusCode } from './errorClassifier';
import { Logger } from './logger';

// ─── Shared response builders ─────────────────────────────────────────────────

function buildMeta(c: iContext) {
  return {
    userAgent: c.req.header('user-agent'),
    environment: c.env?.ENVIRONMENT || 'development',
  };
}

function buildErrorBody(fields: {
  name?: string;
  message: string;
  code: string;
  statusCode: number;
  requestId?: string;
  path: string;
  method: string;
  stack?: string;
  cause?: string;
  context?: Record<string, unknown>;
}) {
  return { success: false as const, error: fields };
}

// ─── Handlers ────────────────────────────────────────────────────────────────

/** Handle errors and return a formatted JSON error response. */
export function handleError(c: iContext, error: any) {
  const requestId = c.req.header('cf-ray');
  const isDevelopment = c.env?.ENVIRONMENT !== 'production';
  const statusCode = getStatusCode(error);
  const code = getErrorCode(error);

  Logger.error(error, c);
  c.header('X-Error-Code', code);

  return c.json(
    {
      ...buildErrorBody({
        name: error.name,
        message: error.message || 'An unexpected error occurred',
        code,
        statusCode,
        requestId,
        path: c.req.path,
        method: c.req.method,
        stack: isDevelopment ? error.stack : undefined,
        cause: error.cause ? String(error.cause) : undefined,
        context: error.context ?? undefined,
      }),
      meta: buildMeta(c),
    },
    statusCode,
  );
}

/** Handle unmatched routes with a 404 JSON response. */
export const notFoundHandler = (c: iContext) => {
  const message = `Route not found: ${c.req.method} ${c.req.path}`;
  Logger.warn(`⚠️ ${message}`, undefined, c);
  c.header('X-Error-Code', 'ROUTE_NOT_FOUND');
  return c.json(
    {
      ...buildErrorBody({ message, code: 'ROUTE_NOT_FOUND', statusCode: 404, path: c.req.path, method: c.req.method }),
      meta: buildMeta(c),
    },
    404,
  );
};
