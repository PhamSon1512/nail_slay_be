import type { iContext, iLogData, iOperation } from '../@types';
import type { BaseError } from '../@types/error';
import { getErrorCode, getStatusCode } from './errorClassifier';
import { isOperationalError } from './errors';

export class Logger {
  /**
   * Base logging method — single point for all log output.
   */
  private static log(
    level: 'info' | 'warn' | 'error' | 'debug',
    message: string,
    additionalData: Partial<iLogData> = {},
    c?: iContext,
  ): void {
    const baseLogData: iLogData = {
      timestamp: new Date().toISOString(),
      user: c ? this.getUserInfo(c) : null,
      headers: c ? this.getFilteredHeaders(c) : null,
      ...additionalData,
    };

    console[level](message, baseLogData);
  }

  /** Log informational messages with optional request context. */
  static info(message: string, data?: unknown, c?: iContext): void {
    this.log('info', `ℹ️ ${message}`, { data }, c);
  }

  /** Log debug messages — only emitted outside production. */
  static debug(data: unknown, c?: iContext): void {
    if (c?.env?.ENVIRONMENT !== 'production') {
      this.log('debug', '🐛 DEBUG', { data }, c);
    }
  }

  /** Log warning messages with optional request context. */
  static warn(message: string, data?: unknown, c?: iContext): void {
    this.log('warn', message, { data }, c);
  }

  /** Log an error with full contextual information. */
  static error(error: BaseError, c?: iContext): void {
    const message = `🚨 ${error.name}: ${error.message}`;

    this.log(
      'error',
      message,
      {
        error: {
          name: error.name,
          message: error.message || 'An unexpected error occurred',
          stack: error.stack,
          code: getErrorCode(error),
          statusCode: getStatusCode(error),
          cause: error?.cause,
          context: error?.context,
          isOperational: isOperationalError(error),
        },
      },
      c,
    );
  }

  /** Log a CRUD operation with structured metadata. */
  static logCrudOperation(
    operation: iOperation,
    modelName: string,
    data: {
      recordId?: string;
      recordIds?: string[];
      affectedCount?: number;
      payload?: any;
      filters?: any;
    },
    c?: iContext,
  ): void {
    const userEmail = c?.var?.jwtPayload?.email || 'unknown';
    const message = `ℹ️ ${operation} operation on "${modelName}" by ${userEmail}`;
    this.log('info', message, { operation, model: modelName, data }, c);
  }

  /** Log performance metrics for an operation. */
  static logPerformance(
    operation: iOperation,
    modelName: string,
    metrics: {
      executionTime: number;
      startTime?: number;
      endTime?: number;
      memoryUsage?: number;
      queryCount?: number;
      cacheHits?: number;
      cacheMisses?: number;
      resourceType?: string;
      resourceId?: string;
      additionalMetrics?: Record<string, any>;
    },
    c?: iContext,
  ): void {
    const emoji = metrics.executionTime > 5000 ? '🐌' : metrics.executionTime > 1000 ? '⚠️' : '✅';
    const userEmail = c?.var?.jwtPayload?.email || 'unknown';
    const message = `${emoji} ${operation} operation on "${modelName}" completed in ${metrics.executionTime}ms by ${userEmail}`;

    const cacheHitRate =
      metrics.cacheHits && metrics.cacheMisses
        ? `${((metrics.cacheHits / (metrics.cacheHits + metrics.cacheMisses)) * 100).toFixed(2)}%`
        : undefined;

    this.log(
      'info',
      message,
      {
        operation,
        model: modelName,
        metrics: {
          executionTime: `${metrics.executionTime}ms`,
          startTime: metrics.startTime ? new Date(metrics.startTime).toISOString() : undefined,
          endTime: metrics.endTime ? new Date(metrics.endTime).toISOString() : undefined,
          memoryUsage: metrics.memoryUsage ? `${(metrics.memoryUsage / 1024 / 1024).toFixed(2)}MB` : undefined,
          queryCount: metrics.queryCount,
          cacheHits: metrics.cacheHits,
          cacheMisses: metrics.cacheMisses,
          cacheHitRate,
          resourceType: metrics.resourceType || modelName,
          resourceId: metrics.resourceId,
          isSlowOperation: metrics.executionTime > 1000,
          isCriticalOperation: metrics.executionTime > 5000,
          performanceGrade: getPerformanceGrade(metrics.executionTime),
          additionalMetrics: metrics.additionalMetrics,
        },
      },
      c,
    );
  }

  /** Filter request headers to exclude cookies before logging. */
  static getFilteredHeaders(c: iContext) {
    return Object.fromEntries(Array.from(c.req.raw.headers.entries()).filter(([key]) => key.toLowerCase() !== 'cookie'));
  }

  /** Extract minimal user info from JWT payload for log context. */
  static getUserInfo(c: iContext) {
    const jwtPayload = c.var.jwtPayload;
    return jwtPayload ? { id: jwtPayload.id, email: jwtPayload.email, roles: jwtPayload.roles } : null;
  }

  /**
   * Delegate to errorClassifier — kept for backward compatibility with callers
   * that reference Logger.getStatusCode / Logger.getErrorCode directly.
   */
  static getStatusCode = getStatusCode;
  static getErrorCode = getErrorCode;
}

// ─── Private helpers ──────────────────────────────────────────────────────────

/** Map execution time (ms) to a letter grade. */
function getPerformanceGrade(executionTime: number): string {
  if (executionTime < 100) return 'A';
  if (executionTime < 500) return 'B';
  if (executionTime < 1000) return 'C';
  if (executionTime < 5000) return 'D';
  return 'F';
}
