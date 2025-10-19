/**
 * Test Layer 0 Services
 */

// Load environment variables FIRST
import * as dotenv from 'dotenv';
dotenv.config();

// Now import other modules
import { getSupabaseClient } from '../src/infrastructure/database/client';
import { IdentityService, ReputationService, ProofService } from '../src/core/layer0-identity';
import type { RegisterIdentityRequest } from '../src/core/layer0-identity/types';
import * as fs from 'fs';
import * as path from 'path';

async function testLayer0() {
  console.log('🧪 Testing Layer 0: Identity & Reputation\n');

  // Initialize Supabase
  const db = getSupabaseClient();
  console.log('✅ Supabase client initialized');

  // Initialize services
  const identityService = new IdentityService(db);
  const reputationService = new ReputationService(db);
  const proofService = new ProofService(db);

  // Initialize proof service with keys
  const privateKey = fs.readFileSync(path.join(__dirname, '..', 'keys', 'private.pem'), 'utf8');
  const publicKey = fs.readFileSync(path.join(__dirname, '..', 'keys', 'public.pem'), 'utf8');
  await proofService.initialize(privateKey, publicKey);
  console.log('✅ Proof service initialized\n');

  // Test 1: Register a KYC identity
  console.log('--- Test 1: Register KYC Identity ---');
  const kycRequest: RegisterIdentityRequest = {
    type: 'kyc',
    clientId: 'rangkai-client',
    publicProfile: {
      displayName: 'Test Footwear Manufacturer',
      country: 'MY',
      businessType: 'manufacturer'
    },
    kycData: {
      businessName: 'Test Footwear Sdn Bhd',
      registrationNumber: '202401234567',
      country: 'MY',
      ownerName: 'John Doe',
      businessAddress: 'Kuala Lumpur, Malaysia',
      phoneNumber: '+60123456789',
      email: 'test@footwear.com',
      documents: {
        businessRegistration: 'ipfs://Qm...',
        identityProof: 'ipfs://Qm...',
        addressProof: 'ipfs://Qm...'
      }
    }
  };

  const kycResponse = await identityService.registerIdentity(kycRequest);
  console.log('✅ KYC Identity registered:', kycResponse.did);
  console.log('   Initial trust score:', kycResponse.initialTrustScore);

  // Test 2: Verify the identity
  console.log('\n--- Test 2: Verify Identity ---');
  await identityService.verifyIdentity({
    did: kycResponse.did,
    verificationStatus: 'verified',
    verifiedBy: 'admin',
    notes: 'All documents verified'
  });
  console.log('✅ Identity verified');

  // Test 3: Get identity
  console.log('\n--- Test 3: Get Identity ---');
  const identity = await identityService.getIdentityByDID(kycResponse.did);
  console.log('✅ Identity retrieved:', identity?.publicProfile.displayName);
  console.log('   Verification status:', identity?.verificationStatus);

  // Test 4: Get reputation
  console.log('\n--- Test 4: Get Reputation ---');
  const reputation = await reputationService.getReputation(kycResponse.did);
  console.log('✅ Reputation retrieved');
  console.log('   Score:', reputation?.score);
  console.log('   Transactions:', reputation?.metrics.transactionsCompleted);

  // Test 5: Generate reputation proof
  console.log('\n--- Test 5: Generate Reputation Proof ---');
  const proof = await proofService.generateProof({
    vendorDid: kycResponse.did,
    validityDays: 30
  });
  console.log('✅ Proof generated');
  console.log('   Valid until:', proof.validUntil);
  console.log('   Signature:', proof.signature.substring(0, 20) + '...');

  // Test 6: Verify proof
  console.log('\n--- Test 6: Verify Proof ---');
  const isValid = await proofService.verifyProof(proof);
  console.log('✅ Proof verification:', isValid ? 'VALID' : 'INVALID');

  console.log('\n🎉 All tests passed!');
}

testLayer0()
  .catch(error => {
    console.error('❌ Test failed:', error);
    process.exit(1);
  });