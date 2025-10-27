/**
 * Error Handling Middleware
 * 
 * Global error handler for Express
 * Formats all errors into consistent API responses
 */

import { Request, Response, NextFunction } from 'express';
import { config } from '../core/config';
import { ApiError, toApiError, isOperationalError } from '../core/errors';
import { sanitizeForLogging } from '../core/utils';

/**
 * Log error details (only in development/test)
 */
function logError(error: Error, req: Request): void {
  if (config.isDevelopment || config.isTest) {
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('❌ API Error');
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('Method:', req.method);
    console.error('Path:', req.path);
    console.error('Request ID:', req.requestId);
    console.error('Error:', error.message);
    
    if (error instanceof ApiError) {
      console.error('Code:', error.code);
      console.error('Details:', sanitizeForLogging(error.details));
    }
    
    console.error('Stack:', error.stack);
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  } else {
    // In production, log only essential info
    console.error(`[${req.requestId}] ${error.message}`);
  }
}

/**
 * Global error handler middleware
 */
export function errorHandler(
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Convert to ApiError if needed
  const apiError = error instanceof ApiError ? error : toApiError(error);
  
  // Log error
  logError(apiError, req);
  
  // Prepare response
  const response = apiError.toJSON();
  
  // Add request ID to response
  if (req.requestId) {
    response.error.requestId = req.requestId;
  }
  
  // In production, hide internal error details
  if (config.isProduction && !isOperationalError(apiError)) {
    response.error.message = 'An internal error occurred';
    delete response.error.details;
  }
  
  // Send response
  res.status(apiError.statusCode).json(response);
}

/**
 * 404 Not Found handler
 */
export function notFoundHandler(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: `Endpoint ${req.method} ${req.path} not found`,
      timestamp: new Date().toISOString(),
      requestId: req.requestId,
    },
  });
}

/**
 * Async error wrapper
 * Wraps async route handlers to catch errors
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}