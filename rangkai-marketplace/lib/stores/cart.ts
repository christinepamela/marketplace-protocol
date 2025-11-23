/**
 * Cart Store
 * Client-side cart state management with localStorage persistence
 * 
 * Note: Using simple React state + localStorage instead of complex state management
 * to keep things simple and avoid dependencies.
 */

import type { Product, OrderItem, Price } from '@rangkai/sdk'

// ============================================================================
// TYPES
// ============================================================================

export interface CartItem {
  // Product info
  productId: string
  productName: string
  productImage: string
  vendorDid: string
  vendorName: string
  
  // Pricing
  pricePerUnit: Price
  
  // Quantity
  quantity: number
  moq: number // Minimum order quantity
  
  // Optional customization
  variantId?: string
  variantName?: string
  customization?: Record<string, any>
  notes?: string
  
  // Logistics info
  originCountry: string
  leadTime: number
}

export interface Cart {
  items: CartItem[]
  subtotal: Price
  itemCount: number
  lastUpdated: Date
}

// ============================================================================
// CART STORAGE KEY
// ============================================================================

const CART_STORAGE_KEY = 'rangkai_cart'

// ============================================================================
// CART OPERATIONS
// ============================================================================

/**
 * Get cart from localStorage
 */
export function getCart(): Cart {
  if (typeof window === 'undefined') {
    return createEmptyCart()
  }

  try {
    const stored = localStorage.getItem(CART_STORAGE_KEY)
    if (!stored) {
      return createEmptyCart()
    }

    const cart = JSON.parse(stored) as Cart
    
    // Validate cart structure
    if (!cart.items || !Array.isArray(cart.items)) {
      return createEmptyCart()
    }

    return cart
  } catch (error) {
    console.error('Failed to load cart:', error)
    return createEmptyCart()
  }
}

/**
 * Save cart to localStorage
 */
export function saveCart(cart: Cart): void {
  if (typeof window === 'undefined') return

  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart))
  } catch (error) {
    console.error('Failed to save cart:', error)
  }
}

/**
 * Create empty cart
 */
function createEmptyCart(): Cart {
  return {
    items: [],
    subtotal: { amount: 0, currency: 'USD' },
    itemCount: 0,
    lastUpdated: new Date()
  }
}

/**
 * Add item to cart
 * If item already exists, increase quantity
 */
export function addToCart(product: Product, quantity: number = 1): Cart {
  const cart = getCart()
  
  // Check if product already in cart
  const existingIndex = cart.items.findIndex(
    item => item.productId === product.id
  )

  if (existingIndex >= 0) {
    // Update existing item quantity
    cart.items[existingIndex].quantity += quantity
    
    // Ensure quantity meets MOQ
    const moq = cart.items[existingIndex].moq
    if (cart.items[existingIndex].quantity < moq) {
      cart.items[existingIndex].quantity = moq
    }
  } else {
    // Add new item
    const newItem: CartItem = {
      productId: product.id,
      productName: product.basic.name,
      productImage: product.basic.images.primary || product.basic.images.thumbnail || '',
      vendorDid: product.vendorDid,
      vendorName: 'Vendor', // Will be populated from vendor data
      pricePerUnit: product.pricing.basePrice,
      quantity: Math.max(quantity, product.pricing.moq), // Ensure meets MOQ
      moq: product.pricing.moq,
      originCountry: product.logistics.originCountry,
      leadTime: product.logistics.leadTime
    }
    
    cart.items.push(newItem)
  }

  // Recalculate totals
  const updatedCart = recalculateCart(cart)
  saveCart(updatedCart)
  
  return updatedCart
}

/**
 * Remove item from cart
 */
export function removeFromCart(productId: string): Cart {
  const cart = getCart()
  
  cart.items = cart.items.filter(item => item.productId !== productId)
  
  const updatedCart = recalculateCart(cart)
  saveCart(updatedCart)
  
  return updatedCart
}

/**
 * Update item quantity
 */
