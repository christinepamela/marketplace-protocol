/**
 * Layer 5 (Developer SDK & API) Test Runner
 * 
 * Tests API infrastructure, authentication, and endpoints
 */

import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

import request from 'supertest';
import { app } from '../src/api';

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
}

const results: TestResult[] = [];

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
  console.log(colors.cyan + '🧪 Layer 5: Developer SDK & API Tests' + colors.reset);
  console.log(colors.cyan + '━'.repeat(60) + colors.reset + '\n');

  // Test 1: Health Check
  try {
    const response = await request(app).get('/health');
    const passed = response.status === 200 && response.body.status === 'healthy';
    logTest('Health check endpoint returns 200', passed);
  } catch (error: any) {
    logTest('Health check endpoint returns 200', false, error.message);
  }

  // Test 2: Health check response structure
  try {
    const response = await request(app).get('/health');
    const passed = 
      response.body.status === 'healthy' &&
      response.body.version === 'v1' &&
      response.body.timestamp !== undefined &&
      typeof response.body.sandbox === 'boolean';
    logTest('Health check has correct response structure', passed);
  } catch (error: any) {
    logTest('Health check has correct response structure', false, error.message);
  }

  // Test 3: No authentication required for health
  try {
    const response = await request(app).get('/health');
    const passed = response.status === 200;
    logTest('Health check does not require authentication', passed);
  } catch (error: any) {
    logTest('Health check does not require authentication', false, error.message);
  }

  // Test 4: API version endpoint
  try {
    const response = await request(app).get('/api/v1/version');
    const passed = 
      response.status === 200 && 
      response.body.version === 'v1';
    logTest('API version endpoint returns correct version', passed);
  } catch (error: any) {
    logTest('API version endpoint returns correct version', false, error.message);
  }

  // Test 5: 404 handling
  try {
    const response = await request(app).get('/api/v1/nonexistent');
    const passed = 
      response.status === 404 &&
      response.body.error?.code === 'NOT_FOUND';
    logTest('Returns 404 for unknown endpoints', passed);
  } catch (error: any) {
    logTest('Returns 404 for unknown endpoints', false, error.message);
  }

  // Test 6: Request ID header
  try {
    const response = await request(app).get('/health');
    const requestId = response.headers['x-request-id'];
    const passed = 
      requestId !== undefined &&
      /^req_\d+_[a-z0-9]+$/.test(requestId);
    logTest('Adds unique request ID to all responses', passed);
  } catch (error: any) {
    logTest('Adds unique request ID to all responses', false, error.message);
  }

  // Test 7: CORS headers
  try {
    const response = await request(app)
      .get('/health')
      .set('Origin', 'http://localhost:3001');
    const passed = response.headers['access-control-allow-origin'] !== undefined;
    logTest('Includes CORS headers in responses', passed);
  } catch (error: any) {
    logTest('Includes CORS headers in responses', false, error.message);
  }

  // Test 8: OPTIONS preflight
  try {
    const response = await request(app).options('/api/v1/version');
    const passed = 
      response.status === 204 &&
      response.headers['access-control-allow-methods'] !== undefined;
    logTest('Handles OPTIONS preflight requests', passed);
  } catch (error: any) {
    logTest('Handles OPTIONS preflight requests', false, error.message);
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