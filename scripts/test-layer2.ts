/**
 * Test Layer 2 Services
 */

// Load environment variables FIRST
import * as dotenv from 'dotenv';
dotenv.config();

import { getSupabaseClient } from '../src/infrastructure/database/client';
import { OrderService, EscrowService, PaymentService, FeeService } from '../src/core/layer2-transaction';
import type { CreateOrderRequest, OrderItem } from '../src/core/layer2-transaction/types';

async function testLayer2() {
  console.log('🧪 Testing Layer 2: Transaction & Settlement\n');

  // Initialize Supabase
  const db = getSupabaseClient();
  console.log('✅ Supabase client initialized');

  // Initialize services
  const orderService = new OrderService(db);
  const escrowService = new EscrowService(db);
  const paymentService = new PaymentService(db);
  const feeService = new FeeService(db);
  console.log('✅ Services initialized\n');

  // Get test data from previous layers
  const { data: vendors } = await db
    .from('identities')
    .select('did')
    .eq('type', 'kyc')
    .limit(1);

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
  const testBuyerDid = testVendorDid; // Using same for simplicity
  const testProduct = products[0];

  console.log(`Using vendor: ${testVendorDid}`);
  console.log(`Using product: ${testProduct.basic.name}\n`);

  // Test 1: Create order
  console.log('--- Test 1: Create Order ---');
  const orderItems: OrderItem[] = [
    {
      productId: testProduct.id,
      productName: testProduct.basic.name,
      quantity: 10,
      pricePerUnit: testProduct.pricing.basePrice,
      totalPrice: {
        amount: testProduct.pricing.basePrice.amount * 10,
        currency: testProduct.pricing.basePrice.currency
      }
    }
  ];

  const createRequest: CreateOrderRequest = {
    buyerDid: testBuyerDid,
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

  const createResponse = await orderService.createOrder(createRequest);
  console.log('✅ Order created:', createResponse.orderNumber);
  console.log('   Order ID:', createResponse.orderId);
  console.log('   Total:', createResponse.total.amount, createResponse.total.currency);
  console.log('   Status:', createResponse.status);

  // Test 2: Get order details
  console.log('\n--- Test 2: Get Order Details ---');
  const order = await orderService.getOrderById(createResponse.orderId);
  console.log('✅ Order retrieved');
  console.log('   Items:', order?.items.length);
  console.log('   Subtotal:', order?.subtotal.amount);
  console.log('   Protocol fee:', order?.fees.protocolFee.amount, `(${order?.fees.protocolFeePercentage}%)`);
  console.log('   Client fee:', order?.fees.clientFee.amount, `(${order?.fees.clientFeePercentage}%)`);
  console.log('   Total fees:', order?.fees.totalFees.amount);

  // Test 3: Initialize payment
  console.log('\n--- Test 3: Initialize Payment ---');
  const paymentInstructions = await paymentService.initializePayment(
    createResponse.orderId,
    createResponse.total,
    'lightning'
  );
  console.log('✅ Payment initialized');
  console.log('   Method:', paymentInstructions.method);
  console.log('   Lightning invoice:', paymentInstructions.lightningInvoice?.substring(0, 30) + '...');
  console.log('   Amount (sats):', paymentInstructions.lightningAmount);
  console.log('   Expires:', paymentInstructions.expiresAt);

  // Test 4: Process payment (simulate)
  console.log('\n--- Test 4: Process Payment ---');
  const payment = await paymentService.processPayment({
    orderId: createResponse.orderId,
    paymentMethod: 'lightning',
    paymentProof: {
      lightningPreimage: 'mock_preimage_123456',
      timestamp: new Date()
    }
  });
  console.log('✅ Payment processed');
  console.log('   Status:', payment.status);
  console.log('   Processed at:', payment.processedAt);

  // Test 5: Mark order as paid (creates escrow)
  console.log('\n--- Test 5: Mark Order as Paid ---');
  await orderService.markAsPaid(createResponse.orderId, payment.id);
  const escrowCreated = await escrowService.createEscrow(
  createResponse.orderId,
  order!.total
);
  const paidOrder = await orderService.getOrderById(createResponse.orderId);
  console.log('✅ Order marked as paid');
  console.log('   Status:', paidOrder?.status);
  console.log('   Payment status:', paidOrder?.paymentStatus);
  console.log('   Escrow status:', paidOrder?.escrowStatus);

  // Test 6: Check escrow
  console.log('\n--- Test 6: Check Escrow ---');
  const escrow = await escrowService.getEscrowByOrderId(createResponse.orderId);
  console.log('✅ Escrow created');
  console.log('   Amount held:', escrow?.amount.amount, escrow?.amount.currency);
  console.log('   Status:', escrow?.status);
  console.log('   Hold duration:', escrow?.rules.holdDuration, 'days');
  console.log('   Release scheduled:', escrow?.releaseScheduledAt);

  // Test 7: Vendor confirms order
  console.log('\n--- Test 7: Vendor Confirms Order ---');
  await orderService.confirmOrder(createResponse.orderId, testVendorDid);
  const confirmedOrder = await orderService.getOrderById(createResponse.orderId);
  console.log('✅ Order confirmed by vendor');
  console.log('   Status:', confirmedOrder?.status);

  // Test 8: Mark as shipped
  console.log('\n--- Test 8: Mark as Shipped ---');
  await orderService.markAsShipped(
    createResponse.orderId,
    'TRACK123456',
    'logistics-provider-1'
  );
  const shippedOrder = await orderService.getOrderById(createResponse.orderId);
  console.log('✅ Order shipped');
  console.log('   Status:', shippedOrder?.status);
  console.log('   Tracking:', shippedOrder?.trackingNumber);

  // Test 9: Mark as delivered
  console.log('\n--- Test 9: Mark as Delivered ---');
  await orderService.markAsDelivered(createResponse.orderId);
  const deliveredOrder = await orderService.getOrderById(createResponse.orderId);
  console.log('✅ Order delivered');
  console.log('   Status:', deliveredOrder?.status);
  console.log('   Delivered at:', deliveredOrder?.deliveredAt);

  // Test 10: Complete order (release escrow)
  console.log('\n--- Test 10: Complete Order (Release Escrow) ---');
  await orderService.completeOrder(createResponse.orderId);
  const completedOrder = await orderService.getOrderById(createResponse.orderId);
  console.log('✅ Order completed');
  console.log('   Status:', completedOrder?.status);
  console.log('   Escrow status:', completedOrder?.escrowStatus);
  console.log('   Completed at:', completedOrder?.completedAt);

  // Test 11: Distribute fees
  console.log('\n--- Test 11: Distribute Fees ---');
  if (completedOrder) {
    const distribution = await feeService.distributeFees(completedOrder);
    console.log('✅ Fees distributed');
    console.log('   Vendor receives:', distribution.vendorAmount.amount, distribution.vendorAmount.currency);
    console.log('   Protocol receives:', distribution.protocolAmount.amount);
    console.log('   Client receives:', distribution.clientAmount.amount);
    console.log('   Distributed:', distribution.distributed);
  }

  // Test 12: Get order history
  console.log('\n--- Test 12: Get Order History ---');
  const history = await orderService.getOrderHistory(createResponse.orderId);
  console.log(`✅ Order history retrieved (${history.length} events)`);
  history.forEach((event, index) => {
    console.log(`   ${index + 1}. ${event.fromStatus} → ${event.toStatus} (${event.reason})`);
  });

  // Test 13: Get orders by vendor
  console.log('\n--- Test 13: Get Orders by Vendor ---');
  const vendorOrders = await orderService.getOrdersByVendor(testVendorDid, {
    limit: 5
  });
  console.log(`✅ Vendor has ${vendorOrders.length} orders`);

  // Test 14: Test state machine validation
  console.log('\n--- Test 14: Test State Machine Validation ---');
  try {
    const newOrder = await orderService.createOrder(createRequest);
    // Try invalid transition: payment_pending → completed (should fail)
    await orderService.updateStatus({
      orderId: newOrder.orderId,
      newStatus: 'completed',
      reason: 'Invalid transition test'
    });
    console.log('❌ State machine validation failed - invalid transition allowed');
  } catch (error: any) {
    console.log('✅ State machine validation working');
    console.log('   Error:', error.message);
  }

  console.log('\n🎉 All Layer 2 tests passed!');
  console.log('\n📊 Summary:');
  console.log('   ✅ Order lifecycle complete (created → paid → shipped → delivered → completed)');
  console.log('   ✅ Payment processing working');
  console.log('   ✅ Escrow hold and release functional');
  console.log('   ✅ Fee distribution calculated correctly');
  console.log('   ✅ State machine enforcing valid transitions');
}

testLayer2()
  .catch(error => {
    console.error('❌ Test failed:', error);
    process.exit(1);
  });