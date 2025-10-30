/**
 * Test: Order Routes (Layer 2)
 * Integration tests for order management API
 */

// Load environment variables FIRST
import dotenv from 'dotenv';
dotenv.config();

import { createClient } from '@supabase/supabase-js';
import { config } from '../src/api/core/config';
import { TokenManager } from '../src/api/core/auth';
import { v4 as uuidv4 } from 'uuid';
import type { CreateOrderRequest } from '../src/core/layer2-transaction/types';

// Initialize Supabase
const supabase = createClient(
  config.supabaseUrl,
  config.supabaseServiceKey
);

const API_URL = 'http://localhost:3000/api/v1';

// Test data
let testBuyerDid: string;
let testVendorDid: string;
let testProductId: string;
let testOrderId: string;
let buyerToken: string;
let vendorToken: string;

async function setupTestData() {
  console.log('Setting up test data...');

  // Create test buyer
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
      metadata: {
        kyc: {
          businessName: 'Test Buyer Co',
          country: 'MY'
        }
      }
    })
    .select()
    .single();

  if (buyerError) throw buyerError;
  testBuyerDid = buyer.did;
  // Cast to any to add 'did' field (your auth middleware should handle this)
  buyerToken = TokenManager.generateToken({
    sub: testBuyerDid,
    type: 'user',
    permissions: ['orders:read', 'orders:write'],
    did: testBuyerDid
  } as any);

  // Create test vendor
  const vendorUuid = uuidv4();
  const { data: vendor, error: vendorError } = await supabase
    .from('identities')
    .insert({
      did: `did:rangkai:${vendorUuid}`,
      type: 'kyc',
      client_id: 'test-client',
      verification_status: 'verified',
      public_profile: {
        displayName: 'Test Vendor',
        country: 'ID',
        businessType: 'manufacturer',
        verified: true
      },
      metadata: {
        kyc: {
          businessName: 'Test Vendor Manufacturing',
          country: 'ID'
        }
      }
    })
    .select()
    .single();

  if (vendorError) throw vendorError;
  testVendorDid = vendor.did;
  vendorToken = TokenManager.generateToken({
    sub: testVendorDid,
    type: 'user',
    permissions: ['orders:read', 'orders:write'],
    did: testVendorDid
  } as any);

  // Create test product
  const { data: product, error: productError } = await supabase
    .from('products')
    .insert({
      vendor_did: testVendorDid,
      client_id: 'test-client',
      category: {
        primary: 'test',
        subcategory: 'test-product',
        tags: ['test']
      },
      basic: {
        name: 'Test Product',
        description: 'Test product for orders',
        shortDescription: 'Test product',
        condition: 'new'
      },
      advanced: {
        attributes: {},
        keywords: ['test']
      },
      pricing: {
        basePrice: { amount: 100, currency: 'USD' },
        moq: 1,
        tiers: [
          { minQuantity: 1, pricePerUnit: 100, currency: 'USD' }
        ]
      },
      logistics: {
        weight: { value: 1, unit: 'kg' },
        dimensions: { length: 10, width: 10, height: 10, unit: 'cm' },
        originCountry: 'US',
        leadTime: 7,
        shippingMethods: ['air']
      },
      status: 'active',
      visibility: 'public'
    })
    .select()
    .single();

  if (productError) throw productError;
  testProductId = product.id;

  console.log('✓ Test data created');
  console.log(`  Buyer: ${testBuyerDid}`);
  console.log(`  Vendor: ${testVendorDid}`);
  console.log(`  Product: ${testProductId}`);
}

