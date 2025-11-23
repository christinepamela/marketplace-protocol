'use client'

import type { Cart, CartItem } from '@/lib/stores/cart'
import { formatPrice } from '@/lib/utils/formatters'
import { groupCartByVendor, calculateVendorTotal } from '@/lib/stores/cart'

interface CartSummaryProps {
  cart: Cart
  showVendorBreakdown?: boolean
}

/**
 * Cart summary component
 * Shows price breakdown and totals
 */
export default function CartSummary({ 
  cart, 
  showVendorBreakdown = false 
}: CartSummaryProps) {
  // Group items by vendor for breakdown
  const vendorGroups = showVendorBreakdown ? groupCartByVendor(cart) : {}
  const hasMultipleVendors = Object.keys(vendorGroups).length > 1

  return (
    <div className="bg-light-cream p-6 space-y-4">
      <h2 className="text-lg font-medium text-soft-black">
        Order Summary
      </h2>

      {/* Vendor breakdown (if multiple vendors) */}
      {showVendorBreakdown && hasMultipleVendors && (
        <div className="space-y-3 pb-4 border-b border-barely-beige">
          <p className="text-sm font-medium text-soft-black">
            Items by Vendor
          </p>
          {Object.entries(vendorGroups).map(([vendorDid, items]) => {
            const vendorTotal = calculateVendorTotal(items)
            const vendorName = items[0]?.vendorName || 'Unknown Vendor'
            
            return (
              <div key={vendorDid} className="flex justify-between text-sm">
                <span className="text-warm-gray">
                  {vendorName} ({items.length} items)
                </span>
                <span className="text-soft-black">
                  {formatPrice(vendorTotal)}
                </span>
              </div>
            )
          })}
        </div>
      )}

      {/* Item count */}
      <div className="flex justify-between text-sm">
        <span className="text-warm-gray">
          Items ({cart.itemCount})
        </span>
        <span className="text-soft-black">
          {formatPrice(cart.subtotal)}
        </span>
      </div>

      {/* Shipping note */}
      <div className="flex justify-between text-sm">
        <span className="text-warm-gray">Shipping</span>
        <span className="text-warm-gray text-xs">
          Calculated at checkout
        </span>
      </div>

      {/* Protocol fee note */}
      <div className="flex justify-between text-sm">
        <span className="text-warm-gray">Protocol Fee (3%)</span>
        <span className="text-warm-gray text-xs">
          Included in price
        </span>
      </div>

      {/* Total */}
      <div className="pt-4 border-t border-barely-beige">
        <div className="flex justify-between">
          <span className="text-lg font-medium text-soft-black">
            Subtotal
          </span>
          <span className="text-lg font-medium text-soft-black">
            {formatPrice(cart.subtotal)}
          </span>
        </div>
        <p className="text-xs text-warm-gray mt-2">
          Final total will be calculated at checkout including shipping
        </p>
      </div>

      {/* Multi-vendor notice */}
      {hasMultipleVendors && (
        <div className="pt-4 border-t border-barely-beige">
          <div className="bg-warm-white p-3 text-xs text-warm-gray">
            <p className="font-medium text-soft-black mb-1">
              📦 Multiple Vendors
            </p>
            <p>
              Your items will ship separately from {Object.keys(vendorGroups).length} vendors.
              You'll create separate orders at checkout.
            </p>
          </div>
        </div>
      )}

      {/* Escrow notice */}
      <div className="pt-4 border-t border-barely-beige">
        <div className="bg-warm-white p-3 text-xs text-warm-gray">
          <p className="font-medium text-soft-black mb-1">
            🔒 Secure Payments
          </p>
          <p>
            Your payment is held in escrow and released to vendors only after 
            you confirm delivery or 7 days after delivery.
          </p>
        </div>
      </div>
    </div>
  )
}