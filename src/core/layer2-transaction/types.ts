/**
 * Layer 2: Transaction & Settlement
 * Core type definitions for orders, payments, and escrow
 */

import type { Price } from '../layer1-catalog/types';

// ============================================================================
// ORDER TYPES
// ============================================================================

/**
 * Order status (state machine)
 */
export type OrderStatus = 
  | 'draft'              // Order created but not yet paid
  | 'payment_pending'    // Awaiting payment
  | 'payment_failed'     // Payment attempt failed
  | 'paid'               // Payment received, held in escrow
  | 'confirmed'          // Vendor confirmed order
  | 'processing'         // Vendor is preparing goods
  | 'shipped'            // Goods shipped, in transit
  | 'delivered'          // Goods delivered (awaiting confirmation)
  | 'completed'          // Transaction complete, funds released
  | 'cancelled'          // Order cancelled (before payment or with refund)
  | 'disputed'           // Dispute raised
  | 'refunded';          // Funds returned to buyer

/**
 * Order type
 */
export type OrderType = 'sample' | 'wholesale' | 'custom';

/**
 * Order item (product in cart)
 */
export interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  pricePerUnit: Price;
  totalPrice: Price;
  
  // Variant info (if applicable)
  variantId?: string;
  variantName?: string;
  
  // Customization (if applicable)
  customization?: Record<string, any>;
  
  // Notes
  notes?: string;
}

/**
 * Shipping address
 */
export interface ShippingAddress {
  name: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state?: string;
  postalCode: string;
  country: string; // ISO country code
  phone: string;
}

/**
 * Complete order
 */
export interface Order {
  // Core identifiers
  id: string;
  orderNumber: string; // Human-readable order number (e.g., "ORD-2024-001")
  
  // Participants
  buyerDid: string;
  vendorDid: string;
  clientId: string; // Which marketplace this order belongs to
  
  // Order details
  type: OrderType;
  items: OrderItem[];
  
  // Pricing
  subtotal: Price;
  fees: OrderFees;
  total: Price;
  
  // Shipping
  shippingAddress: ShippingAddress;
  shippingMethod?: string;
  shippingCost?: Price;
  
  // Payment
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  escrowStatus: EscrowStatus;
  
  // Status
  status: OrderStatus;
  
  // Logistics
  logisticsProviderId?: string;
  trackingNumber?: string;
  estimatedDeliveryDate?: Date;
  actualDeliveryDate?: Date;
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  paidAt?: Date;
  shippedAt?: Date;
  deliveredAt?: Date;
  completedAt?: Date;
  
  // Notes and messages
  buyerNotes?: string;
  vendorNotes?: string;
  internalNotes?: string;
}

// ============================================================================
// PAYMENT TYPES
// ============================================================================

/**
 * Payment method
 */
export type PaymentMethod = 
  | 'lightning'        // Bitcoin Lightning Network
  | 'bitcoin_onchain'  // Bitcoin on-chain
  | 'stripe'           // Stripe (credit card, bank transfer)
  | 'paypal'           // PayPal
  | 'bank_transfer'    // Direct bank transfer
  | 'other';

/**
 * Payment status
 */
export type PaymentStatus = 
  | 'pending'          // Awaiting payment
  | 'processing'       // Payment being processed
  | 'completed'        // Payment confirmed
  | 'failed'           // Payment failed
  | 'refunded'         // Payment refunded
  | 'partially_refunded'; // Partial refund issued

/**
 * Escrow status
 */
export type EscrowStatus = 
  | 'none'             // No escrow (payment not yet received)
  | 'held'             // Funds held in escrow
  | 'released'         // Funds released to vendor
  | 'refunded'         // Funds returned to buyer
  | 'disputed';        // Under dispute resolution

/**
 * Payment record
 */
export interface Payment {
  id: string;
  orderId: string;
  
  // Amount
  amount: Price;
  
  // Method
  method: PaymentMethod;
  status: PaymentStatus;
  
  // Payment proof
  paymentProof?: PaymentProof;
  
  // Timestamps
  createdAt: Date;
  processedAt?: Date;
  
  // Metadata
  metadata?: Record<string, any>;
}

/**
 * Payment proof (method-specific)
 */
