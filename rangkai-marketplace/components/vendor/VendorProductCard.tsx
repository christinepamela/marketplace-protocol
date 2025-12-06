'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Edit, Trash2, Eye, EyeOff } from 'lucide-react'
import type { Product } from '@rangkai/sdk'
import { formatPrice } from '@/lib/utils/formatters'

interface VendorProductCardProps {
  product: Product
  onDelete: (productId: string) => void
  onToggleStatus: (productId: string, newStatus: 'active' | 'inactive') => void
}

export default function VendorProductCard({ 
  product, 
  onDelete, 
  onToggleStatus 
}: VendorProductCardProps) {
  const isActive = product.status === 'active'
  const isDraft = product.status === 'draft'

  return (
    <div className="bg-white border border-barely-beige rounded overflow-hidden hover:shadow-soft transition-shadow">
      {/* Image */}
      <div className="relative aspect-square bg-light-cream">
        <Image
          src={product.basic.images.primary}
          alt={product.basic.name}
          fill
          className="object-cover"
        />
        
        {/* Status Badge */}
        <div className="absolute top-2 right-2">
          {isDraft && (
            <span className="px-2 py-1 bg-gray-500 text-white text-xs rounded">
              Draft
            </span>
          )}
          {!isActive && !isDraft && (
            <span className="px-2 py-1 bg-red-500 text-white text-xs rounded">
              Inactive
            </span>
          )}
          {isActive && (
            <span className="px-2 py-1 bg-green-500 text-white text-xs rounded">
              Active
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-medium text-soft-black mb-1 line-clamp-1">
          {product.basic.name}
        </h3>
        
        <p className="text-sm text-warm-gray mb-2 line-clamp-2">
          {product.basic.shortDescription || product.basic.description}
        </p>

        <div className="flex items-center justify-between mb-4">
          <span className="text-lg font-medium text-soft-black">
            {formatPrice(product.pricing.basePrice)}
          </span>
          <span className="text-sm text-warm-gray">
            MOQ: {product.pricing.moq}
          </span>
        </div>

        {/* Stats */}
        {product.stats && (
          <div className="flex items-center gap-4 text-xs text-warm-gray mb-4 pb-4 border-b border-barely-beige">
            <span>👁️ {product.stats.views} views</span>
            <span>💬 {product.stats.inquiries} inquiries</span>
            <span>📦 {product.stats.orders} orders</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Link
            href={`/vendor/products/${product.id}/edit`}
            className="flex-1 btn btn-secondary text-sm py-2"
          >
            <Edit size={16} className="mr-2" />
            Edit
          </Link>

          <button
            onClick={() => onToggleStatus(
              product.id, 
              isActive ? 'inactive' : 'active'
            )}
            className="p-2 border border-barely-beige rounded hover:bg-light-cream transition-colors"
            title={isActive ? 'Deactivate' : 'Activate'}
          >
            {isActive ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>

          <button
            onClick={() => {
              if (confirm('Are you sure you want to delete this product?')) {
                onDelete(product.id)
              }
            }}
            className="p-2 border border-red-200 rounded hover:bg-red-50 transition-colors text-red-600"
            title="Delete"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}