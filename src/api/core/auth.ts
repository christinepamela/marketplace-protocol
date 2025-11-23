/**
 * Authentication Utilities
 * 
 * Handles JWT token generation/verification and API key management
 * Supports both user sessions and server-to-server authentication
 */

import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { config } from './config';
import { UnauthorizedError } from './errors';

// JWT Payload structure
export interface JwtPayload {
  sub: string;           // Subject (user DID or client ID)
  did?: string;
  type: 'user' | 'client' | 'service';
  tokenType?: 'access' | 'refresh';
  permissions?: string[];
  iat?: number;          // Issued at
  exp?: number;          // Expiry
}

// API Key structure
export interface ApiKey {
  key: string;           // The actual API key
  clientId: string;      // Associated client
  name: string;          // Key name/description
  permissions: string[];
  createdAt: Date;
  expiresAt?: Date;
  isActive: boolean;
}

/**
 * JWT Token Manager
 */
export class TokenManager {
  /**
   * Generate a JWT token
   */
  static generateToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): string {
    const options: jwt.SignOptions = {
      expiresIn: config.jwtExpiry as jwt.SignOptions['expiresIn'],
    };
    return jwt.sign(payload as object, config.jwtSecret as jwt.Secret, options);
  }
  
  /**
   * Verify and decode a JWT token
   */
  static verifyToken(token: string): JwtPayload {
    try {
      const decoded = jwt.verify(token, config.jwtSecret) as JwtPayload;
      return decoded;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new UnauthorizedError('Token has expired', { code: 'TOKEN_EXPIRED' });
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw new UnauthorizedError('Invalid token', { code: 'INVALID_TOKEN' });
      }
      throw new UnauthorizedError('Token verification failed');
    }
  }
  
  /**
   * Extract token from Authorization header
   */
  static extractFromHeader(authHeader?: string): string | null {
    if (!authHeader) {
      return null;
    }
    
    // Support both "Bearer <token>" and "<token>"
    const parts = authHeader.split(' ');
    if (parts.length === 2 && parts[0] === 'Bearer') {
      return parts[1];
    }
    if (parts.length === 1) {
      return parts[0];
    }
    
    return null;
  }
}

/**
 * API Key Manager
 */
export class ApiKeyManager {
  /**
   * Generate a new API key
   */
  static generateKey(prefix = 'rk'): string {
    // Format: rk_live_xxxxxxxxxxxxx or rk_test_xxxxxxxxxxxxx
    const environment = config.isSandboxMode ? 'test' : 'live';
    const randomBytes = crypto.randomBytes(32).toString('hex');
    return `${prefix}_${environment}_${randomBytes}`;
  }
  
  /**
   * Hash an API key for storage
   */
  static hashKey(key: string): string {
    return crypto
      .createHmac('sha256', config.apiKeySalt)
      .update(key)
      .digest('hex');
  }
  
  /**
   * Verify an API key matches its hash
   */
  static verifyKey(key: string, hash: string): boolean {
    const computedHash = this.hashKey(key);
    return crypto.timingSafeEqual(
      Buffer.from(computedHash),
      Buffer.from(hash)
    );
  }
  
  /**
   * Extract API key from request headers
   */
  static extractFromHeader(authHeader?: string): string | null {
    if (!authHeader) {
      return null;
    }
    
    // Support "ApiKey <key>" format
    const parts = authHeader.split(' ');
    if (parts.length === 2 && parts[0] === 'ApiKey') {
      return parts[1];
    }
    
    return null;
  }
  
  /**
   * Check if a key is in sandbox mode
   */
  static isSandboxKey(key: string): boolean {
    return key.includes('_test_');
  }
  
  /**
   * Check if a key is expired
   */
  static isExpired(expiresAt?: Date): boolean {
    if (!expiresAt) {
      return false; // No expiry set
    }
    return new Date() > expiresAt;
  }
}

/**
 * Permission checker
 */
export class PermissionChecker {
  /**
   * Check if permissions include required permission
   */
  static hasPermission(
    userPermissions: string[],
    requiredPermission: string
  ): boolean {
    // Admin has all permissions
    if (userPermissions.includes('admin')) {
      return true;
    }
    
    // Check exact match
    if (userPermissions.includes(requiredPermission)) {
      return true;
    }
    
    // Check wildcard patterns (e.g., "orders:*" matches "orders:read")
    return userPermissions.some(permission => {
      if (!permission.includes('*')) {
        return false;
      }
      
      const pattern = permission.replace('*', '.*');
      const regex = new RegExp(`^${pattern}$`);
      return regex.test(requiredPermission);
    });
  }
  
  /**
   * Check if permissions include all required permissions
   */
  static hasAllPermissions(
    userPermissions: string[],
    requiredPermissions: string[]
  ): boolean {
    return requiredPermissions.every(required =>
      this.hasPermission(userPermissions, required)
    );
  }
  
  /**
   * Check if permissions include any of the required permissions
   */
  static hasAnyPermission(
    userPermissions: string[],
    requiredPermissions: string[]
  ): boolean {
    return requiredPermissions.some(required =>
      this.hasPermission(userPermissions, required)
    );
  }
}

// Standard permission definitions
export const PERMISSIONS = {
  // Identity (Layer 0)
  IDENTITY_READ: 'identity:read',
  IDENTITY_WRITE: 'identity:write',
  IDENTITY_VERIFY: 'identity:verify',
  
  // Catalog (Layer 1)
  CATALOG_READ: 'catalog:read',
  CATALOG_WRITE: 'catalog:write',
  CATALOG_SEARCH: 'catalog:search',
  
  // Orders (Layer 2)
  ORDERS_READ: 'orders:read',
  ORDERS_WRITE: 'orders:write',
  ORDERS_ESCROW: 'orders:escrow',
  
  // Logistics (Layer 3)
  LOGISTICS_READ: 'logistics:read',
  LOGISTICS_WRITE: 'logistics:write',
  LOGISTICS_PROVIDER: 'logistics:provider',
  
  // Trust (Layer 4)
  TRUST_READ: 'trust:read',
  TRUST_DISPUTE: 'trust:dispute',
  TRUST_RATE: 'trust:rate',
  
  // Governance (Layer 6)
  GOVERNANCE_READ: 'governance:read',
  GOVERNANCE_PROPOSE: 'governance:propose',
  GOVERNANCE_VOTE: 'governance:vote',
  GOVERNANCE_EXECUTE: 'governance:execute',
  
  // Admin
  ADMIN: 'admin',
} as const;