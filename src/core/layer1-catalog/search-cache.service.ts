/**
 * Search Cache Service
 * Redis-based caching for federated search optimization
 * 
 * Features:
 * - Cache popular search queries (5 min TTL)
 * - Cache product index entries (10 min TTL)
 * - Cache vendor reputation data (1 hour TTL)
 * - Query result caching with smart invalidation
 * - Performance analytics tracking
 * 
 * Performance Goals:
 * - Cached queries: <10ms response
 * - Fresh queries: <100ms response
 * - Cache hit rate: >70%
 */

import Redis from 'ioredis';
import type { SearchQuery, SearchResults, SearchResultItem } from './types';

// ============================================================================
// TYPES
// ============================================================================

export interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number; // Percentage
  avgCachedResponseTime: number; // Milliseconds
  avgFreshResponseTime: number; // Milliseconds
  totalQueries: number;
  uniqueQueries: number;
  popularQueries: Array<{ query: string; count: number }>;
}

export interface CacheConfig {
  host: string;
  port: number;
  password?: string;
  db?: number;
  keyPrefix?: string;
  defaultTTL?: number; // Seconds
}

// ============================================================================
// SEARCH CACHE SERVICE
// ============================================================================

export class SearchCacheService {
  private redis: Redis;
  private config: CacheConfig;
  
  // TTL values (seconds)
  private readonly SEARCH_RESULTS_TTL = 300; // 5 minutes
  private readonly PRODUCT_INDEX_TTL = 600; // 10 minutes
  private readonly VENDOR_REPUTATION_TTL = 3600; // 1 hour
  private readonly POPULAR_QUERIES_TTL = 86400; // 24 hours
  
  // Cache keys
  private readonly SEARCH_KEY_PREFIX = 'search:query:';
  private readonly PRODUCT_KEY_PREFIX = 'product:index:';
  private readonly VENDOR_KEY_PREFIX = 'vendor:reputation:';
  private readonly STATS_KEY = 'search:stats';
  private readonly POPULAR_KEY = 'search:popular';
  
  constructor(config: CacheConfig) {
    this.config = config;
    
    // Initialize Redis client
    this.redis = new Redis({
      host: config.host,
      port: config.port,
      password: config.password,
      db: config.db || 0,
      keyPrefix: config.keyPrefix || 'rangkai:',
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      }
    });
    
    // Handle errors
    this.redis.on('error', (err) => {
      console.error('Redis error:', err);
    });
    
