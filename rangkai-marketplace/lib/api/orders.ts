/**
 * Orders API Functions
 * Wrapper around SDK for easier client usage
 */

import { sdk } from '@/lib/sdk'
import type { Order, OrderStatus, OrderStatusChange } from '@rangkai/sdk'

// ============================================================================
// FETCH ORDERS
// ============================================================================

/**
 * Get orders for buyer (orders I placed)
 */
export async function getBuyerOrders(
  buyerDid: string,
  options?: {
    status?: OrderStatus
    limit?: number
    offset?: number
  }
): Promise<Order[]> {
  try {
    return await sdk.orders.getByBuyer(buyerDid, options)
  } catch (error) {
    console.error('Failed to fetch buyer orders:', error)
    throw error
  }
}

/**
 * Get orders for vendor (orders to fulfill)
 */
export async function getVendorOrders(
  vendorDid: string,
  options?: {
    status?: OrderStatus
    limit?: number
    offset?: number
  }
): Promise<Order[]> {
  try {
    return await sdk.orders.getByVendor(vendorDid, options)
  } catch (error) {
    console.error('Failed to fetch vendor orders:', error)
    throw error
  }
}

/**
 * Get single order by ID
 */
export async function getOrder(orderId: string): Promise<Order> {
  try {
    return await sdk.orders.getById(orderId)
  } catch (error) {
    console.error('Failed to fetch order:', error)
    throw error
  }
}

/**
 * Get order status history
 */
export async function getOrderHistory(orderId: string): Promise<OrderStatusChange[]> {
  try {
    return await sdk.orders.getHistory(orderId)
  } catch (error) {
    console.error('Failed to fetch order history:', error)
    throw error
  }
}

// ============================================================================
// ORDER ACTIONS
// ============================================================================

/**
 * Mark order as shipped (vendor action)
 */
export async function shipOrder(
  orderId: string,
  trackingNumber?: string,
  logisticsProviderId?: string
): Promise<void> {
  try {
    await sdk.orders.markAsShipped(orderId, trackingNumber, logisticsProviderId)
  } catch (error) {
    console.error('Failed to ship order:', error)
    throw error
  }
}

/**
 * Confirm order delivery (buyer action)
 */
export async function confirmDelivery(orderId: string): Promise<void> {
  try {
    await sdk.orders.markAsDelivered(orderId)
  } catch (error) {
    console.error('Failed to confirm delivery:', error)
    throw error
  }
}

/**
 * Complete order (buyer action or auto-complete)
 */
export async function completeOrder(orderId: string): Promise<void> {
  try {
    await sdk.orders.complete(orderId)
  } catch (error) {
    console.error('Failed to complete order:', error)
    throw error
  }
}

/**
 * Cancel order (buyer or vendor action)
 */
export async function cancelOrder(orderId: string, reason: string): Promise<void> {
  try {
    await sdk.orders.cancel(orderId, reason)
  } catch (error) {
    console.error('Failed to cancel order:', error)
    throw error
  }
}

/**
 * Confirm order (vendor action)
 */
export async function confirmOrder(orderId: string): Promise<void> {
  try {
    await sdk.orders.confirm(orderId)
  } catch (error) {
    console.error('Failed to confirm order:', error)
    throw error
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Check if user can perform buyer actions on this order
 */
export function canPerformBuyerActions(order: Order, userDid: string): boolean {
  return order.buyerDid === userDid
}

/**
 * Check if user can perform vendor actions on this order
 */
export function canPerformVendorActions(order: Order, userDid: string): boolean {
  return order.vendorDid === userDid
}

/**
 * Get available actions for order based on status and user role
 */
export function getAvailableActions(order: Order, userDid: string): {
  canConfirm: boolean
  canShip: boolean
  canConfirmDelivery: boolean
  canComplete: boolean
  canCancel: boolean
} {
  const isBuyer = order.buyerDid === userDid
  const isVendor = order.vendorDid === userDid

  return {
    // Vendor: Confirm order after payment
    canConfirm: isVendor && order.status === 'paid',
    
    // Vendor: Ship order after confirmation
    canShip: isVendor && order.status === 'confirmed',
    
    // Buyer: Confirm delivery after shipped
    canConfirmDelivery: isBuyer && order.status === 'shipped',
    
    // Buyer: Complete order after delivery (releases escrow)
    canComplete: isBuyer && order.status === 'delivered',
    
    // Both: Cancel before shipping
    canCancel: (isBuyer || isVendor) && 
               ['paid', 'confirmed'].includes(order.status)
  }
}