export interface PaymentProof {
  // Lightning
  lightningInvoice?: string;
  lightningPreimage?: string; // Proof of payment
  
  // On-chain Bitcoin
  txid?: string;
  blockHeight?: number;
  
  // Stripe
  stripePaymentIntentId?: string;
  stripeChargeId?: string;
  
  // PayPal
  paypalTransactionId?: string;
  
  // Generic
  receiptUrl?: string;
  timestamp: Date;
}

// ============================================================================
// ESCROW TYPES
// ============================================================================

/**
 * Escrow record
 */
export interface Escrow {
  id: string;
  orderId: string;
  
  // Amount held
  amount: Price;
  
  // Status
  status: EscrowStatus;
  
  // Rules
  rules: EscrowRules;
  
  // Timestamps
  heldAt: Date;
  releaseScheduledAt?: Date;
  releasedAt?: Date;
  refundedAt?: Date;
  
  // Dispute info
  disputeId?: string;
}

/**
 * Escrow rules
 */
export interface EscrowRules {
  // Hold duration before auto-release
  holdDuration: number; // days
  
  // Release conditions
  releaseCondition: 'delivery_confirmed' | 'auto_release' | 'manual_approval';
  
  // Dispute window (after delivery)
  disputeWindow: number; // days
  
  // Auto-release if no dispute
  autoReleaseIfNoDispute: boolean;
}

/**
 * Default escrow rules
 */
export const DEFAULT_ESCROW_RULES: EscrowRules = {
  holdDuration: 7,
  releaseCondition: 'delivery_confirmed',
  disputeWindow: 7,
  autoReleaseIfNoDispute: true
};

// ============================================================================
// FEE TYPES
// ============================================================================

/**
 * Order fees breakdown
 */
export interface OrderFees {
  // Protocol fee (typically 3%)
  protocolFee: Price;
  protocolFeePercentage: number;
  
  // Client marketplace fee (0-5%)
  clientFee: Price;
  clientFeePercentage: number;
  
  // Payment processing fee (if applicable)
  paymentProcessingFee?: Price;
  
  // Total fees
  totalFees: Price;
}

/**
 * Fee configuration
 */
export interface FeeConfiguration {
  protocolFeePercentage: number; // e.g., 3
  clientFeePercentage: number;   // e.g., 0-5
  
  // Payment method fees (passed to buyer or absorbed)
  paymentMethodFees?: {
    stripe?: number;      // e.g., 2.9% + $0.30
    paypal?: number;      // e.g., 3.49%
    lightning?: number;   // e.g., 0.1%
  };
  
  // Who pays payment processing fees
  paymentFeeBearer: 'buyer' | 'vendor' | 'split';
}

/**
 * Default fee configuration
 */
export const DEFAULT_FEE_CONFIG: FeeConfiguration = {
  protocolFeePercentage: 3,
  clientFeePercentage: 0,
  paymentFeeBearer: 'buyer'
};

/**
 * Fee distribution (after payment released)
 */
export interface FeeDistribution {
  orderId: string;
  
  // Amounts
  totalAmount: Price;
  protocolAmount: Price;
  clientAmount: Price;
  vendorAmount: Price;
  
  // Status
  distributed: boolean;
  distributedAt?: Date;
  
  // Payment records
  vendorPaymentId?: string;
  protocolPaymentId?: string;
  clientPaymentId?: string;
}

// ============================================================================
// REFUND TYPES
// ============================================================================

/**
 * Refund reason
 */
export type RefundReason = 
  | 'buyer_cancelled'
  | 'vendor_cancelled'
  | 'out_of_stock'
  | 'quality_issue'
  | 'delivery_failed'
  | 'dispute_resolved'
  | 'other';

/**
 * Refund record
 */
export interface Refund {
  id: string;
  orderId: string;
  
  // Amount
  originalAmount: Price;
  refundAmount: Price;
  
  // Reason
  reason: RefundReason;
  notes?: string;
  
  // Status
  status: 'pending' | 'processing' | 'completed' | 'failed';
  
  // Timestamps
  requestedAt: Date;
  processedAt?: Date;
  completedAt?: Date;
  
  // Initiated by
  initiatedBy: string; // DID of person who requested refund
}

// ============================================================================
// MILESTONE PAYMENT TYPES (for large orders)
// ============================================================================

