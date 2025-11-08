/**
 * Type Definitions
 * Re-exports all types from core protocol layers
 * 
 * Note: In actual implementation, these would import from '../../core/layerX/types'
 * For the SDK package, types are copied/bundled to avoid dependencies on core
 */

// ============================================================================
// LAYER 0: IDENTITY & REPUTATION
// ============================================================================

export type IdentityType = 'kyc' | 'nostr' | 'anonymous';
export type VerificationStatus = 'pending' | 'verified' | 'rejected' | 'suspended' | 'banned' | 'inactive';
export type BusinessType = 'manufacturer' | 'artisan' | 'trader' | 'buyer';

export interface PublicProfile {
  displayName: string;
  country?: string;
  businessType: BusinessType;
  verified: boolean;
  avatarUrl?: string;
  bio?: string;
}

export interface KYCData {
  businessName: string;
  registrationNumber: string;
  country: string;
  ownerName: string;
  businessAddress: string;
  phoneNumber: string;
  email: string;
  website?: string;
  socialMedia?: { platform: string; url: string }[];
  taxId?: string;
  documents: {
    businessRegistration: string;
    identityProof: string;
    addressProof: string;
  };
}

export interface NostrData {
  pubkey: string;
  displayName?: string;
  country?: string;
  reputationSeed?: string;
  transactionHistoryHash?: string;
}

export interface AnonymousData {
  dailyLimit?: number;
  escrowPremium?: number;
  minimumAccountAge?: number;
}

export interface Identity {
  did: string;
  type: IdentityType;
  clientId: string;
  verificationStatus: VerificationStatus;
  createdAt: Date;
  updatedAt: Date;
  publicProfile: PublicProfile;
  contactInfo?: any;
  metadata: {
    kyc?: Partial<KYCData>;
    nostr?: NostrData;
    anonymous?: AnonymousData;
  };
}

export interface ReputationMetrics {
  transactionsCompleted: number;
  totalTransactionValue: number;
  averageRating: number;
  totalRatings: number;
  onTimeDeliveryRate: number;
  responseTimeAvg: number;
  disputesTotal: number;
  disputesWon: number;
  disputesLost: number;
  minorDisputes: number;
  majorDisputes: number;
  verificationMultiplier: number;
  clientModifiers?: Record<string, number>;
}

export interface Reputation {
  vendorDid: string;
  score: number;
  metrics: ReputationMetrics;
  history: any[];
  lastUpdated: Date;
  recentEventsHash?: string;
}

export interface ReputationProof {
  vendorDid: string;
  score: number;
  transactionsCompleted: number;
  averageRating: number;
  generatedAt: Date;
  validUntil: Date;
  proofVersion: number;
  protocolVersion: string;
  eventsHash?: string;
  signature: string;
}

// ============================================================================
// LAYER 1: CATALOG
// ============================================================================

export type PrimaryCategory = 'footwear' | 'bags' | 'textiles' | 'electronics' | 'home' | 'craft' | 'other';
export type CurrencyCode = 'USD' | 'EUR' | 'GBP' | 'MYR' | 'SGD' | 'AUD' | 'BTC';
export type ProductStatus = 'draft' | 'active' | 'inactive' | 'out_of_stock' | 'discontinued';
export type ProductVisibility = 'public' | 'private' | 'unlisted';

export interface Category {
  primary: PrimaryCategory;
  subcategory: string;
  tags?: string[];
}

export interface Price {
  amount: number;
  currency: CurrencyCode;
}

export interface ProductImages {
  primary: string;
  gallery?: string[];
  thumbnail?: string;
}

export interface BasicSpecifications {
  name: string;
  description: string;
  shortDescription?: string;
  images: ProductImages;
  sku?: string;
  brand?: string;
  condition: 'new' | 'used' | 'refurbished';
}

export interface AdvancedSpecifications {
  attributes: Record<string, any>;
  customization?: any[];
  variants?: any[];
  materials?: string[];
  certifications?: any[];
  keywords?: string[];
}

