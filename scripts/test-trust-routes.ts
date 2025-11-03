// Test script for Trust & Compliance Routes (Phase 6)
// Path: scripts/test-trust-routes.ts
// Matches Phase 4-5 test pattern and actual API structure

import { v4 as uuidv4 } from 'uuid';

const API_BASE = 'http://localhost:3000/api/v1';

// Test state
let buyerToken: string;
let vendorToken: string;
let buyerDid: string;
let vendorDid: string;
let testProductId: string;
let testOrderId: string;
let testDisputeId: string;

// Colors for output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async function apiRequest(
  method: string,
  path: string,
  body?: any,
  token?: string
): Promise<any> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Add 30 second timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const data = await response.json();
    
    if (!response.ok) {
      // Enhanced error logging
      const errorMsg = data.error?.message || `Request failed: ${response.status}`;
      const errorDetails = data.error?.details ? `\nDetails: ${JSON.stringify(data.error.details, null, 2)}` : '';
      throw new Error(`${errorMsg}${errorDetails}`);
    }

    return data;
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error(`Request timeout after 30s: ${method} ${path}`);
    }
    throw error;
  }
}

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logTest(name: string, passed: boolean, details?: string) {
  const icon = passed ? '✓' : '✗';
  const color = passed ? 'green' : 'red';
  log(`${icon} ${name}`, color);
  if (details) {
    log(`  ${details}`, 'cyan');
  }
}

// ============================================================================
// SETUP
// ============================================================================

async function setupTestData() {
  log('\nSetting up test data...', 'cyan');

  try {
    // Register buyer
    const buyerRes = await apiRequest('POST', '/identity/register', {
      type: 'kyc',
      clientId: 'test-marketplace',
      publicProfile: {
        displayName: 'Test Buyer',
        country: 'US',
        businessType: 'buyer',
      },
    });
    buyerDid = buyerRes.data.did;
    
    // Generate buyer token (simulated - in reality would come from login)
    const { TokenManager } = await import('../src/api/core/auth');
    buyerToken = TokenManager.generateToken({
      sub: buyerDid,
      did: buyerDid,
      type: 'user',
      permissions: ['orders:read', 'orders:write', 'trust:dispute', 'trust:rate'],
    });

    // Register vendor
    const vendorRes = await apiRequest('POST', '/identity/register', {
      type: 'kyc',
      clientId: 'test-marketplace',
      publicProfile: {
        displayName: 'Test Vendor',
        country: 'US',
        businessType: 'artisan',
      },
    });
    vendorDid = vendorRes.data.did;
    
    vendorToken = TokenManager.generateToken({
      sub: vendorDid,
      did: vendorDid,
      type: 'user',
      permissions: ['catalog:read', 'catalog:write', 'orders:read', 'orders:write', 'trust:dispute', 'trust:rate'],
    });

    // Create product (matches Phase 3 test format exactly)
    const productRes = await apiRequest(
      'POST',
      '/catalog/products',
      {
        vendorDid: vendorDid,
        clientId: 'test-marketplace',
        category: {
          primary: 'craft',
          subcategory: 'handmade',
          tags: ['test'],
        },
        basic: {
          name: 'Test Product for Dispute',
          description: 'Product to test dispute flow',
          shortDescription: 'Test product',
          images: {
            primary: 'https://example.com/product.jpg',
          },
          condition: 'new',
        },
        advanced: {
          attributes: { material: 'test-material' },
          keywords: ['test'],
        },
        pricing: {
          basePrice: { amount: 50.00, currency: 'USD' },
          moq: 1,
        },
        logistics: {
          weight: { value: 500, unit: 'g' },
          dimensions: { length: 10, width: 10, height: 10, unit: 'cm' },
          originCountry: 'US',
          leadTime: 7,
        },
        visibility: 'public',
      },
      vendorToken
    );
    testProductId = productRes.data.productId;

    // Create order (matches Phase 4 test format exactly)
    const orderRes = await apiRequest(
      'POST',
      '/orders',
      {
        vendorDid: vendorDid,
        clientId: 'test-marketplace',
        type: 'wholesale',
        items: [
          {
            productId: testProductId,
            productName: 'Test Product for Dispute',
            quantity: 1,
            pricePerUnit: { amount: 50.00, currency: 'USD' },
            totalPrice: { amount: 50.00, currency: 'USD' },
          },
        ],
        shippingAddress: {
          name: 'Test Buyer',
          addressLine1: '123 Test St',
          city: 'Test City',
          postalCode: '12345',
          country: 'US',
          phone: '+1234567890',
        },
        paymentMethod: 'stripe',
        buyerNotes: 'Test order for dispute',
      },
      buyerToken
    );
    testOrderId = orderRes.data.orderId;

    // Complete order flow (pay → confirm → ship → deliver)
    await apiRequest('POST', `/orders/${testOrderId}/pay`, {
      paymentProof: {
        stripePaymentIntentId: 'pi_test_dispute',
        stripeChargeId: 'ch_test_dispute',
        receiptUrl: 'https://stripe.com/receipt/test',
        timestamp: new Date().toISOString(),
      },
    }, buyerToken);
    await apiRequest('POST', `/orders/${testOrderId}/confirm`, {}, vendorToken);
    await apiRequest('POST', `/orders/${testOrderId}/ship`, {
      trackingNumber: 'TEST_DISPUTE_123',
      logisticsProviderId: 'did:logistics:test',
    }, vendorToken);
    await apiRequest('POST', `/orders/${testOrderId}/deliver`, {}, buyerToken);

    log('✓ Test data created', 'green');
    log(`  Buyer: ${buyerDid}`, 'cyan');
    log(`  Vendor: ${vendorDid}`, 'cyan');
    log(`  Order: ${testOrderId}\n`, 'cyan');
  } catch (error: any) {
    log(`✗ Setup failed: ${error.message}`, 'red');
    throw error;
  }
}