async function cleanupTestData() {
  console.log('\nCleaning up test data...');
  
  // Delete in reverse order of foreign key dependencies
  if (testOrderId) {
    await supabase.from('order_status_log').delete().eq('order_id', testOrderId);
    await supabase.from('escrow').delete().eq('order_id', testOrderId);
    await supabase.from('orders').delete().eq('id', testOrderId);
  }
  
  if (testProductId) {
    await supabase.from('products').delete().eq('id', testProductId);
  }
  
  if (testBuyerDid) {
    await supabase.from('identities').delete().eq('did', testBuyerDid);
  }
  
  if (testVendorDid) {
    await supabase.from('identities').delete().eq('did', testVendorDid);
  }

  console.log('✓ Cleanup complete');
}

// ============================================================================
// TESTS
// ============================================================================

async function test1_createOrder() {
  console.log('\n[Test 1] POST /api/v1/orders - Create order');

  const orderData = {
    vendorDid: testVendorDid,
    clientId: 'test-client',
    type: 'wholesale',
    items: [
      {
        productId: testProductId,
        productName: 'Test Product',
        quantity: 10,
        pricePerUnit: { amount: 100, currency: 'USD' },
        totalPrice: { amount: 1000, currency: 'USD' }
      }
    ],
    shippingAddress: {
      name: 'Test Buyer',
      addressLine1: '123 Test St',
      city: 'Test City',
      postalCode: '12345',
      country: 'US',
      phone: '+1234567890'
    },
    paymentMethod: 'stripe',
    buyerNotes: 'Please ship ASAP'
  };

  const response = await fetch(`${API_URL}/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${buyerToken}`
    },
    body: JSON.stringify(orderData)
  });

  const result = await response.json();

  if (response.ok && result.success) {
    console.log('✓ Order created successfully');
    console.log(`  Order ID: ${result.data.orderId}`);
    console.log(`  Order Number: ${result.data.orderNumber}`);
    console.log(`  Total: ${result.data.total.currency} ${result.data.total.amount}`);
    console.log(`  Status: ${result.data.status}`);
    testOrderId = result.data.orderId;
    return true;
  } else {
    console.error('✗ Failed to create order:', result);
    return false;
  }
}

async function test2_getOrderById() {
  console.log('\n[Test 2] GET /api/v1/orders/:id - Get order details');

  const response = await fetch(`${API_URL}/orders/${testOrderId}`, {
    headers: {
      'Authorization': `Bearer ${buyerToken}`
    }
  });

  const result = await response.json();

  if (response.ok && result.success && result.data) {
    console.log('✓ Order retrieved successfully');
    console.log(`  Order Number: ${result.data.orderNumber}`);
    console.log(`  Status: ${result.data.status}`);
    console.log(`  Buyer: ${result.data.buyerDid}`);
    console.log(`  Vendor: ${result.data.vendorDid}`);
    console.log(`  Items: ${result.data.items.length}`);
    return true;
  } else {
    console.error('✗ Failed to get order:', result);
    return false;
  }
}

async function test3_unauthorizedAccess() {
  console.log('\n[Test 3] GET /api/v1/orders/:id - Unauthorized access (should fail)');

  // Create a different user token
  const otherUserDid = `did:rangkai:${uuidv4()}`;
  const otherToken = TokenManager.generateToken({
    sub: otherUserDid,
    type: 'user',
    permissions: [],
    did: otherUserDid
  } as any);

  const response = await fetch(`${API_URL}/orders/${testOrderId}`, {
    headers: {
      'Authorization': `Bearer ${otherToken}`
    }
  });

  const result = await response.json();

  // Should get 403 Forbidden (check error code, not just status)
  if ((response.status === 403 || result.error?.code === 'FORBIDDEN') && !result.success) {
    console.log('✓ Unauthorized access correctly blocked');
    console.log(`  Error: ${result.error.message}`);
    return true;
  } else {
    console.error('✗ Should have blocked unauthorized access');
    console.error(`  Got status: ${response.status}`);
    console.error(`  Response:`, result);
    return false;
  }
}

