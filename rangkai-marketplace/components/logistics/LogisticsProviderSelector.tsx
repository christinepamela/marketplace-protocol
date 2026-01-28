'use client'

import { useState, useEffect } from 'react'
import { sdk } from '@/lib/sdk'
import { Truck, DollarSign, Clock, Shield, CheckCircle, XCircle, AlertCircle, Loader2 } from 'lucide-react'

interface ShippingQuote {
  id: string
  order_id: string
  provider_id: string
  method: 'standard' | 'express' | 'freight'
  price_fiat: number
  currency: string
  estimated_days: number
  insurance_included: boolean
  status: 'pending' | 'accepted' | 'rejected' | 'expired'
  valid_until: string
  created_at: string
  provider?: {
    id: string
    business_name: string
    average_rating?: number
    total_deliveries: number
  }
}

interface LogisticsProviderSelectorProps {
  orderId: string
  onProviderSelected: () => void
}

export default function LogisticsProviderSelector({
  orderId,
  onProviderSelected
}: LogisticsProviderSelectorProps) {
  const [quotes, setQuotes] = useState<ShippingQuote[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [accepting, setAccepting] = useState<string | null>(null)
  const [rejecting, setRejecting] = useState<string | null>(null)

  useEffect(() => {
    loadQuotesAndProviders()
  }, [orderId])

  const loadQuotesAndProviders = async () => {
    try {
      setLoading(true)
      setError(null)

      // Get all quotes for this order
      const quotesData = await sdk.logistics.getQuotesForOrder(orderId)

      // Filter to only show pending quotes
      const pendingQuotes = quotesData.filter(q => q.status === 'pending')

      // Load provider details for each quote
      const quotesWithProviders = await Promise.all(
        pendingQuotes.map(async (quote) => {
          try {
            const provider = await sdk.logistics.getProvider(quote.provider_id)
            return {
              ...quote,
              provider: {
                id: provider.id,
                business_name: provider.business_name,
                average_rating: provider.average_rating,
                total_deliveries: provider.total_deliveries
              }
            }
          } catch (err) {
            console.error(`Failed to load provider ${quote.provider_id}:`, err)
            return quote
          }
        })
      )

      setQuotes(quotesWithProviders)
    } catch (err: any) {
      console.error('Failed to load logistics providers:', err)
      setError(err.message || 'Failed to load shipping quotes')
    } finally {
      setLoading(false)
    }
  }

  const handleAcceptQuote = async (quoteId: string) => {
    try {
      setAccepting(quoteId)
      setError(null)

      await sdk.logistics.acceptQuote(quoteId)

      // Refresh parent component
      onProviderSelected()
    } catch (err: any) {
      console.error('Failed to accept quote:', err)
      setError(err.message || 'Failed to accept quote')
      setAccepting(null)
    }
  }

  const handleRejectQuote = async (quoteId: string) => {
    try {
      setRejecting(quoteId)
      setError(null)

      // Note: Backend has rejectQuote endpoint but SDK might not expose it
      // We'll use a simple POST request
      await fetch(`/api/v1/logistics/quotes/${quoteId}/reject`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      })

      // Reload quotes after rejection
      await loadQuotesAndProviders()
    } catch (err: any) {
      console.error('Failed to reject quote:', err)
      setError(err.message || 'Failed to reject quote')
    } finally {
      setRejecting(null)
    }
  }

  const getMethodLabel = (method: string) => {
    const labels: Record<string, string> = {
      standard: 'Standard',
      express: 'Express',
      freight: 'Freight'
    }
    return labels[method] || method
  }

  const getTimeRemaining = (validUntil: string): string => {
    const now = new Date()
    const expiry = new Date(validUntil)
    const diff = expiry.getTime() - now.getTime()

    if (diff <= 0) return 'Expired'

    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

    if (hours > 0) {
      return `${hours}h ${minutes}m remaining`
    }
    return `${minutes}m remaining`
  }

  const isExpired = (validUntil: string): boolean => {
    return new Date(validUntil) <= new Date()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-warm-taupe" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-medium text-red-900 mb-1">Error Loading Providers</h3>
            <p className="text-sm text-red-800">{error}</p>
            <button
              onClick={loadQuotesAndProviders}
              className="mt-3 text-sm text-red-700 underline hover:text-red-900"
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (quotes.length === 0) {
    return (
      <div className="bg-warm-white border border-barely-beige rounded-lg p-8 text-center">
        <Truck className="w-16 h-16 text-warm-gray mx-auto mb-4 opacity-50" />
        <h3 className="text-lg font-medium text-soft-black mb-2">
          No Quotes Available
        </h3>
        <p className="text-warm-gray text-sm">
          Logistics providers have not submitted quotes yet. This typically happens within 24 hours of order confirmation.
        </p>
      </div>
    )
  }

  // Sort quotes by price (lowest first)
  const sortedQuotes = [...quotes].sort((a, b) => a.price_fiat - b.price_fiat)

  return (
    <div className="space-y-4">
      {/* Info banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-medium text-blue-900 mb-1">Select Shipping Provider</h3>
            <p className="text-sm text-blue-800">
              Review quotes and select the best shipping option for your order. Once selected, the provider will create a shipment and provide tracking information.
            </p>
          </div>
        </div>
      </div>

      {/* Quote cards */}
      <div className="space-y-4">
        {sortedQuotes.map((quote, index) => {
          const expired = isExpired(quote.valid_until)
          const isAccepting = accepting === quote.id
          const isRejecting = rejecting === quote.id
          const isProcessing = isAccepting || isRejecting

          return (
            <div
              key={quote.id}
              className={`bg-white border-2 rounded-lg p-6 transition-all ${
                index === 0 && !expired
                  ? 'border-warm-taupe'
                  : 'border-barely-beige'
              } ${expired ? 'opacity-60' : ''}`}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-medium text-soft-black">
                      {quote.provider?.business_name || 'Logistics Provider'}
                    </h3>
                    {index === 0 && !expired && (
                      <span className="px-2 py-1 bg-warm-taupe text-white text-xs rounded-full">
                        Best Price
                      </span>
                    )}
                  </div>
                  
                  {quote.provider && (
                    <div className="flex items-center gap-4 text-sm text-warm-gray">
                      {quote.provider.average_rating !== undefined && (
                        <span className="flex items-center gap-1">
                          ⭐ {quote.provider.average_rating.toFixed(1)}
                        </span>
                      )}
                      <span>
                        {quote.provider.total_deliveries} deliveries
                      </span>
                    </div>
                  )}
                </div>

                {!expired && (
                  <div className="text-right">
                    <div className="text-2xl font-medium text-soft-black mb-1">
                      {quote.currency} {quote.price_fiat.toFixed(2)}
                    </div>
                    <div className="text-xs text-warm-gray">
                      {getTimeRemaining(quote.valid_until)}
                    </div>
                  </div>
                )}
              </div>

              {/* Details grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 pb-4 border-b border-barely-beige">
                <div>
                  <p className="text-xs text-warm-gray mb-1">Method</p>
                  <div className="flex items-center gap-1">
                    <Truck className="w-4 h-4 text-warm-taupe" />
                    <p className="font-medium text-soft-black text-sm">
                      {getMethodLabel(quote.method)}
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-xs text-warm-gray mb-1">Delivery Time</p>
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4 text-warm-taupe" />
                    <p className="font-medium text-soft-black text-sm">
                      {quote.estimated_days} {quote.estimated_days === 1 ? 'day' : 'days'}
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-xs text-warm-gray mb-1">Insurance</p>
                  <div className="flex items-center gap-1">
                    <Shield className="w-4 h-4 text-warm-taupe" />
                    <p className="font-medium text-soft-black text-sm">
                      {quote.insurance_included ? 'Included' : 'Not included'}
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-xs text-warm-gray mb-1">Quote Valid</p>
                  <p className={`font-medium text-sm ${
                    expired ? 'text-red-600' : 'text-soft-black'
                  }`}>
                    {expired ? 'Expired' : getTimeRemaining(quote.valid_until)}
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between">
                <p className="text-xs text-warm-gray">
                  Quote submitted {new Date(quote.created_at).toLocaleDateString()}
                </p>

                {expired ? (
                  <span className="text-sm text-red-600 font-medium">
                    This quote has expired
                  </span>
                ) : (
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleRejectQuote(quote.id)}
                      disabled={isProcessing}
                      className="px-4 py-2 border border-barely-beige text-warm-gray rounded-lg hover:bg-light-cream transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {isRejecting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Rejecting...
                        </>
                      ) : (
                        <>
                          <XCircle className="w-4 h-4" />
                          Reject
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => handleAcceptQuote(quote.id)}
                      disabled={isProcessing}
                      className="px-6 py-2 bg-warm-taupe text-white rounded-lg hover:bg-soft-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {isAccepting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Accepting...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-4 h-4" />
                          Accept Quote
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Help text */}
      <div className="text-xs text-warm-gray text-center pt-2">
        After accepting a quote, the logistics provider will create a shipment and provide tracking information.
      </div>
    </div>
  )
}