export interface ProductPricing {
  basePrice: Price;
  tiers?: any[];
  moq: number;
  sample?: any;
}

export interface LogisticsInfo {
  weight: { value: number; unit: 'kg' | 'lb' | 'g' };
  dimensions: { length: number; width: number; height: number; unit: 'cm' | 'in' };
  originCountry: string;
  leadTime: number;
  shippingMethods?: string[];
}

export interface Product {
  id: string;
  vendorDid: string;
  clientId: string;
  category: Category;
  basic: BasicSpecifications;
  advanced: AdvancedSpecifications;
  pricing: ProductPricing;
  logistics: LogisticsInfo;
  status: ProductStatus;
  visibility: ProductVisibility;
  createdAt: Date;
  updatedAt: Date;
  lastSyncedAt?: Date;
  stats?: {
    views: number;
    inquiries: number;
    orders: number;
  };
}

export interface SearchQuery {
  query?: string;
  filters?: any;
  sortBy?: 'relevance' | 'price_asc' | 'price_desc' | 'newest' | 'popular' | 'vendor_reputation';
  limit?: number;
  offset?: number;
  clientIds?: string[];
  includeInactive?: boolean;
}

export interface SearchResults {
  items: any[];
  total: number;
  query: SearchQuery;
  executionTime: number;
  searchedClients: string[];
  aggregations?: any;
}

// ============================================================================
// LAYER 2: ORDERS
// ============================================================================

export type OrderStatus = 
  | 'draft' | 'payment_pending' | 'payment_failed' | 'paid' | 'confirmed'
  | 'processing' | 'shipped' | 'delivered' | 'completed' | 'cancelled'
  | 'disputed' | 'refunded';

export type OrderType = 'sample' | 'wholesale' | 'custom';
export type PaymentMethod = 'lightning' | 'bitcoin_onchain' | 'stripe' | 'paypal' | 'bank_transfer' | 'other';

export interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  pricePerUnit: Price;
  totalPrice: Price;
  variantId?: string;
  variantName?: string;
  customization?: Record<string, any>;
  notes?: string;
}

export interface ShippingAddress {
  name: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state?: string;
  postalCode: string;
  country: string;
  phone: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  buyerDid: string;
  vendorDid: string;
  clientId: string;
  type: OrderType;
  items: OrderItem[];
  subtotal: Price;
  fees: any;
  total: Price;
  shippingAddress: ShippingAddress;
  shippingMethod?: string;
  shippingCost?: Price;
  paymentMethod: PaymentMethod;
  paymentStatus: string;
  escrowStatus: string;
  status: OrderStatus;
  logisticsProviderId?: string;
  trackingNumber?: string;
  estimatedDeliveryDate?: Date;
  actualDeliveryDate?: Date;
  createdAt: Date;
  updatedAt: Date;
  paidAt?: Date;
  shippedAt?: Date;
  deliveredAt?: Date;
  completedAt?: Date;
  buyerNotes?: string;
  vendorNotes?: string;
  internalNotes?: string;
}

export interface PaymentProof {
  lightningInvoice?: string;
  lightningPreimage?: string;
  txid?: string;
  blockHeight?: number;
  stripePaymentIntentId?: string;
  stripeChargeId?: string;
  paypalTransactionId?: string;
  receiptUrl?: string;
  timestamp: Date | string;
}

