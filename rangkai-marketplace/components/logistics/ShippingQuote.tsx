import React from 'react'
import { DollarSign, Calendar, Shield, Truck, Clock } from 'lucide-react'
import type { ShippingQuote as ShippingQuoteType } from '@rangkai/sdk'

interface ShippingQuoteProps {
  quote: ShippingQuoteType
  providerName?: string
  selected?: boolean
  onSelect?: () => void
}

export default function ShippingQuote({ 
  quote, 
  providerName,
  selected,
  onSelect 
}: ShippingQuoteProps) {
  
  const formatPrice = () => {
    if (quote.price_fiat) {
      return `${quote.currency} ${quote.price_fiat.toFixed(2)}`
    }
    if (quote.price_sats) {
      return `${quote.price_sats.toLocaleString()} sats`
    }
    return 'Price not available'
  }

  const formatMethod = (method: string) => {
    return method.charAt(0).toUpperCase() + method.slice(1)
  }

  const formatValidUntil = (date: Date | string) => {
    const d = new Date(date)
    const now = new Date()
    const hoursLeft = Math.floor((d.getTime() - now.getTime()) / (1000 * 60 * 60))
    
    if (hoursLeft < 1) return 'Expiring soon'
    if (hoursLeft < 24) return `Valid for ${hoursLeft}h`
    
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const isExpired = new Date(quote.valid_until) < new Date()
  const isAccepted = quote.status === 'accepted'

  return (
    <div 
      className={`
        border rounded-lg p-4 transition-all
        ${selected 
          ? 'border-warm-taupe bg-light-cream ring-2 ring-warm-taupe ring-opacity-20' 
          : 'border-barely-beige bg-white'
        }
        ${isExpired ? 'opacity-50' : ''}
        ${onSelect && !isExpired ? 'cursor-pointer hover:border-warm-taupe' : ''}
      `}
      onClick={!isExpired ? onSelect : undefined}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          {providerName && (
            <h4 className="font-medium text-soft-black mb-1">
              {providerName}
            </h4>
          )}
          <div className="flex items-center gap-2">
            <span className={`
              text-xs px-2 py-1 rounded
              ${isAccepted 
                ? 'bg-green-100 text-green-700' 
                : 'bg-warm-white text-warm-gray'
              }
            `}>
              {isAccepted ? 'Accepted' : formatMethod(quote.method)}
            </span>
            {isExpired && (
              <span className="text-xs px-2 py-1 rounded bg-red-100 text-red-700">
                Expired
              </span>
            )}
          </div>
        </div>

        {/* Price */}
        <div className="text-right">
          <div className="text-lg font-bold text-soft-black">
            {formatPrice()}
          </div>
          {quote.insurance_included && (
            <div className="text-xs text-warm-gray">
              + Insurance
            </div>
          )}
        </div>
      </div>

      {/* Quote details */}
      <div className="space-y-2">
        {/* Delivery time */}
        <div className="flex items-center gap-2 text-sm">
          <Calendar className="w-4 h-4 text-warm-taupe" />
          <span className="text-warm-gray">Estimated delivery:</span>
          <span className="text-soft-black font-medium">
            {quote.estimated_days} {quote.estimated_days === 1 ? 'day' : 'days'}
          </span>
        </div>

        {/* Shipping method details */}
        <div className="flex items-center gap-2 text-sm">
          <Truck className="w-4 h-4 text-warm-taupe" />
          <span className="text-warm-gray">Method:</span>
          <span className="text-soft-black capitalize">
            {formatMethod(quote.method)}
          </span>
        </div>

        {/* Insurance */}
        {quote.insurance_included && (
          <div className="flex items-center gap-2 text-sm">
            <Shield className="w-4 h-4 text-warm-taupe" />
            <span className="text-soft-black">Insurance included</span>
          </div>
        )}

        {/* Valid until */}
        {!isAccepted && (
          <div className="flex items-center gap-2 text-sm">
            <Clock className="w-4 h-4 text-warm-taupe" />
            <span className="text-warm-gray">Valid until:</span>
            <span className={`font-medium ${isExpired ? 'text-red-600' : 'text-soft-black'}`}>
              {formatValidUntil(quote.valid_until)}
            </span>
          </div>
        )}
      </div>

      {/* Action button */}
      {onSelect && !isExpired && !isAccepted && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onSelect()
          }}
          className={`
            w-full mt-4 py-2 px-4 rounded transition-colors text-sm font-medium
            ${selected 
              ? 'bg-warm-taupe text-white' 
              : 'bg-light-cream text-soft-black border border-barely-beige hover:bg-warm-white'
            }
          `}
        >
          {selected ? 'Selected' : 'Select Quote'}
        </button>
      )}

      {isAccepted && (
        <div className="mt-3 text-xs text-green-600 text-center">
          ✓ This quote has been accepted
        </div>
      )}
    </div>
  )
}