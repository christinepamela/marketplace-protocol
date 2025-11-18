'use client'

import Link from 'next/link'
import type { Product } from '@rangkai/sdk'
import ProductImage from './ProductImage'
import VendorBadge from './VendorBadge'
import { formatPrice } from '@/lib/utils/formatters'

interface ProductCardProps {
  product: Product
  vendor?: {
    displayName: string
    verified: boolean
    reputation?: {
      score: number
      metrics: {
        averageRating: number
        totalRatings: number
      }
    }
  }
}

/**
 * Product card component for grid display
 */
export default function ProductCard({ product, vendor }: ProductCardProps) {
  const { id, basic, pricing, logistics } = product

  // Get primary image or fallback
  const imageUrl = basic.images.primary || basic.images.thumbnail || 
    'https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=800&q=80'

  // Check if sample available
  const sampleAvailable = pricing.sample?.available

  return (
    <Link 
      href={`/products/${id}`}
      className="group block"
    >
      <div className="bg-white border border-barely-beige transition-shadow duration-200 hover:shadow-soft">
        {/* Image */}
        <div className="aspect-square relative">
          <ProductImage
            src={imageUrl}
            alt={basic.name}
            width={400}
            height={400}
            className="w-full h-full"
          />
          
          {/* Sample badge */}
          {sampleAvailable && (
            <div className="absolute top-3 right-3 bg-white px-2 py-1 text-xs text-soft-black border border-barely-beige">
              Sample Available
            </div>
          )}

          {/* Condition badge */}
          {basic.condition !== 'new' && (
            <div className="absolute top-3 left-3 bg-warm-taupe text-white px-2 py-1 text-xs">
              {basic.condition === 'used' ? 'Used' : 'Refurbished'}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-4 space-y-2">
          {/* Product name */}
          <h3 className="font-medium text-soft-black group-hover:text-warm-taupe transition-colors line-clamp-2">
            {basic.name}
          </h3>

          {/* Price */}
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-medium text-soft-black">
              {formatPrice(pricing.basePrice)}
            </span>
            {pricing.moq > 1 && (
              <span className="text-xs text-warm-gray">
                MOQ: {pricing.moq}
              </span>
            )}
          </div>

          {/* Short description */}
          {basic.shortDescription && (
            <p className="text-sm text-warm-gray line-clamp-2">
              {basic.shortDescription}
            </p>
          )}

          {/* Vendor info */}
          {vendor && (
            <div className="pt-2 border-t border-barely-beige">
              <VendorBadge
                displayName={vendor.displayName}
                verified={vendor.verified}
                reputation={vendor.reputation}
                size="sm"
                showRating={true}
              />
            </div>
          )}

          {/* Origin country */}
          <div className="flex items-center gap-1 text-xs text-warm-gray">
            <span>📍</span>
            <span>{logistics.originCountry}</span>
            {logistics.leadTime && (
              <>
                <span>•</span>
                <span>{logistics.leadTime} days lead time</span>
              </>
            )}
          </div>
        </div>
      </div>
    </Link>
  )
}