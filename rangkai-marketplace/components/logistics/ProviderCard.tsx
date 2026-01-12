import React from 'react'
import { Star, Package, Shield, Clock } from 'lucide-react'
import type { LogisticsProvider } from '@rangkai/sdk'

interface ProviderCardProps {
  provider: LogisticsProvider
  selected?: boolean
  onSelect?: () => void
  showSelectButton?: boolean
}

export default function ProviderCard({ 
  provider, 
  selected, 
  onSelect,
  showSelectButton = false 
}: ProviderCardProps) {
  
  const formatRating = (rating?: number) => {
    if (!rating) return 'New Provider'
    return rating.toFixed(1)
  }

  const formatDeliveries = (count: number) => {
    if (count < 1000) return count.toString()
    if (count < 1000000) return `${(count / 1000).toFixed(1)}k`
    return `${(count / 1000000).toFixed(1)}m`
  }

  return (
    <div 
      className={`
        border rounded-lg p-4 transition-all
        ${selected 
          ? 'border-warm-taupe bg-light-cream ring-2 ring-warm-taupe ring-opacity-20' 
          : 'border-barely-beige bg-white hover:border-warm-taupe'
        }
        ${onSelect ? 'cursor-pointer' : ''}
      `}
      onClick={onSelect}
    >
      {/* Provider header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="font-medium text-soft-black mb-1">
            {provider.business_name}
          </h3>
          
          {/* Rating */}
          {provider.average_rating ? (
            <div className="flex items-center gap-1 text-sm">
              <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
              <span className="font-medium text-soft-black">
                {formatRating(provider.average_rating)}
              </span>
              <span className="text-warm-gray">
                ({formatDeliveries(provider.total_deliveries)} deliveries)
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-1 text-sm text-warm-gray">
              <Star className="w-4 h-4" />
              <span>New Provider</span>
            </div>
          )}
        </div>

        {/* Selection indicator */}
        {selected && (
          <div className="flex items-center justify-center w-6 h-6 rounded-full bg-warm-taupe text-white">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </div>
        )}
      </div>

      {/* Provider details */}
      <div className="space-y-2 mb-4">
        {/* Service regions */}
        <div className="flex items-start gap-2 text-sm">
          <Package className="w-4 h-4 text-warm-taupe flex-shrink-0 mt-0.5" />
          <div>
            <span className="text-warm-gray">Regions: </span>
            <span className="text-soft-black">
              {provider.service_regions.slice(0, 3).join(', ')}
              {provider.service_regions.length > 3 && ` +${provider.service_regions.length - 3} more`}
            </span>
          </div>
        </div>

        {/* Shipping methods */}
        <div className="flex items-start gap-2 text-sm">
          <Clock className="w-4 h-4 text-warm-taupe flex-shrink-0 mt-0.5" />
          <div>
            <span className="text-warm-gray">Methods: </span>
            <span className="text-soft-black capitalize">
              {provider.shipping_methods.join(', ')}
            </span>
          </div>
        </div>

        {/* Insurance */}
        {provider.insurance_available && (
          <div className="flex items-center gap-2 text-sm">
            <Shield className="w-4 h-4 text-warm-taupe" />
            <span className="text-soft-black">Insurance available</span>
          </div>
        )}
      </div>

      {/* Select button */}
      {showSelectButton && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onSelect?.()
          }}
          className={`
            w-full py-2 px-4 rounded transition-colors text-sm font-medium
            ${selected 
              ? 'bg-warm-taupe text-white' 
              : 'bg-light-cream text-soft-black border border-barely-beige hover:bg-warm-white'
            }
          `}
        >
          {selected ? 'Selected' : 'Select Provider'}
        </button>
      )}
    </div>
  )
}