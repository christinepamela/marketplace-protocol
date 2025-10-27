/**
 * Utility Functions
 * 
 * Provides helpers for retry logic, caching, and request handling
 */

import { InternalError } from './errors';

/**
 * Sleep helper for async delays
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry configuration
 */
export interface RetryConfig {
  maxAttempts: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  initialDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
};

/**
 * Retry a function with exponential backoff
 */
export async function retry<T>(
  fn: () => Promise<T>,
  config: Partial<RetryConfig> = {}
): Promise<T> {
  const finalConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  let lastError: Error | undefined;
  let delay = finalConfig.initialDelayMs;
  
  for (let attempt = 1; attempt <= finalConfig.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // Don't retry on last attempt
      if (attempt === finalConfig.maxAttempts) {
        break;
      }
      
      // Don't retry operational errors (client errors)
      if (error instanceof Error && 'isOperational' in error && error.isOperational) {
        throw error;
      }
      
      // Wait before next attempt
      await sleep(delay);
      
      // Exponential backoff
      delay = Math.min(delay * finalConfig.backoffMultiplier, finalConfig.maxDelayMs);
    }
  }
  
  throw new InternalError(
    `Failed after ${finalConfig.maxAttempts} attempts`,
    { lastError: lastError?.message }
  );
}

/**
 * In-memory cache implementation
 */
export class SimpleCache<T> {
  private cache = new Map<string, { value: T; expiresAt: number }>();
  private defaultTtlMs: number;
  
  constructor(defaultTtlMs = 60000) {
    this.defaultTtlMs = defaultTtlMs;
  }
  
  /**
   * Get value from cache
   */
  get(key: string): T | null {
    const item = this.cache.get(key);
    
    if (!item) {
      return null;
    }
    
    // Check if expired
    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    
    return item.value;
  }
  
  /**
   * Set value in cache
   */
  set(key: string, value: T, ttlMs?: number): void {
    const expiresAt = Date.now() + (ttlMs ?? this.defaultTtlMs);
    this.cache.set(key, { value, expiresAt });
  }
  
  /**
   * Delete value from cache
   */
  delete(key: string): void {
    this.cache.delete(key);
  }
  
  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
  }
  
  /**
   * Clean up expired items
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiresAt) {
        this.cache.delete(key);
      }
    }
  }
  
  /**
   * Get or set with factory function
   */
  async getOrSet(
    key: string,
    factory: () => Promise<T>,
    ttlMs?: number
  ): Promise<T> {
    const cached = this.get(key);
    if (cached !== null) {
      return cached;
    }
    
    const value = await factory();
    this.set(key, value, ttlMs);
    return value;
  }
}

/**
 * Generate a unique request ID
 */
export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
}

/**
 * Sanitize object for logging (remove sensitive fields)
 */
export function sanitizeForLogging(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  if (typeof obj !== 'object') {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(sanitizeForLogging);
  }
  
  const sanitized: any = {};
  const sensitiveKeys = ['password', 'secret', 'token', 'apiKey', 'privateKey'];
  
  for (const [key, value] of Object.entries(obj)) {
    if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object') {
      sanitized[key] = sanitizeForLogging(value);
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
}

/**
 * Parse pagination parameters
 */
export interface PaginationParams {
  page: number;
  limit: number;
  offset: number;
}

export function parsePagination(
  pageStr?: string,
  limitStr?: string,
  maxLimit = 100
): PaginationParams {
  const page = Math.max(1, parseInt(pageStr || '1', 10) || 1);
  const limit = Math.min(
    maxLimit,
    Math.max(1, parseInt(limitStr || '20', 10) || 20)
  );
  const offset = (page - 1) * limit;
  
  return { page, limit, offset };
}

/**
 * Format pagination response
 */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export function formatPaginatedResponse<T>(
  data: T[],
  total: number,
  params: PaginationParams
): PaginatedResponse<T> {
  const totalPages = Math.ceil(total / params.limit);
  
  return {
    data,
    pagination: {
      page: params.page,
      limit: params.limit,
      total,
      totalPages,
      hasNext: params.page < totalPages,
      hasPrev: params.page > 1,
    },
  };
}

/**
 * Validate UUID format
 */
export function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Validate DID format (did:method:identifier)
 */
export function isValidDID(did: string): boolean {
  const didRegex = /^did:[a-z0-9]+:[a-zA-Z0-9._-]+$/;
  return didRegex.test(did);
}

/**
 * Parse sort parameters
 */
export interface SortParams {
  field: string;
  order: 'asc' | 'desc';
}

export function parseSort(sortStr?: string, defaultSort?: SortParams): SortParams {
  if (!sortStr) {
    return defaultSort || { field: 'created_at', order: 'desc' };
  }
  
  // Format: "field" or "field:asc" or "field:desc"
  const [field, order] = sortStr.split(':');
  
  return {
    field: field || defaultSort?.field || 'created_at',
    order: (order === 'asc' || order === 'desc') ? order : (defaultSort?.order || 'desc'),
  };
}

/**
 * Deep freeze an object (immutable)
 */
export function deepFreeze<T>(obj: T): Readonly<T> {
  Object.freeze(obj);
  
  Object.getOwnPropertyNames(obj).forEach(prop => {
    const value = (obj as any)[prop];
    if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
      deepFreeze(value);
    }
  });
  
  return obj;
}