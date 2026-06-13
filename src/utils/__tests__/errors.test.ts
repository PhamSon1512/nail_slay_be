import { describe, expect, it } from 'vitest';
import {
  AppError,
  AuthenticationError,
  AuthorizationError,
  ConflictError,
  DatabaseError,
  ExternalServiceError,
  FileSystemError,
  isOperationalError,
  NotFoundError,
  RateLimitError,
  ResourceError,
  SerializationError,
  throwError,
  TimeoutError,
  ValidationError,
} from '../errors';

// ─── AppError ─────────────────────────────────────────────────────────────────

describe('AppError', () => {
  it('constructs with string overload and correct defaults', () => {
    const err = new AppError('something went wrong', 400, 'BAD_REQUEST');
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(AppError);
    expect(err.message).toBe('something went wrong');
    expect(err.statusCode).toBe(400);
    expect(err.code).toBe('BAD_REQUEST');
    expect(err.isOperational).toBe(true);
    expect(err.timestamp).toBeInstanceOf(Date);
    expect(err.name).toBe('AppError');
  });

  it('constructs with options object overload', () => {
    const err = new AppError({
      message: 'options overload',
      statusCode: 422,
      code: 'VALIDATION_ERROR',
      isOperational: false,
      context: { field: 'email' },
      category: 'validation',
      severity: 'high',
    });
    expect(err.message).toBe('options overload');
    expect(err.statusCode).toBe(422);
    expect(err.isOperational).toBe(false);
    expect(err.context).toEqual({ field: 'email' });
    expect(err.category).toBe('validation');
    expect(err.severity).toBe('high');
  });

  it('falls back to APP_ERROR_500 code when code is omitted', () => {
    const err = new AppError('no code');
    expect(err.code).toBe('APP_ERROR_500');
    expect(err.statusCode).toBe(500);
  });

  it('timestamp is set at construction time', () => {
    const before = Date.now();
    const err = new AppError('ts test');
    const after = Date.now();
    expect(err.timestamp.getTime()).toBeGreaterThanOrEqual(before);
    expect(err.timestamp.getTime()).toBeLessThanOrEqual(after);
  });
});

// ─── Derived error classes ────────────────────────────────────────────────────

describe('DatabaseError', () => {
  it('uses statusCode 500 and default code DATABASE_ERROR', () => {
    const err = new DatabaseError('db failed');
    expect(err.statusCode).toBe(500);
    expect(err.code).toBe('DATABASE_ERROR');
    expect(err).toBeInstanceOf(AppError);
  });
});

describe('ValidationError', () => {
  it('uses statusCode 400 and default code VALIDATION_ERROR', () => {
    const err = new ValidationError('bad input');
    expect(err.statusCode).toBe(400);
    expect(err.code).toBe('VALIDATION_ERROR');
  });
});

describe('AuthenticationError', () => {
  it('uses statusCode 401 and default code AUTHENTICATION_ERROR', () => {
    const err = new AuthenticationError('not logged in');
    expect(err.statusCode).toBe(401);
    expect(err.code).toBe('AUTHENTICATION_ERROR');
  });
});

describe('AuthorizationError', () => {
  it('uses statusCode 403 and default code AUTHORIZATION_ERROR', () => {
    const err = new AuthorizationError('no permission');
    expect(err.statusCode).toBe(403);
    expect(err.code).toBe('AUTHORIZATION_ERROR');
  });
});

describe('NotFoundError', () => {
  it('uses statusCode 404 and default code RESOURCE_NOT_FOUND', () => {
    const err = new NotFoundError('not found');
    expect(err.statusCode).toBe(404);
    expect(err.code).toBe('RESOURCE_NOT_FOUND');
  });
});

describe('ConflictError', () => {
  it('uses statusCode 409 and default code RESOURCE_CONFLICT', () => {
    const err = new ConflictError('already exists');
    expect(err.statusCode).toBe(409);
    expect(err.code).toBe('RESOURCE_CONFLICT');
  });
});

describe('RateLimitError', () => {
  it('uses statusCode 429, default message, and default code RATE_LIMIT_EXCEEDED', () => {
    const err = new RateLimitError();
    expect(err.statusCode).toBe(429);
    expect(err.message).toBe('Too many requests');
    expect(err.code).toBe('RATE_LIMIT_EXCEEDED');
  });
});

describe('ExternalServiceError', () => {
  it('uses statusCode 502 and default code EXTERNAL_SERVICE_ERROR', () => {
    const err = new ExternalServiceError('stripe is down');
    expect(err.statusCode).toBe(502);
    expect(err.code).toBe('EXTERNAL_SERVICE_ERROR');
  });
});

