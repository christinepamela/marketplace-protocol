/**
 * Authentication Middleware
 * 
 * Validates JWT tokens and API keys
 * Attaches authenticated user/client to request object
 */

import { Request, Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';
import { config } from '../core/config';
import { 
  TokenManager, 
  ApiKeyManager, 
  PermissionChecker,
  JwtPayload 
} from '../core/auth';
import { UnauthorizedError } from '../core/errors';

// Supabase client for API key validation
const supabase = createClient(
  config.supabaseUrl,
  config.supabaseServiceKey
);

/**
 * Authenticate with JWT token
 */
export function authenticateJWT(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  try {
    const authHeader = req.headers.authorization;
    const token = TokenManager.extractFromHeader(authHeader);
    
    if (!token) {
      throw new UnauthorizedError('No token provided');
    }
    
    // Verify and decode token
    const payload = TokenManager.verifyToken(token);
    
    // ✅ NEW: Ensure it's an access token, not a refresh token
    if (payload.tokenType && payload.tokenType !== 'access') {
      throw new UnauthorizedError('Invalid token type. Use access token for API requests.');
    }
    
    // Attach to request
    req.user = payload;
    req.permissions = payload.permissions || [];
    
    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Authenticate with API key
 */
export function authenticateApiKey() {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authHeader = req.headers.authorization;
      const apiKey = ApiKeyManager.extractFromHeader(authHeader);
      
      if (!apiKey) {
        throw new UnauthorizedError('No API key provided');
      }
      
      // Check if sandbox mode matches
      const isSandboxKey = ApiKeyManager.isSandboxKey(apiKey);
      if (config.isSandboxMode !== isSandboxKey) {
        throw new UnauthorizedError(
          config.isSandboxMode 
            ? 'Live API keys cannot be used in sandbox mode'
            : 'Sandbox API keys cannot be used in production'
        );
      }
      
      // Hash the key for lookup
      const keyHash = ApiKeyManager.hashKey(apiKey);
      
      // Look up key in database
      const { data: keyRecord, error } = await supabase
        .from('api_keys')
        .select('*')
        .eq('key_hash', keyHash)
        .eq('is_active', true)
        .single();
      
      if (error || !keyRecord) {
        throw new UnauthorizedError('Invalid API key');
      }
      
      // Check expiration
      if (ApiKeyManager.isExpired(keyRecord.expires_at)) {
        throw new UnauthorizedError('API key has expired');
      }
      
      // Attach to request
      req.clientId = keyRecord.client_id;
      req.permissions = keyRecord.permissions || [];
      
      // Update last used timestamp
      await supabase
        .from('api_keys')
        .update({ last_used_at: new Date().toISOString() })
        .eq('id', keyRecord.id);
      
      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Authenticate with either JWT or API key
 */
export function authenticate() {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader) {
        throw new UnauthorizedError('Authentication required');
      }
      
      // Try JWT first
      const jwtToken = TokenManager.extractFromHeader(authHeader);
      if (jwtToken) {
        const payload = TokenManager.verifyToken(jwtToken);
        
        // ✅ NEW: Ensure it's an access token, not a refresh token
        if (payload.tokenType && payload.tokenType !== 'access') {
          throw new UnauthorizedError('Invalid token type. Use access token for API requests.');
        }
        
        req.user = payload;
        req.permissions = payload.permissions || [];
        return next();
      }
      
      // Try API key
      const apiKey = ApiKeyManager.extractFromHeader(authHeader);
      if (apiKey) {
        return authenticateApiKey()(req, res, next);
      }
      
      throw new UnauthorizedError('Invalid authentication credentials');
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Require specific permissions
 */
export function requirePermissions(...requiredPermissions: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const userPermissions = req.permissions || [];
      
      if (!PermissionChecker.hasAllPermissions(userPermissions, requiredPermissions)) {
        throw new UnauthorizedError(
          'Insufficient permissions',
          { 
            required: requiredPermissions,
            provided: userPermissions 
          }
        );
      }
      
      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Require any of the specified permissions
 */
export function requireAnyPermission(...requiredPermissions: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const userPermissions = req.permissions || [];
      
      if (!PermissionChecker.hasAnyPermission(userPermissions, requiredPermissions)) {
        throw new UnauthorizedError(
          'Insufficient permissions',
          { 
            requiredAny: requiredPermissions,
            provided: userPermissions 
          }
        );
      }
      
      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Optional authentication (doesn't fail if no auth provided)
 */
export function optionalAuth() {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader) {
        return next();
      }
      
      // Try to authenticate but don't throw on failure
      await authenticate()(req, res, (error) => {
        // Continue even if auth fails
        next();
      });
    } catch (error) {
      // Ignore auth errors for optional auth
      next();
    }
  };
}