async function test4_getOrdersByBuyer() {
  console.log('\n[Test 4] GET /api/v1/orders/buyer/:did - Get buyer orders');

  const response = await fetch(`${API_URL}/orders/buyer/${testBuyerDid}?limit=10`, {
    headers: {
      'Authorization': `Bearer ${buyerToken}`
    }
  });

  const result = await response.json();

  if (response.ok && result.success) {
    console.log('✓ Buyer orders retrieved successfully');
    console.log(`  Orders count: ${result.data.length}`);
    console.log(`  Pagination: ${JSON.stringify(result.pagination)}`);
    return true;
  } else {
    console.error('✗ Failed to get buyer orders:', result);
    return false;
  }
}

async function test5_getOrdersByVendor() {
  console.log('\n[Test 5] GET /api/v1/orders/vendor/:did - Get vendor orders');

  const response = await fetch(`${API_URL}/orders/vendor/${testVendorDid}?status=payment_pending`, {
    headers: {
      'Authorization': `Bearer ${vendorToken}`
    }
  });

  const result = await response.json();

  if (response.ok && result.success) {
    console.log('✓ Vendor orders retrieved successfully');
    console.log(`  Orders count: ${result.data.length}`);
    console.log(`  Filter: status=payment_pending`);
    return true;
  } else {
    console.error('✗ Failed to get vendor orders:', result);
    return false;
  }
}

async function test6_payOrder() {
  console.log('\n[Test 6] POST /api/v1/orders/:id/pay - Mark order as paid');

  const paymentData = {
    paymentProof: {
      stripePaymentIntentId: 'pi_test_12345',
      stripeChargeId: 'ch_test_12345',
      receiptUrl: 'https://stripe.com/receipt/12345',
      timestamp: new Date().toISOString()
    }
  };

  const response = await fetch(`${API_URL}/orders/${testOrderId}/pay`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${buyerToken}`
    },
    body: JSON.stringify(paymentData)
  });

  const result = await response.json();

  if (response.ok && result.success) {
    console.log('✓ Order marked as paid');
    console.log(`  Message: ${result.message}`);
    console.log(`  Escrow ID: ${result.data.escrowId}`);
    console.log(`  Status: ${result.data.status}`);
    return true;
  } else {
    console.error('✗ Failed to mark order as paid:', result);
    return false;
  }
}

async function test7_confirmOrder() {
  console.log('\n[Test 7] POST /api/v1/orders/:id/confirm - Vendor confirms order');

  const response = await fetch(`${API_URL}/orders/${testOrderId}/confirm`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${vendorToken}`
    }
  });

  const result = await response.json();

  if (response.ok && result.success) {
    console.log('✓ Order confirmed by vendor');
    console.log(`  Message: ${result.message}`);
    return true;
  } else {
    console.error('✗ Failed to confirm order:', result);
    return false;
  }
}

async function test8_markAsShipped() {
  console.log('\n[Test 8] POST /api/v1/orders/:id/ship - Mark order as shipped');

  const shippingData = {
    trackingNumber: 'TRACK123456',
    logisticsProviderId: 'did:logistics:fedex'
  };

  const response = await fetch(`${API_URL}/orders/${testOrderId}/ship`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${vendorToken}`
    },
    body: JSON.stringify(shippingData)
  });

  const result = await response.json();

  if (response.ok && result.success) {
    console.log('✓ Order marked as shipped');
    console.log(`  Message: ${result.message}`);
    console.log(`  Tracking: ${result.data.trackingNumber}`);
    console.log(`  Provider: ${result.data.logisticsProviderId}`);
    return true;
  } else {
    console.error('✗ Failed to mark as shipped:', result);
    return false;
  }
}

async function test9_markAsDelivered() {
  console.log('\n[Test 9] POST /api/v1/orders/:id/deliver - Mark order as delivered');

  const response = await fetch(`${API_URL}/orders/${testOrderId}/deliver`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${buyerToken}`
    }
  });

  const result = await response.json();

  if (response.ok && result.success) {
    console.log('✓ Order marked as delivered');
    console.log(`  Message: ${result.message}`);
    return true;
  } else {
    console.error('✗ Failed to mark as delivered:', result);
    return false;
  }
}

