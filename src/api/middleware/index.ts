/**
 * Middleware Exports
 * 
 * Centralized export point for all middleware
 */

// Authentication middleware
export {
  authenticateJWT,
  authenticateApiKey,
  authenticate,
  requirePermissions,
  requireAnyPermission,
  optionalAuth,
} from './auth.middleware';

// Rate limiting middleware
export {
  standardRateLimit,
  strictRateLimit,
  lenientRateLimit,
  createRateLimit,
} from './ratelimit.middleware';

// Validation middleware
export {
  validateBody,
  validateQuery,
  validateParams,
  commonSchemas,
} from './validation.middleware';

// Error handling middleware
export {
  errorHandler,
  notFoundHandler,
  asyncHandler,
} from './error.middleware';