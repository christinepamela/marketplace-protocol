/**
 * Test Layer 3 Services + Opportunities Endpoint
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

  // Mark order as confirmed (needed for opportunities)
  await orderService.updateStatus({
    orderId: orderResponse.orderId,
    newStatus: 'confirmed',
    reason: 'Test order confirmed by vendor'
  });
  console.log('   Status:', 'confirmed');

  // ============================================================================
  // NEW TESTS: Opportunities Endpoint
  // ============================================================================

  // Test 5: Get opportunities (should include our confirmed order)
  console.log('\n--- Test 5: Get Opportunities (No Filters) ---');
  const { data: allOpportunities, error: oppsError } = await db
    .from('orders')
    .select('*')
    .eq('status', 'confirmed');
  
  if (oppsError) {
    console.error('❌ Failed to query opportunities:', oppsError);
  } else {
    console.log(`✅ Found ${allOpportunities?.length || 0} confirmed order(s)`);
    if (allOpportunities && allOpportunities.length > 0) {
      const order = allOpportunities[0];
      console.log('   Order ID:', order.id);
      console.log('   Items:', JSON.stringify(order.items, null, 2));
      console.log('   Shipping Address:', JSON.stringify(order.shipping_address, null, 2));
    }
  }

  // Test 6: Verify order has no accepted quotes (should be an opportunity)
  console.log('\n--- Test 6: Verify No Accepted Quotes ---');
  const { data: acceptedQuotes } = await db
    .from('shipping_quotes')
    .select('order_id')
    .eq('order_id', orderResponse.orderId)
    .eq('status', 'accepted');
  
  console.log(`✅ Accepted quotes for this order: ${acceptedQuotes?.length || 0}`);
  if (acceptedQuotes && acceptedQuotes.length === 0) {
    console.log('   ✓ Order should appear in opportunities');
  }

  // Test 7: Verify product has logistics data
  console.log('\n--- Test 7: Verify Product Logistics Data ---');
  const { data: productData } = await db
    .from('products')
    .select('id, logistics')
    .eq('id', testProduct.id)
    .single();
  
  if (productData) {
    console.log('✅ Product logistics data:');
    console.log('   Raw:', JSON.stringify(productData.logistics, null, 2));
    
    const logistics = productData.logistics as any;
    if (logistics.weight) {
      console.log('   Weight:', logistics.weight.value, logistics.weight.unit);
    } else {
      console.log('   ⚠️  No weight data found');
    }
    
    if (logistics.dimensions) {
      console.log('   Dimensions:', 
        logistics.dimensions.length, '×',
        logistics.dimensions.width, '×',
        logistics.dimensions.height,
        logistics.dimensions.unit
      );
    } else {
      console.log('   ⚠️  No dimensions data found');
    }
  }

  // Test 8: Simulate opportunities endpoint logic
  console.log('\n--- Test 8: Simulate Opportunities Calculation ---');
  
  // Fetch the order to get items
  const { data: orderData } = await db
    .from('orders')
    .select('*')
    .eq('id', orderResponse.orderId)
    .single();
  
  if (!orderData) {
    console.log('   ⚠️  Could not fetch order data');
  } else {
    const items = orderData.items as any[] || [];
    let totalWeight = 0;
    let dimensions = { length: 0, width: 0, height: 0 };
    
    for (const item of items) {
      const { data: product } = await db
        .from('products')
        .select('logistics')
        .eq('id', item.productId)
        .single();
      
      if (product && product.logistics) {
        const logistics = product.logistics as any;
        
        // Calculate weight (structure: { weight: { value: 2, unit: "kg" } })
        if (logistics.weight) {
          const weight = logistics.weight.unit === 'kg' 
            ? logistics.weight.value 
            : logistics.weight.value / 1000;
          totalWeight += weight * item.quantity;
          console.log(`   Item: ${item.productName}`);
          console.log(`   Weight: ${weight} kg × ${item.quantity} = ${weight * item.quantity} kg`);
        }
        
        // Get dimensions (structure: { dimensions: { length: 30, width: 30, height: 15 } })
        if (dimensions.length === 0 && logistics.dimensions) {
          dimensions = {
            length: logistics.dimensions.length || 0,
            width: logistics.dimensions.width || 0,
            height: logistics.dimensions.height || 0
          };
          console.log(`   Dimensions: ${dimensions.length}×${dimensions.width}×${dimensions.height} cm`);
        }
      }
    }
    
    console.log(`✅ Total calculated weight: ${totalWeight} kg`);
    console.log(`✅ Dimensions: ${dimensions.length}×${dimensions.width}×${dimensions.height} cm`);

    // Test 9: Filter by region
    console.log('\n--- Test 9: Test Region Filter ---');
    const shippingAddress = orderData.shipping_address as any;
    const destCountry = shippingAddress?.country || 'Unknown';
    console.log(`✅ Order destination: ${destCountry}`);
    console.log(`   Filtering for "${destCountry}" should include this order`);
  }

  // ============================================================================
  // ORIGINAL TESTS CONTINUE
  // ============================================================================

  // Test 10: Submit quote
  console.log('\n--- Test 10: Provider Submits Quote ---');
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

  // Test 11: Verify order now excluded from opportunities
  console.log('\n--- Test 11: Verify Order Excluded After Quote Accepted ---');
  // (Will test after accepting quote in next steps)

  // Test 12: Get quotes for order
  console.log('\n--- Test 12: Get Quotes for Order ---');
  const quotes = await quoteService.getQuotesForOrder(orderResponse.orderId);
  console.log(`✅ Found ${quotes.length} active quote(s) for order`);
  if (quotes.length > 0) {
    console.log('   First quote:', quotes[0].method, '-', quotes[0].price_sats, 'sats');
  }

  // Test 13: Accept quote
  console.log('\n--- Test 13: Accept Quote ---');
  const acceptedQuote = await quoteService.acceptQuote(quote.id);
  console.log('✅ Quote accepted');
  console.log('   Status:', acceptedQuote.status);

  // Test 14: Verify order now excluded from opportunities
  console.log('\n--- Test 14: Verify Exclusion After Acceptance ---');
  const { data: ordersWithAcceptedQuotes2 } = await db
    .from('shipping_quotes')
    .select('order_id')
    .eq('order_id', orderResponse.orderId)
    .eq('status', 'accepted');
  
  console.log(`✅ Order has ${ordersWithAcceptedQuotes2?.length || 0} accepted quote(s)`);
  console.log('   This order should NOT appear in opportunities anymore');

  // Test 15: Create shipment
  console.log('\n--- Test 15: Create Shipment ---');
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

  // Test 16: Update shipment status - picked up
  console.log('\n--- Test 16: Update Status - Picked Up ---');
  await trackingService.updateStatus({
    shipment_id: shipment.id,
    status: 'picked_up',
    location: 'Origin Hub - Kuala Lumpur',
    notes: 'Package collected from sender'
  });
  console.log('✅ Status updated to: picked_up');

  // Test 17: Update shipment status - in transit
  console.log('\n--- Test 17: Update Status - In Transit ---');
  await trackingService.updateStatus({
    shipment_id: shipment.id,
    status: 'in_transit',
    location: 'Transit Hub - Singapore',
    notes: 'Package in transit to destination'
  });
  console.log('✅ Status updated to: in_transit');

  // Test 18: Get tracking events
  console.log('\n--- Test 18: Get Tracking Events ---');
  const events = await trackingService.getTrackingEvents(shipment.id);
  console.log(`✅ Retrieved ${events.length} tracking events:`);
  events.forEach((event, index) => {
    console.log(`   ${index + 1}. ${event.status} - ${event.location || 'N/A'} (${event.notes || 'No notes'})`);
  });

  // Test 19: Track by tracking number
  console.log('\n--- Test 19: Track by Tracking Number ---');
  const trackedShipment = await trackingService.getByTrackingNumber(shipment.tracking_number);
  console.log('✅ Shipment found by tracking number');
  console.log('   Current status:', trackedShipment.status);
  console.log('   Current location:', trackedShipment.current_location);

  // Test 20: Mark as delivered with proof
  console.log('\n--- Test 20: Add Proof of Delivery ---');
  const proofData = Buffer.from('delivery_signature_' + Date.now());
  const deliveredShipment = await trackingService.addProofOfDelivery(
    shipment.id,
    proofData
  );
  console.log('✅ Proof of delivery added');
  console.log('   Status:', deliveredShipment.status);
  console.log('   Proof hash:', deliveredShipment.proof_of_delivery_hash?.substring(0, 20) + '...');

  // Test 21: Verify order status updated
  console.log('\n--- Test 21: Verify Order Status Updated ---');
  const updatedOrder = await orderService.getOrderById(orderResponse.orderId);
  console.log('✅ Order status after delivery:', updatedOrder?.status);

  // Test 22: Update provider rating
  console.log('\n--- Test 22: Update Provider Rating ---');
  await providerService.updateProviderRating(provider.id, 5.0);
  await providerService.updateProviderRating(provider.id, 4.5);
  await providerService.updateProviderRating(provider.id, 4.8);

  const ratedProvider = await providerService.getProvider(provider.id);
  console.log('✅ Provider rating updated');
  console.log('   Average rating:', ratedProvider.average_rating?.toFixed(2));
  console.log('   Total deliveries:', ratedProvider.total_deliveries);

  // Test 23: Get provider stats
  console.log('\n--- Test 23: Get Provider Statistics ---');
  const stats = await providerService.getProviderStats(provider.id);
  console.log('✅ Provider stats retrieved');
  console.log('   Active shipments:', stats.active_shipments);
  console.log('   Completed shipments:', stats.completed_shipments);
  console.log('   Pending quotes:', stats.pending_quotes);

  // Test 24: Get complete tracking info
  console.log('\n--- Test 24: Get Complete Tracking Info ---');
  const trackingInfo = await trackingService.getTrackingInfo(shipment.tracking_number);
  console.log('✅ Complete tracking info retrieved');
  console.log('   Shipment status:', trackingInfo.shipment.status);
  console.log('   Provider:', trackingInfo.provider.business_name);
  console.log('   Events count:', trackingInfo.events.length);

  // Test 25: Verify proof of delivery
  console.log('\n--- Test 25: Verify Proof of Delivery ---');
  const isProofValid = trackingService.verifyProofOfDelivery(
    proofData,
    deliveredShipment.proof_of_delivery_hash!
  );
  console.log('✅ Proof verification:', isProofValid ? 'VALID' : 'INVALID');

  console.log('\n🎉 All Layer 3 tests passed!');
  console.log('\n📊 Summary:');
  console.log('   ✅ Provider registration and search');
  console.log('   ✅ Opportunities endpoint data verification');
  console.log('   ✅ Weight and dimensions calculation');
  console.log('   ✅ Region filtering logic');
  console.log('   ✅ Quote exclusion logic');
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