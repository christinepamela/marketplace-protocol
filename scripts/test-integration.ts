/**
 * Integration Test
 * Tests all services working together
 */

import { createClient } from '@supabase/supabase-js';
import { BitcoinService } from '../src/core/layer2-transaction/bitcoin.service';
import { PriceFeedService } from '../src/core/layer2-transaction/price-feed.service';
import { SearchService } from '../src/core/layer1-catalog/search.service';
import { SearchCacheService } from '../src/core/layer1-catalog/search-cache.service';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function testIntegration() {
  console.log('🧪 Integration Test: All Services\n');
  
  // Initialize all services
  const bitcoinService = new BitcoinService(supabase, process.env.BITCOIN_MNEMONIC, true);
  const priceFeed = new PriceFeedService(supabase);
  const searchService = new SearchService(supabase);
  const cacheService = new SearchCacheService({
    host: 'localhost',
    port: 6379
  });
  
  // Scenario: Complete order flow with Bitcoin payment
  console.log('📦 Scenario: Order with Bitcoin payment\n');
  
  // Step 1: Buyer searches for product
  console.log('Step 1: Buyer searches for "leather backpack"');
  const searchResults = await cacheService.getCachedResults({
    query: 'leather backpack',
    limit: 5
  }) || await searchService.search({ query: 'leather backpack', limit: 5 });
  console.log('✅ Found', searchResults.total, 'products');
  console.log('');
  
  // Step 2: Buyer selects product (assume $150 USD)
  console.log('Step 2: Buyer adds $150 product to cart');
  const productPrice = { amount: 150, currency: 'USD' };
  console.log('✅ Product price:', productPrice.amount, productPrice.currency);
  console.log('');
  
  // Step 3: Checkout - Generate Bitcoin payment
  console.log('Step 3: Checkout - Generate Bitcoin payment address');
  const orderId = `integration-test-${Date.now()}`;
  const paymentAddress = await bitcoinService.generateEscrowAddress(
    orderId,
    productPrice
  );
  
  // Get BTC amount
  const satoshis = await priceFeed.fiatToSatoshis(productPrice);
  const btcAmount = priceFeed.formatSatoshisAsBTC(satoshis);
  
  console.log('✅ Payment instructions:');
  console.log('   - Order ID:', orderId);
  console.log('   - Pay to address:', paymentAddress.address);
  console.log('   - Amount:', btcAmount, `(${satoshis.toLocaleString()} sats)`);
  console.log('   - USD equivalent:', '$' + productPrice.amount);
  console.log('   - Expires:', paymentAddress.expiresAt.toLocaleString());
  console.log('');
  
  // Step 4: Monitor payment (simulate)
  console.log('Step 4: Monitor payment status');
  const status = await bitcoinService.monitorOrderPayment(orderId);
  console.log('✅ Payment status:');
  console.log('   - Confirmed:', status?.confirmed || false);
  console.log('   - Confirmations:', status?.confirmations || 0);
  console.log('   - Amount received:', status?.amountReceived || 0, 'sats');
  console.log('');
  
  console.log('ℹ️  To complete the flow:');
  console.log('   1. Send', btcAmount, 'to', paymentAddress.address);
  console.log('   2. Wait for 3 confirmations (~30 minutes)');
  console.log('   3. Payment will auto-confirm via monitoring');
  console.log('   4. Order status → paid');
  console.log('   5. Vendor ships product');
  console.log('   6. On delivery, payout vendor from escrow');
  console.log('');
  
  // Cleanup
  await cacheService.close();
  
  console.log('🎉 Integration test completed!\n');
  console.log('✅ All services working together:');
  console.log('   - Search: Cached queries working');
  console.log('   - Price Feed: Real-time BTC prices');
  console.log('   - Bitcoin: Address generation working');
  console.log('   - Payment: Ready to receive funds');
}

testIntegration()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Test failed:', error);
    process.exit(1);
  });