async function test10_completeOrder() {
  console.log('\n[Test 10] POST /api/v1/orders/:id/complete - Complete order and release escrow');

  const response = await fetch(`${API_URL}/orders/${testOrderId}/complete`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${buyerToken}`
    }
  });

  const result = await response.json();

  if (response.ok && result.success) {
    console.log('✓ Order completed and escrow released');
    console.log(`  Message: ${result.message}`);
    return true;
  } else {
    console.error('✗ Failed to complete order:', result);
    return false;
  }
}

async function test11_getOrderHistory() {
  console.log('\n[Test 11] GET /api/v1/orders/:id/history - Get order status history');

  const response = await fetch(`${API_URL}/orders/${testOrderId}/history`, {
    headers: {
      'Authorization': `Bearer ${buyerToken}`
    }
  });

  const result = await response.json();

  if (response.ok && result.success) {
    console.log('✓ Order history retrieved');
    console.log(`  Status changes: ${result.data.length}`);
    result.data.forEach((change: any, idx: number) => {
      console.log(`  ${idx + 1}. ${change.fromStatus} → ${change.toStatus} (${change.reason})`);
    });
    return true;
  } else {
    console.error('✗ Failed to get order history:', result);
    return false;
  }
}

async function test12_cancelOrder() {
  console.log('\n[Test 12] POST /api/v1/orders/:id/cancel - Cancel order (new order)');

  // Create a new order to cancel
  const orderData = {
    vendorDid: testVendorDid,
    clientId: 'test-client',
    type: 'sample',
    items: [
      {
        productId: testProductId,
        productName: 'Test Product',
        quantity: 1,
        pricePerUnit: { amount: 100, currency: 'USD' },
        totalPrice: { amount: 100, currency: 'USD' }
      }
    ],
    shippingAddress: {
      name: 'Test Buyer',
      addressLine1: '123 Test St',
      city: 'Test City',
      postalCode: '12345',
      country: 'US',
      phone: '+1234567890'
    },
    paymentMethod: 'stripe'
  };

  const createResponse = await fetch(`${API_URL}/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${buyerToken}`
    },
    body: JSON.stringify(orderData)
  });

  const createResult = await createResponse.json();
  const cancelOrderId = createResult.data.orderId;

  // Now cancel it
  const cancelResponse = await fetch(`${API_URL}/orders/${cancelOrderId}/cancel`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${buyerToken}`
    },
    body: JSON.stringify({ reason: 'Changed my mind' })
  });

  const cancelResult = await cancelResponse.json();

  // Cleanup
  await supabase.from('order_status_log').delete().eq('order_id', cancelOrderId);
  await supabase.from('orders').delete().eq('id', cancelOrderId);

  if (cancelResponse.ok && cancelResult.success) {
    console.log('✓ Order cancelled successfully');
    console.log(`  Message: ${cancelResult.message}`);
    console.log(`  Cancelled by: ${cancelResult.data.cancelledBy}`);
    console.log(`  Reason: ${cancelResult.data.reason}`);
    return true;
  } else {
    console.error('✗ Failed to cancel order:', cancelResult);
    return false;
  }
}

// ============================================================================
// RUN ALL TESTS
// ============================================================================

async function runTests() {
  console.log('====================================');
  console.log('  Order Routes Integration Tests');
  console.log('====================================');

  let passed = 0;
  let failed = 0;

  try {
    await setupTestData();

    // Run tests
    const tests = [
      test1_createOrder,
      test2_getOrderById,
      test3_unauthorizedAccess,
      test4_getOrdersByBuyer,
      test5_getOrdersByVendor,
      test6_payOrder,
      test7_confirmOrder,
      test8_markAsShipped,
      test9_markAsDelivered,
      test10_completeOrder,
      test11_getOrderHistory,
      test12_cancelOrder
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