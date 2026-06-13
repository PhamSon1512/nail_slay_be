import { HTTPException } from 'hono/http-exception';
import { describe, expect, it } from 'vitest';
import { getErrorCode, getStatusCode } from '../errorClassifier';
import { AuthenticationError, AuthorizationError, NotFoundError, ValidationError } from '../errors';

// ─── getStatusCode ────────────────────────────────────────────────────────────

describe('getStatusCode', () => {
  describe('AppError subclasses', () => {
    it('returns 400 for ValidationError', () => {
      expect(getStatusCode(new ValidationError('bad'))).toBe(400);
    });

    it('returns 401 for AuthenticationError', () => {
      expect(getStatusCode(new AuthenticationError('no token'))).toBe(401);
    });

    it('returns 403 for AuthorizationError', () => {
      expect(getStatusCode(new AuthorizationError('forbidden'))).toBe(403);
    });

    it('returns 404 for NotFoundError', () => {
      expect(getStatusCode(new NotFoundError('missing'))).toBe(404);
    });
  });

  describe('HTTPException', () => {
    it('returns the status from HTTPException', () => {
      expect(getStatusCode(new HTTPException(422))).toBe(422);
    });
  });

  describe('DB constraint errors (via error.cause)', () => {
    it('returns 409 for UNIQUE constraint', () => {
      const err = Object.assign(new Error('fail'), { cause: 'UNIQUE constraint failed: users.email' });
      expect(getStatusCode(err)).toBe(409);
    });

    it('returns 400 for FOREIGN KEY constraint', () => {
      const err = Object.assign(new Error('fail'), { cause: 'FOREIGN KEY constraint failed' });
      expect(getStatusCode(err)).toBe(400);
    });

    it('returns 400 for NOT NULL constraint', () => {
      const err = Object.assign(new Error('fail'), { cause: 'NOT NULL constraint failed' });
      expect(getStatusCode(err)).toBe(400);
    });
  });

  describe('JWT errors', () => {
    it('returns 401 for JwtTokenExpired', () => {
      const err = Object.assign(new Error('expired'), { name: 'JwtTokenExpired' });
      expect(getStatusCode(err)).toBe(401);
    });

    it('returns 401 for JwtTokenInvalid', () => {
      const err = Object.assign(new Error('invalid'), { name: 'JwtTokenInvalid' });
      expect(getStatusCode(err)).toBe(401);
    });
  });

  describe('Zod validation', () => {
    it('returns 400 for ZodError', () => {
      const err = Object.assign(new Error('schema fail'), { name: 'ZodError' });
      expect(getStatusCode(err)).toBe(400);
    });
  });

  describe('Filesystem errors (via error.code)', () => {
    it('returns 503 for ENOTFOUND', () => {
      const err = Object.assign(new Error('dns fail'), { code: 'ENOTFOUND' });
      expect(getStatusCode(err)).toBe(503);
    });

    it('returns 503 for ECONNREFUSED', () => {
      const err = Object.assign(new Error('refused'), { code: 'ECONNREFUSED' });
      expect(getStatusCode(err)).toBe(503);
    });

    it('returns 403 for EACCES', () => {
      const err = Object.assign(new Error('perm'), { code: 'EACCES' });
      expect(getStatusCode(err)).toBe(403);
    });

    it('returns 404 for ENOENT', () => {
      const err = Object.assign(new Error('missing'), { code: 'ENOENT' });
      expect(getStatusCode(err)).toBe(404);
    });

    it('returns 507 for EMFILE', () => {
      const err = Object.assign(new Error('too many'), { code: 'EMFILE' });
      expect(getStatusCode(err)).toBe(507);
    });

    it('returns 507 for ENOSPC', () => {
      const err = Object.assign(new Error('no space'), { code: 'ENOSPC' });
      expect(getStatusCode(err)).toBe(507);
    });
  });

  describe('Timeout errors', () => {
    it('returns 408 for error.name === TimeoutError', () => {
      const err = Object.assign(new Error('timed out'), { name: 'TimeoutError' });
      expect(getStatusCode(err)).toBe(408);
    });

    it('returns 408 for error.code === TIMEOUT', () => {
      const err = Object.assign(new Error('timed out'), { code: 'TIMEOUT' });
      expect(getStatusCode(err)).toBe(408);
    });

    it('returns 408 when message includes "timeout"', () => {
      expect(getStatusCode(new Error('db connection timeout'))).toBe(408);
    });
  });

  describe('Memory / resource errors', () => {
    it('returns 507 for RangeError', () => {
      expect(getStatusCode(new RangeError('out of memory'))).toBe(507);
    });

    it('returns 507 when message contains "out of memory"', () => {
      expect(getStatusCode(new Error('out of memory'))).toBe(507);
    });
  });

  describe('Serialization errors', () => {
    it('returns 400 for SyntaxError with JSON message', () => {
      const err = new SyntaxError('Unexpected token in JSON');
      expect(getStatusCode(err)).toBe(400);
    });
  });

  describe('Business logic errors', () => {
    it('returns 422 when error.name is BusinessLogicError with no statusCode', () => {
      const err = Object.assign(new Error('bad logic'), { name: 'BusinessLogicError' });
      expect(getStatusCode(err)).toBe(422);
    });

    it('uses error.statusCode when provided', () => {
      const err = Object.assign(new Error('bad logic'), { name: 'PaymentError', statusCode: 402 });
      expect(getStatusCode(err)).toBe(402);
    });
  });

  describe('Default fallback', () => {
    it('returns 500 for plain unknown Error', () => {
      expect(getStatusCode(new Error('mystery'))).toBe(500);
    });

    it('returns 500 when error has no matching classifier', () => {
      expect(getStatusCode(new TypeError('type mismatch'))).toBe(500);
    });
  });
});

