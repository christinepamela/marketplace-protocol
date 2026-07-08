'use client'

import { useState, useEffect } from 'react'
import type { Cart, CartItem } from '@/lib/stores/cart'
import { formatPrice } from '@/lib/utils/formatters'
import { groupCartByVendor, calculateVendorTotal } from '@/lib/stores/cart'
import { getShippingSummaryByVendor, type VendorShippingSummary } from '@/lib/api/cart'

interface CartSummaryProps {
  cart: Cart
  showVendorBreakdown?: boolean
  ownLogistics?: boolean
}

/**
 * Cart summary component
 * Shows price breakdown and totals
 */
export default function CartSummary({ 
  cart, 
  showVendorBreakdown = false,
  ownLogistics = false
}: CartSummaryProps) {
  // Group items by vendor — needed for shipping lookup regardless of
  // showVendorBreakdown, since shipping cost always depends on vendor (L15 v1 — S33)
  const vendorGroups = groupCartByVendor(cart)
  const hasMultipleVendors = Object.keys(vendorGroups).length > 1

  // Shipping (L15 v1 — S33): fetch each vendor's accepted quote(s) and
  // summarize into a per-vendor firm/estimated cost, or 'none' if no quote yet.
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

  // When the buyer opts to arrange their own logistics (L11), the seller's
  // shipping quote is irrelevant to their total — they're not paying it (L15 v1 — S33)
  const shippingEntries = Object.entries(shippingSummaries)
  const allQuotesResolved = !shippingLoading && shippingEntries.length > 0 &&
    shippingEntries.every(([, s]) => s.status !== 'none')
  const anyEstimated = shippingEntries.some(([, s]) => s.status === 'estimated')
  const totalShippingAmount = shippingEntries.reduce((sum, [, s]) => sum + (s.cost?.amount || 0), 0)
  const shippingCurrency = shippingEntries.find(([, s]) => s.cost)?.[1].cost?.currency || cart.subtotal.currency
  const grandTotal = ownLogistics
    ? cart.subtotal.amount
    : cart.subtotal.amount + (allQuotesResolved ? totalShippingAmount : 0)

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

      {/* Shipping (L15 v1 — S33) — replaces the old static "Calculated at
          checkout" placeholder now that L14's accepted-quote data exists.
          Removed the stale "Protocol Fee (3%)" line here too — contradicted
          the S30-confirmed fee model (D11): fee is skimmed from payouts at
          escrow release, never shown to the buyer. */}
      <div className="space-y-2">
        {ownLogistics ? (
          <div className="flex justify-between text-sm">
            <span className="text-warm-gray">Shipping</span>
            <span className="text-xs text-warm-gray">You're arranging this yourself</span>
          </div>
        ) : shippingLoading ? (
          <div className="flex justify-between text-sm">
            <span className="text-warm-gray">Shipping</span>
            <span className="text-xs text-warm-gray">Checking shipping options…</span>
          </div>
        ) : hasMultipleVendors ? (
          <>
            <p className="text-sm font-medium text-soft-black">Shipping</p>
            {Object.entries(vendorGroups).map(([vendorDid, items]) => {
              const summary = shippingSummaries[vendorDid]
              const vendorName = items[0]?.vendorName || 'Vendor'
              return (
                <div key={vendorDid} className="flex justify-between text-sm">
                  <span className="text-warm-gray">{vendorName} shipping</span>
                  <span className="text-soft-black">
                    {!summary || summary.status === 'none' ? (
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
              )
            })}
          </>
        ) : (
          (() => {
            const [vendorDid] = Object.keys(vendorGroups)
            const summary = shippingSummaries[vendorDid]
            return (
              <div className="flex justify-between text-sm">
                <span className="text-warm-gray">Shipping</span>
                <span className="text-soft-black">
                  {!summary || summary.status === 'none' ? (
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
            )
          })()
        )}
      </div>

      {/* Total */}
      <div className="pt-4 border-t border-barely-beige">
        <div className="flex justify-between">
          <span className="text-lg font-medium text-soft-black">
            {allQuotesResolved ? 'Total' : 'Subtotal'}
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