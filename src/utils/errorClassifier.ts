import type { ContentfulStatusCode } from 'hono/utils/http-status';
import { HTTPException } from 'hono/http-exception';
import { AppError } from './errors';

// ─── Lookup tables (OCP: add new error types without touching existing checks) ─

/** Map from error.code (filesystem, network) → HTTP status */
const CODE_TO_STATUS: Readonly<Record<string, ContentfulStatusCode>> = {
  ENOTFOUND: 503,
  ECONNREFUSED: 503,
  EACCES: 403,
  ENOENT: 404,
  EMFILE: 507,
  ENOSPC: 507,
};

/** Map from error.code → error string code */
const CODE_TO_ERROR_CODE: Readonly<Record<string, string>> = {
  EACCES: 'FILE_PERMISSION_DENIED',
  ENOENT: 'FILE_NOT_FOUND',
  EMFILE: 'TOO_MANY_FILES_OPEN',
  ENOSPC: 'NO_SPACE_LEFT',
};

/** Substring patterns in error.cause → HTTP status + error code pair */
const DB_CONSTRAINT_MAP: ReadonlyArray<[string, ContentfulStatusCode, string]> = [
  ['UNIQUE constraint failed', 409, 'DB_UNIQUE_CONSTRAINT'],
  ['FOREIGN KEY constraint failed', 400, 'DB_FOREIGN_KEY_CONSTRAINT'],
  ['NOT NULL constraint failed', 400, 'DB_NOT_NULL_CONSTRAINT'],
];

/** Business logic error names → fallback error code */
const BUSINESS_ERROR_NAMES = new Set(['BusinessLogicError', 'InventoryError', 'PaymentError', 'OrderError', 'ShippingError']);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function causeString(error: any): string {
  return error.cause ? String(error.cause) : '';
}

function isTimeoutError(error: any): boolean {
  return error.name === 'TimeoutError' || (error as any).code === 'TIMEOUT' || error.message?.includes('timeout');
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Determine the HTTP status code for any error.
 * Checks in priority order: AppError → HTTPException → DB constraints →
 * JWT → Zod → network codes → timeout → filesystem → memory → serialization →
 * business logic → default 500.
 */
export function getStatusCode(error: any): ContentfulStatusCode {
  if (error instanceof AppError) return error.statusCode;
  if (error instanceof HTTPException) return error.status;

  const cause = causeString(error);
  for (const [pattern, status] of DB_CONSTRAINT_MAP) {
    if (cause.includes(pattern)) return status;
  }

  if (error.name?.includes('Jwt')) return 401;
  if (error.name === 'ZodError') return 400;

  const codeStatus = CODE_TO_STATUS[(error as any).code];
  if (codeStatus) return codeStatus;

  if (isTimeoutError(error)) return 408;

  if (error.name === 'RangeError' || error.message?.includes('out of memory')) return 507;
  if (error instanceof SyntaxError && error.message?.includes('JSON')) return 400;

  if (BUSINESS_ERROR_NAMES.has(error.name)) return (error as any).statusCode ?? 422;

  return 500;
}

/**
 * Derive a string error code for any error.
 * Mirrors getStatusCode classification but returns a named code string.
 */
export function getErrorCode(error: any): string {
  if (error instanceof AppError) return error.code;
  if (error instanceof HTTPException) return `HTTP_${error.status}`;

  const cause = causeString(error);
  for (const [pattern, , code] of DB_CONSTRAINT_MAP) {
    if (cause.includes(pattern)) return code;
  }

  if (error.name?.includes('Jwt')) {
    // JwtTokenExpired → JWT_TOKEN_EXPIRED (insert _ before each uppercase letter after stripping Jwt)
    const suffix = error.name
      .replace('Jwt', '')
      .replace(/([A-Z])/g, '_$1')
      .toUpperCase();
    return `JWT${suffix}`;
  }
  if (error.name === 'ZodError') return 'VALIDATION_ERROR';
  if (error.message?.includes('fetch')) return 'NETWORK_ERROR';

  if (isTimeoutError(error)) return 'TIMEOUT_ERROR';

  const codeStr = CODE_TO_ERROR_CODE[(error as any).code];
  if (codeStr) return codeStr;

  if (error.name === 'RangeError' && error.message?.includes('Maximum call stack')) return 'STACK_OVERFLOW';
  if (error.message?.includes('out of memory') || (error as any).code === 'ERR_MEMORY_ALLOCATION_FAILED') {
    return 'OUT_OF_MEMORY';
  }

  if (error instanceof SyntaxError && error.message?.includes('JSON')) return 'JSON_PARSE_ERROR';
  if (error.name === 'SerializationError') return 'SERIALIZATION_ERROR';

  if (BUSINESS_ERROR_NAMES.has(error.name)) return (error as any).code ?? 'BUSINESS_LOGIC_ERROR';

  const stdCodes: Record<string, string> = {
    TypeError: 'TYPE_ERROR',
    ReferenceError: 'REFERENCE_ERROR',
    SyntaxError: 'SYNTAX_ERROR',
  };
  return stdCodes[error.name] ?? 'INTERNAL_SERVER_ERROR';
}
