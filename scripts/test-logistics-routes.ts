/**
 * Test: Logistics Routes (Layer 3)
 * Integration tests for logistics coordination API
 */

// Load environment variables FIRST
import dotenv from 'dotenv';
dotenv.config();

import { createClient } from '@supabase/supabase-js';
import { config } from '../src/api/core/config';
import { TokenManager } from '../src/api/core/auth';
import { v4 as uuidv4 } from 'uuid';

// Initialize Supabase
const supabase = createClient(
  config.supabaseUrl,
  config.supabaseServiceKey
);

const API_URL = 'http://localhost:3000/api/v1';

// Test data
let testProviderDid: string;
let testBuyerDid: string;
let testOrderId: string;
let testProviderId: string;
let testQuoteId: string;
let testShipmentId: string;
let providerToken: string;
let buyerToken: string;

async function setupTestData() {
  console.log('Setting up test data...');

  // Create test provider identity
  const providerUuid = uuidv4();
  const { data: provider, error: providerError } = await supabase
    .from('identities')
    .insert({
      did: `did:rangkai:${providerUuid}`,
      type: 'kyc',
      client_id: 'test-client',
      verification_status: 'verified',
      public_profile: {
        displayName: 'Test Logistics Provider',
        country: 'US',
        businessType: 'logistics',
        verified: true
      },
      metadata: {
        kyc: {
          businessName: 'Test Logistics Co',
          country: 'US'
        }
      }
    })
    .select()
    .single();

  if (providerError) throw providerError;
  testProviderDid = provider.did;
  providerToken = TokenManager.generateToken({
    sub: testProviderDid,
    type: 'user',
    permissions: ['logistics:read', 'logistics:write'],
    did: testProviderDid
  } as any);

  // Create test buyer identity
  const buyerUuid = uuidv4();
  const { data: buyer, error: buyerError } = await supabase
    .from('identities')
    .insert({
      did: `did:rangkai:${buyerUuid}`,
      type: 'kyc',
      client_id: 'test-client',
      verification_status: 'verified',
      public_profile: {
        displayName: 'Test Buyer',
        country: 'MY',
        businessType: 'buyer',
        verified: true
      },
      metadata: {}
    })
    .select()
    .single();

  if (buyerError) throw buyerError;
  testBuyerDid = buyer.did;
  buyerToken = TokenManager.generateToken({
    sub: testBuyerDid,
    type: 'user',
    permissions: ['orders:read', 'orders:write'],
    did: testBuyerDid
  } as any);

  // Create test order (paid status for logistics)
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({
      order_number: `ORD-2025-${Date.now()}-TEST`,
      buyer_did: testBuyerDid,
      vendor_did: testProviderDid,
      client_id: 'test-client',
      type: 'wholesale',
      items: [{ productId: 'test', quantity: 1, totalPrice: { amount: 100, currency: 'USD' } }],
      subtotal: { amount: 100, currency: 'USD' },
      fees: {
        protocolFee: { amount: 3, currency: 'USD' },
        protocolFeePercentage: 3,
        clientFee: { amount: 0, currency: 'USD' },
        clientFeePercentage: 0,
        totalFees: { amount: 3, currency: 'USD' }
      },
      total: { amount: 103, currency: 'USD' },
      shipping_address: {
        name: 'Test Buyer',
        addressLine1: '123 Test St',
        city: 'Test City',
        postalCode: '12345',
        country: 'US',
        phone: '+1234567890'
      },
      status: 'paid',
      payment_status: 'completed',
      escrow_status: 'held',
      payment_method: 'stripe'
    })
    .select()
    .single();

  if (orderError) throw orderError;
  testOrderId = order.id;

  console.log('✓ Test data created');
  console.log(`  Provider: ${testProviderDid}`);
  console.log(`  Buyer: ${testBuyerDid}`);
  console.log(`  Order: ${testOrderId}`);
}