// ─── throwError helpers ───────────────────────────────────────────────────────

describe('throwError', () => {
  describe('badRequest', () => {
    it('throws ValidationError with code BAD_REQUEST', () => {
      expect(() => throwError.badRequest('invalid email', { email: 'x' })).toThrow(ValidationError);
      try {
        throwError.badRequest('invalid email');
      } catch (e: any) {
        expect(e.code).toBe('BAD_REQUEST');
        expect(e.statusCode).toBe(400);
      }
    });
  });

  describe('unauthorized', () => {
    it('throws AuthenticationError with code UNAUTHORIZED', () => {
      expect(() => throwError.unauthorized()).toThrow(AuthenticationError);
      try {
        throwError.unauthorized('no token');
      } catch (e: any) {
        expect(e.code).toBe('UNAUTHORIZED');
        expect(e.statusCode).toBe(401);
        expect(e.message).toBe('no token');
      }
    });

    it('uses default message when called with no args', () => {
      try {
        throwError.unauthorized();
      } catch (e: any) {
        expect(e.message).toBe('Unauthorized access');
      }
    });
  });

  describe('forbidden', () => {
    it('throws AuthorizationError with code FORBIDDEN', () => {
      expect(() => throwError.forbidden()).toThrow(AuthorizationError);
      try {
        throwError.forbidden();
      } catch (e: any) {
        expect(e.code).toBe('FORBIDDEN');
        expect(e.statusCode).toBe(403);
      }
    });
  });

  describe('notFound', () => {
    it('throws NotFoundError with code NOT_FOUND', () => {
      expect(() => throwError.notFound('User')).toThrow(NotFoundError);
      try {
        throwError.notFound('User', { id: '123' });
      } catch (e: any) {
        expect(e.code).toBe('NOT_FOUND');
        expect(e.statusCode).toBe(404);
        expect(e.context).toEqual({ id: '123' });
      }
    });
  });

  describe('conflict', () => {
    it('throws ConflictError with code CONFLICT', () => {
      expect(() => throwError.conflict('already exists')).toThrow(ConflictError);
      try {
        throwError.conflict('already exists');
      } catch (e: any) {
        expect(e.code).toBe('CONFLICT');
        expect(e.statusCode).toBe(409);
      }
    });
  });

  describe('internal', () => {
    it('throws AppError with statusCode 500 and code INTERNAL_SERVER_ERROR', () => {
      expect(() => throwError.internal()).toThrow(AppError);
      try {
        throwError.internal();
      } catch (e: any) {
        expect(e.code).toBe('INTERNAL_SERVER_ERROR');
        expect(e.statusCode).toBe(500);
        expect(e.isOperational).toBe(false);
      }
    });
  });

  describe('rateLimit', () => {
    it('throws RateLimitError with code RATE_LIMIT_EXCEEDED', () => {
      expect(() => throwError.rateLimit()).toThrow(RateLimitError);
    });
  });

  describe('externalService', () => {
    it('throws ExternalServiceError with service in context', () => {
      expect(() => throwError.externalService('stripe')).toThrow(ExternalServiceError);
      try {
        throwError.externalService('stripe', 'payment failed', { txId: 'abc' });
      } catch (e: any) {
        expect(e.statusCode).toBe(502);
        expect(e.context?.service).toBe('stripe');
        expect(e.context?.txId).toBe('abc');
      }
    });
  });
});

// ─── isOperationalError ───────────────────────────────────────────────────────

describe('isOperationalError', () => {
  it('returns true for operational AppError subclass', () => {
    const err = new ValidationError('oops');
    expect(isOperationalError(err)).toBe(true);
  });

  it('returns false for non-operational AppError', () => {
    const err = new AppError('crash', 500, 'INTERNAL_SERVER_ERROR', false);
    expect(isOperationalError(err)).toBe(false);
  });

  it('returns false for plain Error', () => {
    expect(isOperationalError(new Error('plain'))).toBe(false);
  });

  it('returns false for null/undefined', () => {
    expect(isOperationalError(null)).toBe(false);
    expect(isOperationalError(undefined)).toBe(false);
  });
});

// ─── Additional error classes ─────────────────────────────────────────────────

describe('TimeoutError', () => {
  it('uses statusCode 408, default message, and code TIMEOUT_ERROR', () => {
    const err = new TimeoutError();
    expect(err.statusCode).toBe(408);
    expect(err.message).toBe('Operation timed out');
    expect(err.code).toBe('TIMEOUT_ERROR');
    expect(err).toBeInstanceOf(AppError);
  });

  it('accepts custom message', () => {
    const err = new TimeoutError('DB query timed out');
    expect(err.message).toBe('DB query timed out');
  });
});