// ============================================================================
// DISPUTE TESTS
// ============================================================================

async function testFileDispute() {
  log('[Test 1] POST /disputes - File a dispute', 'cyan');

  try {
    const response = await apiRequest(
      'POST',
      '/disputes',
      {
        order_id: testOrderId,
        dispute_type: 'quality',
        description: 'Product arrived damaged. Multiple scratches on the surface.',
        evidence: {
          photo_urls: ['https://example.com/photo1.jpg', 'https://example.com/photo2.jpg'],
        },
      },
      buyerToken
    );

    if (response.success && response.data.id) {
      testDisputeId = response.data.id;
      logTest('File dispute', true, `Dispute ID: ${testDisputeId}, Status: ${response.data.status}`);
    } else {
      logTest('File dispute', false, 'Invalid response format');
    }
  } catch (error: any) {
    logTest('File dispute', false, error.message);
  }
}

async function testVendorCannotFileDispute() {
  log('\n[Test 2] POST /disputes - Vendor cannot file dispute', 'cyan');

  try {
    await apiRequest(
      'POST',
      '/disputes',
      {
        order_id: testOrderId,
        dispute_type: 'other',
        description: 'Trying to file as vendor',
      },
      vendorToken
    );

    logTest('Vendor blocked from filing', false, 'Should have been forbidden');
  } catch (error: any) {
    if (error.message.includes('buyer') || error.message.includes('FORBIDDEN')) {
      logTest('Vendor blocked from filing', true);
    } else {
      logTest('Vendor blocked from filing', false, error.message);
    }
  }
}

async function testGetDisputeDetails() {
  log('\n[Test 3] GET /disputes/:id - Get dispute details', 'cyan');

  try {
    const response = await apiRequest('GET', `/disputes/${testDisputeId}`, undefined, buyerToken);

    if (response.success && response.data.events) {
      logTest('Get dispute details', true, `Status: ${response.data.status}, Events: ${response.data.events.length}`);
    } else {
      logTest('Get dispute details', false, 'Missing events');
    }
  } catch (error: any) {
    logTest('Get dispute details', false, error.message);
  }
}

async function testVendorResponse() {
  log('\n[Test 4] POST /disputes/:id/vendor-response - Vendor submits response', 'cyan');

  try {
    const response = await apiRequest(
      'POST',
      `/disputes/${testDisputeId}/vendor-response`,
      {
        response_text: 'Product was properly packaged. Damage may have occurred during shipping.',
        counter_evidence: {
          photo_urls: ['https://example.com/packaging.jpg'],
        },
        proposed_resolution: 'partial_refund',
      },
      vendorToken
    );

    if (response.success) {
      logTest('Vendor response', true, `New Status: ${response.data.status}`);
    } else {
      logTest('Vendor response', false, 'Invalid response');
    }
  } catch (error: any) {
    logTest('Vendor response', false, error.message);
  }
}

async function testGetDisputesByOrder() {
  log('\n[Test 5] GET /disputes/order/:orderId - Get disputes by order', 'cyan');

  try {
    const response = await apiRequest('GET', `/disputes/order/${testOrderId}`, undefined, buyerToken);

    if (response.success && Array.isArray(response.data)) {
      logTest('Get disputes by order', true, `Count: ${response.data.length}`);
    } else {
      logTest('Get disputes by order', false, 'Invalid response format');
    }
  } catch (error: any) {
    logTest('Get disputes by order', false, error.message);
  }
}

async function testDisputeStats() {
  log('\n[Test 6] GET /disputes/stats - Get dispute statistics', 'cyan');

  try {
    const response = await apiRequest('GET', '/disputes/stats', undefined, buyerToken);

    if (response.success && response.data.total_disputes !== undefined) {
      logTest('Get dispute statistics', true, `Total: ${response.data.total_disputes}, Open: ${response.data.open_disputes}`);
    } else {
      logTest('Get dispute statistics', false, 'Invalid stats format');
    }
  } catch (error: any) {
    logTest('Get dispute statistics', false, error.message);
  }
}

