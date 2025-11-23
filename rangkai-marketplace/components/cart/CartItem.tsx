'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { X, Plus, Minus } from 'lucide-react'
import type { CartItem } from '@/lib/stores/cart'
import { formatPrice } from '@/lib/utils/formatters'

interface CartItemProps {
  item: CartItem
  onUpdateQuantity: (productId: string, quantity: number) => void
  onRemove: (productId: string) => void
}

/**
 * Cart item component
 * Displays product in cart with quantity controls
 */
export default function CartItemComponent({ 
  item, 
  onUpdateQuantity, 
  onRemove 
}: CartItemProps) {
  const [quantity, setQuantity] = useState(item.quantity)
  const [isUpdating, setIsUpdating] = useState(false)

  // Calculate item total
  const itemTotal = {
    amount: item.pricePerUnit.amount * quantity,
    currency: item.pricePerUnit.currency
  }

  // Handle quantity change
  const handleQuantityChange = async (newQuantity: number) => {
    // Enforce minimum order quantity
    if (newQuantity < item.moq) {
      newQuantity = item.moq
    }

    setQuantity(newQuantity)
    setIsUpdating(true)
    
    try {
      await onUpdateQuantity(item.productId, newQuantity)
    } finally {
      setIsUpdating(false)
    }
  }

  // Handle remove
  const handleRemove = () => {
    if (confirm(`Remove ${item.productName} from cart?`)) {
      onRemove(item.productId)
    }
  }

  return (
    <div className="flex gap-4 py-6 border-b border-barely-beige">
      {/* Product Image */}
      <Link 
        href={`/products/${item.productId}`}
        className="flex-shrink-0"
      >
        <div className="relative w-24 h-24 bg-light-cream">
          {item.productImage ? (
            <Image
              src={item.productImage}
              alt={item.productName}
              fill
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-warm-gray text-xs">
              No image
            </div>
          )}
        </div>
      </Link>

      {/* Product Details */}
      <div className="flex-grow">
        <div className="flex justify-between">
          <div>
            {/* Product name */}
            <Link 
              href={`/products/${item.productId}`}
              className="font-medium text-soft-black hover:text-warm-taupe transition-colors"
            >
              {item.productName}
            </Link>
            
            {/* Vendor */}
            <p className="text-sm text-warm-gray mt-1">
              {item.vendorName}
            </p>

            {/* Origin & Lead time */}
            <p className="text-xs text-warm-gray mt-1">
              📍 {item.originCountry} • {item.leadTime} days lead time
            </p>

            {/* MOQ warning */}
            {quantity < item.moq && (
              <p className="text-xs text-red-600 mt-2">
                Minimum order quantity: {item.moq}
              </p>
            )}

            {/* Notes */}
            {item.notes && (
              <p className="text-xs text-warm-gray mt-2 italic">
                Note: {item.notes}
              </p>
            )}
          </div>

          {/* Remove button */}
          <button
            onClick={handleRemove}
            className="text-warm-gray hover:text-soft-black transition-colors p-1"
            aria-label="Remove from cart"
          >
            <X size={20} />
          </button>
        </div>

        {/* Price and Quantity Controls */}
        <div className="flex items-center justify-between mt-4">
          {/* Quantity controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleQuantityChange(quantity - 1)}
              disabled={quantity <= item.moq || isUpdating}
              className="w-8 h-8 flex items-center justify-center border border-barely-beige text-soft-black hover:bg-light-cream transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Decrease quantity"
            >
              <Minus size={16} />
            </button>

            <input
              type="number"
              min={item.moq}
              value={quantity}
              onChange={(e) => handleQuantityChange(parseInt(e.target.value) || item.moq)}
              disabled={isUpdating}
              className="w-16 h-8 text-center border border-barely-beige text-soft-black focus:outline-none focus:border-warm-taupe"
            />

            <button
              onClick={() => handleQuantityChange(quantity + 1)}
              disabled={isUpdating}
              className="w-8 h-8 flex items-center justify-center border border-barely-beige text-soft-black hover:bg-light-cream transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Increase quantity"
            >
              <Plus size={16} />
            </button>

            <span className="text-xs text-warm-gray ml-2">
              MOQ: {item.moq}
            </span>
          </div>

          {/* Price */}
          <div className="text-right">
            <p className="text-sm text-warm-gray">
              {formatPrice(item.pricePerUnit)} each
            </p>
            <p className="text-lg font-medium text-soft-black mt-1">
              {formatPrice(itemTotal)}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}