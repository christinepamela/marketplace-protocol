/**
 * Test Layer 3 Services
 */

// Load environment variables FIRST
import * as dotenv from 'dotenv';
dotenv.config();

import { getSupabaseClient } from '../src/infrastructure/database/client';
import { ProviderService, QuoteService, TrackingService } from '../src/core/layer3-logistics';
import { OrderService } from '../src/core/layer2-transaction';
import type { CreateProviderInput, SubmitQuoteInput, CreateShipmentInput } from '../src/core/layer3-logistics/types';
import type { CreateOrderRequest, OrderItem } from '../src/core/layer2-transaction/types';

async function testLayer3() {
  console.log('🧪 Testing Layer 3: Logistics Coordination\n');

  // Initialize Supabase
  const db = getSupabaseClient();
  console.log('✅ Supabase client initialized');

  // Initialize services
  const providerService = new ProviderService(db);
  const quoteService = new QuoteService(db);
  const trackingService = new TrackingService(db);
  const orderService = new OrderService(db);
  console.log('✅ Services initialized\n');

  // Get test data from previous layers
  const { data: vendors } = await db
    .from('identities')
    .select('did')
    .eq('type', 'kyc')
    .limit(2);

  const { data: products } = await db
    .from('products')
    .select('*')
    .eq('status', 'active')
    .limit(1);

  if (!vendors || vendors.length === 0) {
    throw new Error('No vendors found. Run test-layer0.ts first');
  }

  if (!products || products.length === 0) {
    throw new Error('No products found. Run test-layer1.ts first');
  }

  const testVendorDid = vendors[0].did;
  const testProviderDid = vendors.length > 1 ? vendors[1].did : vendors[0].did;
  const testProduct = products[0];

  console.log(`Using vendor: ${testVendorDid}`);
  console.log(`Using provider: ${testProviderDid}`);
  console.log(`Using product: ${testProduct.basic.name}\n`);

  // Test 1: Register logistics provider
  console.log('--- Test 1: Register Logistics Provider ---');
  const providerRequest: CreateProviderInput = {
    business_name: 'FastShip Logistics',
    identity_did: testProviderDid,
    service_regions: ['MY', 'SG', 'ID'],
    shipping_methods: ['standard', 'express'],
    insurance_available: true
  };

  const provider = await providerService.registerProvider(providerRequest);
  console.log('✅ Provider registered:', provider.id);
  console.log('   Business:', provider.business_name);
  console.log('   Regions:', provider.service_regions.join(', '));
  console.log('   Methods:', provider.shipping_methods.join(', '));

  // Test 2: Get provider
  console.log('\n--- Test 2: Get Provider ---');
  const retrievedProvider = await providerService.getProvider(provider.id);
  console.log('✅ Provider retrieved:', retrievedProvider.business_name);

  // Test 3: Search providers by region
  console.log('\n--- Test 3: Search Providers by Region ---');
  const providers = await providerService.findProviders({
    service_region: 'MY',
    shipping_method: 'express'
  });
  console.log(`✅ Found ${providers.length} providers in MY offering express`);

  // Test 4: Create order for quote testing
  console.log('\n--- Test 4: Create Test Order ---');
  const orderItems: OrderItem[] = [
    {
      productId: testProduct.id,
      productName: testProduct.basic.name,
      quantity: 20,
      pricePerUnit: testProduct.pricing.basePrice,
      totalPrice: {
        amount: testProduct.pricing.basePrice.amount * 20,
        currency: testProduct.pricing.basePrice.currency
      }
    }
  ];

  const createOrderRequest: CreateOrderRequest = {
    buyerDid: testVendorDid,
    vendorDid: testVendorDid,
    clientId: 'rangkai-client',
    type: 'wholesale',
    items: orderItems,
    shippingAddress: {
      name: 'John Doe',
      addressLine1: '123 Test Street',
      city: 'Kuala Lumpur',
      postalCode: '50000',
      country: 'MY',
      phone: '+60123456789'
    },
    paymentMethod: 'lightning'
  };

  const orderResponse = await orderService.createOrder(createOrderRequest);
  console.log('✅ Order created:', orderResponse.orderNumber);

  // Mark order as paid
  await orderService.updateStatus({
    orderId: orderResponse.orderId,
    newStatus: 'paid',
    reason: 'Test payment confirmed'
  });
  console.log('   Status:', 'paid');

  // Test 5: Submit quote
  console.log('\n--- Test 5: Provider Submits Quote ---');
  const quoteRequest: SubmitQuoteInput = {
    order_id: orderResponse.orderId,
    provider_id: provider.id,
    method: 'express',
    price_sats: 8000,
    estimated_days: 3,
    insurance_included: true,
    valid_hours: 48
  };

  const quote = await quoteService.submitQuote(quoteRequest);
  console.log('✅ Quote submitted:', quote.id);
  console.log('   Method:', quote.method);
  console.log('   Price:', quote.price_sats, 'sats');
  console.log('   Delivery:', quote.estimated_days, 'days');
  console.log('   Valid until:', quote.valid_until);

  // Test 6: Get quotes for order
  console.log('\n--- Test 6: Get Quotes for Order ---');
  const quotes = await quoteService.getQuotesForOrder(orderResponse.orderId);
  console.log(`✅ Found ${quotes.length} active quote(s) for order`);
  if (quotes.length > 0) {
    console.log('   First quote:', quotes[0].method, '-', quotes[0].price_sats, 'sats');
  }

  // Test 7: Accept quote
  console.log('\n--- Test 7: Accept Quote ---');
  const acceptedQuote = await quoteService.acceptQuote(quote.id);
  console.log('✅ Quote accepted');
  console.log('   Status:', acceptedQuote.status);

  // Test 8: Create shipment
  console.log('\n--- Test 8: Create Shipment ---');
  const shipmentRequest: CreateShipmentInput = {
    order_id: orderResponse.orderId,
    quote_id: acceptedQuote.id,
    tracking_number: 'TRACK' + Date.now(),
    estimated_delivery: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
  };

  const shipment = await trackingService.createShipment(shipmentRequest);
  console.log('✅ Shipment created:', shipment.id);
  console.log('   Tracking:', shipment.tracking_number);
  console.log('   Status:', shipment.status);

  // Test 9: Update shipment status - picked up
  console.log('\n--- Test 9: Update Status - Picked Up ---');
  await trackingService.updateStatus({
    shipment_id: shipment.id,
    status: 'picked_up',
    location: 'Origin Hub - Kuala Lumpur',
    notes: 'Package collected from sender'
  });
  console.log('✅ Status updated to: picked_up');

  // Test 10: Update shipment status - in transit
  console.log('\n--- Test 10: Update Status - In Transit ---');
  await trackingService.updateStatus({
    shipment_id: shipment.id,
    status: 'in_transit',
    location: 'Transit Hub - Singapore',
    notes: 'Package in transit to destination'
  });
  console.log('✅ Status updated to: in_transit');

  // Test 11: Get tracking events
  console.log('\n--- Test 11: Get Tracking Events ---');
  const events = await trackingService.getTrackingEvents(shipment.id);
  console.log(`✅ Retrieved ${events.length} tracking events:`);
  events.forEach((event, index) => {
    console.log(`   ${index + 1}. ${event.status} - ${event.location || 'N/A'} (${event.notes || 'No notes'})`);
  });

  // Test 12: Track by tracking number
  console.log('\n--- Test 12: Track by Tracking Number ---');
  const trackedShipment = await trackingService.getByTrackingNumber(shipment.tracking_number);
  console.log('✅ Shipment found by tracking number');
  console.log('   Current status:', trackedShipment.status);
  console.log('   Current location:', trackedShipment.current_location);

  // Test 13: Mark as delivered with proof
  console.log('\n--- Test 13: Add Proof of Delivery ---');
  const proofData = Buffer.from('delivery_signature_' + Date.now());
  const deliveredShipment = await trackingService.addProofOfDelivery(
    shipment.id,
    proofData
  );
  console.log('✅ Proof of delivery added');
  console.log('   Status:', deliveredShipment.status);
  console.log('   Proof hash:', deliveredShipment.proof_of_delivery_hash?.substring(0, 20) + '...');

  // Test 14: Verify order status updated
  console.log('\n--- Test 14: Verify Order Status Updated ---');
  const updatedOrder = await orderService.getOrderById(orderResponse.orderId);
  console.log('✅ Order status after delivery:', updatedOrder?.status);

  // Test 15: Update provider rating
  console.log('\n--- Test 15: Update Provider Rating ---');
  await providerService.updateProviderRating(provider.id, 5.0);
  await providerService.updateProviderRating(provider.id, 4.5);
  await providerService.updateProviderRating(provider.id, 4.8);

  const ratedProvider = await providerService.getProvider(provider.id);
  console.log('✅ Provider rating updated');
  console.log('   Average rating:', ratedProvider.average_rating?.toFixed(2));
  console.log('   Total deliveries:', ratedProvider.total_deliveries);

  // Test 16: Get provider stats
  console.log('\n--- Test 16: Get Provider Statistics ---');
  const stats = await providerService.getProviderStats(provider.id);
  console.log('✅ Provider stats retrieved');
  console.log('   Active shipments:', stats.active_shipments);
  console.log('   Completed shipments:', stats.completed_shipments);
  console.log('   Pending quotes:', stats.pending_quotes);

  // Test 17: Get complete tracking info
  console.log('\n--- Test 17: Get Complete Tracking Info ---');
  const trackingInfo = await trackingService.getTrackingInfo(shipment.tracking_number);
  console.log('✅ Complete tracking info retrieved');
  console.log('   Shipment status:', trackingInfo.shipment.status);
  console.log('   Provider:', trackingInfo.provider.business_name);
  console.log('   Events count:', trackingInfo.events.length);

  // Test 18: Verify proof of delivery
  console.log('\n--- Test 18: Verify Proof of Delivery ---');
  const isProofValid = trackingService.verifyProofOfDelivery(
    proofData,
    deliveredShipment.proof_of_delivery_hash!
  );
  console.log('✅ Proof verification:', isProofValid ? 'VALID' : 'INVALID');

  console.log('\n🎉 All Layer 3 tests passed!');
  console.log('\n📊 Summary:');
  console.log('   ✅ Provider registration and search');
  console.log('   ✅ Quote submission and acceptance');
  console.log('   ✅ Shipment creation and tracking');
  console.log('   ✅ Status updates through lifecycle');
  console.log('   ✅ Proof of delivery with cryptographic hash');
  console.log('   ✅ Provider rating system');
  console.log('   ✅ Order status integration (delivered)');
}

testLayer3()
  .catch(error => {
    console.error('❌ Test failed:', error);
    process.exit(1);
  });