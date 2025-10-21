/**
 * Order Service
 * Handles order lifecycle, state machine, and management
 */

import { v4 as uuidv4 } from 'uuid';
import type {
  Order,
  OrderStatus,
  OrderType,
  CreateOrderRequest,
  CreateOrderResponse,
  UpdateOrderStatusRequest,
  OrderStatusChange,
  OrderFees,
  FeeConfiguration
} from './types';

// Import constants separately
import { DEFAULT_FEE_CONFIG } from './types';
import { isValidTransition, canCancelOrder } from './types';
import type { Price } from '../layer1-catalog/types';

export class OrderService {
  private dbClient: any;
  private feeConfig: FeeConfiguration;
  
  constructor(dbClient: any, feeConfig?: FeeConfiguration) {
    this.dbClient = dbClient;
    this.feeConfig = feeConfig || DEFAULT_FEE_CONFIG;
  }

  /**
   * Create a new order
   */
  async createOrder(request: CreateOrderRequest): Promise<CreateOrderResponse> {
    // Validate items
    if (request.items.length === 0) {
      throw new Error('Order must contain at least one item');
    }
    
    // Calculate pricing
    const subtotal = this.calculateSubtotal(request.items);
    const fees = this.calculateFees(subtotal, request.paymentMethod);
    const total = {
      amount: subtotal.amount + fees.totalFees.amount,
      currency: subtotal.currency
    };
    
    // Generate order number
    const orderNumber = await this.generateOrderNumber();
    
    // Create order
    const order: Order = {
      id: uuidv4(),
      orderNumber,
      buyerDid: request.buyerDid,
      vendorDid: request.vendorDid,
      clientId: request.clientId,
      type: request.type,
      items: request.items,
      subtotal,
      fees,
      total,
      shippingAddress: request.shippingAddress,
      paymentMethod: request.paymentMethod,
      paymentStatus: 'pending',
      escrowStatus: 'none',
      status: 'payment_pending',
      createdAt: new Date(),
      updatedAt: new Date(),
      buyerNotes: request.buyerNotes
    };
    
    // Store in database
    await this.storeOrder(order);
    
    // Log status change
    await this.logStatusChange({
      orderId: order.id,
      fromStatus: 'draft',
      toStatus: 'payment_pending',
      changedBy: request.buyerDid,
      reason: 'Order created',
      timestamp: new Date()
    });
    
    return {
      orderId: order.id,
      orderNumber: order.orderNumber,
      total: order.total,
      paymentRequired: order.total,
      status: order.status
    };
  }

  /**
   * Get order by ID
   */
  async getOrderById(orderId: string): Promise<Order | null> {
    const { data, error } = await this.dbClient
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    
    return this.mapDatabaseToOrder(data);
  }

  /**
   * Get order by order number
   */
  async getOrderByNumber(orderNumber: string): Promise<Order | null> {
    const { data, error } = await this.dbClient
      .from('orders')
      .select('*')
      .eq('order_number', orderNumber)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    
    return this.mapDatabaseToOrder(data);
  }

  /**
   * Update order status (state machine)
   */
  async updateStatus(request: UpdateOrderStatusRequest): Promise<void> {
    const { orderId, newStatus, reason, metadata } = request;
    
    // Get current order
    const order = await this.getOrderById(orderId);
    if (!order) {
      throw new Error(`Order not found: ${orderId}`);
    }
    
    // Validate transition
    if (!isValidTransition(order.status, newStatus)) {
      throw new Error(
        `Invalid status transition: ${order.status} → ${newStatus}`
      );
    }
    
    const oldStatus = order.status;
    order.status = newStatus;
    order.updatedAt = new Date();
    
    // Update status-specific timestamps
    switch (newStatus) {
      case 'paid':
        order.paidAt = new Date();
        order.paymentStatus = 'completed';
        order.escrowStatus = 'held';
        break;
      case 'shipped':
        order.shippedAt = new Date();
        break;
      case 'delivered':
        order.deliveredAt = new Date();
        break;
      case 'completed':
        order.completedAt = new Date();
        order.escrowStatus = 'released';
        break;
      case 'cancelled':
      case 'refunded':
        order.escrowStatus = 'refunded';
        break;
    }
    
    // Save to database
    await this.updateOrderInDb(order);
    
    // Log status change
    await this.logStatusChange({
      orderId,
      fromStatus: oldStatus,
      toStatus: newStatus,
      changedBy: 'system', // Should be actual user DID
      reason,
      timestamp: new Date(),
      metadata
    });
  }

  /**
   * Mark order as paid
   */
  async markAsPaid(orderId: string, paymentId: string): Promise<void> {
  // Get the order
  const order = await this.getOrderById(orderId);
  if (!order) throw new Error('Order not found');
  
  // Update status
  await this.updateStatus({
    orderId,
    newStatus: 'paid',
    reason: 'Payment confirmed',
    metadata: { paymentId }
  });
  
  // Create escrow (we need to import EscrowService)
  // For now, this will be handled by the calling code
}