async function cleanupTestData() {
  console.log('\nCleaning up test data...');
  
  if (testShipmentId) {
    await supabase.from('tracking_events').delete().eq('shipment_id', testShipmentId);
    await supabase.from('shipments').delete().eq('id', testShipmentId);
  }
  
  if (testQuoteId) {
    await supabase.from('shipping_quotes').delete().eq('id', testQuoteId);
  }
  
  if (testProviderId) {
    await supabase.from('logistics_providers').delete().eq('id', testProviderId);
  }
  
  if (testOrderId) {
    await supabase.from('orders').delete().eq('id', testOrderId);
  }
  
  if (testProviderDid) {
    await supabase.from('identities').delete().eq('did', testProviderDid);
  }
  
  if (testBuyerDid) {
    await supabase.from('identities').delete().eq('did', testBuyerDid);
  }

  console.log('✓ Cleanup complete');
}

// ============================================================================
// TESTS
// ============================================================================

async function test1_registerProvider() {
  console.log('\n[Test 1] POST /api/v1/logistics/providers - Register provider');

  const providerData = {
    business_name: 'Test Logistics Co',
    identity_did: testProviderDid,
    service_regions: ['US', 'CA', 'MX'],
    shipping_methods: ['standard', 'express'],
    insurance_available: true
  };

  const response = await fetch(`${API_URL}/logistics/providers`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${providerToken}`
    },
    body: JSON.stringify(providerData)
  });

  const result = await response.json();

  if (response.ok && result.success) {
    console.log('✓ Provider registered successfully');
    console.log(`  Provider ID: ${result.data.id}`);
    console.log(`  Service regions: ${result.data.service_regions.join(', ')}`);
    testProviderId = result.data.id;
    return true;
  } else {
    console.error('✗ Failed to register provider:', result);
    return false;
  }
}

async function test2_searchProviders() {
  console.log('\n[Test 2] GET /api/v1/logistics/providers - Search providers');

  const response = await fetch(`${API_URL}/logistics/providers?service_region=US&shipping_method=express`);
  const result = await response.json();

  if (response.ok && result.success) {
    console.log('✓ Providers found');
    console.log(`  Count: ${result.data.length}`);
    return true;
  } else {
    console.error('✗ Failed to search providers:', result);
    return false;
  }
}

async function test3_submitQuote() {
  console.log('\n[Test 3] POST /api/v1/logistics/quotes - Submit quote');

  const quoteData = {
    order_id: testOrderId,
    provider_id: testProviderId,
    method: 'express',
    price_fiat: 25.50,
    currency: 'USD',
    estimated_days: 3,
    insurance_included: true,
    valid_hours: 24
  };

  const response = await fetch(`${API_URL}/logistics/quotes`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${providerToken}`
    },
    body: JSON.stringify(quoteData)
  });

  const result = await response.json();

  if (response.ok && result.success) {
    console.log('✓ Quote submitted successfully');
    console.log(`  Quote ID: ${result.data.id}`);
    console.log(`  Price: ${result.data.currency} ${result.data.price_fiat}`);
    testQuoteId = result.data.id;
    return true;
  } else {
    console.error('✗ Failed to submit quote:', result);
    return false;
  }
}

async function test4_getQuotesForOrder() {
  console.log('\n[Test 4] GET /api/v1/logistics/quotes/order/:orderId - Get quotes');

  const response = await fetch(`${API_URL}/logistics/quotes/order/${testOrderId}`, {
    headers: {
      'Authorization': `Bearer ${buyerToken}`
    }
  });

  const result = await response.json();

  if (response.ok && result.success) {
    console.log('✓ Quotes retrieved');
    console.log(`  Count: ${result.data.length}`);
    return true;
  } else {
    console.error('✗ Failed to get quotes:', result);
    return false;
  }
}

