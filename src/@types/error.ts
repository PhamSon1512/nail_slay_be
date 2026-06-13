import type { ContentfulStatusCode } from 'hono/utils/http-status';

/**
 * Error severity levels for categorizing error importance
 */
export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

/**
 * Error categories for better error classification
 */
export type ErrorCategory =
  | 'validation'
  | 'authentication'
  | 'authorization'
  | 'database'
  | 'external_service'
  | 'business_logic'
  | 'system'
  | 'network'
  | 'timeout'
  | 'rate_limit'
  | 'file_system'
  | 'serialization'
  | 'resource'
  | 'payment'
  | 'inventory'
  | 'order'
  | 'shipping';

/**
 * Standard error codes used throughout the application
 */
export type ErrorCode =
  | 'APP_ERROR_400'
  | 'APP_ERROR_401'
  | 'APP_ERROR_403'
  | 'APP_ERROR_404'
  | 'APP_ERROR_409'
  | 'APP_ERROR_429'
  | 'APP_ERROR_500'
  | 'VALIDATION_ERROR'
  | 'AUTHENTICATION_ERROR'
  | 'AUTHORIZATION_ERROR'
  | 'RESOURCE_NOT_FOUND'
  | 'RESOURCE_CONFLICT'
  | 'RATE_LIMIT_EXCEEDED'
  | 'DATABASE_ERROR'
  | 'EXTERNAL_SERVICE_ERROR'
  | 'TIMEOUT_ERROR'
  | 'FILE_SYSTEM_ERROR'
  | 'RESOURCE_ERROR'
  | 'SERIALIZATION_ERROR'
  | 'BUSINESS_LOGIC_ERROR'
  | 'INVENTORY_ERROR'
  | 'PAYMENT_ERROR'
  | 'ORDER_ERROR'
  | 'SHIPPING_ERROR'
  // Additional error codes for throwError utility
  | 'BAD_REQUEST'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'VALIDATION_FAILED'
  | 'DATABASE_OPERATION_FAILED'
  | 'INTERNAL_SERVER_ERROR'
  | 'RESOURCE_EXHAUSTED'
  | 'INSUFFICIENT_FUNDS'
  | 'EXPIRED_TOKEN'
  | 'INVENTORY_SHORTAGE'
  | 'ORDER_ALREADY_FULFILLED'
  | 'PAYMENT_DECLINED'
  | 'SHIPPING_UNAVAILABLE'
  | 'PRODUCT_OUT_OF_STOCK'
  | 'INVALID_COUPON'
  | 'ORDER_CANCELLED'
  | 'SUBSCRIPTION_EXPIRED';

/**
 * Error context interface for providing additional error information
 */
export interface ErrorContext {
  [key: string]: any;
  userId?: string;
  shopId?: string;
  requestId?: string;
  endpoint?: string;
  method?: string;
  userAgent?: string;
  ip?: string;
  timestamp?: string;
  stackTrace?: string;
  additionalInfo?: Record<string, any>;
}

/**
 * Base error interface that all error types should implement
 */
export interface BaseError extends Error {
  name: string;
  message: string;
  code: ErrorCode;
  statusCode: ContentfulStatusCode;
  isOperational: boolean;
  context?: ErrorContext;
  timestamp: Date;
  stack?: string;
}

/**
 * Validation error context for input validation errors
 */
export interface ValidationErrorContext extends ErrorContext {
  field?: string;
  value?: any;
  constraint?: string;
  validationRule?: string;
  allowedValues?: any[];
}

/**
 * Database error context for database-related errors
 */
export interface DatabaseErrorContext extends ErrorContext {
  query?: string;
  table?: string;
  operation?: 'select' | 'insert' | 'update' | 'delete' | 'transaction';
  constraint?: string;
  sqlState?: string;
}

/**
 * External service error context for third-party service errors
 */
export interface ExternalServiceErrorContext extends ErrorContext {
  service: string;
  endpoint?: string;
  responseStatus?: number;
  responseBody?: any;
  requestPayload?: any;
  retryAttempt?: number;
  maxRetries?: number;
}

/**
 * AppError constructor options interface
 */
export interface AppErrorOptions {
  message: string;
  statusCode?: ContentfulStatusCode;
  code?: ErrorCode;
  isOperational?: boolean;
  context?: ErrorContext;
  category?: ErrorCategory;
  severity?: ErrorSeverity;
}

/**
 * Error response interface for API responses
 */
export interface ErrorResponse {
  success: false;
  error: {
    code: ErrorCode;
    message: string;
    statusCode: ContentfulStatusCode;
    timestamp: string;
    requestId?: string;
    context?: ErrorContext;
  };
}

/**
 * Error handler function type
 */
export type ErrorHandler = (error: BaseError, context?: ErrorContext) => void;

/**
 * Error logger function type
 */
export type ErrorLogger = (error: BaseError, level?: 'error' | 'warn' | 'info') => void;
