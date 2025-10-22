// Layer 3: Logistics Coordination - Type Definitions
// Path: src/types/logistics.types.ts

export type ShippingMethod = 'standard' | 'express' | 'freight';

export type QuoteStatus = 'pending' | 'accepted' | 'rejected' | 'expired';

export type ShipmentStatus = 
  | 'pending_pickup'
  | 'picked_up'
  | 'in_transit'
  | 'out_for_delivery'
  | 'delivered'
  | 'failed_delivery'
  | 'returning'
  | 'returned'
  | 'lost'
  | 'cancelled';

// ============================================================================
// LOGISTICS PROVIDER
// ============================================================================
export interface LogisticsProvider {
  id: string;
  business_name: string;
  identity_did: string; // Changed from identity_id
  service_regions: string[]; // ISO country codes
  shipping_methods: ShippingMethod[];
  insurance_available: boolean;
  average_rating?: number; // 0.00 to 5.00
  total_deliveries: number;
  created_at: Date;
}

export interface CreateProviderInput {
  business_name: string;
  identity_did: string; // Changed from identity_id
  service_regions: string[];
  shipping_methods: ShippingMethod[];
  insurance_available: boolean;
}

export interface ProviderSearchFilters {
  service_region?: string;
  shipping_method?: ShippingMethod;
  insurance_required?: boolean;
  min_rating?: number;
}

// ============================================================================
// SHIPPING QUOTE
// ============================================================================
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
  status: QuoteStatus;
  valid_until: Date;
  created_at: Date;
}

export interface SubmitQuoteInput {
  order_id: string;
  provider_id: string;
  method: ShippingMethod;
  price_sats?: number;
  price_fiat?: number;
  currency?: string;
  estimated_days: number;
  insurance_included: boolean;
  valid_hours: number; // Quote expires after X hours
}

export interface QuoteRequest {
  order_id: string;
  origin_country: string;
  destination_country: string;
  weight_kg: number;
  dimensions_cm: {
    length: number;
    width: number;
    height: number;
  };
  declared_value_sats?: number;
  declared_value_fiat?: number;
  currency?: string;
  insurance_required: boolean;
}

// ============================================================================
// SHIPMENT
// ============================================================================
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

export interface CreateShipmentInput {
  order_id: string;
  quote_id: string;
  tracking_number: string;
  estimated_delivery: Date;
}

export interface UpdateShipmentStatusInput {
  shipment_id: string;
  status: ShipmentStatus;
  location?: string;
  notes?: string;
}

// ============================================================================
// TRACKING EVENT
// ============================================================================
export interface TrackingEvent {
  id: string;
  shipment_id: string;
  status: ShipmentStatus;
  location?: string;
  notes?: string;
  timestamp: Date;
}

// ============================================================================
// HELPER TYPES
// ============================================================================
export interface ShipmentWithProvider extends Shipment {
  provider: LogisticsProvider;
}

export interface QuoteWithProvider extends ShippingQuote {
  provider: LogisticsProvider;
}

export interface ShipmentTrackingInfo {
  shipment: Shipment;
  events: TrackingEvent[];
  provider: LogisticsProvider;
}