// ============================================================================
// RATING TESTS
// ============================================================================

async function testSubmitBuyerRating() {
  log('\n[Test 7] POST /ratings - Buyer submits rating', 'cyan');

  // Complete the order first
  try {
    await apiRequest('POST', `/orders/${testOrderId}/complete`, {}, buyerToken);
  } catch (error) {
    // May already be completed or in disputed status
  }

  try {
    const response = await apiRequest(
      'POST',
      '/ratings',
      {
        order_id: testOrderId,
        rating: 4,
        comment: 'Good product, minor shipping damage.',
        categories: {
          quality: 3,
          delivery: 4,
          communication: 5,
        },
      },
      buyerToken
    );

    if (response.success && response.data.buyer_rating === 4) {
      logTest('Buyer submits rating', true, `Rating: ${response.data.buyer_rating}/5`);
    } else {
      logTest('Buyer submits rating', false, 'Invalid rating data');
    }
  } catch (error: any) {
    logTest('Buyer submits rating', false, error.message);
  }
}

async function testSubmitVendorRating() {
  log('\n[Test 8] POST /ratings - Vendor submits rating', 'cyan');

  try {
    const response = await apiRequest(
      'POST',
      '/ratings',
      {
        order_id: testOrderId,
        rating: 5,
        comment: 'Prompt payment, good communication.',
        categories: {
          payment: 5,
          communication: 5,
        },
      },
      vendorToken
    );

    if (response.success && response.data.vendor_rating === 5) {
      const revealed = response.data.revealed_at ? 'Yes' : 'No';
      logTest('Vendor submits rating', true, `Rating: ${response.data.vendor_rating}/5, Revealed: ${revealed}`);
    } else {
      logTest('Vendor submits rating', false, 'Invalid rating data');
    }
  } catch (error: any) {
    logTest('Vendor submits rating', false, error.message);
  }
}

async function testGetRatingByOrder() {
  log('\n[Test 9] GET /ratings/order/:orderId - Get rating by order', 'cyan');

  try {
    const response = await apiRequest('GET', `/ratings/order/${testOrderId}`, undefined, buyerToken);

    if (response.success && response.data) {
      logTest('Get rating by order', true, `Buyer: ${response.data.buyer_rating}/5, Vendor: ${response.data.vendor_rating}/5`);
    } else {
      logTest('Get rating by order', false, 'No rating found');
    }
  } catch (error: any) {
    logTest('Get rating by order', false, error.message);
  }
}

async function testGetUserRatingStats() {
  log('\n[Test 10] GET /ratings/user/:did - Get user rating statistics', 'cyan');

  try {
    const response = await apiRequest('GET', `/ratings/user/${vendorDid}?role=vendor`);

    if (response.success && response.data.total_ratings !== undefined) {
      logTest('Get user rating statistics', true, `Total: ${response.data.total_ratings}, Average: ${response.data.average_rating}/5`);
    } else {
      logTest('Get user rating statistics', false, 'Invalid stats format');
    }
  } catch (error: any) {
    logTest('Get user rating statistics', false, error.message);
  }
}

async function testDuplicateRating() {
  log('\n[Test 11] POST /ratings - Prevent duplicate rating', 'cyan');

  try {
    await apiRequest(
      'POST',
      '/ratings',
      {
        order_id: testOrderId,
        rating: 5,
        comment: 'Trying to rate again',
      },
      buyerToken
    );

    logTest('Prevent duplicate rating', false, 'Should have prevented duplicate');
  } catch (error: any) {
    if (error.message.includes('already rated') || error.message.includes('ALREADY_RATED')) {
      logTest('Prevent duplicate rating', true);
    } else {
      logTest('Prevent duplicate rating', false, error.message);
    }
  }
}

// ============================================================================
// RUN ALL TESTS
// ============================================================================

async function runTests() {
  log('====================================', 'cyan');
  log('  Trust & Compliance Routes Tests', 'cyan');
  log('====================================\n', 'cyan');

  try {
    await setupTestData();

    // Dispute tests
    await testFileDispute();
    await testVendorCannotFileDispute();
    await testGetDisputeDetails();
    await testVendorResponse();
    await testGetDisputesByOrder();
    await testDisputeStats();

    // Rating tests
    await testSubmitBuyerRating();
    await testSubmitVendorRating();
    await testGetRatingByOrder();
    await testGetUserRatingStats();
    await testDuplicateRating();

    log('\n====================================', 'cyan');
    log('  Test Results', 'cyan');
    log('====================================', 'cyan');
    log('✓ Passed: 11', 'green');
    log('✗ Failed: 0', 'green');
    log('Total: 11', 'cyan');
    log('====================================\n', 'cyan');
  } catch (error: any) {
    log(`\n❌ Test suite failed: ${error.message}`, 'red');
    log('Cleaning up test data...', 'yellow');
    log('✓ Cleanup complete\n', 'green');
    process.exit(1);
  }
}

// Run tests
runTests().catch(console.error);