'use client'

import { useState, useEffect } from 'react'
import type { Cart, CartItem } from '@/lib/stores/cart'
import { formatPrice } from '@/lib/utils/formatters'
import { groupCartByVendor } from '@/lib/stores/cart'
import { getShippingSummaryByVendor, type VendorShippingSummary } from '@/lib/api/cart'

interface CartSummaryProps {
  cart: Cart
  showVendorBreakdown?: boolean
  ownLogistics?: boolean
}

/**
 * Cart summary component
 * Shows price breakdown and totals, grouped per vendor: name, item lines,
 * shipping — all together (L15 v1 restructure — S33, per Pam's request after
 * multi-vendor testing showed disjointed vendor/item/shipping blocks).
 */
export default function CartSummary({ 
  cart, 
  showVendorBreakdown = false,
  ownLogistics = false
}: CartSummaryProps) {
  const vendorGroups = groupCartByVendor(cart)
  const hasMultipleVendors = Object.keys(vendorGroups).length > 1

  const [shippingSummaries, setShippingSummaries] = useState<Record<string, VendorShippingSummary>>({})
  const [shippingLoading, setShippingLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setShippingLoading(true)
    getShippingSummaryByVendor(cart).then(summaries => {
      if (!cancelled) {
        setShippingSummaries(summaries)
        setShippingLoading(false)
      }
    })
    return () => { cancelled = true }
  }, [cart])

  const shippingEntries = Object.entries(shippingSummaries)
  const allQuotesResolved = !shippingLoading && shippingEntries.length > 0 &&
    shippingEntries.every(([, s]) => s.status !== 'none')
  const anyEstimated = shippingEntries.some(([, s]) => s.status === 'estimated')
  const totalShippingAmount = shippingEntries.reduce((sum, [, s]) => sum + (s.cost?.amount || 0), 0)
  const shippingCurrency = shippingEntries.find(([, s]) => s.cost)?.[1].cost?.currency || cart.subtotal.currency
  const grandTotal = ownLogistics
    ? cart.subtotal.amount
    : cart.subtotal.amount + (allQuotesResolved ? totalShippingAmount : 0)

  // D30 workaround: cart items currently carry a hardcoded "Vendor" placeholder
  // name (see lib/stores/cart.ts addToCart()) — real fix is blocked on B17.
  // Fall back to a DID-suffix label so vendors are at least distinguishable.
  function vendorLabel(vendorDid: string, items: CartItem[]): string {
    const name = items[0]?.vendorName
    if (name && name !== 'Vendor') return name
    return `Vendor (…${vendorDid.slice(-6)})`
  }

  return (
    <div className="bg-light-cream p-6 space-y-4">
      <h2 className="text-lg font-medium text-soft-black">
        Order Summary
      </h2>

      {showVendorBreakdown ? (
        <div className="space-y-4 pb-4 border-b border-barely-beige">
          {Object.entries(vendorGroups).map(([vendorDid, items]) => {
            const summary = shippingSummaries[vendorDid]
            return (
              <div key={vendorDid} className="space-y-1">
                <p className="text-sm font-medium text-soft-black">
                  {vendorLabel(vendorDid, items)}
                </p>
                {items.map(item => (
                  <div key={item.productId} className="flex justify-between text-sm pl-2">
                    <span className="text-warm-gray">
                      {item.quantity}x {item.productName}
                    </span>
                    <span className="text-soft-black">
                      {formatPrice({
                        amount: item.pricePerUnit.amount * item.quantity,
                        currency: item.pricePerUnit.currency
                      })}
                    </span>
                  </div>
                ))}
                <div className="flex justify-between text-sm pl-2">
                  <span className="text-warm-gray">Shipping</span>
                  <span className="text-soft-black">
                    {ownLogistics ? (
                      <span className="text-xs text-warm-gray">You're arranging this</span>
                    ) : shippingLoading ? (
                      <span className="text-xs text-warm-gray">Checking…</span>
                    ) : !summary || summary.status === 'none' ? (
                      <span className="text-xs text-warm-gray">Awaiting quote</span>
                    ) : (
                      <>
                        {formatPrice(summary.cost!)}
                        {summary.status === 'estimated' && (
                          <span className="text-xs text-warm-gray italic ml-1">(estimated)</span>
                        )}
                      </>
                    )}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="flex justify-between text-sm">
          <span className="text-warm-gray">Items ({cart.itemCount})</span>
          <span className="text-soft-black">{formatPrice(cart.subtotal)}</span>
        </div>
      )}

      {/* Total */}
      <div className="pt-4 border-t border-barely-beige">
        <div className="flex justify-between">
          <span className="text-lg font-medium text-soft-black">
            {allQuotesResolved || ownLogistics ? 'Total' : 'Subtotal'}
          </span>
          <span className="text-lg font-medium text-soft-black">
            {formatPrice({ amount: grandTotal, currency: shippingCurrency })}
          </span>
        </div>
        {!ownLogistics && !shippingLoading && !allQuotesResolved && (
          <p className="text-xs text-warm-gray mt-2">
            Shown total is products only — shipping is still pending a quote for one or more items.
          </p>
        )}
        {!ownLogistics && allQuotesResolved && anyEstimated && (
          <p className="text-xs text-warm-gray mt-2">
            Includes an estimated shipping amount — the seller will confirm the final price before fulfillment.
          </p>
        )}
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