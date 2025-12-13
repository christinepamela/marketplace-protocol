/**
 * Generate Token Script (Simplified)
 * Just creates a JWT token from an existing DID
 */

const jwt = require('jsonwebtoken');
require('dotenv').config();

// Use the provider DID from your test
const TEST_DID = 'did:rangkai:aeb78760-25ae-4b31-bc87-99e6ec2a5bb7';

console.log('🔑 Generating JWT token for testing...\n');
console.log('   Using DID:', TEST_DID);
console.log('');

// Check if JWT_SECRET exists
if (!process.env.JWT_SECRET) {
  console.error('❌ JWT_SECRET not found in .env file');
  process.exit(1);
}

// Generate JWT token
const token = jwt.sign(
  { 
    did: TEST_DID, 
    sub: TEST_DID, 
    type: 'kyc' 
  },
  process.env.JWT_SECRET,
  { expiresIn: '30d' }
);

console.log('✅ JWT Token Generated (valid for 30 days)');
console.log('');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('COPY THIS TOKEN:');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(token);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('');
console.log('Use this token in Authorization header:');
console.log(`Bearer ${token}`);
console.log('');