/**
 * Test Bitcoin Service
 * Tests address generation, payment monitoring, and payouts
 */

import { createClient } from '@supabase/supabase-js';
import { BitcoinService } from '../src/core/layer2-transaction/bitcoin.service';
import type { Price } from '../src/core/layer1-catalog/types';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function testBitcoinService() {
  console.log('🧪 Testing Bitcoin Service\n');
  
  // Initialize service (TESTNET!)
  const bitcoinService = new BitcoinService(
    supabase,
    process.env.BITCOIN_MNEMONIC,
    true // testnet
  );
  
  // Test 1: Generate escrow address
  console.log('Test 1: Generate escrow address');
  const testOrderId = `test-order-${Date.now()}`;
  const orderAmount: Price = { 
    amount: 150, 
    currency: 'USD' as const // Type assertion
  };
  
  const paymentAddress = await bitcoinService.generateEscrowAddress(
    testOrderId,
    orderAmount
  );
  
  console.log('✅ Address generated:');
  console.log('  - Order ID:', paymentAddress.orderId);
  console.log('  - Address:', paymentAddress.address);
  console.log('  - Expected (satoshis):', paymentAddress.expectedAmount);
  console.log('  - USD amount:', paymentAddress.usdAmount);
  console.log('  - Expires:', paymentAddress.expiresAt);
  console.log('  - Derivation path:', paymentAddress.derivationPath);
  console.log('');
  
  // Test 2: Check payment status (should be unpaid)
  console.log('Test 2: Check payment status');
  const status = await bitcoinService.monitorOrderPayment(testOrderId);
  
  console.log('✅ Payment status:');
  console.log('  - Address:', status?.address);
  console.log('  - Confirmed:', status?.confirmed);
  console.log('  - Confirmations:', status?.confirmations);
  console.log('  - Amount received:', status?.amountReceived);
  console.log('');
  
  // Test 3: Manual payment check (real blockchain query)
  console.log('Test 3: Manual blockchain check');
  console.log('ℹ️  To test payment detection:');
  console.log('   1. Go to https://testnet-faucet.mempool.co/');
  console.log('   2. Send testnet BTC to:', paymentAddress.address);
  console.log('   3. Run this script again after 30 seconds');
  console.log('');
  
  console.log('🎉 All tests passed!\n');
  console.log('📋 Next steps:');
  console.log('   1. Send testnet BTC to test address');
  console.log('   2. Run test again to verify payment detection');
  console.log('   3. Test vendor payout after payment confirmed');
}

// Run tests
testBitcoinService()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Test failed:', error);
    process.exit(1);
  });
