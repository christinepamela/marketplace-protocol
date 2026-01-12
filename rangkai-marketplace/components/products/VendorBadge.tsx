'use client'

import { CheckCircle } from 'lucide-react'
import { formatReputation } from '@/lib/utils/formatters'

interface VendorBadgeProps {
  displayName: string
  verified: boolean
  reputation?: {
    score: number
    metrics: {
      averageRating: number
      totalRatings: number
    }
  }
  size?: 'sm' | 'md' | 'lg'
  showRating?: boolean
}

/**
 * Display vendor name with verification badge and reputation
 */
export default function VendorBadge({
  displayName,
  verified,
  reputation,
  size = 'md',
  showRating = true
}: VendorBadgeProps) {
  const { stars, label } = reputation 
    ? formatReputation(reputation.score)
    : { stars: 0, label: 'New Vendor' }

  const sizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  }

  const iconSizes = {
    sm: 12,
    md: 14,
    lg: 16
  }

  return (
    <div className="flex flex-col gap-1">
      {/* Vendor name with verification */}
      <div className="flex items-center gap-1">
        <span className={`font-medium text-soft-black ${sizeClasses[size]}`}>
          {displayName}
        </span>
        {verified && (
          <CheckCircle 
            className="text-muted-sage flex-shrink-0" 
            size={iconSizes[size]}
          />
        )}
      </div>

      {/* Rating display */}
      {showRating && reputation?.metrics && reputation.metrics.totalRatings > 0 && (
//                        ^^
//                   Added optional chaining
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <span className="text-warm-taupe text-xs">★</span>
            <span className="text-xs text-warm-gray">
              {reputation.metrics.averageRating.toFixed(1)}
            </span>
          </div>
          <span className="text-xs text-warm-gray">
            ({reputation.metrics.totalRatings})
          </span>
        </div>
      )}

      {/* New vendor indicator */}
      {showRating && (!reputation || !reputation.metrics || reputation.metrics.totalRatings === 0) && (
//                              ^^^^^^^^^^^^^^^^^^^
//                         Added null check for metrics
        <span className="text-xs text-warm-gray">
          {label}
        </span>
      )}
    </div>
  )
}