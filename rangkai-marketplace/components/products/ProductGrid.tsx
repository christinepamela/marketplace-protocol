'use client'

import type { SearchResultItem } from '@rangkai/sdk'
import ProductCard from './ProductCard'

interface ProductGridProps {
  items: SearchResultItem[]
  loading?: boolean
  emptyMessage?: string
}

/**
 * Responsive product grid with loading and empty states
 */
export default function ProductGrid({ 
  items, 
  loading = false,
  emptyMessage = 'No products found'
}: ProductGridProps) {
  // Loading skeleton
  if (loading) {
    return (
      <div className="product-grid">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="bg-white border border-barely-beige">
            <div className="aspect-square bg-light-cream animate-pulse" />
            <div className="p-4 space-y-3">
              <div className="h-4 bg-light-cream animate-pulse rounded" />
              <div className="h-4 bg-light-cream animate-pulse rounded w-2/3" />
              <div className="h-3 bg-light-cream animate-pulse rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  // Empty state
  if (items.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="text-6xl mb-4">🔍</div>
        <h3 className="text-2xl font-medium text-soft-black mb-2">
          {emptyMessage}
        </h3>
        <p className="text-warm-gray">
          Try adjusting your filters or search terms
        </p>
      </div>
    )
  }

  // Product grid
  return (
    <div className="product-grid">
      {items.map((item) => (
        <ProductCard
          key={item.product.id}
          product={item.product}
          vendor={item.vendor}
        />
      ))}
    </div>
  )
}