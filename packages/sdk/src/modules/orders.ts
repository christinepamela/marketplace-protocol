/**
 * Orders Module (Layer 2)
 * Order management, payments, and escrow
 */

import type { HttpClient } from '../client';
import type {
  Order,
  OrderStatus,
  OrderType,
  OrderItem,
  ShippingAddress,
  PaymentMethod,
  PaymentProof,
  OrderStatusChange,
} from '../types';

// ============================================================================
// REQUEST/RESPONSE TYPES
// ============================================================================

export interface CreateOrderRequest {
  vendorDid: string;
  clientId: string;
  type: OrderType;
  items: OrderItem[];
  shippingAddress: ShippingAddress;
  paymentMethod: PaymentMethod;
  buyerNotes?: string;
}

export interface CreateOrderResponse {
  orderId: string;
  orderNumber: string;
  total: { amount: number; currency: string };
  paymentRequired: { amount: number; currency: string };
  status: OrderStatus;
}

export interface ProcessPaymentRequest {
  paymentProof?: Partial<PaymentProof>;
}

// ============================================================================
// ORDERS MODULE
// ============================================================================

export class OrdersModule {
  constructor(private readonly http: HttpClient) {}

  /**
   * Create new order
   * Requires authentication (buyer)
   * 
   * @param request - Order details
   * @returns Order ID and payment info
   * 
   * @example
   * const order = await sdk.orders.create({
   *   vendorDid: 'did:rangkai:...',
   *   clientId: 'my-marketplace',
   *   type: 'wholesale',
   *   items: [{
   *     productId: 'uuid',
   *     productName: 'Leather Shoes',
   *     quantity: 10,
   *     pricePerUnit: { amount: 100, currency: 'USD' },
   *     totalPrice: { amount: 1000, currency: 'USD' }
   *   }],
   *   shippingAddress: { ... },
   *   paymentMethod: 'stripe'
   * });
   */
  async create(request: CreateOrderRequest): Promise<CreateOrderResponse> {
    return this.http.post('/orders', request);
  }

  /**
   * Get order by ID
   * Requires authentication (buyer or vendor only)
   * 
   * @param orderId - Order UUID
   * @returns Order details
   * 
   * @example
   * const order = await sdk.orders.getById('uuid-here');
   */
  async getById(orderId: string): Promise<Order> {
    return this.http.get(`/orders/${orderId}`);
  }

  /**
   * Get orders by buyer
   * Requires authentication (own orders only)
   * 
   * @param buyerDid - Buyer's DID
   * @param options - Filter and pagination options
   * @returns List of orders
   * 
   * @example
   * const orders = await sdk.orders.getByBuyer('did:rangkai:...', {
   *   status: 'shipped',
   *   limit: 20
   * });
   */
  async getByBuyer(
    buyerDid: string,
    options?: {
      status?: OrderStatus;
      limit?: number;
      offset?: number;
    }
  ): Promise<Order[]> {
    return this.http.get(`/orders/buyer/${buyerDid}`, options);
  }

  /**
   * Get orders by vendor
   * Requires authentication (own orders only)
   * 
   * @param vendorDid - Vendor's DID
   * @param options - Filter and pagination options
   * @returns List of orders
   * 
   * @example
   * const orders = await sdk.orders.getByVendor('did:rangkai:...', {
   *   status: 'confirmed',
   *   limit: 20
   * });
   */
  async getByVendor(
    vendorDid: string,
    options?: {
      status?: OrderStatus;
      limit?: number;
      offset?: number;
    }
  ): Promise<Order[]> {
    return this.http.get(`/orders/vendor/${vendorDid}`, options);
  }

  /**
   * Mark order as paid
   * Requires authentication (buyer only)
   * Creates escrow to hold funds
   * 
   * @param orderId - Order UUID
   * @param paymentProof - Payment proof details
   * @returns Escrow confirmation
   * 
   * @example
   * await sdk.orders.markAsPaid('uuid-here', {
   *   paymentProof: {
   *     stripePaymentIntentId: 'pi_...',
   *     timestamp: new Date().toISOString()
   *   }
   * });
   */
  async markAsPaid(
    orderId: string,
    paymentProof?: Partial<PaymentProof>
  ): Promise<{
    message: string;
    orderId: string;
    escrowId: string;
    status: string;
  }> {
    return this.http.post(`/orders/${orderId}/pay`, { paymentProof });
  }

  /**
   * Confirm order (vendor accepts)
   * Requires authentication (vendor only)
   * 
   * @param orderId - Order UUID
   * @returns Confirmation message
   * 
   * @example
   * await sdk.orders.confirm('uuid-here');
   */
  async confirm(orderId: string): Promise<{ message: string }> {
    return this.http.post(`/orders/${orderId}/confirm`);
  }

  /**
   * Mark order as shipped
   * Requires authentication (vendor only)
   * 
   * @param orderId - Order UUID
   * @param trackingNumber - Shipping tracking number
   * @param logisticsProviderId - Logistics provider ID
   * @returns Shipping confirmation
   * 
   * @example
   * await sdk.orders.markAsShipped('uuid-here', '1Z999AA10123456784', 'provider-uuid');
   */
  async markAsShipped(
    orderId: string,
    trackingNumber?: string,
    logisticsProviderId?: string
  ): Promise<{
    message: string;
    trackingNumber?: string;
    logisticsProviderId?: string;
  }> {
    return this.http.post(`/orders/${orderId}/ship`, {
      trackingNumber,
      logisticsProviderId,
    });
  }

  /**
   * Mark order as delivered
   * Requires authentication (buyer or logistics provider)
   * 
   * @param orderId - Order UUID
   * @returns Delivery confirmation
   * 
   * @example
   * await sdk.orders.markAsDelivered('uuid-here');
   */
  async markAsDelivered(orderId: string): Promise<{ message: string }> {
    return this.http.post(`/orders/${orderId}/deliver`);
  }

  /**
   * Complete order and release escrow
   * Requires authentication (buyer or auto-release)
   * Releases funds to vendor
   * 
   * @param orderId - Order UUID
   * @returns Completion confirmation
   * 
   * @example
   * await sdk.orders.complete('uuid-here');
   */
  async complete(orderId: string): Promise<{ message: string }> {
    return this.http.post(`/orders/${orderId}/complete`);
  }

  /**
   * Cancel order
   * Requires authentication (buyer or vendor)
   * Refunds escrow if payment was made
   * 
   * @param orderId - Order UUID
   * @param reason - Cancellation reason
   * @returns Cancellation confirmation
   * 
   * @example
   * await sdk.orders.cancel('uuid-here', 'Out of stock');
   */
  async cancel(
    orderId: string,
    reason: string
  ): Promise<{
    message: string;
    cancelledBy: string;
    reason: string;
  }> {
    return this.http.post(`/orders/${orderId}/cancel`, { reason });
  }

  /**
   * Get order status history
   * Requires authentication (buyer or vendor)
   * 
   * @param orderId - Order UUID
   * @returns Status change log
   * 
   * @example
   * const history = await sdk.orders.getHistory('uuid-here');
   * history.forEach(change => {
   *   console.log(`${change.timestamp}: ${change.fromStatus} -> ${change.toStatus}`);
   * });
   */
  async getHistory(orderId: string): Promise<OrderStatusChange[]> {
    return this.http.get(`/orders/${orderId}/history`);
  }
}