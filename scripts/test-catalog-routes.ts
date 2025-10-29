/**
 * Catalog Routes Test Runner
 * 
 * Tests Layer 1 (Catalog) API endpoints
 */

import dotenv from 'dotenv';
dotenv.config();

import request from 'supertest';
import { app } from '../src/api';
import { TokenManager } from '../src/api/core/auth';

// ANSI colors
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
}

const results: TestResult[] = [];
let testProductId: string;
let testVendorDid: string;
let authToken: string;

function logTest(name: string, passed: boolean, error?: string) {
  const icon = passed ? '✓' : '✗';
  const color = passed ? colors.green : colors.red;
  console.log(`  ${color}${icon}${colors.reset} ${name}`);
  if (error) {
    console.log(`    ${colors.red}${error}${colors.reset}`);
  }
  results.push({ name, passed, error });
}

async function runTests() {
  console.log('\n' + colors.cyan + '━'.repeat(60) + colors.reset);
  console.log(colors.cyan + '🧪 Catalog Routes (Layer 1) Tests' + colors.reset);
  console.log(colors.cyan + '━'.repeat(60) + colors.reset + '\n');

  // Setup: Register vendor first
  const vendorResponse = await request(app)
    .post('/api/v1/identity/register')
    .send({
      type: 'kyc',
      clientId: 'test-marketplace',
      publicProfile: {
        displayName: 'Test Vendor Catalog',
        country: 'MY',
        businessType: 'manufacturer',
      },
    });
  
  testVendorDid = vendorResponse.body.data.did;
  authToken = TokenManager.generateToken({
    sub: testVendorDid,
    type: 'user',
    permissions: ['catalog:read', 'catalog:write', 'catalog:search'],
  });

  // Test 1: Create product
  try {
    const response = await request(app)
      .post('/api/v1/catalog/products')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        vendorDid: testVendorDid,
        clientId: 'test-marketplace',
        category: {
          primary: 'footwear',
          subcategory: 'leather-shoes',
          tags: ['handmade', 'premium'],
        },
        basic: {
          name: 'Premium Leather Shoes',
          description: 'Handcrafted leather shoes made with premium materials',
          shortDescription: 'Premium handcrafted leather shoes',
          images: {
            primary: 'https://example.com/shoe1.jpg',
          },
          condition: 'new',
        },
        advanced: {
          attributes: { sizes: ['39', '40', '41', '42'] },
          keywords: ['leather', 'shoes', 'handmade'],
        },
        pricing: {
          basePrice: { amount: 89.99, currency: 'USD' },
          moq: 1,
        },
        logistics: {
          weight: { value: 500, unit: 'g' },
          dimensions: { length: 30, width: 20, height: 10, unit: 'cm' },
          originCountry: 'MY',
          leadTime: 7,
        },
        visibility: 'public',
      });
    
    const passed = response.status === 201 && response.body.success === true;
    if (passed) {
      testProductId = response.body.data.productId;
    }
    logTest('POST /catalog/products - Create product', passed);
  } catch (error: any) {
    logTest('POST /catalog/products - Create product', false, error.message);
  }

  // Test 2: Create product validates required fields
  try {
    const response = await request(app)
      .post('/api/v1/catalog/products')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        vendorDid: testVendorDid,
        // Missing required fields
      });
    
    const passed = response.status === 400;
    logTest('POST /catalog/products - Validates required fields', passed);
  } catch (error: any) {
    logTest('POST /catalog/products - Validates required fields', false, error.message);
  }

  // Test 3: Get product by ID
  try {
    const response = await request(app)
      .get(`/api/v1/catalog/products/${testProductId}`);
    
    const passed = 
      response.status === 200 &&
      response.body.data.id === testProductId;
    logTest('GET /catalog/products/:id - Get product', passed);
  } catch (error: any) {
    logTest('GET /catalog/products/:id - Get product', false, error.message);
  }

  // Test 4: Update product
  try {
    const response = await request(app)
      .put(`/api/v1/catalog/products/${testProductId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        basic: {
          name: 'Premium Leather Shoes - Updated',
        },
        status: 'active',
      });
    
    const passed = 
      response.status === 200 &&
      response.body.data.basic.name === 'Premium Leather Shoes - Updated';
    logTest('PUT /catalog/products/:id - Update product', passed);
  } catch (error: any) {
    logTest('PUT /catalog/products/:id - Update product', false, error.message);
  }

  // Test 5: Update requires ownership
  const otherVendorToken = TokenManager.generateToken({
    sub: 'did:rangkai:other-vendor',
    type: 'user',
    permissions: ['catalog:write'],
  });
  
  try {
    const response = await request(app)
      .put(`/api/v1/catalog/products/${testProductId}`)
      .set('Authorization', `Bearer ${otherVendorToken}`)
      .send({
        basic: { name: 'Hacked' },
      });
    
    const passed = response.status === 400 || response.status === 404;
    logTest('PUT /catalog/products/:id - Requires ownership', passed);
  } catch (error: any) {
    logTest('PUT /catalog/products/:id - Requires ownership', false, error.message);
  }

  // Test 6: List products
  try {
    const response = await request(app)
      .get('/api/v1/catalog/products')
      .query({ vendorDid: testVendorDid });
    
    const passed = 
      response.status === 200 &&
      Array.isArray(response.body.data) &&
      response.body.pagination !== undefined;
    logTest('GET /catalog/products - List products', passed);
  } catch (error: any) {
    logTest('GET /catalog/products - List products', false, error.message);
  }

  // Test 7: Search products
  try {
    const response = await request(app)
      .get('/api/v1/catalog/search')
      .query({ q: 'leather shoes' });
    
    const passed = 
      response.status === 200 &&
      response.body.data !== undefined;
    logTest('GET /catalog/search - Search products', passed);
  } catch (error: any) {
    logTest('GET /catalog/search - Search products', false, error.message);
  }

  // Test 8: Search with filters
  try {
    const response = await request(app)
      .get('/api/v1/catalog/search')
      .query({
        category: 'footwear',
        minPrice: '50',
        maxPrice: '100',
      });
    
    const passed = response.status === 200;
    logTest('GET /catalog/search - Search with filters', passed);
  } catch (error: any) {
    logTest('GET /catalog/search - Search with filters', false, error.message);
  }

  // Test 9: Delete product (soft delete)
  try {
    const response = await request(app)
      .delete(`/api/v1/catalog/products/${testProductId}`)
      .set('Authorization', `Bearer ${authToken}`);
    
    const passed = response.status === 200;
    logTest('DELETE /catalog/products/:id - Delete product', passed);
  } catch (error: any) {
    logTest('DELETE /catalog/products/:id - Delete product', false, error.message);
  }

  // Test 10: Deleted product status changed
  try {
    const response = await request(app)
      .get(`/api/v1/catalog/products/${testProductId}`)
      .set('Authorization', `Bearer ${authToken}`);
    
    const passed = 
      response.status === 200 &&
      response.body.data.status === 'discontinued';
    logTest('Product status changed to discontinued after delete', passed);
  } catch (error: any) {
    logTest('Product status changed to discontinued after delete', false, error.message);
  }

  // Summary
  console.log('\n' + colors.cyan + '━'.repeat(60) + colors.reset);
  const passed = results.filter(r => r.passed).length;
  const total = results.length;
  const allPassed = passed === total;
  
  const summaryColor = allPassed ? colors.green : colors.red;
  console.log(summaryColor + `\n✓ ${passed}/${total} tests passed` + colors.reset);
  
  if (!allPassed) {
    console.log(colors.red + '\n❌ Some tests failed\n' + colors.reset);
    process.exit(1);
  } else {
    console.log(colors.green + '\n✅ All tests passed!\n' + colors.reset);
  }
}

// Run tests
runTests().catch(error => {
  console.error(colors.red + '\n❌ Test suite error:' + colors.reset, error);
  process.exit(1);
});