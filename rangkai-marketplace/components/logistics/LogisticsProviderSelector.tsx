import React, { useState, useEffect } from 'react'
import { Loader2, AlertCircle, Package } from 'lucide-react'
import ProviderCard from './ProviderCard'
import ShippingQuote from './ShippingQuote'
import { sdk } from '@/lib/sdk'
import type { LogisticsProvider, ShippingQuote as ShippingQuoteType } from '@rangkai/sdk'

interface LogisticsProviderSelectorProps {
  orderId: string
  onProviderSelected?: (providerId: string, quoteId: string) => void
}

export default function LogisticsProviderSelector({ 
  orderId, 
  onProviderSelected 
}: LogisticsProviderSelectorProps) {
  const [providers, setProviders] = useState<LogisticsProvider[]>([])
  const [quotes, setQuotes] = useState<ShippingQuoteType[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedQuoteId, setSelectedQuoteId] = useState<string | null>(null)
  const [accepting, setAccepting] = useState(false)

  useEffect(() => {
    loadQuotesAndProviders()
  }, [orderId])

  const loadQuotesAndProviders = async () => {
    setLoading(true)
    setError(null)
    
    try {
      // Get quotes for this order
      const quotesData = await sdk.logistics.getQuotesForOrder(orderId)
      setQuotes(quotesData)

      // Get provider details for each quote
      const providerIds = [...new Set(quotesData.map(q => q.provider_id))]
      const providersData = await Promise.all(
        providerIds.map(id => sdk.logistics.getProvider(id))
      )
      setProviders(providersData)

    } catch (err: any) {
      console.error('Failed to load logistics providers:', err)
      setError(err.message || 'Failed to load providers')
    } finally {
      setLoading(false)
    }
  }

  const handleAcceptQuote = async () => {
    if (!selectedQuoteId) return

    setAccepting(true)
    try {
      await sdk.logistics.acceptQuote(selectedQuoteId)
      
      // Find the selected quote to get provider ID
      const selectedQuote = quotes.find(q => q.id === selectedQuoteId)
      if (selectedQuote && onProviderSelected) {
        onProviderSelected(selectedQuote.provider_id, selectedQuoteId)
      }

      alert('Logistics provider selected successfully!')
      
      // Reload to show updated status
      await loadQuotesAndProviders()
      
    } catch (err: any) {
      console.error('Failed to accept quote:', err)
      alert(err.message || 'Failed to select provider')
    } finally {
      setAccepting(false)
    }
  }

  // Get provider name for a quote
  const getProviderName = (providerId: string) => {
    const provider = providers.find(p => p.id === providerId)
    return provider?.business_name || 'Unknown Provider'
  }

  // Check if any quote is already accepted
  const acceptedQuote = quotes.find(q => q.status === 'accepted')

  if (loading) {
    return (
      <div className="bg-white border border-barely-beige rounded-lg p-8">
        <div className="flex flex-col items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-warm-taupe mb-4" />
          <p className="text-warm-gray">Loading logistics providers...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-medium text-red-900 mb-1">
              Error Loading Providers
            </h4>
            <p className="text-sm text-red-700">{error}</p>
            <button
              onClick={loadQuotesAndProviders}
              className="text-sm text-red-800 underline mt-2"
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
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
        <div className="flex items-start gap-3">
          <Package className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-medium text-amber-900 mb-1">
              No Quotes Available
            </h4>
            <p className="text-sm text-amber-700">
              Logistics providers have not submitted quotes yet. 
              This typically happens within 24 hours of order confirmation.
            </p>
          </div>
        </div>
      </div>
    )
  }

  // If a quote is already accepted, show it prominently
  if (acceptedQuote) {
    return (
      <div className="space-y-4">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-green-900 mb-1">
            ✓ Logistics Provider Selected
          </h4>
          <p className="text-sm text-green-700">
            {getProviderName(acceptedQuote.provider_id)} will handle the shipping for this order.
          </p>
        </div>

        <ShippingQuote
          quote={acceptedQuote}
          providerName={getProviderName(acceptedQuote.provider_id)}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-medium text-soft-black mb-2">
          Select Logistics Provider
        </h3>
        <p className="text-sm text-warm-gray">
          Choose a shipping provider and quote for this order. 
          You can compare rates, delivery times, and provider ratings.
        </p>
      </div>

      {/* Quotes grouped by provider */}
      <div className="space-y-4">
        {providers.map(provider => {
          const providerQuotes = quotes.filter(q => q.provider_id === provider.id)
          
          return (
            <div key={provider.id} className="space-y-3">
              {/* Provider info */}
              <ProviderCard provider={provider} />

              {/* Provider's quotes */}
              <div className="ml-4 space-y-3">
                {providerQuotes.map(quote => (
                  <ShippingQuote
                    key={quote.id}
                    quote={quote}
                    selected={selectedQuoteId === quote.id}
                    onSelect={() => setSelectedQuoteId(quote.id)}
                  />
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* Action buttons */}
      {selectedQuoteId && (
        <div className="flex items-center justify-between p-4 bg-light-cream border border-barely-beige rounded-lg">
          <div>
            <p className="text-sm font-medium text-soft-black">
              Ready to proceed?
            </p>
            <p className="text-xs text-warm-gray mt-1">
              Once accepted, the provider will prepare your shipment
            </p>
          </div>
          
          <button
            onClick={handleAcceptQuote}
            disabled={accepting}
            className="btn btn-primary"
          >
            {accepting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Accepting...
              </>
            ) : (
              'Accept Quote'
            )}
          </button>
        </div>
      )}

      {/* Helper text */}
      <div className="text-xs text-warm-gray text-center">
        Quotes are valid for a limited time. Select one to proceed with shipping.
      </div>
    </div>
  )
}