/**
 * Milestone payment (for custom/large orders)
 */
export interface Milestone {
  id: string;
  orderId: string;
  
  // Milestone details
  name: string;
  description: string;
  sequence: number; // Order of milestones
  
  // Amount
  percentage: number; // % of total order
  amount: Price;
  
  // Status
  status: 'pending' | 'due' | 'paid' | 'released' | 'skipped';
  
  // Conditions
  dueDate?: Date;
  requiredProof?: string; // What vendor must provide
  
  // Timestamps
  paidAt?: Date;
  releasedAt?: Date;
}

// ============================================================================
// STATE TRANSITION TYPES
// ============================================================================

/**
 * Valid state transitions (for state machine)
 */
export const VALID_STATE_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  'draft': ['payment_pending', 'cancelled'],
  'payment_pending': ['paid', 'payment_failed', 'cancelled'],
  'payment_failed': ['payment_pending', 'cancelled'],
  'paid': ['confirmed', 'cancelled', 'refunded'],
  'confirmed': ['processing', 'shipped', 'cancelled', 'disputed'],
  'processing': ['shipped', 'cancelled', 'disputed'],
  'shipped': ['delivered', 'disputed'],
  'delivered': ['completed', 'disputed'],
  'completed': ['disputed'],
  'cancelled': [],
  'disputed': ['completed', 'cancelled', 'refunded'],
  'refunded': []
};

/**
 * Order status change event
 */
export interface OrderStatusChange {
  orderId: string;
  fromStatus: OrderStatus;
  toStatus: OrderStatus;
  changedBy: string; // DID of person who changed status
  reason?: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

// ============================================================================
// API REQUEST/RESPONSE TYPES
// ============================================================================

/**
 * Create order request
 */
export interface CreateOrderRequest {
  buyerDid: string;
  vendorDid: string;
  clientId: string;
  type: OrderType;
  items: OrderItem[];
  shippingAddress: ShippingAddress;
  paymentMethod: PaymentMethod;
  buyerNotes?: string;
}

/**
 * Create order response
 */
export interface CreateOrderResponse {
  orderId: string;
  orderNumber: string;
  total: Price;
  paymentRequired: Price;
  status: OrderStatus;
  
  // Payment details (if immediate payment)
  paymentInstructions?: PaymentInstructions;
}

/**
 * Payment instructions (method-specific)
 */
export interface PaymentInstructions {
  method: PaymentMethod;
  
  // Lightning
  lightningInvoice?: string;
  lightningAmount?: number; // satoshis
  
  // Stripe
  stripeClientSecret?: string;
  stripePublishableKey?: string;
  
  // Bank transfer
  bankDetails?: {
    accountName: string;
    accountNumber: string;
    bankName: string;
    swiftCode?: string;
  };
  
  // Expiry
  expiresAt?: Date;
}

/**
 * Process payment request
 */
export interface ProcessPaymentRequest {
  orderId: string;
  paymentMethod: PaymentMethod;
  paymentProof?: Partial<PaymentProof>;
}

/**
 * Update order status request
 */
export interface UpdateOrderStatusRequest {
  orderId: string;
  newStatus: OrderStatus;
  reason?: string;
  metadata?: Record<string, any>;
}

/**
 * Request refund
 */
export interface RequestRefundRequest {
  orderId: string;
  amount: Price;
  reason: RefundReason;
  notes?: string;
}

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Validate state transition
 */
export function isValidTransition(from: OrderStatus, to: OrderStatus): boolean {
  const validTransitions = VALID_STATE_TRANSITIONS[from];
  return validTransitions.includes(to);
}

/**
 * Check if order can be cancelled
 */
export function canCancelOrder(status: OrderStatus): boolean {
  const cancellableStatuses: OrderStatus[] = [
    'draft',
    'payment_pending',
    'payment_failed',
    'paid',
    'confirmed'
  ];
  return cancellableStatuses.includes(status);
}

/**
 * Check if order can be refunded
 */
export function canRefundOrder(status: OrderStatus): boolean {
  const refundableStatuses: OrderStatus[] = [
    'paid',
    'confirmed',
    'processing',
    'shipped',
    'delivered',
    'disputed'
  ];
  return refundableStatuses.includes(status);
}