    // Log connection
    this.redis.on('connect', () => {
      console.log('✅ Redis connected');
    });
  }

  // ============================================================================
  // SEARCH QUERY CACHING
  // ============================================================================

  /**
   * Get cached search results
   */
  async getCachedResults(query: SearchQuery): Promise<SearchResults | null> {
    const startTime = Date.now();
    
    try {
      const key = this.generateSearchKey(query);
      const cached = await this.redis.get(key);
      
      if (!cached) {
        await this.recordCacheMiss();
        return null;
      }
      
      const results = JSON.parse(cached) as SearchResults;
      
      // Record hit
      const responseTime = Date.now() - startTime;
      await this.recordCacheHit(responseTime);
      
      // Update popular queries
      await this.incrementQueryCount(query.query || '');
      
      return results;
    } catch (error) {
      console.error('Error getting cached results:', error);
      return null;
    }
  }

  /**
   * Cache search results
   */
  async cacheResults(query: SearchQuery, results: SearchResults): Promise<void> {
    try {
      const key = this.generateSearchKey(query);
      await this.redis.setex(
        key,
        this.SEARCH_RESULTS_TTL,
        JSON.stringify(results)
      );
    } catch (error) {
      console.error('Error caching results:', error);
    }
  }

  /**
   * Invalidate search cache for specific query
   */
  async invalidateQuery(query: SearchQuery): Promise<void> {
    try {
      const key = this.generateSearchKey(query);
      await this.redis.del(key);
    } catch (error) {
      console.error('Error invalidating query:', error);
    }
  }

  /**
   * Invalidate all search caches
   */
  async invalidateAllSearches(): Promise<void> {
    try {
      const pattern = `${this.config.keyPrefix || ''}${this.SEARCH_KEY_PREFIX}*`;
      const keys = await this.redis.keys(pattern);
      
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    } catch (error) {
      console.error('Error invalidating all searches:', error);
    }
  }

  // ============================================================================
  // PRODUCT INDEX CACHING
  // ============================================================================

  /**
   * Get cached product index entry
   */
  async getCachedProduct(productId: string): Promise<any | null> {
    try {
      const key = `${this.PRODUCT_KEY_PREFIX}${productId}`;
      const cached = await this.redis.get(key);
      
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      console.error('Error getting cached product:', error);
      return null;
    }
  }

  /**
   * Cache product index entry
   */
  async cacheProduct(productId: string, product: any): Promise<void> {
    try {
      const key = `${this.PRODUCT_KEY_PREFIX}${productId}`;
      await this.redis.setex(
        key,
        this.PRODUCT_INDEX_TTL,
        JSON.stringify(product)
      );
    } catch (error) {
      console.error('Error caching product:', error);
    }
  }

  /**
   * Invalidate product cache (when product updated)
   */
  async invalidateProduct(productId: string): Promise<void> {
    try {
      const key = `${this.PRODUCT_KEY_PREFIX}${productId}`;
      await this.redis.del(key);
      
      // Also invalidate related search caches
      // (products with this ID might appear in search results)
      await this.invalidateAllSearches();
    } catch (error) {
      console.error('Error invalidating product:', error);
    }
  }

  // ============================================================================
  // VENDOR REPUTATION CACHING
  // ============================================================================

  /**
   * Get cached vendor reputation
   */
  async getCachedVendorReputation(vendorDid: string): Promise<number | null> {
    try {
      const key = `${this.VENDOR_KEY_PREFIX}${vendorDid}`;
      const cached = await this.redis.get(key);
      
      return cached ? parseFloat(cached) : null;
    } catch (error) {
      console.error('Error getting cached vendor reputation:', error);
      return null;
    }
  }

  /**
   * Cache vendor reputation
   */
  async cacheVendorReputation(vendorDid: string, reputation: number): Promise<void> {
    try {
      const key = `${this.VENDOR_KEY_PREFIX}${vendorDid}`;
      await this.redis.setex(
        key,
        this.VENDOR_REPUTATION_TTL,
        reputation.toString()
      );
    } catch (error) {
      console.error('Error caching vendor reputation:', error);
    }
  }

  /**
   * Invalidate vendor reputation (when rating updated)
   */
  async invalidateVendorReputation(vendorDid: string): Promise<void> {
    try {
      const key = `${this.VENDOR_KEY_PREFIX}${vendorDid}`;
      await this.redis.del(key);
      
      // Invalidate searches that might include this vendor's products
      await this.invalidateAllSearches();
    } catch (error) {
      console.error('Error invalidating vendor reputation:', error);
    }
  }

  // ============================================================================
  // POPULAR QUERIES TRACKING
  // ============================================================================

  /**
   * Increment query count
   */
  private async incrementQueryCount(query: string): Promise<void> {
    if (!query) return;
    
    try {
      await this.redis.zincrby(this.POPULAR_KEY, 1, query);
      await this.redis.expire(this.POPULAR_KEY, this.POPULAR_QUERIES_TTL);
    } catch (error) {
      console.error('Error incrementing query count:', error);
    }
  }

  /**
   * Get popular queries
   */
  async getPopularQueries(limit: number = 10): Promise<Array<{ query: string; count: number }>> {
    try {
      const results = await this.redis.zrevrange(
        this.POPULAR_KEY,
        0,
        limit - 1,
        'WITHSCORES'
      );
      
      const popular: Array<{ query: string; count: number }> = [];
      
      for (let i = 0; i < results.length; i += 2) {
        popular.push({
          query: results[i],
          count: parseInt(results[i + 1])
        });
      }
      
      return popular;
    } catch (error) {
      console.error('Error getting popular queries:', error);
      return [];
    }
  }

  // ============================================================================
  // CACHE STATISTICS
  // ============================================================================

  /**
   * Record cache hit
   */
  private async recordCacheHit(responseTime: number): Promise<void> {
    try {
      await this.redis.hincrby(this.STATS_KEY, 'hits', 1);
      await this.redis.hincrbyfloat(
        this.STATS_KEY,
        'cached_response_time_total',
        responseTime
      );
    } catch (error) {
      console.error('Error recording cache hit:', error);
    }
  }

  /**
   * Record cache miss
   */
  private async recordCacheMiss(): Promise<void> {
    try {
      await this.redis.hincrby(this.STATS_KEY, 'misses', 1);
    } catch (error) {
      console.error('Error recording cache miss:', error);
    }
  }

  /**
   * Record fresh query response time
   */
  async recordFreshQueryTime(responseTime: number): Promise<void> {
    try {
      await this.redis.hincrbyfloat(
        this.STATS_KEY,
        'fresh_response_time_total',
        responseTime
      );
      await this.redis.hincrby(this.STATS_KEY, 'fresh_queries', 1);
    } catch (error) {
      console.error('Error recording fresh query time:', error);
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<CacheStats> {
    try {
      const stats = await this.redis.hgetall(this.STATS_KEY);
      
      const hits = parseInt(stats.hits || '0');
      const misses = parseInt(stats.misses || '0');
      const totalQueries = hits + misses;
      const hitRate = totalQueries > 0 ? (hits / totalQueries) * 100 : 0;
      
      const cachedTimeTotal = parseFloat(stats.cached_response_time_total || '0');
      const avgCachedResponseTime = hits > 0 ? cachedTimeTotal / hits : 0;
      
      const freshTimeTotal = parseFloat(stats.fresh_response_time_total || '0');
      const freshQueries = parseInt(stats.fresh_queries || '0');
      const avgFreshResponseTime = freshQueries > 0 ? freshTimeTotal / freshQueries : 0;
      
      const popularQueries = await this.getPopularQueries(10);
      const uniqueQueries = popularQueries.length;
      
      return {
        hits,
        misses,
        hitRate,
        avgCachedResponseTime,
        avgFreshResponseTime,
        totalQueries,
        uniqueQueries,
        popularQueries
      };
    } catch (error) {
      console.error('Error getting cache stats:', error);
      return {
        hits: 0,
        misses: 0,
        hitRate: 0,
        avgCachedResponseTime: 0,
        avgFreshResponseTime: 0,
        totalQueries: 0,
        uniqueQueries: 0,
        popularQueries: []
      };
    }
  }

  /**
   * Reset statistics
   */
  async resetStats(): Promise<void> {
    try {
      await this.redis.del(this.STATS_KEY);
      await this.redis.del(this.POPULAR_KEY);
    } catch (error) {
      console.error('Error resetting stats:', error);
    }
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Generate cache key for search query
   */
  private generateSearchKey(query: SearchQuery): string {
    // Create deterministic key from query parameters
    const parts = [
      query.query || '',
      query.clientIds?.sort().join(',') || 'all',
      query.filters?.category || '',
      query.filters?.minPrice || '',
      query.filters?.maxPrice || '',
      query.sortBy || 'relevance',
      query.limit || '20',
      query.offset || '0'
    ];
    
    return `${this.SEARCH_KEY_PREFIX}${parts.join(':')}`;
  }

  /**
   * Warm cache with popular queries
   * Call this periodically (e.g., nightly) to pre-cache popular searches
   */
  async warmCache(
    searchService: any, // SearchService instance
    topN: number = 20
  ): Promise<void> {
    try {
      console.log('🔥 Warming search cache...');
      
      const popularQueries = await this.getPopularQueries(topN);
      
      for (const { query } of popularQueries) {
        // Execute search and cache results
        const searchQuery: SearchQuery = {
          query,
          limit: 20,
          offset: 0
        };
        
        const results = await searchService.search(searchQuery);
        await this.cacheResults(searchQuery, results);
      }
      
      console.log(`✅ Warmed cache with ${popularQueries.length} popular queries`);
    } catch (error) {
      console.error('Error warming cache:', error);
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.redis.ping();
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Close connection
   */
  async close(): Promise<void> {
    await this.redis.quit();
  }
}

// ============================================================================
// USAGE EXAMPLE
// ============================================================================

/**
 * Example integration with SearchService:
 * 
 * // 1. Initialize cache
 * const cacheService = new SearchCacheService({
 *   host: process.env.REDIS_HOST || 'localhost',
 *   port: parseInt(process.env.REDIS_PORT || '6379'),
 *   password: process.env.REDIS_PASSWORD,
 *   keyPrefix: 'rangkai:'
 * });
 * 
 * // 2. Wrap search with caching
 * async function cachedSearch(query: SearchQuery): Promise<SearchResults> {
 *   const startTime = Date.now();
 *   
 *   // Check cache first
 *   const cached = await cacheService.getCachedResults(query);
 *   if (cached) {
 *     console.log('✅ Cache hit!', Date.now() - startTime + 'ms');
 *     return cached;
 *   }
 *   
 *   // Cache miss - execute search
 *   const results = await searchService.search(query);
 *   
 *   // Cache results
 *   await cacheService.cacheResults(query, results);
 *   
 *   // Record timing
 *   await cacheService.recordFreshQueryTime(Date.now() - startTime);
 *   
 *   return results;
 * }
 * 
 * // 3. Monitor performance
 * const stats = await cacheService.getStats();
 * console.log('Cache hit rate:', stats.hitRate.toFixed(2) + '%');
 * console.log('Avg cached response:', stats.avgCachedResponseTime.toFixed(2) + 'ms');
 * console.log('Avg fresh response:', stats.avgFreshResponseTime.toFixed(2) + 'ms');
 * 
 * // 4. Warm cache nightly (cron job)
 * // 0 0 * * * (daily at midnight)
 * await cacheService.warmCache(searchService, 50);
 */
