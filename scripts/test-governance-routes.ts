/**
 * Test: Governance Routes (Layer 6)
 * Integration tests for proposal management and voting API
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
let testSigner1Did: string;
let testSigner2Did: string;
let testSigner3Did: string;
let signer1Token: string;
let signer2Token: string;
let signer3Token: string;
let testProposalId: string;
let testProposalNumber: string;

// Test results tracking
let passedTests = 0;
let failedTests = 0;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function logTest(name: string, passed: boolean, details?: string) {
  if (passed) {
    console.log(`✓ ${name}`);
    if (details) console.log(`  ${details}`);
    passedTests++;
  } else {
    console.log(`✗ ${name}`);
    if (details) console.log(`  ${details}`);
    failedTests++;
  }
}

async function apiRequest(
  method: string,
  path: string,
  body?: any,
  token?: string
): Promise<any> {
  const options: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    },
  };

  if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`${API_URL}${path}`, options);
  const data = await response.json();

  return {
    ok: response.ok,
    status: response.status,
    ...data,
  };
}

// ============================================================================
// SETUP & CLEANUP
// ============================================================================

async function setupTestData() {
  console.log('Setting up test data...');

  try {
    // Create 3 test signers (required for 2-of-3 multisig)
    const signer1Uuid = uuidv4();
    const signer2Uuid = uuidv4();
    const signer3Uuid = uuidv4();

    testSigner1Did = `did:rangkai:${signer1Uuid}`;
    testSigner2Did = `did:rangkai:${signer2Uuid}`;
    testSigner3Did = `did:rangkai:${signer3Uuid}`;

    // Create identities
    const identities = [
      {
        did: testSigner1Did,
        type: 'kyc',
        client_id: 'test-governance',
        verification_status: 'verified',
        public_profile: {
          displayName: 'Signer 1 (Founder)',
          country: 'US',
          businessType: 'platform',
          verified: true,
        },
      },
      {
        did: testSigner2Did,
        type: 'kyc',
        client_id: 'test-governance',
        verification_status: 'verified',
        public_profile: {
          displayName: 'Signer 2 (Technical)',
          country: 'US',
          businessType: 'platform',
          verified: true,
        },
      },
      {
        did: testSigner3Did,
        type: 'kyc',
        client_id: 'test-governance',
        verification_status: 'verified',
        public_profile: {
          displayName: 'Signer 3 (Treasury)',
          country: 'US',
          businessType: 'platform',
          verified: true,
        },
      },
    ];

    const { error: identityError } = await supabase
      .from('identities')
      .insert(identities);

    if (identityError) throw identityError;

    // Add signers to governance council
    const signers = [
      {
        signer_id: testSigner1Did,
        identity_did: testSigner1Did,
        role: 'founder',
        active: true,
      },
      {
        signer_id: testSigner2Did,
        identity_did: testSigner2Did,
        role: 'technical',
        active: true,
      },
      {
        signer_id: testSigner3Did,
        identity_did: testSigner3Did,
        role: 'treasury',
        active: true,
      },
    ];

    const { error: signerError } = await supabase
      .from('governance_signers')
      .insert(signers);

    if (signerError) throw signerError;

    // Generate tokens
    signer1Token = TokenManager.generateToken({
      sub: testSigner1Did,
      did: testSigner1Did,
      type: 'user',
      permissions: ['governance:read', 'governance:propose', 'governance:vote', 'governance:execute'],
    } as any);

    signer2Token = TokenManager.generateToken({
      sub: testSigner2Did,
      did: testSigner2Did,
      type: 'user',
      permissions: ['governance:read', 'governance:propose', 'governance:vote', 'governance:execute'],
    } as any);

    signer3Token = TokenManager.generateToken({
      sub: testSigner3Did,
      did: testSigner3Did,
      type: 'user',
      permissions: ['governance:read', 'governance:propose', 'governance:vote', 'governance:execute'],
    } as any);

    console.log('✓ Test data created');
    console.log(`  Signer 1: ${testSigner1Did}`);
    console.log(`  Signer 2: ${testSigner2Did}`);
    console.log(`  Signer 3: ${testSigner3Did}`);
  } catch (error) {
    console.error('Setup failed:', error);
    throw error;
  }
}

async function cleanupTestData() {
  console.log('\nCleaning up test data...');

  try {
    // Delete in reverse order of dependencies
    if (testProposalId) {
      await supabase.from('governance_actions').delete().eq('proposal_id', testProposalId);
      await supabase.from('governance_approvals').delete().eq('proposal_id', testProposalId);
      await supabase.from('governance_proposals').delete().eq('id', testProposalId);
    }

    // Delete all test proposals
    await supabase.from('governance_proposals').delete().ilike('rationale', '%TEST:%');

    // Delete signers
    if (testSigner1Did) {
      await supabase.from('governance_signers').delete().eq('signer_id', testSigner1Did);
      await supabase.from('identities').delete().eq('did', testSigner1Did);
    }
    if (testSigner2Did) {
      await supabase.from('governance_signers').delete().eq('signer_id', testSigner2Did);
      await supabase.from('identities').delete().eq('did', testSigner2Did);
    }
    if (testSigner3Did) {
      await supabase.from('governance_signers').delete().eq('signer_id', testSigner3Did);
      await supabase.from('identities').delete().eq('did', testSigner3Did);
    }

    console.log('✓ Cleanup complete');
  } catch (error) {
    console.error('Cleanup error:', error);
  }
}

// ============================================================================
// TESTS
// ============================================================================

async function test1_createProposal() {
  console.log('\n[Test 1] POST /api/v1/proposals - Create proposal');

  try {
    const proposalData = {
      action: 'update_protocol_fee',
      params: {
        new_fee_percent: 2.5,
      },
      rationale: 'TEST: Adjusting protocol fee to improve competitiveness while maintaining sustainability.',
      voting_duration_hours: 72,
    };

    const result = await apiRequest('POST', '/proposals', proposalData, signer1Token);

    if (result.success && result.data.proposalId) {
      testProposalId = result.data.proposalId;
      testProposalNumber = result.data.proposalNumber;
      logTest(
        'Create proposal',
        true,
        `Proposal ${result.data.proposalNumber} created (ID: ${result.data.proposalId})`
      );
    } else {
      logTest('Create proposal', false, JSON.stringify(result));
    }
  } catch (error: any) {
    logTest('Create proposal', false, error.message);
  }
}

async function test2_getNonSignerCannotPropose() {
  console.log('\n[Test 2] POST /api/v1/proposals - Non-signer blocked');

  try {
    // Create non-signer token
    const nonSignerDid = `did:rangkai:${uuidv4()}`;
    const nonSignerToken = TokenManager.generateToken({
      sub: nonSignerDid,
      did: nonSignerDid,
      type: 'user',
      permissions: ['governance:read'],
    } as any);

    const proposalData = {
      action: 'emergency_pause',
      params: {},
      rationale: 'TEST: This should be blocked',
    };

    const result = await apiRequest('POST', '/proposals', proposalData, nonSignerToken);

    if (!result.success && (result.status === 403 || result.error?.code === 'FORBIDDEN')) {
      logTest('Non-signer blocked', true, 'Correctly denied proposal creation');
    } else {
      logTest('Non-signer blocked', false, 'Should have blocked non-signer');
    }
  } catch (error: any) {
    logTest('Non-signer blocked', false, error.message);
  }
}

async function test3_getProposalDetails() {
  console.log('\n[Test 3] GET /api/v1/proposals/:id - Get proposal details');

  try {
    const result = await apiRequest('GET', `/proposals/${testProposalId}`);

    if (result.success && result.data.proposal) {
      const summary = result.data;
      logTest(
        'Get proposal details',
        true,
        `Status: ${summary.proposal.status}, Approvals: ${summary.proposal.current_approvals}/${summary.proposal.required_approvals}`
      );
    } else {
      logTest('Get proposal details', false, JSON.stringify(result));
    }
  } catch (error: any) {
    logTest('Get proposal details', false, error.message);
  }
}

async function test4_getAllProposals() {
  console.log('\n[Test 4] GET /api/v1/proposals - List all proposals');

  try {
    const result = await apiRequest('GET', '/proposals?status=active');

    if (result.success && Array.isArray(result.data)) {
      logTest(
        'List proposals',
        true,
        `Found ${result.count} active proposals`
      );
    } else {
      logTest('List proposals', false, JSON.stringify(result));
    }
  } catch (error: any) {
    logTest('List proposals', false, error.message);
  }
}

async function test5_submitApprovalVote() {
  console.log('\n[Test 5] POST /api/v1/proposals/:id/vote - Submit approval (Signer 1)');

  try {
    const voteData = {
      approved: true,
      comment: 'I support this fee adjustment',
    };

    const result = await apiRequest(
      'POST',
      `/proposals/${testProposalId}/vote`,
      voteData,
      signer1Token
    );

    if (result.success && result.data.approved === true) {
      logTest(
        'Submit approval vote',
        true,
        `Vote recorded. Current: ${result.data.currentApprovals}/${result.data.requiredApprovals}`
      );
    } else {
      logTest('Submit approval vote', false, JSON.stringify(result));
    }
  } catch (error: any) {
    logTest('Submit approval vote', false, error.message);
  }
}

async function test6_submitSecondApproval() {
  console.log('\n[Test 6] POST /api/v1/proposals/:id/vote - Submit approval (Signer 2)');

  try {
    const voteData = {
      approved: true,
      comment: 'Agreed, this makes sense',
    };

    const result = await apiRequest(
      'POST',
      `/proposals/${testProposalId}/vote`,
      voteData,
      signer2Token
    );

    if (result.success && result.data.approved === true) {
      logTest(
        'Submit second approval',
        true,
        `Vote recorded. Status: ${result.data.proposalStatus}, Approvals: ${result.data.currentApprovals}/${result.data.requiredApprovals}`
      );
    } else {
      logTest('Submit second approval', false, JSON.stringify(result));
    }
  } catch (error: any) {
    logTest('Submit second approval', false, error.message);
  }
}

async function test7_duplicateVoteBlocked() {
  console.log('\n[Test 7] POST /api/v1/proposals/:id/vote - Duplicate vote blocked');

  try {
    const voteData = {
      approved: false,
    };

    const result = await apiRequest(
      'POST',
      `/proposals/${testProposalId}/vote`,
      voteData,
      signer1Token
    );

    if (!result.success && result.error?.message?.includes('already voted')) {
      logTest('Duplicate vote blocked', true, 'Correctly prevented duplicate vote');
    } else {
      logTest('Duplicate vote blocked', false, 'Should have blocked duplicate vote');
    }
  } catch (error: any) {
    logTest('Duplicate vote blocked', false, error.message);
  }
}

async function test8_submitThirdApproval() {
  console.log('\n[Test 8] POST /api/v1/proposals/:id/vote - Submit approval (Signer 3)');

  try {
    const voteData = {
      approved: true,
      comment: 'Final approval for execution',
    };

    const result = await apiRequest(
      'POST',
      `/proposals/${testProposalId}/vote`,
      voteData,
      signer3Token
    );

    if (result.success && result.data.approved === true) {
      logTest(
        'Submit third approval',
        true,
        `Vote recorded. Status: ${result.data.proposalStatus}, Approvals: ${result.data.currentApprovals}/${result.data.requiredApprovals}`
      );
    } else {
      logTest('Submit third approval', false, JSON.stringify(result));
    }
  } catch (error: any) {
    logTest('Submit third approval', false, error.message);
  }
}

async function test9_executeProposal() {
  console.log('\n[Test 9] POST /api/v1/proposals/:id/execute - Execute approved proposal');

  try {
    const result = await apiRequest(
      'POST',
      `/proposals/${testProposalId}/execute`,
      {},
      signer3Token
    );

    if (result.success && result.data.status === 'success') {
      logTest(
        'Execute proposal',
        true,
        `Action: ${result.data.action}, Result: ${JSON.stringify(result.data.result)}`
      );
    } else {
      logTest('Execute proposal', false, JSON.stringify(result));
    }
  } catch (error: any) {
    logTest('Execute proposal', false, error.message);
  }
}

// ============================================================================
// RUN ALL TESTS
// ============================================================================

async function runTests() {
  console.log('=============================================');
  console.log('  Governance Routes Integration Tests');
  console.log('  Phase 7: Layer 6 API (Proposals & Voting)');
  console.log('=============================================');

  try {
    await setupTestData();

    // Run tests in sequence
    await test1_createProposal();
    await test2_getNonSignerCannotPropose();
    await test3_getProposalDetails();
    await test4_getAllProposals();
    await test5_submitApprovalVote();
    await test6_submitSecondApproval();
    await test7_duplicateVoteBlocked();
    await test8_submitThirdApproval();
    await test9_executeProposal();

  } catch (error) {
    console.error('\n❌ Fatal error during tests:', error);
  } finally {
    await cleanupTestData();
  }

  console.log('\n=============================================');
  console.log('  Test Results');
  console.log('=============================================');
  console.log(`✓ Passed: ${passedTests}`);
  console.log(`✗ Failed: ${failedTests}`);
  console.log(`Total: ${passedTests + failedTests}`);
  console.log('=============================================\n');

  process.exit(failedTests > 0 ? 1 : 0);
}

// Run if called directly
if (require.main === module) {
  runTests().catch(console.error);
}

export { runTests };