  /**
   * Confirm order (vendor accepts)
   */
  async confirmOrder(orderId: string, vendorDid: string): Promise<void> {
    const order = await this.getOrderById(orderId);
    if (!order) throw new Error('Order not found');
    
    if (order.vendorDid !== vendorDid) {
      throw new Error('Unauthorized: Only vendor can confirm order');
    }
    
    await this.updateStatus({
      orderId,
      newStatus: 'confirmed',
      reason: 'Vendor confirmed order'
    });
  }

  /**
   * Mark order as shipped
   */
  async markAsShipped(
    orderId: string,
    trackingNumber?: string,
    logisticsProviderId?: string
  ): Promise<void> {
    const order = await this.getOrderById(orderId);
    if (!order) throw new Error('Order not found');
    
    order.trackingNumber = trackingNumber;
    order.logisticsProviderId = logisticsProviderId;
    
    await this.updateOrderInDb(order);
    
    await this.updateStatus({
      orderId,
      newStatus: 'shipped',
      reason: 'Order shipped',
      metadata: { trackingNumber, logisticsProviderId }
    });
  }

  /**
   * Mark order as delivered
   */
  async markAsDelivered(orderId: string): Promise<void> {
    await this.updateStatus({
      orderId,
      newStatus: 'delivered',
      reason: 'Order delivered'
    });
  }

  /**
   * Complete order (release escrow)
   */
  async completeOrder(orderId: string): Promise<void> {
    await this.updateStatus({
      orderId,
      newStatus: 'completed',
      reason: 'Order completed, funds released'
    });
  }

  /**
   * Cancel order
   */
  async cancelOrder(
    orderId: string,
    cancelledBy: string,
    reason: string
  ): Promise<void> {
    const order = await this.getOrderById(orderId);
    if (!order) throw new Error('Order not found');
    
    if (!canCancelOrder(order.status)) {
      throw new Error(`Cannot cancel order in status: ${order.status}`);
    }
    
    await this.updateStatus({
      orderId,
      newStatus: 'cancelled',
      reason,
      metadata: { cancelledBy }
    });
  }

  /**
   * Get orders by buyer
   */
  async getOrdersByBuyer(
    buyerDid: string,
    filters?: {
      status?: OrderStatus;
      limit?: number;
      offset?: number;
    }
  ): Promise<Order[]> {
    let query = this.dbClient
      .from('orders')
      .select('*')
      .eq('buyer_did', buyerDid);
    
    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    
    if (filters?.limit) {
      query = query.limit(filters.limit);
    }
    
    if (filters?.offset) {
      query = query.range(
        filters.offset,
        filters.offset + (filters.limit || 10) - 1
      );
    }
    
    query = query.order('created_at', { ascending: false });
    
    const { data, error } = await query;
    if (error) throw error;
    
    return data.map(this.mapDatabaseToOrder);
  }

  /**
   * Get orders by vendor
   */
  async getOrdersByVendor(
    vendorDid: string,
    filters?: {
      status?: OrderStatus;
      limit?: number;
      offset?: number;
    }
  ): Promise<Order[]> {
    let query = this.dbClient
      .from('orders')
      .select('*')
      .eq('vendor_did', vendorDid);
    
    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    
    if (filters?.limit) {
      query = query.limit(filters.limit);
    }
    
    if (filters?.offset) {
      query = query.range(
        filters.offset,
        filters.offset + (filters.limit || 10) - 1
      );
    }
    
    query = query.order('created_at', { ascending: false });
    
    const { data, error } = await query;
    if (error) throw error;
    
    return data.map(this.mapDatabaseToOrder);
  }

  /**
   * Get order status history
   */
  async getOrderHistory(orderId: string): Promise<OrderStatusChange[]> {
    const { data, error } = await this.dbClient
      .from('order_status_log')
      .select('*')
      .eq('order_id', orderId)
      .order('timestamp', { ascending: true });
    
    if (error) throw error;
    
    return data.map((d: any) => ({
      orderId: d.order_id,
      fromStatus: d.from_status,
      toStatus: d.to_status,
      changedBy: d.changed_by,
      reason: d.reason,
      timestamp: new Date(d.timestamp),
      metadata: d.metadata
    }));
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  /**
   * Calculate subtotal
   */
  private calculateSubtotal(items: any[]): Price {
    let total = 0;
    const currency = items[0]?.totalPrice.currency || 'USD';
    
    items.forEach(item => {
      total += item.totalPrice.amount;
    });
    
    return { amount: total, currency };
  }

  /**
   * Calculate fees
   */
  private calculateFees(subtotal: Price, paymentMethod: string): OrderFees {
    const protocolFeeAmount = 
      (subtotal.amount * this.feeConfig.protocolFeePercentage) / 100;
    
    const clientFeeAmount = 
      (subtotal.amount * this.feeConfig.clientFeePercentage) / 100;
    
    let paymentProcessingFee = 0;
    if (this.feeConfig.paymentMethodFees) {
      // Simplified fee calculation
      if (paymentMethod === 'stripe') {
        paymentProcessingFee = subtotal.amount * 0.029 + 0.30; // 2.9% + $0.30
      } else if (paymentMethod === 'lightning') {
        paymentProcessingFee = subtotal.amount * 0.001; // 0.1%
      }
    }
    
    const totalFeesAmount = protocolFeeAmount + clientFeeAmount + paymentProcessingFee;
    
    return {
      protocolFee: {
        amount: protocolFeeAmount,
        currency: subtotal.currency
      },
      protocolFeePercentage: this.feeConfig.protocolFeePercentage,
      clientFee: {
        amount: clientFeeAmount,
        currency: subtotal.currency
      },
      clientFeePercentage: this.feeConfig.clientFeePercentage,
      paymentProcessingFee: paymentProcessingFee > 0 ? {
        amount: paymentProcessingFee,
        currency: subtotal.currency
      } : undefined,
      totalFees: {
        amount: totalFeesAmount,
        currency: subtotal.currency
      }
    };
  }

  /**
   * Generate unique order number
   */
  private async generateOrderNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.random().toString(36).substring(2, 5).toUpperCase();
    
    return `ORD-${year}-${timestamp}-${random}`;
  }

