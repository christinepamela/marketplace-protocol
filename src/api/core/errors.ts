/**
 * Error Handling System
 * 
 * Defines standard error types and response formats
 * Provides consistent error codes across all API endpoints
 */

// Standard error codes
export enum ErrorCode {
  // Authentication & Authorization
  UNAUTHORIZED = 'UNAUTHORIZED',
  INVALID_TOKEN = 'INVALID_TOKEN',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  INVALID_API_KEY = 'INVALID_API_KEY',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  
  // Validation
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',
  
  // Resources
  NOT_FOUND = 'NOT_FOUND',
  ALREADY_EXISTS = 'ALREADY_EXISTS',
  CONFLICT = 'CONFLICT',
  
  // Business Logic
  INVALID_STATUS = 'INVALID_STATUS',
  INSUFFICIENT_BALANCE = 'INSUFFICIENT_BALANCE',
  ESCROW_ALREADY_RELEASED = 'ESCROW_ALREADY_RELEASED',
  ORDER_NOT_PAID = 'ORDER_NOT_PAID',
  DISPUTE_ALREADY_EXISTS = 'DISPUTE_ALREADY_EXISTS',
  
  // Rate Limiting
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  
  // External Services
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  BLOCKCHAIN_ERROR = 'BLOCKCHAIN_ERROR',
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
  
  // Server
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
}

// HTTP status code mapping
export const ERROR_STATUS_MAP: Record<ErrorCode, number> = {
  // 401 Unauthorized
  [ErrorCode.UNAUTHORIZED]: 401,
  [ErrorCode.INVALID_TOKEN]: 401,
  [ErrorCode.TOKEN_EXPIRED]: 401,
  [ErrorCode.INVALID_API_KEY]: 401,
  
  // 403 Forbidden
  [ErrorCode.INSUFFICIENT_PERMISSIONS]: 403,
  
  // 400 Bad Request
  [ErrorCode.VALIDATION_ERROR]: 400,
  [ErrorCode.INVALID_INPUT]: 400,
  [ErrorCode.MISSING_REQUIRED_FIELD]: 400,
  [ErrorCode.INVALID_STATUS]: 400,
  [ErrorCode.INSUFFICIENT_BALANCE]: 400,
  [ErrorCode.ESCROW_ALREADY_RELEASED]: 400,
  [ErrorCode.ORDER_NOT_PAID]: 400,
  
  // 404 Not Found
  [ErrorCode.NOT_FOUND]: 404,
  
  // 409 Conflict
  [ErrorCode.ALREADY_EXISTS]: 409,
  [ErrorCode.CONFLICT]: 409,
  [ErrorCode.DISPUTE_ALREADY_EXISTS]: 409,
  
  // 429 Too Many Requests
  [ErrorCode.RATE_LIMIT_EXCEEDED]: 429,
  
  // 502 Bad Gateway
  [ErrorCode.PAYMENT_FAILED]: 502,
  [ErrorCode.BLOCKCHAIN_ERROR]: 502,
  [ErrorCode.EXTERNAL_SERVICE_ERROR]: 502,
  
  // 500 Internal Server Error
  [ErrorCode.INTERNAL_ERROR]: 500,
  [ErrorCode.DATABASE_ERROR]: 500,
  
  // 503 Service Unavailable
  [ErrorCode.SERVICE_UNAVAILABLE]: 503,
};

// Error response format
export interface ErrorResponse {
  error: {
    code: ErrorCode;
    message: string;
    details?: Record<string, any>;
    timestamp?: string;
    requestId?: string;
  };
}

// Base API Error class
export class ApiError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly details?: Record<string, any>;
  public readonly isOperational: boolean;
  
  constructor(
    code: ErrorCode,
    message: string,
    details?: Record<string, any>,
    isOperational = true
  ) {
    super(message);
    
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = ERROR_STATUS_MAP[code] || 500;
    this.details = details;
    this.isOperational = isOperational;
    
    Error.captureStackTrace(this, this.constructor);
  }
  
  toJSON(): ErrorResponse {
    return {
      error: {
        code: this.code,
        message: this.message,
        details: this.details,
        timestamp: new Date().toISOString(),
      }
    };
  }
}

// Specific error classes for common cases
export class UnauthorizedError extends ApiError {
  constructor(message = 'Authentication required', details?: Record<string, any>) {
    super(ErrorCode.UNAUTHORIZED, message, details);
  }
}

export class ValidationError extends ApiError {
  constructor(message: string, details?: Record<string, any>) {
    super(ErrorCode.VALIDATION_ERROR, message, details);
  }
}

export class NotFoundError extends ApiError {
  constructor(resource: string, id?: string) {
    const message = id 
      ? `${resource} with ID '${id}' not found`
      : `${resource} not found`;
    super(ErrorCode.NOT_FOUND, message, { resource, id });
  }
}

export class ConflictError extends ApiError {
  constructor(message: string, details?: Record<string, any>) {
    super(ErrorCode.CONFLICT, message, details);
  }
}

export class RateLimitError extends ApiError {
  constructor(retryAfter?: number) {
    super(
      ErrorCode.RATE_LIMIT_EXCEEDED,
      'Rate limit exceeded. Please try again later.',
      { retryAfter }
    );
  }
}

export class InternalError extends ApiError {
  constructor(message = 'An internal error occurred', details?: Record<string, any>) {
    super(ErrorCode.INTERNAL_ERROR, message, details, false);
  }
}

// Helper function to check if error is operational
export function isOperationalError(error: Error): boolean {
  if (error instanceof ApiError) {
    return error.isOperational;
  }
  return false;
}

// Helper to convert unknown errors to ApiError
export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) {
    return error;
  }
  
  if (error instanceof Error) {
    return new InternalError(error.message, { originalError: error.name });
  }
  
  return new InternalError('An unknown error occurred');
}