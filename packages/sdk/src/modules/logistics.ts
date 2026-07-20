/**
 * Logistics Module (Layer 3)
 * Shipping quotes, tracking, and logistics providers
 */

import type { HttpClient } from '../client';
import type {
  LogisticsProvider,
  ShippingQuote,
  Shipment,
  ShipmentStatus,
  TrackingEvent,
  ShippingMethod,
} from '../types';

// ============================================================================
// REQUEST/RESPONSE TYPES
// ============================================================================

export interface RegisterProviderRequest {
  business_name: string;
  identity_did: string;
  service_regions: string[];
  shipping_methods: ShippingMethod[];
  insurance_available: boolean;
}

export interface SubmitQuoteRequest {
  order_id: string;
  provider_id: string;
  method: ShippingMethod;
  price_sats?: number;
  price_fiat?: number;
  currency?: string;
  estimated_days: number;
  insurance_included: boolean;
  valid_hours: number;
}

export interface CreateShipmentRequest {
  order_id: string;
  quote_id: string;
  tracking_number: string;
  estimated_delivery: string;
}

export interface UpdateTrackingRequest {
  status: ShipmentStatus;
  location?: string;
  notes?: string;
}

export interface CreateQuoteRequestRequest {
  product_id: string;
  origin_country: string;
  destination_country?: string; // omit = broadcast to any destination the pool serves (L12 — S32)
  weight_kg: number;
  dimensions_cm: {
    length: number;
    width: number;
    height: number;
  };
  incoterm: 'EXW' | 'FOB' | 'DAP' | 'DDP';
  hs_code?: string;
  insurance_required?: boolean;
}

// ============================================================================
// LOGISTICS MODULE
// ============================================================================

export class LogisticsModule {
  constructor(private readonly http: HttpClient) {}

  // =========================================================================
  // PROVIDERS
  // =========================================================================

  /**
   * Register as logistics provider
   * Requires authentication
   * 
   * @param request - Provider details
   * @returns Provider ID
   * 
   * @example
   * const provider = await sdk.logistics.registerProvider({
   *   business_name: 'Fast Shipping Co',
   *   identity_did: 'did:rangkai:...',
   *   service_regions: ['US', 'CA', 'MX'],
   *   shipping_methods: ['standard', 'express'],
   *   insurance_available: true
   * });
   */
  async registerProvider(request: RegisterProviderRequest): Promise<{
    providerId: string;
    status: string;
  }> {
    return this.http.post('/logistics/providers', request);
  }

  /**
   * Get logistics provider by ID
   * Public endpoint
   * 
   * @param providerId - Provider UUID
   * @returns Provider details
   */
  async getProvider(providerId: string): Promise<LogisticsProvider> {
    return this.http.get(`/logistics/providers/${providerId}`);
  }

  /**
   * Search logistics providers
   * Public endpoint
   * 
   * @param filters - Search criteria
   * @returns List of providers
   * 
   * @example
   * const providers = await sdk.logistics.searchProviders({
   *   service_region: 'US',
   *   shipping_method: 'express',
   *   insurance_required: true,
   *   min_rating: 4.0
   * });
   */
  async searchProviders(filters?: {
    service_region?: string;
    shipping_method?: ShippingMethod;
    insurance_required?: boolean;
    min_rating?: number;
  }): Promise<LogisticsProvider[]> {
    return this.http.get('/logistics/providers', filters);
  }

  // =========================================================================
  // QUOTES
  // =========================================================================

  /**
   * Submit shipping quote for an order
   * Requires authentication (provider only)
   * 
   * @param request - Quote details
   * @returns Quote ID
   * 
   * @example
   * const quote = await sdk.logistics.submitQuote({
   *   order_id: 'uuid',
   *   provider_id: 'provider-uuid',
   *   method: 'express',
   *   price_fiat: 50,
   *   currency: 'USD',
   *   estimated_days: 3,
   *   insurance_included: true,
   *   valid_hours: 24
   * });
   */
  async submitQuote(request: SubmitQuoteRequest): Promise<{
    quoteId: string;
    validUntil: string;
  }> {
    return this.http.post('/logistics/quotes', request);
  }

