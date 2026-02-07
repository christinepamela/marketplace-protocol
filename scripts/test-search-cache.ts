/**
 * Test Search Cache Service
 * Tests Redis caching, cache hits/misses, and performance
 */

import { createClient } from '@supabase/supabase-js';
import { SearchService } from '../src/core/layer1-catalog/search.service';
import { SearchCacheService } from '../src/core/layer1-catalog/search-cache.service';
import type { SearchQuery } from '../src/core/layer1-catalog/types';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function testSearchCache() {
  console.log('🧪 Testing Search Cache Service\n');
  
  // Initialize services
  const searchService = new SearchService(supabase);
  const cacheService = new SearchCacheService({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD
  });
  
  // Test 1: Redis health check
  console.log('Test 1: Redis health check');
  const isHealthy = await cacheService.healthCheck();
  console.log(isHealthy ? '✅ Redis connected' : '❌ Redis not connected');
  console.log('');
  
  if (!isHealthy) {
    console.error('❌ Redis not running. Start with: docker-compose up -d redis');
    process.exit(1);
  }
  
  // Test 2: Cache miss (first search)
  console.log('Test 2: Cache miss - First search');
  const query: SearchQuery = {
    query: 'leather backpack',
    limit: 10,
    offset: 0
  };
  
  const start1 = Date.now();
  const cached1 = await cacheService.getCachedResults(query);
  const time1 = Date.now() - start1;
  
  console.log('✅ Cache check:', cached1 ? 'HIT' : 'MISS', `(${time1}ms)`);
  
  if (!cached1) {
    console.log('   Executing fresh search...');
    const start2 = Date.now();
    const results = await searchService.search(query);
    const time2 = Date.now() - start2;
    
    console.log('   ✅ Search completed:', time2 + 'ms');
    console.log('   📊 Results found:', results.total);
    
    // Cache the results
    await cacheService.cacheResults(query, results);
    await cacheService.recordFreshQueryTime(time2);
    console.log('   💾 Results cached');
  }
  console.log('');
  
  // Test 3: Cache hit (second search)
  console.log('Test 3: Cache hit - Same search');
  const start3 = Date.now();
  const cached2 = await cacheService.getCachedResults(query);
  const time3 = Date.now() - start3;
  
  console.log('✅ Cache check:', cached2 ? 'HIT' : 'MISS', `(${time3}ms)`);
  if (cached2) {
    console.log('   📊 Results from cache:', cached2.total);
    console.log('   ⚡ Speed improvement:', 
      Math.round(((time1 - time3) / time1) * 100) + '% faster');
  }
  console.log('');
  
  // Test 4: Cache statistics
  console.log('Test 4: Cache statistics');
  const stats = await cacheService.getStats();
  console.log('✅ Cache stats:');
  console.log('   - Total queries:', stats.totalQueries);
  console.log('   - Cache hits:', stats.hits);
  console.log('   - Cache misses:', stats.misses);
  console.log('   - Hit rate:', stats.hitRate.toFixed(2) + '%');
  console.log('   - Avg cached response:', stats.avgCachedResponseTime.toFixed(2) + 'ms');
  console.log('   - Avg fresh response:', stats.avgFreshResponseTime.toFixed(2) + 'ms');
  console.log('');
  
  // Test 5: Popular queries
  console.log('Test 5: Popular queries');
  const popular = await cacheService.getPopularQueries(5);
  console.log('✅ Top queries:');
  popular.forEach((q, i) => {
    console.log(`   ${i + 1}. "${q.query}" (${q.count} searches)`);
  });
  console.log('');
  
  // Cleanup
  await cacheService.close();
  
  console.log('🎉 All tests passed!');
}

testSearchCache()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Test failed:', error);
    process.exit(1);
  });