export interface OrderStatusChange {
  orderId: string;
  fromStatus: OrderStatus;
  toStatus: OrderStatus;
  changedBy: string;
  reason?: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

// ============================================================================
// LAYER 3: LOGISTICS
// ============================================================================

export type ShippingMethod = 'standard' | 'express' | 'freight';
export type ShipmentStatus = 
  | 'pending_pickup' | 'picked_up' | 'in_transit' | 'out_for_delivery'
  | 'delivered' | 'failed_delivery' | 'returning' | 'returned' | 'lost' | 'cancelled';

export interface LogisticsProvider {
  id: string;
  business_name: string;
  identity_did: string;
  service_regions: string[];
  shipping_methods: ShippingMethod[];
  insurance_available: boolean;
  average_rating?: number;
  total_deliveries: number;
  created_at: Date;
}

export interface ShippingQuote {
  id: string;
  order_id: string;
  provider_id: string;
  method: ShippingMethod;
  price_sats?: number;
  price_fiat?: number;
  currency: string;
  estimated_days: number;
  insurance_included: boolean;
  status: string;
  valid_until: Date;
  created_at: Date;
}

export interface Shipment {
  id: string;
  order_id: string;
  quote_id: string;
  provider_id: string;
  tracking_number: string;
  status: ShipmentStatus;
  current_location?: string;
  estimated_delivery?: Date;
  proof_of_delivery_hash?: string;
  created_at: Date;
  updated_at: Date;
}

export interface TrackingEvent {
  id: string;
  shipment_id: string;
  status: ShipmentStatus;
  location?: string;
  notes?: string;
  timestamp: Date;
}

// ============================================================================
// LAYER 4: TRUST
// ============================================================================

export type DisputeType = 'quality' | 'non_receipt' | 'logistics' | 'change_of_mind' | 'other';
export type DisputeStatus = 'open' | 'awaiting_vendor' | 'awaiting_evidence' | 'under_review' | 'arbitration' | 'resolved' | 'closed';
export type DisputeResolution = 'full_refund' | 'partial_refund' | 'no_refund' | 'vendor_wins';

export interface DisputeEvidence {
  photo_urls?: string[];
  video_urls?: string[];
  tracking_number?: string;
  tracking_events?: any[];
  message_thread_id?: string;
  description_details?: string;
}

export interface Dispute {
  id: string;
  dispute_number: string;
  order_id: string;
  buyer_did: string;
  vendor_did: string;
  dispute_type: DisputeType;
  description: string;
  evidence?: DisputeEvidence;
  vendor_response?: any;
  status: DisputeStatus;
  resolution?: DisputeResolution;
  resolution_reason?: string;
  requires_arbitration: boolean;
  arbitrator_id?: string;
  arbitrator_decision?: Record<string, any>;
  opened_at: Date;
  vendor_response_due_at?: Date;
  resolved_at?: Date;
}

export interface RatingCategories {
  quality?: number;
  delivery?: number;
  communication?: number;
  payment?: number;
}

export interface Rating {
  id: string;
  order_id: string;
  buyer_did: string;
  vendor_did: string;
  buyer_rating?: number;
  buyer_comment?: string;
  buyer_categories?: RatingCategories;
  buyer_submitted_at?: Date;
  vendor_rating?: number;
  vendor_comment?: string;
  vendor_categories?: RatingCategories;
  vendor_submitted_at?: Date;
  revealed_at?: Date;
  transaction_value_sats?: number;
  created_at: Date;
}

export interface RatingStats {
  total_ratings: number;
  average_rating: number;
  rating_distribution: { [key: number]: number };
  recent_ratings: Rating[];
}

// ============================================================================
// LAYER 6: GOVERNANCE
// ============================================================================

export type ProposalStatus = 'draft' | 'active' | 'approved' | 'executed' | 'rejected' | 'expired';
export type GovernanceAction = 
  | 'update_protocol_fee' | 'update_client_fee' | 'treasury_withdrawal'
  | 'emergency_pause' | 'emergency_unpause' | 'add_signer' | 'remove_signer'
  | 'update_escrow_duration' | 'update_dispute_window' | 'schema_migration';

export interface GovernanceProposal {
  id: string;
  proposal_number: string;
  action: GovernanceAction;
  params: Record<string, any>;
  rationale: string;
  proposed_by: string;
  status: ProposalStatus;
  required_approvals: number;
  current_approvals: number;
  voting_starts_at?: Date;
  voting_ends_at?: Date;
  executed_at?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface GovernanceApproval {
  id: string;
  proposal_id: string;
  signer_id: string;
  approved: boolean;
  signature?: string;
  comment?: string;
  approved_at: Date;
}