/**
 * Logistics API — buyer-facing wrappers (L15c — S34)
 */

import { sdk } from '@/lib/sdk'

// ============================================================================
// TYPES
// ============================================================================

export interface BuyerQuoteRequest {
  id: string
  product_id: string
  origin_country: string
  destination_country: string
  weight_kg: number
  dimensions_cm: { length: number; width: number; height: number }
  incoterm: string
  status: string
  expires_at: string
  created_at: string
  product: {
    id: string
    basic: { name: string }
    logistics: any
  } | null
  quotes: IncomingQuote[]
}

export interface IncomingQuote {
  id: string
  provider_id: string
  method: string
  price_fiat: number | null
  currency: string
  estimated_days: number
  insurance_included: boolean
  status: string
  valid_until: string
  created_at: string
  provider: {
    id: string
    business_name: string
    average_rating: number | null
  } | null
}

// ============================================================================
// API CALLS
// ============================================================================

/**
 * Broadcast a buyer-initiated RFQ for one product.
 * Called once per unique product in cart where the buyer wants pool quotes.
 */
export async function broadcastBuyerQuoteRequest(
  productId: string,
  destinationCountry: string
): Promise<{ id: string }> {
  try {
    const result = await sdk.logistics.requestQuoteAsBuyer({
      product_id: productId,
      destination_country: destinationCountry,
    })
    return result
  } catch (error) {
    console.error('Failed to broadcast buyer quote request:', error)
    throw error
  }
}

/**
 * Get all open quote requests the buyer created, with any incoming quotes.
 * Used to poll for provider responses and let the buyer pick one.
 */
export async function getBuyerPendingQuoteRequests(): Promise<BuyerQuoteRequest[]> {
  try {
    const result = await sdk.logistics.getBuyerPendingQuoteRequests()
    return result || []
  } catch (error) {
    console.error('Failed to fetch buyer pending quote requests:', error)
    return []
  }
}

/**
 * Accept a quote submitted by a provider in response to a buyer RFQ.
 * Re-uses the existing acceptQuote endpoint (ownership check in the backend
 * already allows the buyer on the order — for product quotes, we added the
 * buyer-RFQ requester check in the route above).
 */
export async function acceptIncomingQuote(quoteId: string): Promise<void> {
  await sdk.logistics.acceptQuote(quoteId)
}