  /**
   * Store order in database
   */
  private async storeOrder(order: Order): Promise<void> {
    const { error } = await this.dbClient
      .from('orders')
      .insert({
        id: order.id,
        order_number: order.orderNumber,
        buyer_did: order.buyerDid,
        vendor_did: order.vendorDid,
        client_id: order.clientId,
        type: order.type,
        items: order.items,
        subtotal: order.subtotal,
        fees: order.fees,
        total: order.total,
        shipping_address: order.shippingAddress,
        shipping_method: order.shippingMethod,
        shipping_cost: order.shippingCost,
        payment_method: order.paymentMethod,
        payment_status: order.paymentStatus,
        escrow_status: order.escrowStatus,
        status: order.status,
        buyer_notes: order.buyerNotes,
        vendor_notes: order.vendorNotes,
        internal_notes: order.internalNotes,
        created_at: order.createdAt,
        updated_at: order.updatedAt
      });
    
    if (error) throw error;
  }

  /**
   * Update order in database
   */
  private async updateOrderInDb(order: Order): Promise<void> {
    const { error } = await this.dbClient
      .from('orders')
      .update({
        status: order.status,
        payment_status: order.paymentStatus,
        escrow_status: order.escrowStatus,
        tracking_number: order.trackingNumber,
        logistics_provider_id: order.logisticsProviderId,
        estimated_delivery_date: order.estimatedDeliveryDate,
        actual_delivery_date: order.actualDeliveryDate,
        vendor_notes: order.vendorNotes,
        internal_notes: order.internalNotes,
        updated_at: order.updatedAt,
        paid_at: order.paidAt,
        shipped_at: order.shippedAt,
        delivered_at: order.deliveredAt,
        completed_at: order.completedAt
      })
      .eq('id', order.id);
    
    if (error) throw error;
  }

  /**
   * Log status change
   */
  private async logStatusChange(change: OrderStatusChange): Promise<void> {
    const { error } = await this.dbClient
      .from('order_status_log')
      .insert({
        order_id: change.orderId,
        from_status: change.fromStatus,
        to_status: change.toStatus,
        changed_by: change.changedBy,
        reason: change.reason,
        timestamp: change.timestamp,
        metadata: change.metadata
      });
    
    if (error) throw error;
  }

  /**
   * Map database record to Order
   */
  private mapDatabaseToOrder(data: any): Order {
    return {
      id: data.id,
      orderNumber: data.order_number,
      buyerDid: data.buyer_did,
      vendorDid: data.vendor_did,
      clientId: data.client_id,
      type: data.type,
      items: data.items,
      subtotal: data.subtotal,
      fees: data.fees,
      total: data.total,
      shippingAddress: data.shipping_address,
      shippingMethod: data.shipping_method,
      shippingCost: data.shipping_cost,
      paymentMethod: data.payment_method,
      paymentStatus: data.payment_status,
      escrowStatus: data.escrow_status,
      status: data.status,
      logisticsProviderId: data.logistics_provider_id,
      trackingNumber: data.tracking_number,
      estimatedDeliveryDate: data.estimated_delivery_date ? new Date(data.estimated_delivery_date) : undefined,
      actualDeliveryDate: data.actual_delivery_date ? new Date(data.actual_delivery_date) : undefined,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
      paidAt: data.paid_at ? new Date(data.paid_at) : undefined,
      shippedAt: data.shipped_at ? new Date(data.shipped_at) : undefined,
      deliveredAt: data.delivered_at ? new Date(data.delivered_at) : undefined,
      completedAt: data.completed_at ? new Date(data.completed_at) : undefined,
      buyerNotes: data.buyer_notes,
      vendorNotes: data.vendor_notes,
      internalNotes: data.internal_notes
    };
  }
}