  /**
   * Get quotes for an order
   * Requires authentication (buyer or vendor)
   * 
   * @param orderId - Order UUID
   * @returns List of quotes
   * 
   * @example
   * const quotes = await sdk.logistics.getQuotesForOrder('order-uuid');
   */
  async getQuotesForOrder(orderId: string): Promise<ShippingQuote[]> {
    return this.http.get(`/logistics/quotes/order/${orderId}`);
  }

  /**
   * Accept a shipping quote
   * Requires authentication (vendor)
   * 
   * @param quoteId - Quote UUID
   * @returns Acceptance confirmation
   * 
   * @example
   * await sdk.logistics.acceptQuote('quote-uuid');
   */
  async acceptQuote(quoteId: string): Promise<{ message: string }> {
    return this.http.post(`/logistics/quotes/${quoteId}/accept`);
  }

  /**
   * ✅ NEW: Get all quotes for a provider
   * Requires authentication (provider only)
   * 
   * @param providerId - Provider UUID
   * @param status - Optional filter by status
   * @returns List of provider's quotes
   * 
   * @example
   * const quotes = await sdk.logistics.getProviderQuotes('provider-uuid', 'pending');
   */
  async getProviderQuotes(
    providerId: string,
    status?: 'pending' | 'accepted' | 'rejected' | 'expired'
  ): Promise<ShippingQuote[]> {
    const params = status ? { status } : {};
    return this.http.get(`/logistics/providers/${providerId}/quotes`, params);
  }

  /**
   * ✅ NEW: Get opportunities (orders needing quotes)
   * Requires authentication (provider only)
   * 
   * @param filters - Search criteria
   * @returns Orders ready for quotes
   * 
   * @example
   * const opportunities = await sdk.logistics.getOpportunities({
   *   service_region: 'SG',
   *   min_weight_kg: 1,
   *   max_weight_kg: 5
   * });
   */
  async getOpportunities(filters?: {
    service_region?: string;
    min_weight_kg?: number;
    max_weight_kg?: number;
  }): Promise<any[]> {
    return this.http.get('/logistics/opportunities', filters);
  }

  /**
   * Get all quotes (pending + accepted) for a product, with provider details
   * Seller-facing, product owner only (L13 — S32)
   */
  async getQuotesForProduct(productId: string): Promise<any[]> {
    return this.http.get(`/logistics/quotes/product/${productId}`);
  }

  /**
   * Get the accepted shipping quote for a product, buyer-facing (L14 — S33)
   * Public endpoint. Returns null if no quote has been accepted yet.
   */
  async getAcceptedQuoteForProduct(productId: string): Promise<any | null> {
    return this.http.get(`/logistics/quotes/product/${productId}/accepted`);
  }

  /**
   * Buyer-initiated: broadcast a request for quotes on a product (L15c — S34)
   * Called by the buyer at checkout. destination_country is required (buyer
   * knows their shipping address). Product logistics data (weight, dimensions,
   * incoterm) is read server-side from the product row — buyer doesn't re-enter.
   *
   * @example
   * await sdk.logistics.requestQuoteAsBuyer({
   *   product_id: 'product-uuid',
   *   destination_country: 'SG'
   * });
   */
  async requestQuoteAsBuyer(request: {
    product_id: string;
    destination_country: string;
    target_provider_id?: string; // L15d: omit for broadcast, set for direct request
  }): Promise<any> {
    return this.http.post('/logistics/quote-requests/buyer', request);
  }

  /**
   * Buyer: get all open quote requests I created, with any incoming quotes on them (L15c — S34)
   * Used by checkout to poll for provider responses and let the buyer accept one.
   *
   * @example
   * const pending = await sdk.logistics.getBuyerPendingQuoteRequests();
   */
  async getBuyerPendingQuoteRequests(): Promise<any[]> {
    return this.http.get('/logistics/quote-requests/buyer/pending');
  }

  /**
   * Broadcast a request for logistics quotes on a product (L12 — S32)
   * KYC sellers only. Creates an open quote_requests row visible to matching
   * logistics providers. Omitting destination_country broadcasts to any
   * provider serving the given origin, regardless of destination.
   *
   * @example
   * await sdk.logistics.requestQuote({
   *   product_id: 'product-uuid',
   *   origin_country: 'MY',
   *   weight_kg: 2,
   *   dimensions_cm: { length: 30, width: 30, height: 15 },
   *   incoterm: 'DAP'
   * });
   */
  async requestQuote(request: CreateQuoteRequestRequest): Promise<any> {
    return this.http.post('/logistics/quote-requests', request);
  }

