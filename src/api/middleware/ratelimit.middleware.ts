/**
 * Rate Limiting Middleware
 * 
 * Limits requests to 100 per hour per client
 * Tracks by client ID (from auth) or IP address
 */
import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { config } from '../core/config';
import { RateLimitError } from '../core/errors';

/**
 * Standard rate limiter: 100 requests per hour
 */
export const standardRateLimit = rateLimit({
  windowMs: config.rateLimitWindowMs,
  max: config.rateLimitMaxRequests,
  
  // Don't use custom keyGenerator - let express-rate-limit handle it
  // It will use req.ip automatically with IPv6 support
  
  // Custom error handler
  handler: (req: Request, res: Response) => {
    const retryAfter = Math.ceil(config.rateLimitWindowMs / 1000);
    const error = new RateLimitError(retryAfter);
    
    res.status(error.statusCode).json(error.toJSON());
  },
  
  // Add rate limit info to headers
  standardHeaders: true,
  legacyHeaders: false,
  
  // Skip rate limiting in test environment
  skip: () => config.isTest,
});

/**
 * Strict rate limiter for sensitive operations: 10 requests per hour
 */
export const strictRateLimit = rateLimit({
  windowMs: config.rateLimitWindowMs,
  max: 10,
  
  handler: (req: Request, res: Response) => {
    const retryAfter = Math.ceil(config.rateLimitWindowMs / 1000);
    const error = new RateLimitError(retryAfter);
    
    res.status(error.statusCode).json(error.toJSON());
  },
  
  standardHeaders: true,
  legacyHeaders: false,
  
  skip: () => config.isTest,
});

/**
 * Lenient rate limiter for public endpoints: 1000 requests per hour
 */
export const lenientRateLimit = rateLimit({
  windowMs: config.rateLimitWindowMs,
  max: 1000,
  
  handler: (req: Request, res: Response) => {
    const retryAfter = Math.ceil(config.rateLimitWindowMs / 1000);
    const error = new RateLimitError(retryAfter);
    
    res.status(error.statusCode).json(error.toJSON());
  },
  
  standardHeaders: true,
  legacyHeaders: false,
  
  skip: () => config.isTest,
});

/**
 * Custom rate limiter with configurable limits
 */
export function createRateLimit(maxRequests: number, windowMs?: number) {
  return rateLimit({
    windowMs: windowMs || config.rateLimitWindowMs,
    max: maxRequests,
    
    handler: (req: Request, res: Response) => {
      const retryAfter = Math.ceil((windowMs || config.rateLimitWindowMs) / 1000);
      const error = new RateLimitError(retryAfter);
      
      res.status(error.statusCode).json(error.toJSON());
    },
    
    standardHeaders: true,
    legacyHeaders: false,
    
    skip: () => config.isTest,
  });
}