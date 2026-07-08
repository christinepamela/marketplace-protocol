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
  PaymentMethod,
  Price
} from '@rangkai/sdk'
import { getAcceptedShippingQuote } from './products'

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
  buyerNotes?: string,
  logisticsQuoteId?: string,
  logisticsCost?: number,
  ownLogistics?: boolean
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
      buyerNotes,
      logisticsQuoteId,
      logisticsCost,
      ownLogistics
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
  paymentMethod: PaymentMethod,
  ownLogistics?: boolean
): Promise<CreateOrderResponse[]> {
  try {
    // Group items by vendor
    const vendorGroups = groupCartByVendor(cart)
    
    // Create order for each vendor
    const orderPromises = Object.entries(vendorGroups).map(
      ([vendorDid, items]) => 
        createOrderFromCart(vendorDid, items, shippingAddress, paymentMethod, undefined, undefined, undefined, ownLogistics)
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
// SHIPPING SUMMARY (L15 v1 — S33)
// ============================================================================

export interface VendorShippingSummary {
  status: 'none' | 'firm' | 'estimated'
  cost: Price | null
  quoteCount: number
}

/**
 * Fetch and summarize shipping cost per vendor for a cart (L15 v1 — S33)
 * - 0 accepted quotes among a vendor's products -> status 'none', cost null
 * - 1 accepted quote -> status matches that quote's own firm/estimated state
 * - 2+ accepted quotes -> forced 'estimated' (summed as a ballpark; see R23
 *   for the future consolidated-quote request that would replace this)
 *
 * Note: only price_fiat is summed for now. A quote priced only in price_sats
 * (BTC) can't be added to a fiat total without a conversion step we don't have
 * yet, so it's silently excluded from the sum. Fine for v1 since all test data
 * is USD — revisit before Bitcoin-priced quotes are real (see D6, currency layer).
 */
export async function getShippingSummaryByVendor(
  cart: Cart
): Promise<Record<string, VendorShippingSummary>> {
  const vendorGroups = groupCartByVendor(cart)
  const summaries: Record<string, VendorShippingSummary> = {}

  await Promise.all(
    Object.entries(vendorGroups).map(async ([vendorDid, items]) => {
      const uniqueProductIds = Array.from(new Set(items.map(i => i.productId)))
      const quotes = await Promise.all(
        uniqueProductIds.map(id => getAcceptedShippingQuote(id))
      )
      const acceptedQuotes = quotes.filter(
        (q): q is NonNullable<typeof q> => q !== null && q.price_fiat != null
      )

      if (acceptedQuotes.length === 0) {
        summaries[vendorDid] = { status: 'none', cost: null, quoteCount: 0 }
      } else if (acceptedQuotes.length === 1) {
        const q = acceptedQuotes[0]
        summaries[vendorDid] = {
          status: q.priceStatus,
          cost: { amount: q.price_fiat, currency: q.currency || 'USD' },
          quoteCount: 1
        }
      } else {
        const total = acceptedQuotes.reduce((sum, q) => sum + q.price_fiat, 0)
        summaries[vendorDid] = {
          status: 'estimated',
          cost: { amount: total, currency: acceptedQuotes[0].currency || 'USD' },
          quoteCount: acceptedQuotes.length
        }
      }
    })
  )

  return summaries
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