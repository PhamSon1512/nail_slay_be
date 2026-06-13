import type { ContentfulStatusCode } from 'hono/utils/http-status';
import type {
  AppErrorOptions,
  BaseError,
  DatabaseErrorContext,
  ErrorCategory,
  ErrorCode,
  ErrorContext,
  ErrorSeverity,
  ExternalServiceErrorContext,
  ValidationErrorContext,
} from '../@types/error';

/**
 * Enhanced error class with additional context information
 */
export class AppError extends Error implements BaseError {
  public readonly code: ErrorCode;
  public readonly statusCode: ContentfulStatusCode;
  public readonly isOperational: boolean;
  public readonly context?: ErrorContext;
  public readonly timestamp: Date;
  public readonly category?: ErrorCategory;
  public readonly severity?: ErrorSeverity;

  constructor(options: AppErrorOptions);
  constructor(
    message: string,
    statusCode?: ContentfulStatusCode,
    code?: ErrorCode,
    isOperational?: boolean,
    context?: ErrorContext,
  );
  constructor(
    optionsOrMessage: AppErrorOptions | string,
    statusCode: ContentfulStatusCode = 500,
    code?: ErrorCode,
    isOperational: boolean = true,
    context?: ErrorContext,
  ) {
    // Handle both constructor signatures
    let options: AppErrorOptions;
    if (typeof optionsOrMessage === 'string') {
      options = {
        message: optionsOrMessage,
        statusCode,
        code,
        isOperational,
        context,
      };
    } else {
      options = optionsOrMessage;
    }

    super(options.message);

    this.name = this.constructor.name;
    this.statusCode = options.statusCode || 500;
    this.code = options.code || (`APP_ERROR_${this.statusCode}` as ErrorCode);
    this.isOperational = options.isOperational ?? true;
    this.context = options.context;
    this.category = options.category;
    this.severity = options.severity;
    this.timestamp = new Date();

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if ((Error as any).captureStackTrace) {
      (Error as any).captureStackTrace(this, this.constructor);
    }
  }
}

/**
 * Database related errors
 */
export class DatabaseError extends AppError {
  constructor(message: string, code: ErrorCode = 'DATABASE_ERROR', context?: DatabaseErrorContext) {
    super(message, 500, code, true, context);
  }
}

/**
 * Validation related errors
 */
export class ValidationError extends AppError {
  constructor(message: string, code: ErrorCode = 'VALIDATION_ERROR', context?: ValidationErrorContext) {
    super(message, 400, code, true, context);
  }
}

/**
 * Authentication related errors
 */
export class AuthenticationError extends AppError {
  constructor(message: string, code: ErrorCode = 'AUTHENTICATION_ERROR', context?: ErrorContext) {
    super(message, 401, code, true, context);
  }
}

/**
 * Authorization related errors
 */
export class AuthorizationError extends AppError {
  constructor(message: string, code: ErrorCode = 'AUTHORIZATION_ERROR', context?: ErrorContext) {
    super(message, 403, code, true, context);
  }
}

/**
 * Resource not found errors
 */
export class NotFoundError extends AppError {
  constructor(message: string, code: ErrorCode = 'RESOURCE_NOT_FOUND', context?: ErrorContext) {
    super(message, 404, code, true, context);
  }
}

/**
 * Conflict errors (e.g., duplicate resources)
 */
export class ConflictError extends AppError {
  constructor(message: string, code: ErrorCode = 'RESOURCE_CONFLICT', context?: ErrorContext) {
    super(message, 409, code, true, context);
  }
}

/**
 * Rate limiting errors
 */
export class RateLimitError extends AppError {
  constructor(message: string = 'Too many requests', code: ErrorCode = 'RATE_LIMIT_EXCEEDED', context?: ErrorContext) {
    super(message, 429, code, true, context);
  }
}

/**
 * External service related errors
 */
export class ExternalServiceError extends AppError {
  constructor(message: string, code: ErrorCode = 'EXTERNAL_SERVICE_ERROR', context?: ExternalServiceErrorContext) {
    super(message, 502, code, true, context);
  }
}

/**
 * Timeout related errors
 */
export class TimeoutError extends AppError {
  constructor(message: string = 'Operation timed out', code: ErrorCode = 'TIMEOUT_ERROR', context?: ErrorContext) {
    super(message, 408, code, true, context);
  }
}

