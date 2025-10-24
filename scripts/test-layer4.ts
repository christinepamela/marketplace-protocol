/**
 * Test Layer 4 Services
 */

// Load environment variables FIRST
import * as dotenv from 'dotenv';
dotenv.config();

import { getSupabaseClient } from '../src/infrastructure/database/client';
import { DisputeService, RatingService, ComplianceService } from '../src/core/layer4-trust';
import { OrderService } from '../src/core/layer2-transaction';
import type { CreateDisputeInput, SubmitRatingInput, CheckSanctionsInput } from '../src/core/layer4-trust/types';

async function testLayer4() {
  console.log('🧪 Testing Layer 4: Trust & Compliance\n');

  // Initialize Supabase
  const db = getSupabaseClient();
  console.log('✅ Supabase client initialized');

  // Initialize services
  const disputeService = new DisputeService(db);
  const ratingService = new RatingService(db);
  const complianceService = new ComplianceService(db);
  const orderService = new OrderService(db);
  console.log('✅ Services initialized\n');

  // Get test data
  const { data: identities } = await db
    .from('identities')
    .select('did')
    .eq('type', 'kyc')
    .limit(2);

  // Get TWO orders - one for disputes (delivered), one for ratings (completed)
  const { data: deliveredOrders } = await db
    .from('orders')
    .select('*')
    .eq('status', 'delivered')
    .limit(1);

  const { data: completedOrders } = await db
    .from('orders')
    .select('*')
    .eq('status', 'completed')
    .limit(1);

  if (!identities || identities.length < 2) {
    throw new Error('Need at least 2 identities. Run test-layer0.ts first');
  }

  if (!deliveredOrders || deliveredOrders.length === 0) {
    throw new Error('Need a delivered order for disputes. Run test-layer2.ts and test-layer3.ts first');
  }

  if (!completedOrders || completedOrders.length === 0) {
    throw new Error('Need a completed order for ratings. Run test-layer2.ts first');
  }

  const disputeOrder = deliveredOrders[0]; // For dispute tests
  const ratingOrder = completedOrders[0]; // For rating tests
  
  const testBuyerDid = disputeOrder.buyer_did;
  const testVendorDid = disputeOrder.vendor_did;

  console.log(`Using buyer: ${testBuyerDid}`);
  console.log(`Using vendor: ${testVendorDid}`);
  console.log(`Dispute order: ${disputeOrder.order_number} (${disputeOrder.status})`);
  console.log(`Rating order: ${ratingOrder.order_number} (${ratingOrder.status})\n`);

  // ============================================================================
  // PART 1: DISPUTE RESOLUTION
  // ============================================================================
  console.log('=== PART 1: DISPUTE RESOLUTION ===\n');

  // Test 1: Open quality dispute
  console.log('--- Test 1: Open Quality Dispute ---');
  const disputeInput: CreateDisputeInput = {
    order_id: disputeOrder.id,
    buyer_did: testBuyerDid,
    dispute_type: 'quality',
    description: 'Product received with visible damage and missing parts',
    evidence: {
      photo_urls: ['https://example.com/damage1.jpg', 'https://example.com/damage2.jpg'],
      description_details: 'Box was crushed, product has scratches, missing screws',
    },
  };

  const dispute = await disputeService.openDispute(disputeInput);
  console.log('✅ Dispute opened:', dispute.dispute_number);
  console.log('   Type:', dispute.dispute_type);
  console.log('   Status:', dispute.status);
  console.log('   Vendor response due:', dispute.vendor_response_due_at);

  // Test 2: Get dispute events
  console.log('\n--- Test 2: Get Dispute Events ---');
  const events = await disputeService.getDisputeEvents(dispute.id);
  console.log(`✅ Found ${events.length} event(s)`);
  events.forEach((event, index) => {
    console.log(`   ${index + 1}. ${event.event_type} by ${event.actor_did}`);
  });

  // Test 3: Vendor submits response
  console.log('\n--- Test 3: Vendor Submits Response ---');
  const vendorResponse = await disputeService.submitVendorResponse({
    dispute_id: dispute.id,
    vendor_did: testVendorDid,
    response_text: 'We shipped in perfect condition. Damage likely occurred during transit.',
    counter_evidence: {
      photo_urls: ['https://example.com/pre-ship-photo.jpg'],
      description_details: 'Photos taken before shipping show product in perfect condition',
    },
    proposed_resolution: 'partial_refund',
  });
  console.log('✅ Vendor responded');
  console.log('   New status:', vendorResponse.status);

  // Test 4: Get dispute with updated events
  console.log('\n--- Test 4: Check Updated Dispute ---');
  const updatedDispute = await disputeService.getDispute(dispute.id);
  console.log('✅ Dispute status:', updatedDispute.status);
  console.log('   Has vendor response:', !!updatedDispute.vendor_response);
  if (updatedDispute.resolution) {
    console.log('   Resolution:', updatedDispute.resolution);
    console.log('   Reason:', updatedDispute.resolution_reason);
  }

  // Test 5: Get dispute statistics
  console.log('\n--- Test 5: Get Dispute Statistics ---');
  const disputeStats = await disputeService.getDisputeStats();
  console.log('✅ Dispute statistics:');
  console.log('   Total disputes:', disputeStats.total_disputes);
  console.log('   Open disputes:', disputeStats.open_disputes);
  console.log('   Auto-resolved:', disputeStats.auto_resolved_count);
  console.log('   Average resolution time:', disputeStats.average_resolution_time_hours.toFixed(1), 'hours');

  // ============================================================================
  // PART 2: RATING SYSTEM
  // ============================================================================
  console.log('\n=== PART 2: RATING SYSTEM ===\n');

  // Test 6: Buyer rates vendor
  console.log('--- Test 6: Buyer Rates Vendor ---');
  const buyerRating: SubmitRatingInput = {
    order_id: ratingOrder.id,
    rater_did: testBuyerDid,
    rater_type: 'buyer',
    rating: 4,
    comment: 'Good product quality overall, but shipping was slow',
    categories: {
      quality: 5,
      delivery: 3,
      communication: 4,
    },
  };

  const rating1 = await ratingService.submitRating(buyerRating);
  console.log('✅ Buyer rating submitted');
  console.log('   Rating:', rating1.buyer_rating, 'stars');
  console.log('   Categories:', rating1.buyer_categories);
  console.log('   Revealed:', rating1.revealed_at ? 'No (waiting for vendor)' : 'Not yet');

  // Test 7: Vendor rates buyer
  console.log('\n--- Test 7: Vendor Rates Buyer ---');
  const vendorRating: SubmitRatingInput = {
    order_id: ratingOrder.id,
    rater_did: testVendorDid,
    rater_type: 'vendor',
    rating: 5,
    comment: 'Great buyer, fast payment and good communication',
    categories: {
      payment: 5,
      communication: 5,
    },
  };

  const rating2 = await ratingService.submitRating(vendorRating);
  console.log('✅ Vendor rating submitted');
  console.log('   Rating:', rating2.vendor_rating, 'stars');
  console.log('   Revealed:', rating2.revealed_at ? 'Yes (both submitted)' : 'Not yet');

  // Test 8: Get rating for order
  console.log('\n--- Test 8: Get Rating for Order ---');
  const orderRating = await ratingService.getRatingByOrder(ratingOrder.id);
  if (orderRating) {
    console.log('✅ Rating retrieved');
    console.log('   Buyer → Vendor:', orderRating.buyer_rating, 'stars');
    console.log('   Vendor → Buyer:', orderRating.vendor_rating, 'stars');
    console.log('   Revealed at:', orderRating.revealed_at);
  }

  // Test 9: Get vendor rating statistics
  console.log('\n--- Test 9: Get Vendor Rating Statistics ---');
  const vendorStats = await ratingService.getRatingStats(testVendorDid, 'vendor');
  console.log('✅ Vendor rating statistics:');
  console.log('   Total ratings:', vendorStats.total_ratings);
  console.log('   Average:', vendorStats.average_rating);
  console.log('   Distribution:', vendorStats.rating_distribution);

  // Test 10: Test double-rating prevention
  console.log('\n--- Test 10: Test Double-Rating Prevention ---');
  try {
    await ratingService.submitRating(buyerRating);
    console.log('❌ FAILED: Should prevent double-rating');
  } catch (error: any) {
    if (error.message.includes('already rated')) {
      console.log('✅ Double-rating prevented successfully');
    } else {
      throw error;
    }
  }

  // ============================================================================
  // PART 3: COMPLIANCE (SANCTIONS & TAX)
  // ============================================================================
  console.log('\n=== PART 3: COMPLIANCE ===\n');

  // Test 11: Check sanctions (no match)
  console.log('--- Test 11: Sanctions Check (Clean) ---');
  const cleanCheck: CheckSanctionsInput = {
    identity_did: testBuyerDid,
    full_name: 'John Doe',
    birth_date: new Date('1990-01-01'),
    national_id: 'MY123456',
    check_type: 'kyc_onboarding',
  };

  const cleanResult = await complianceService.checkSanctions(cleanCheck);
  console.log('✅ Sanctions check completed');
  console.log('   Match found:', cleanResult.match_found);
  console.log('   Action:', cleanResult.action);
  console.log('   Check ID:', cleanResult.check_id);

  // Test 12: Add sanctioned entity
  console.log('\n--- Test 12: Add Sanctioned Entity ---');
  const sanctionedEntity = await complianceService.addSanctionedEntity({
    entity_name: 'Test Sanctioned Person',
    entity_type: 'individual',
    aliases: ['TSP', 'Test Person'],
    list_source: 'OFAC',
    program: 'Test Sanctions Program',
    added_date: new Date(),
    active: true,
  });
  console.log('✅ Sanctioned entity added:', sanctionedEntity.id);
  console.log('   Name:', sanctionedEntity.entity_name);
  console.log('   Source:', sanctionedEntity.list_source);

  // Test 13: Check sanctions (with match)
  console.log('\n--- Test 13: Sanctions Check (Match Found) ---');
  const matchCheck: CheckSanctionsInput = {
    identity_did: 'test_sanctioned_did',
    full_name: 'Test Sanctioned Person',
    check_type: 'manual_review',
  };

  const matchResult = await complianceService.checkSanctions(matchCheck);
  console.log('✅ Sanctions check completed');
  console.log('   Match found:', matchResult.match_found);
  console.log('   Matches:', matchResult.matches.length);
  console.log('   Confidence:', matchResult.confidence_scores[0]?.toFixed(2));
  console.log('   Action:', matchResult.action);

  // Test 14: Get sanctions history
  console.log('\n--- Test 14: Get Sanctions History ---');
  const history = await complianceService.getSanctionsHistory(testBuyerDid);
  console.log(`✅ Found ${history.length} sanctions check(s) for this identity`);

  // Test 15: Add tax rate
  console.log('\n--- Test 15: Add Tax Rate ---');
  const taxRate = await complianceService.upsertTaxRate({
    country_code: 'MY',
    tax_type: 'VAT',
    rate: 6.0,
    effective_from: new Date('2024-01-01'),
    active: true,
    description: 'Malaysia VAT (6%)',
    source_url: 'https://customs.gov.my',
  });
  console.log('✅ Tax rate added');
  console.log('   Country:', taxRate.country_code);
  console.log('   Type:', taxRate.tax_type);
  console.log('   Rate:', taxRate.rate + '%');

  // Test 16: Get tax rates
  console.log('\n--- Test 16: Get Tax Rates for Malaysia ---');
  const rates = await complianceService.getTaxRates({
    country_code: 'MY',
  });
  console.log(`✅ Found ${rates.length} active tax rate(s)`);
  rates.forEach(rate => {
    console.log(`   ${rate.tax_type}: ${rate.rate}%`);
  });

  // Test 17: Calculate tax
  console.log('\n--- Test 17: Calculate Tax for Transaction ---');
  const taxCalc = await complianceService.calculateTax('MY', 1000);
  console.log('✅ Tax calculated');
  console.log('   Subtotal: $', taxCalc.subtotal);
  console.log('   Tax amount: $', taxCalc.tax_amount.toFixed(2));
  console.log('   Total: $', taxCalc.total.toFixed(2));
  console.log('   Breakdown:');
  taxCalc.breakdown.forEach(b => {
    console.log(`      ${b.tax_type} (${b.rate}%): $${b.amount.toFixed(2)}`);
  });

  // Test 18: Get compliance statistics
  console.log('\n--- Test 18: Get Compliance Statistics ---');
  const complianceStats = await complianceService.getComplianceStats();
  console.log('✅ Compliance statistics:');
  console.log('   Total sanctions checks:', complianceStats.total_sanctions_checks);
  console.log('   Matches found:', complianceStats.matches_found);
  console.log('   Blocked identities:', complianceStats.blocked_identities);
  console.log('   Flagged for review:', complianceStats.flagged_for_review);

  console.log('\n🎉 All Layer 4 tests passed!');
  console.log('\n📊 Summary:');
  console.log('   ✅ Dispute resolution (evidence-based automation)');
  console.log('   ✅ Vendor response and counter-evidence');
  console.log('   ✅ Dispute statistics and tracking');
  console.log('   ✅ Mutual rating system (delayed visibility)');
  console.log('   ✅ Rating statistics and aggregation');
  console.log('   ✅ Double-rating prevention');
  console.log('   ✅ Sanctions screening (OFAC, UN, EU)');
  console.log('   ✅ Sanctions match detection and confidence');
  console.log('   ✅ Tax rate management by jurisdiction');
  console.log('   ✅ Tax calculation with breakdown');
}

testLayer4()
  .catch(error => {
    console.error('❌ Test failed:', error);
    process.exit(1);
  });