// ─── getErrorCode ─────────────────────────────────────────────────────────────

describe('getErrorCode', () => {
  describe('AppError subclasses', () => {
    it('returns VALIDATION_ERROR for ValidationError', () => {
      expect(getErrorCode(new ValidationError('bad'))).toBe('VALIDATION_ERROR');
    });

    it('returns AUTHENTICATION_ERROR for AuthenticationError', () => {
      expect(getErrorCode(new AuthenticationError('no token'))).toBe('AUTHENTICATION_ERROR');
    });
  });

  describe('HTTPException', () => {
    it('returns HTTP_403 for HTTPException(403)', () => {
      expect(getErrorCode(new HTTPException(403))).toBe('HTTP_403');
    });

    it('returns HTTP_500 for HTTPException(500)', () => {
      expect(getErrorCode(new HTTPException(500))).toBe('HTTP_500');
    });
  });

  describe('DB constraint errors', () => {
    it('returns DB_UNIQUE_CONSTRAINT for UNIQUE constraint', () => {
      const err = Object.assign(new Error('fail'), { cause: 'UNIQUE constraint failed: users.email' });
      expect(getErrorCode(err)).toBe('DB_UNIQUE_CONSTRAINT');
    });

    it('returns DB_FOREIGN_KEY_CONSTRAINT for FOREIGN KEY violation', () => {
      const err = Object.assign(new Error('fail'), { cause: 'FOREIGN KEY constraint failed' });
      expect(getErrorCode(err)).toBe('DB_FOREIGN_KEY_CONSTRAINT');
    });

    it('returns DB_NOT_NULL_CONSTRAINT for NOT NULL violation', () => {
      const err = Object.assign(new Error('fail'), { cause: 'NOT NULL constraint failed' });
      expect(getErrorCode(err)).toBe('DB_NOT_NULL_CONSTRAINT');
    });
  });

  describe('JWT errors', () => {
    it('returns JWT_TOKEN_EXPIRED for JwtTokenExpired', () => {
      const err = Object.assign(new Error('expired'), { name: 'JwtTokenExpired' });
      expect(getErrorCode(err)).toBe('JWT_TOKEN_EXPIRED');
    });

    it('returns JWT_TOKEN_INVALID for JwtTokenInvalid', () => {
      const err = Object.assign(new Error('invalid'), { name: 'JwtTokenInvalid' });
      expect(getErrorCode(err)).toBe('JWT_TOKEN_INVALID');
    });
  });

  describe('Zod / network', () => {
    it('returns VALIDATION_ERROR for ZodError', () => {
      const err = Object.assign(new Error('schema'), { name: 'ZodError' });
      expect(getErrorCode(err)).toBe('VALIDATION_ERROR');
    });

    it('returns NETWORK_ERROR when message contains "fetch"', () => {
      expect(getErrorCode(new Error('fetch failed'))).toBe('NETWORK_ERROR');
    });
  });

  describe('Timeout', () => {
    it('returns TIMEOUT_ERROR for TimeoutError name', () => {
      const err = Object.assign(new Error('x'), { name: 'TimeoutError' });
      expect(getErrorCode(err)).toBe('TIMEOUT_ERROR');
    });

    it('returns TIMEOUT_ERROR when message includes "timeout"', () => {
      expect(getErrorCode(new Error('db timeout'))).toBe('TIMEOUT_ERROR');
    });
  });

  describe('Filesystem codes', () => {
    it('returns FILE_PERMISSION_DENIED for EACCES', () => {
      const err = Object.assign(new Error('perm'), { code: 'EACCES' });
      expect(getErrorCode(err)).toBe('FILE_PERMISSION_DENIED');
    });

    it('returns FILE_NOT_FOUND for ENOENT', () => {
      const err = Object.assign(new Error('missing'), { code: 'ENOENT' });
      expect(getErrorCode(err)).toBe('FILE_NOT_FOUND');
    });

    it('returns TOO_MANY_FILES_OPEN for EMFILE', () => {
      const err = Object.assign(new Error('files'), { code: 'EMFILE' });
      expect(getErrorCode(err)).toBe('TOO_MANY_FILES_OPEN');
    });

    it('returns NO_SPACE_LEFT for ENOSPC', () => {
      const err = Object.assign(new Error('space'), { code: 'ENOSPC' });
      expect(getErrorCode(err)).toBe('NO_SPACE_LEFT');
    });
  });

  describe('Memory / resource errors', () => {
    it('returns STACK_OVERFLOW for RangeError with Maximum call stack message', () => {
      const err = new RangeError('Maximum call stack size exceeded');
      expect(getErrorCode(err)).toBe('STACK_OVERFLOW');
    });

    it('returns OUT_OF_MEMORY when message contains "out of memory"', () => {
      expect(getErrorCode(new Error('out of memory'))).toBe('OUT_OF_MEMORY');
    });

    it('returns OUT_OF_MEMORY for ERR_MEMORY_ALLOCATION_FAILED code', () => {
      const err = Object.assign(new Error('alloc'), { code: 'ERR_MEMORY_ALLOCATION_FAILED' });
      expect(getErrorCode(err)).toBe('OUT_OF_MEMORY');
    });
  });

  describe('Serialization', () => {
    it('returns JSON_PARSE_ERROR for SyntaxError with JSON message', () => {
      const err = new SyntaxError('Unexpected token in JSON');
      expect(getErrorCode(err)).toBe('JSON_PARSE_ERROR');
    });

    it('returns SERIALIZATION_ERROR for error.name === SerializationError', () => {
      const err = Object.assign(new Error('serial'), { name: 'SerializationError' });
      expect(getErrorCode(err)).toBe('SERIALIZATION_ERROR');
    });
  });

  describe('Business logic errors', () => {
    it('returns BUSINESS_LOGIC_ERROR when error.code is absent', () => {
      const err = Object.assign(new Error('bad logic'), { name: 'BusinessLogicError' });
      expect(getErrorCode(err)).toBe('BUSINESS_LOGIC_ERROR');
    });

    it('uses error.code when present', () => {
      const err = Object.assign(new Error('pay'), { name: 'PaymentError', code: 'PAYMENT_DECLINED' });
      expect(getErrorCode(err)).toBe('PAYMENT_DECLINED');
    });
  });

  describe('Standard JS error types', () => {
    it('returns TYPE_ERROR for TypeError', () => {
      expect(getErrorCode(new TypeError('bad type'))).toBe('TYPE_ERROR');
    });

    it('returns REFERENCE_ERROR for ReferenceError', () => {
      expect(getErrorCode(new ReferenceError('undefined var'))).toBe('REFERENCE_ERROR');
    });

    it('returns SYNTAX_ERROR for generic SyntaxError (non-JSON)', () => {
      // Non-JSON SyntaxError: message does not contain "JSON"
      const err = new SyntaxError('unexpected token');
      expect(getErrorCode(err)).toBe('SYNTAX_ERROR');
    });
  });

  describe('Default fallback', () => {
    it('returns INTERNAL_SERVER_ERROR for plain unknown Error', () => {
      expect(getErrorCode(new Error('mystery'))).toBe('INTERNAL_SERVER_ERROR');
    });
  });
});
