/**
 * Validation Middleware
 * 
 * Uses Zod schemas to validate request body, query, and params
 * Provides detailed error messages for validation failures
 */

import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema, ZodError } from 'zod';
import { ValidationError } from '../core/errors';

/**
 * Format Zod errors into readable error details
 */
function formatZodErrors(error: ZodError): Record<string, any> {
  const formatted: Record<string, any> = {};
  
  for (const issue of error.issues) {
    const path = issue.path.join('.');
    formatted[path] = issue.message;
  }
  
  return formatted;
}

/**
 * Validate request body
 */
export function validateBody<T extends ZodSchema>(schema: T) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const result = schema.safeParse(req.body);
      
      if (!result.success) {
        throw new ValidationError(
          'Request body validation failed',
          formatZodErrors(result.error)
        );
      }
      
      // Replace body with validated data (with defaults applied)
      req.body = result.data;
      
      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Validate query parameters
 */
export function validateQuery<T extends ZodSchema>(schema: T) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const result = schema.safeParse(req.query);
      
      if (!result.success) {
        throw new ValidationError(
          'Query parameters validation failed',
          formatZodErrors(result.error)
        );
      }
      
      // Replace query with validated data
      req.query = result.data;
      
      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Validate URL parameters
 */
export function validateParams<T extends ZodSchema>(schema: T) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const result = schema.safeParse(req.params);
      
      if (!result.success) {
        throw new ValidationError(
          'URL parameters validation failed',
          formatZodErrors(result.error)
        );
      }
      
      // Replace params with validated data
      req.params = result.data;
      
      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Common validation schemas
 */
export const commonSchemas = {
  // UUID parameter
  uuidParam: z.object({
    id: z.string().uuid('Invalid UUID format'),
  }),
  
  // DID parameter
  didParam: z.object({
    did: z.string().regex(/^did:[a-z0-9]+:[a-zA-Z0-9._-]+$/, 'Invalid DID format'),
  }),
  
  // Pagination query
  paginationQuery: z.object({
    page: z.string().optional().transform(val => val ? parseInt(val, 10) : 1),
    limit: z.string().optional().transform(val => val ? parseInt(val, 10) : 20),
  }),
  
  // Sort query
  sortQuery: z.object({
    sort: z.string().optional(),
  }),
  
  // Search query
  searchQuery: z.object({
    q: z.string().min(1, 'Search query cannot be empty'),
    page: z.string().optional().transform(val => val ? parseInt(val, 10) : 1),
    limit: z.string().optional().transform(val => val ? parseInt(val, 10) : 20),
  }),
  
  // Date range query
  dateRangeQuery: z.object({
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
  }),
};