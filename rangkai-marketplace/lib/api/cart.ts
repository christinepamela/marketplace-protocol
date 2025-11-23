/**
 * Cart API Functions
 * Helper functions to create orders from cart
 */

import { sdk } from '@/lib/sdk'
import type { 
  CartItem, 
  Cart 
} from '@/lib/stores/cart'
import { 
  cartItemsToOrderItems, 
  groupCartByVendor, 
  calculateVendorTotal 
} from '@/lib/stores/cart'
import type { 
  CreateOrderRequest, 
  CreateOrderResponse,
  ShippingAddress,
  PaymentMethod 
} from '@rangkai/sdk'

// ============================================================================
// ORDER CREATION
// ============================================================================

/**
 * Create order from cart items for a specific vendor
 * 
 * @param vendorDid - Vendor's DID
 * @param cartItems - Items to order from this vendor
 * @param shippingAddress - Delivery address
 * @param paymentMethod - Payment method
 * @param buyerNotes - Optional notes from buyer
 * @returns Order creation response
 */
export async function createOrderFromCart(
  vendorDid: string,
  cartItems: CartItem[],
  shippingAddress: ShippingAddress,
  paymentMethod: PaymentMethod,
  buyerNotes?: string
): Promise<CreateOrderResponse> {
  try {
    // Convert cart items to order items
    const orderItems = cartItemsToOrderItems(cartItems)
    
    // Determine order type based on quantities
    const totalQuantity = cartItems.reduce((sum, item) => sum + item.quantity, 0)
    const orderType = totalQuantity >= 50 ? 'wholesale' : 'sample'
    
    // Create order request
    const request: CreateOrderRequest = {
      vendorDid,
      clientId: 'rangkai-marketplace', // Your marketplace client ID
      type: orderType,
      items: orderItems,
      shippingAddress,
      paymentMethod,
      buyerNotes
    }
    
    // Call SDK to create order
    const response = await sdk.orders.create(request)
    
    return response
  } catch (error) {
    console.error('Failed to create order from cart:', error)
    throw error
  }
}

/**
 * Create multiple orders (one per vendor) from cart
 * Use this when cart has items from multiple vendors
 * 
 * @param cart - Full cart
 * @param shippingAddress - Delivery address
 * @param paymentMethod - Payment method
 * @returns Array of order responses, one per vendor
 */
export async function createOrdersFromCart(
  cart: Cart,
  shippingAddress: ShippingAddress,
  paymentMethod: PaymentMethod
): Promise<CreateOrderResponse[]> {
  try {
    // Group items by vendor
    const vendorGroups = groupCartByVendor(cart)
    
    // Create order for each vendor
    const orderPromises = Object.entries(vendorGroups).map(
      ([vendorDid, items]) => 
        createOrderFromCart(vendorDid, items, shippingAddress, paymentMethod)
    )
    
    // Wait for all orders to be created
    const responses = await Promise.all(orderPromises)
    
    return responses
  } catch (error) {
    console.error('Failed to create orders from cart:', error)
    throw error
  }
}

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Validate shipping address
 * Returns array of error messages, empty if valid
 */
export function validateShippingAddress(address: Partial<ShippingAddress>): string[] {
  const errors: string[] = []
  
  if (!address.name?.trim()) {
    errors.push('Name is required')
  }
  
  if (!address.addressLine1?.trim()) {
    errors.push('Address line 1 is required')
  }
  
  if (!address.city?.trim()) {
    errors.push('City is required')
  }
  
  if (!address.postalCode?.trim()) {
    errors.push('Postal code is required')
  }
  
  if (!address.country?.trim()) {
    errors.push('Country is required')
  }
  
  if (!address.phone?.trim()) {
    errors.push('Phone number is required')
  }
  
  return errors
}

/**
 * Format shipping address for display
 */
export function formatShippingAddress(address: ShippingAddress): string {
  const parts = [
    address.name,
    address.addressLine1,
    address.addressLine2,
    `${address.city}, ${address.state || ''} ${address.postalCode}`,
    address.country,
    address.phone
  ].filter(Boolean)
  
  return parts.join('\n')
}