describe('FileSystemError', () => {
  it('uses statusCode 500 and code FILE_SYSTEM_ERROR', () => {
    const err = new FileSystemError('disk full');
    expect(err.statusCode).toBe(500);
    expect(err.code).toBe('FILE_SYSTEM_ERROR');
    expect(err).toBeInstanceOf(AppError);
  });
});

describe('ResourceError', () => {
  it('uses statusCode 507, default message, and code RESOURCE_ERROR', () => {
    const err = new ResourceError();
    expect(err.statusCode).toBe(507);
    expect(err.message).toBe('Resource exhausted');
    expect(err.code).toBe('RESOURCE_ERROR');
  });

  it('accepts custom message', () => {
    const err = new ResourceError('memory exhausted');
    expect(err.message).toBe('memory exhausted');
  });
});

describe('SerializationError', () => {
  it('uses statusCode 400, default message, and code SERIALIZATION_ERROR', () => {
    const err = new SerializationError();
    expect(err.statusCode).toBe(400);
    expect(err.message).toBe('Serialization failed');
    expect(err.code).toBe('SERIALIZATION_ERROR');
  });

  it('accepts custom message', () => {
    const err = new SerializationError('JSON parse failed');
    expect(err.message).toBe('JSON parse failed');
  });
});

// ─── Additional throwError helpers ───────────────────────────────────────────

describe('throwError.validation', () => {
  it('throws ValidationError with code VALIDATION_FAILED', () => {
    expect(() => throwError.validation('invalid payload')).toThrow(ValidationError);
    try {
      throwError.validation('invalid payload', { field: 'email' });
    } catch (e: any) {
      expect(e.code).toBe('VALIDATION_FAILED');
      expect(e.statusCode).toBe(400);
      expect(e.context).toEqual({ field: 'email' });
    }
  });
});

describe('throwError.database', () => {
  it('throws DatabaseError with code DATABASE_OPERATION_FAILED', () => {
    expect(() => throwError.database('query failed')).toThrow(DatabaseError);
    try {
      throwError.database('query failed');
    } catch (e: any) {
      expect(e.code).toBe('DATABASE_OPERATION_FAILED');
      expect(e.statusCode).toBe(500);
    }
  });
});

describe('throwError.timeout', () => {
  it('throws TimeoutError with code TIMEOUT_ERROR', () => {
    expect(() => throwError.timeout('Upload')).toThrow(TimeoutError);
    try {
      throwError.timeout();
    } catch (e: any) {
      expect(e.code).toBe('TIMEOUT_ERROR');
      expect(e.statusCode).toBe(408);
      expect(e.message).toContain('timed out');
    }
  });

  it('includes operation name in message', () => {
    try {
      throwError.timeout('DBQuery');
    } catch (e: any) {
      expect(e.message).toBe('DBQuery timed out');
    }
  });
});

describe('throwError.fileSystem', () => {
  it('throws FileSystemError with code FILE_SYSTEM_ERROR', () => {
    expect(() => throwError.fileSystem('write', 'permission denied')).toThrow(FileSystemError);
    try {
      throwError.fileSystem('read', 'not found', { path: '/tmp/test' });
    } catch (e: any) {
      expect(e.code).toBe('FILE_SYSTEM_ERROR');
      expect(e.statusCode).toBe(500);
      expect(e.message).toContain('read');
    }
  });
});

describe('throwError.resource', () => {
  it('throws ResourceError with code RESOURCE_EXHAUSTED', () => {
    expect(() => throwError.resource('memory')).toThrow(ResourceError);
    try {
      throwError.resource();
    } catch (e: any) {
      expect(e.code).toBe('RESOURCE_EXHAUSTED');
      expect(e.statusCode).toBe(507);
    }
  });

  it('includes resource name in message', () => {
    try {
      throwError.resource('CPU');
    } catch (e: any) {
      expect(e.message).toBe('CPU exhausted');
    }
  });
});

describe('throwError.serialization', () => {
  it('throws SerializationError with code SERIALIZATION_ERROR', () => {
    expect(() => throwError.serialization()).toThrow(SerializationError);
    try {
      throwError.serialization('JSON parse', { input: 'bad json' });
    } catch (e: any) {
      expect(e.code).toBe('SERIALIZATION_ERROR');
      expect(e.statusCode).toBe(400);
      expect(e.message).toContain('JSON parse');
    }
  });
});
