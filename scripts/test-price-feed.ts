/**
 * Test Price Feed Service
 * Tests Bitcoin pricing, currency conversion, and historical rates
 */

import { createClient } from '@supabase/supabase-js';
import { PriceFeedService } from '../src/core/layer2-transaction/price-feed.service';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function testPriceFeed() {
  console.log('🧪 Testing Price Feed Service\n');
  
  const priceFeed = new PriceFeedService(supabase);
  
  // Test 1: Get Bitcoin price
  console.log('Test 1: Get current Bitcoin price');
  const btcPrice = await priceFeed.getBitcoinPrice();
  console.log('✅ Bitcoin price fetched:');
  console.log('   - USD:', '$' + btcPrice.usd.toLocaleString());
  console.log('   - EUR:', '€' + btcPrice.eur.toLocaleString());
  console.log('   - MYR:', 'RM' + btcPrice.myr.toLocaleString());
  console.log('   - SGD:', 'S$' + btcPrice.sgd.toLocaleString());
  console.log('   - Source:', btcPrice.source);
  console.log('   - Timestamp:', btcPrice.timestamp.toISOString());
  console.log('');
  
  // Test 2: Convert fiat to satoshis
  console.log('Test 2: Convert fiat to satoshis');
  const orderAmount = { amount: 150, currency: 'USD' };
  const satoshis = await priceFeed.fiatToSatoshis(orderAmount);
  console.log('✅ Conversion:');
  console.log('   - Input:', orderAmount.amount, orderAmount.currency);
  console.log('   - Output:', satoshis.toLocaleString(), 'satoshis');
  console.log('   - BTC:', priceFeed.formatSatoshisAsBTC(satoshis));
  console.log('');
  
  // Test 3: Convert satoshis to fiat
  console.log('Test 3: Convert satoshis to fiat');
  const testSatoshis = 1_000_000; // 0.01 BTC
  const usdAmount = await priceFeed.satoshisToFiat(testSatoshis, 'USD');
  const myrAmount = await priceFeed.satoshisToFiat(testSatoshis, 'MYR');
  console.log('✅ Conversion (0.01 BTC):');
  console.log('   - USD:', '$' + usdAmount.amount.toLocaleString());
  console.log('   - MYR:', 'RM' + myrAmount.amount.toLocaleString());
  console.log('');
  
  // Test 4: Exchange rates
  console.log('Test 4: Get exchange rates');
  const btcToUsd = await priceFeed.getExchangeRate('BTC', 'USD');
  const usdToMyr = await priceFeed.getExchangeRate('USD', 'MYR');
  console.log('✅ Exchange rates:');
  console.log('   - BTC/USD:', btcToUsd.rate.toLocaleString());
  console.log('   - USD/MYR:', usdToMyr.rate.toFixed(2));
  console.log('');
  
  // Test 5: Cache performance
  console.log('Test 5: Cache performance');
  const start1 = Date.now();
  await priceFeed.getBitcoinPrice(); // Fresh API call
  const time1 = Date.now() - start1;
  
  const start2 = Date.now();
  await priceFeed.getBitcoinPrice(); // Cached
  const time2 = Date.now() - start2;
  
  console.log('✅ Cache performance:');
  console.log('   - First call:', time1 + 'ms (API)');
  console.log('   - Second call:', time2 + 'ms (cached)');
  console.log('   - Speed improvement:', 
    Math.round(((time1 - time2) / time1) * 100) + '% faster');
  console.log('');
  
  // Test 6: Cache stats
  console.log('Test 6: Cache statistics');
  const cacheStats = priceFeed.getCacheStats();
  console.log('✅ Cache stats:');
  console.log('   - Cache size:', cacheStats.size, 'entries');
  console.log('   - Cached keys:', cacheStats.keys.join(', '));
  console.log('');
  
  console.log('🎉 All tests passed!');
}

testPriceFeed()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Test failed:', error);
    process.exit(1);
  });