/**
 * SDK Error Classes
 * Maps API errors to SDK-specific errors with helpful messages
 */

export class RangkaiSDKError extends Error {
  public readonly code: string;
  public readonly statusCode?: number;
  public readonly details?: any;

  constructor(message: string, code: string, statusCode?: number, details?: any) {
    super(message);
    this.name = 'RangkaiSDKError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;

    // Maintains proper stack trace
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      details: this.details,
    };
  }
}

/**
 * Network or request failed
 */
export class RangkaiNetworkError extends RangkaiSDKError {
  constructor(message: string, details?: any) {
    super(message, 'NETWORK_ERROR', undefined, details);
    this.name = 'RangkaiNetworkError';
  }
}

/**
 * Authentication failed (401)
 */
export class RangkaiAuthError extends RangkaiSDKError {
  constructor(message: string, details?: any) {
    super(message, 'AUTH_ERROR', 401, details);
    this.name = 'RangkaiAuthError';
  }
}

/**
 * Permission denied (403)
 */
export class RangkaiForbiddenError extends RangkaiSDKError {
  constructor(message: string, details?: any) {
    super(message, 'FORBIDDEN', 403, details);
    this.name = 'RangkaiForbiddenError';
  }
}

/**
 * Resource not found (404)
 */
export class RangkaiNotFoundError extends RangkaiSDKError {
  constructor(resource: string, id?: string) {
    const message = id
      ? `${resource} with ID '${id}' not found`
      : `${resource} not found`;
    super(message, 'NOT_FOUND', 404, { resource, id });
    this.name = 'RangkaiNotFoundError';
  }
}

/**
 * Validation error (400)
 */
export class RangkaiValidationError extends RangkaiSDKError {
  constructor(message: string, details?: any) {
    super(message, 'VALIDATION_ERROR', 400, details);
    this.name = 'RangkaiValidationError';
  }
}

/**
 * Rate limit exceeded (429)
 */
export class RangkaiRateLimitError extends RangkaiSDKError {
  public readonly retryAfter?: number;

  constructor(retryAfter?: number) {
    super(
      'Rate limit exceeded. Please try again later.',
      'RATE_LIMIT_EXCEEDED',
      429,
      { retryAfter }
    );
    this.name = 'RangkaiRateLimitError';
    this.retryAfter = retryAfter;
  }
}

/**
 * Server error (500+)
 */
export class RangkaiServerError extends RangkaiSDKError {
  constructor(message: string, statusCode: number, details?: any) {
    super(message, 'SERVER_ERROR', statusCode, details);
    this.name = 'RangkaiServerError';
  }
}

/**
 * Map API error response to SDK error
 */
export function mapApiError(error: any): RangkaiSDKError {
  // Network error (no response)
  if (!error.response) {
    return new RangkaiNetworkError(
      error.message || 'Network request failed',
      { originalError: error.message }
    );
  }

  const { status, data } = error.response;
  const errorData = data?.error || {};
  const message = errorData.message || error.message || 'An error occurred';
  const code = errorData.code || 'UNKNOWN_ERROR';

  // Map by status code
  switch (status) {
    case 401:
      return new RangkaiAuthError(message, errorData.details);
    case 403:
      return new RangkaiForbiddenError(message, errorData.details);
    case 404:
      return new RangkaiNotFoundError(
        errorData.details?.resource || 'Resource',
        errorData.details?.id
      );
    case 400:
      return new RangkaiValidationError(message, errorData.details);
    case 429:
      return new RangkaiRateLimitError(errorData.details?.retryAfter);
    case 500:
    case 502:
    case 503:
    case 504:
      return new RangkaiServerError(message, status, errorData.details);
    default:
      return new RangkaiSDKError(message, code, status, errorData.details);
  }
}