export function updateQuantity(productId: string, quantity: number): Cart {
  const cart = getCart()
  
  const item = cart.items.find(item => item.productId === productId)
  
  if (item) {
    // Ensure quantity meets MOQ
    if (quantity < item.moq) {
      quantity = item.moq
    }
    
    item.quantity = quantity
  }
  
  const updatedCart = recalculateCart(cart)
  saveCart(updatedCart)
  
  return updatedCart
}

/**
 * Update item notes
 */
export function updateItemNotes(productId: string, notes: string): Cart {
  const cart = getCart()
  
  const item = cart.items.find(item => item.productId === productId)
  
  if (item) {
    item.notes = notes
  }
  
  saveCart(cart)
  return cart
}

/**
 * Clear entire cart
 */
export function clearCart(): Cart {
  const emptyCart = createEmptyCart()
  saveCart(emptyCart)
  return emptyCart
}

/**
 * Get cart item count
 */
export function getCartItemCount(): number {
  const cart = getCart()
  return cart.items.reduce((total, item) => total + item.quantity, 0)
}

/**
 * Get cart total
 */
export function getCartTotal(): Price {
  const cart = getCart()
  return cart.subtotal
}

/**
 * Check if product is in cart
 */
export function isInCart(productId: string): boolean {
  const cart = getCart()
  return cart.items.some(item => item.productId === productId)
}

/**
 * Get cart item for a specific product
 */
export function getCartItem(productId: string): CartItem | undefined {
  const cart = getCart()
  return cart.items.find(item => item.productId === productId)
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Recalculate cart totals
 */
function recalculateCart(cart: Cart): Cart {
  let totalAmount = 0
  let itemCount = 0
  
  // Assume all items use same currency (USD for now)
  const currency = cart.items[0]?.pricePerUnit.currency || 'USD'
  
  cart.items.forEach(item => {
    const itemTotal = item.pricePerUnit.amount * item.quantity
    totalAmount += itemTotal
    itemCount += item.quantity
  })
  
  cart.subtotal = {
    amount: totalAmount,
    currency
  }
  
  cart.itemCount = itemCount
  cart.lastUpdated = new Date()
  
  return cart
}

/**
 * Convert cart items to OrderItems for SDK
 */
export function cartItemsToOrderItems(cartItems: CartItem[]): OrderItem[] {
  return cartItems.map(item => ({
    productId: item.productId,
    productName: item.productName,
    quantity: item.quantity,
    pricePerUnit: item.pricePerUnit,
    totalPrice: {
      amount: item.pricePerUnit.amount * item.quantity,
      currency: item.pricePerUnit.currency
    },
    variantId: item.variantId,
    variantName: item.variantName,
    customization: item.customization,
    notes: item.notes
  }))
}

/**
 * Group cart items by vendor
 * Useful for multi-vendor checkouts
 */
export function groupCartByVendor(cart: Cart): Record<string, CartItem[]> {
  const grouped: Record<string, CartItem[]> = {}
  
  cart.items.forEach(item => {
    if (!grouped[item.vendorDid]) {
      grouped[item.vendorDid] = []
    }
    grouped[item.vendorDid].push(item)
  })
  
  return grouped
}

/**
 * Calculate total for specific vendor
 */
export function calculateVendorTotal(items: CartItem[]): Price {
  const total = items.reduce(
    (sum, item) => sum + (item.pricePerUnit.amount * item.quantity),
    0
  )
  
  const currency = items[0]?.pricePerUnit.currency || 'USD'
  
  return {
    amount: total,
    currency
  }
}

/**
 * Validate cart before checkout
 * Returns array of error messages, empty if valid
 */
export function validateCart(cart: Cart): string[] {
  const errors: string[] = []
  
  if (cart.items.length === 0) {
    errors.push('Cart is empty')
    return errors
  }
  
  cart.items.forEach(item => {
    // Check MOQ
    if (item.quantity < item.moq) {
      errors.push(`${item.productName}: Quantity (${item.quantity}) is below minimum order quantity (${item.moq})`)
    }
    
    // Check price is valid
    if (item.pricePerUnit.amount <= 0) {
      errors.push(`${item.productName}: Invalid price`)
    }
  })
  
  return errors
}