async function test5_acceptQuote() {
  console.log('\n[Test 5] POST /api/v1/logistics/quotes/:id/accept - Accept quote');

  const response = await fetch(`${API_URL}/logistics/quotes/${testQuoteId}/accept`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${buyerToken}`
    }
  });

  const result = await response.json();

  if (response.ok && result.success) {
    console.log('✓ Quote accepted');
    console.log(`  Message: ${result.message}`);
    return true;
  } else {
    console.error('✗ Failed to accept quote:', result);
    return false;
  }
}

async function test6_createShipment() {
  console.log('\n[Test 6] POST /api/v1/logistics/shipments - Create shipment');

  const shipmentData = {
    order_id: testOrderId,
    quote_id: testQuoteId,
    tracking_number: 'TRACK' + Date.now(),
    estimated_delivery: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
  };

  const response = await fetch(`${API_URL}/logistics/shipments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${providerToken}`
    },
    body: JSON.stringify(shipmentData)
  });

  const result = await response.json();

  if (response.ok && result.success) {
    console.log('✓ Shipment created');
    console.log(`  Shipment ID: ${result.data.id}`);
    console.log(`  Tracking: ${result.data.tracking_number}`);
    testShipmentId = result.data.id;
    return true;
  } else {
    console.error('✗ Failed to create shipment:', result);
    return false;
  }
}

async function test7_updateShipmentStatus() {
  console.log('\n[Test 7] PUT /api/v1/logistics/shipments/:id/status - Update status');

  const updateData = {
    status: 'in_transit',
    location: 'Los Angeles, CA',
    notes: 'Package in transit to destination'
  };

  const response = await fetch(`${API_URL}/logistics/shipments/${testShipmentId}/status`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${providerToken}`
    },
    body: JSON.stringify(updateData)
  });

  const result = await response.json();

  if (response.ok && result.success) {
    console.log('✓ Status updated');
    console.log(`  New status: ${result.data.status}`);
    console.log(`  Location: ${result.data.current_location}`);
    return true;
  } else {
    console.error('✗ Failed to update status:', result);
    return false;
  }
}

async function test8_trackShipment() {
  console.log('\n[Test 8] GET /api/v1/logistics/track/:trackingNumber - Track shipment');

  // Get tracking number first
  const { data: shipment } = await supabase
    .from('shipments')
    .select('tracking_number')
    .eq('id', testShipmentId)
    .single();

  const response = await fetch(`${API_URL}/logistics/track/${shipment.tracking_number}`);
  const result = await response.json();

  if (response.ok && result.success) {
    console.log('✓ Shipment tracked');
    console.log(`  Status: ${result.data.shipment.status}`);
    console.log(`  Events: ${result.data.events.length}`);
    console.log(`  Provider: ${result.data.provider.business_name}`);
    return true;
  } else {
    console.error('✗ Failed to track shipment:', result);
    return false;
  }
}

// ============================================================================
// RUN ALL TESTS
// ============================================================================

async function runTests() {
  console.log('====================================');
  console.log('  Logistics Routes Integration Tests');
  console.log('====================================');

  let passed = 0;
  let failed = 0;

  try {
    await setupTestData();

    const tests = [
      test1_registerProvider,
      test2_searchProviders,
      test3_submitQuote,
      test4_getQuotesForOrder,
      test5_acceptQuote,
      test6_createShipment,
      test7_updateShipmentStatus,
      test8_trackShipment
    ];

    for (const test of tests) {
      try {
        const result = await test();
        if (result) {
          passed++;
        } else {
          failed++;
        }
      } catch (error) {
        console.error(`✗ Test threw error:`, error);
        failed++;
      }
    }

  } catch (error) {
    console.error('Fatal error during tests:', error);
  } finally {
    await cleanupTestData();
  }

  console.log('\n====================================');
  console.log('  Test Results');
  console.log('====================================');
  console.log(`✓ Passed: ${passed}`);
  console.log(`✗ Failed: ${failed}`);
  console.log(`Total: ${passed + failed}`);
  console.log('====================================\n');

  process.exit(failed > 0 ? 1 : 0);
}

// Run if called directly
if (require.main === module) {
  runTests().catch(console.error);
}

export { runTests };