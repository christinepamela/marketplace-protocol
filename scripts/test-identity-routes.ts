/**
 * Identity Routes Test Runner
 * 
 * Tests Layer 0 (Identity) API endpoints
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
let testDID: string;
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
  console.log(colors.cyan + '🧪 Identity Routes (Layer 0) Tests' + colors.reset);
  console.log(colors.cyan + '━'.repeat(60) + colors.reset + '\n');

  // Test 1: Register new identity
  try {
    const response = await request(app)
      .post('/api/v1/identity/register')
      .send({
        type: 'kyc',
        clientId: 'test-marketplace',
        publicProfile: {
          displayName: 'Test Vendor API',
          country: 'US',
          businessType: 'artisan',
          bio: 'Test vendor for API',
        },
      });
    
    const passed = response.status === 201 && response.body.success === true;
    if (passed) {
      testDID = response.body.data.did;
    }
    logTest('POST /identity/register - Register new identity', passed);
  } catch (error: any) {
    logTest('POST /identity/register - Register new identity', false, error.message);
  }

  // Test 2: Register validates required fields
  try {
    const response = await request(app)
      .post('/api/v1/identity/register')
      .send({
        type: 'kyc',
        // Missing clientId and publicProfile
      });
    
    const passed = response.status === 400;
    logTest('POST /identity/register - Validates required fields', passed);
  } catch (error: any) {
    logTest('POST /identity/register - Validates required fields', false, error.message);
  }

  // Test 3: Get identity (public)
  try {
    const response = await request(app)
      .get(`/api/v1/identity/${testDID}`);
    
    const passed = 
      response.status === 200 &&
      response.body.data.did === testDID &&
      response.body.data.contactInfo === undefined; // Contact info hidden for public
    logTest('GET /identity/:did - Get identity without auth', passed);
  } catch (error: any) {
    logTest('GET /identity/:did - Get identity without auth', false, error.message);
  }

  // Generate auth token for authenticated tests
  authToken = TokenManager.generateToken({
    sub: testDID,
    type: 'user',
    permissions: ['identity:read', 'identity:write', 'identity:verify'],
  });

  // Test 4: Get identity (authenticated - own profile)
  try {
    const response = await request(app)
      .get(`/api/v1/identity/${testDID}`)
      .set('Authorization', `Bearer ${authToken}`);
    
    const passed = 
      response.status === 200 &&
      response.body.data.did === testDID &&
      response.body.data.metadata !== undefined; // Metadata visible for own profile
    logTest('GET /identity/:did - Get own identity with auth', passed);
  } catch (error: any) {
    logTest('GET /identity/:did - Get own identity with auth', false, error.message);
  }

  // Test 5: Get identity - Invalid DID format
  try {
    const response = await request(app)
      .get('/api/v1/identity/invalid-did');
    
    const passed = response.status === 400;
    logTest('GET /identity/:did - Rejects invalid DID format', passed);
  } catch (error: any) {
    logTest('GET /identity/:did - Rejects invalid DID format', false, error.message);
  }

  // Test 6: Get reputation
  try {
    const response = await request(app)
      .get(`/api/v1/identity/${testDID}/reputation`);
    
    const passed = 
      response.status === 200 &&
      response.body.data.vendorDid === testDID &&
      response.body.data.score !== undefined;
    logTest('GET /identity/:did/reputation - Get reputation', passed);
  } catch (error: any) {
    logTest('GET /identity/:did/reputation - Get reputation', false, error.message);
  }

  // Test 7: Verify identity - Requires auth
  try {
    const response = await request(app)
      .post(`/api/v1/identity/${testDID}/verify`);
    
    const passed = response.status === 401;
    logTest('POST /identity/:did/verify - Requires authentication', passed);
  } catch (error: any) {
    logTest('POST /identity/:did/verify - Requires authentication', false, error.message);
  }

  // Test 8: Verify identity - With auth
  try {
    const response = await request(app)
      .post(`/api/v1/identity/${testDID}/verify`)
      .set('Authorization', `Bearer ${authToken}`);
    
    const passed = 
      response.status === 200 &&
      response.body.success === true;
    logTest('POST /identity/:did/verify - Initiate verification', passed);
  } catch (error: any) {
    logTest('POST /identity/:did/verify - Initiate verification', false, error.message);
  }

  // Test 9: Generate proof - Requires auth
  try {
    const response = await request(app)
      .post(`/api/v1/identity/${testDID}/proof`)
      .send({ vendorDid: testDID });
    
    const passed = response.status === 401;
    logTest('POST /identity/:did/proof - Requires authentication', passed);
  } catch (error: any) {
    logTest('POST /identity/:did/proof - Requires authentication', false, error.message);
  }

  // Test 10: Generate proof - With auth
  try {
    const response = await request(app)
      .post(`/api/v1/identity/${testDID}/proof`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        vendorDid: testDID,
        validityDays: 30,
      });
    
    // Accept either success or specific error about signing key
    const passed = 
      (response.status === 200 && response.body.data.signature !== undefined) ||
      (response.status === 500 && response.body.error.message.includes('Signing key'));
    
    if (!passed) {
      logTest('POST /identity/:did/proof - Generate reputation proof', false, 
        `Expected 200 or signing key error, got ${response.status}: ${response.body.error?.message || 'Unknown'}`);
    } else {
      logTest('POST /identity/:did/proof - Generate reputation proof', true);
    }
  } catch (error: any) {
    logTest('POST /identity/:did/proof - Generate reputation proof', false, error.message);
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