  // =========================================================================
  // SHIPMENTS
  // =========================================================================

  /**
   * Create shipment
   * Requires authentication (provider)
   * 
   * @param request - Shipment details
   * @returns Shipment ID
   * 
   * @example
   * const shipment = await sdk.logistics.createShipment({
   *   order_id: 'order-uuid',
   *   quote_id: 'quote-uuid',
   *   tracking_number: '1Z999AA10123456784',
   *   estimated_delivery: '2024-12-25T00:00:00Z'
   * });
   */
  async createShipment(request: CreateShipmentRequest): Promise<{
    shipmentId: string;
    trackingNumber: string;
  }> {
    return this.http.post('/logistics/shipments', request);
  }

  /**
   * Get shipment by ID
   * Public endpoint
   * 
   * @param shipmentId - Shipment UUID
   * @returns Shipment details
   */
  async getShipment(shipmentId: string): Promise<Shipment> {
    return this.http.get(`/logistics/shipments/${shipmentId}`);
  }

  /**
   * Get shipment by order ID
   * Public endpoint
   * 
   * @param orderId - Order UUID
   * @returns Shipment details
   */
  async getShipmentByOrder(orderId: string): Promise<Shipment> {
    return this.http.get(`/logistics/shipments/order/${orderId}`);
  }

  /**
   * Update shipment tracking
   * Requires authentication (provider)
   * 
   * @param shipmentId - Shipment UUID
   * @param update - Status and location update
   * @returns Update confirmation
   * 
   * @example
   * await sdk.logistics.updateTracking('shipment-uuid', {
   *   status: 'in_transit',
   *   location: 'Los Angeles, CA',
   *   notes: 'Package departed facility'
   * });
   */
  async updateTracking(
    shipmentId: string,
    update: UpdateTrackingRequest
  ): Promise<{ message: string }> {
    return this.http.put(`/logistics/shipments/${shipmentId}/status`, update);
  }

  /**
   * Get tracking history
   * Public endpoint
   * 
   * @param shipmentId - Shipment UUID
   * @returns Tracking events
   * 
   * @example
   * const events = await sdk.logistics.getTrackingHistory('shipment-uuid');
   * events.forEach(event => {
   *   console.log(`${event.timestamp}: ${event.status} at ${event.location}`);
   * });
   */
  async getTrackingHistory(shipmentId: string): Promise<TrackingEvent[]> {
     return this.http.get(`/logistics/shipments/${shipmentId}/history`);
   }

  /**
   * ✅ NEW: Get provider's shipments
   * Requires authentication (provider only)
   * 
   * @param providerId - Provider UUID
   * @param status - Optional filter by status
   * @returns List of provider's shipments
   * 
   * @example
   * const shipments = await sdk.logistics.getProviderShipments('provider-uuid', 'in_transit');
   */
  async getProviderShipments(
    providerId: string,
    status?: ShipmentStatus
  ): Promise<Shipment[]> {
    const params = status ? { status } : {};
    return this.http.get(`/logistics/providers/${providerId}/shipments`, params);
  }

  // =========================================================================
  // FAVORITES
  // =========================================================================

  /**
   * ✅ NEW: Favorite a provider
   * Requires authentication
   * 
   * @param providerId - Provider UUID
   * @returns Success confirmation
   * 
   * @example
   * await sdk.logistics.favoriteProvider('provider-uuid');
   */
  async favoriteProvider(providerId: string): Promise<{ message: string }> {
    return this.http.post(`/logistics/providers/${providerId}/favorite`);
  }

  /**
   * ✅ NEW: Get user's favorite providers
   * Requires authentication
   * 
   * @returns List of favorited providers
   * 
   * @example
   * const favorites = await sdk.logistics.getFavoriteProviders();
   */
  async getFavoriteProviders(): Promise<LogisticsProvider[]> {
    return this.http.get('/logistics/favorites');
  }
}