/**
 * File system related errors
 */
export class FileSystemError extends AppError {
  constructor(message: string, code: ErrorCode = 'FILE_SYSTEM_ERROR', context?: ErrorContext) {
    super(message, 500, code, true, context);
  }
}

/**
 * Memory/Resource exhaustion errors
 */
export class ResourceError extends AppError {
  constructor(message: string = 'Resource exhausted', code: ErrorCode = 'RESOURCE_ERROR', context?: ErrorContext) {
    super(message, 507, code, true, context);
  }
}

/**
 * JSON parsing and serialization errors
 */
export class SerializationError extends AppError {
  constructor(message: string = 'Serialization failed', code: ErrorCode = 'SERIALIZATION_ERROR', context?: ErrorContext) {
    super(message, 400, code, true, context);
  }
}

/**
 * Utility functions for throwing common errors
 */
export const throwError = {
  /**
   * Throw a bad request error
   */
  badRequest: (message: string, context?: Record<string, any>): never => {
    throw new ValidationError(message, 'BAD_REQUEST', context);
  },

  /**
   * Throw an unauthorized error
   */
  unauthorized: (message: string = 'Unauthorized access', context?: Record<string, any>): never => {
    throw new AuthenticationError(message, 'UNAUTHORIZED', context);
  },

  /**
   * Throw a forbidden error
   */
  forbidden: (message: string = 'Access forbidden', context?: Record<string, any>): never => {
    throw new AuthorizationError(message, 'FORBIDDEN', context);
  },

  /**
   * Throw a not found error
   */
  notFound: (message: string = 'Item not found', context?: Record<string, any>): never => {
    throw new NotFoundError(message, 'NOT_FOUND', context);
  },

  /**
   * Throw a conflict error
   */
  conflict: (message: string, context?: Record<string, any>): never => {
    throw new ConflictError(message, 'CONFLICT', context);
  },

  /**
   * Throw a validation error
   */
  validation: (message: string, context?: Record<string, any>): never => {
    throw new ValidationError(message, 'VALIDATION_FAILED', context);
  },

  /**
   * Throw a database error
   */
  database: (message: string, context?: Record<string, any>): never => {
    throw new DatabaseError(message, 'DATABASE_OPERATION_FAILED', context);
  },

  /**
   * Throw an internal server error
   */
  internal: (message: string = 'Internal server error', context?: Record<string, any>): never => {
    throw new AppError(message, 500, 'INTERNAL_SERVER_ERROR', false, context);
  },

  /**
   * Throw a rate limit error
   */
  rateLimit: (message?: string, context?: Record<string, any>): never => {
    throw new RateLimitError(message, 'RATE_LIMIT_EXCEEDED', context);
  },

  /**
   * Throw an external service error
   */
  externalService: (service: string, message?: string, context?: Record<string, any>): never => {
    const errorMessage = message || `External service ${service} is unavailable`;
    const errorContext: ExternalServiceErrorContext = {
      service,
      ...context,
    };
    throw new ExternalServiceError(errorMessage, 'EXTERNAL_SERVICE_ERROR', errorContext);
  },

  /**
   * Timeout error helper
   */
  timeout: (operation: string = 'Operation', context?: Record<string, any>): never => {
    throw new TimeoutError(`${operation} timed out`, 'TIMEOUT_ERROR', context);
  },

  /**
   * File system error helper
   */
  fileSystem: (operation: string, error: string, context?: Record<string, any>): never => {
    throw new FileSystemError(`File system error during ${operation}: ${error}`, 'FILE_SYSTEM_ERROR', context);
  },

  /**
   * Resource exhaustion error helper
   */
  resource: (resource: string = 'system resource', context?: Record<string, any>): never => {
    throw new ResourceError(`${resource} exhausted`, 'RESOURCE_EXHAUSTED', context);
  },

  /**
   * Serialization error helper
   */
  serialization: (operation: string = 'serialization', context?: Record<string, any>): never => {
    throw new SerializationError(`${operation} failed`, 'SERIALIZATION_ERROR', context);
  },
};

/**
 * Type guard to check if error is an operational error
 */
export const isOperationalError = (error: any): error is AppError => {
  return error instanceof AppError && error.isOperational;
};
