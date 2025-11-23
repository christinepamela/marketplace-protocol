'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ShoppingCart } from 'lucide-react'
import { getCartItemCount } from '@/lib/stores/cart'

/**
 * Cart button for header
 * Shows cart icon with item count badge
 */
export default function CartButton() {
  const [itemCount, setItemCount] = useState(0)
  const [mounted, setMounted] = useState(false)

  // Load cart count on mount and when storage changes
  useEffect(() => {
    setMounted(true)
    updateCount()

    // Listen for storage changes (when cart is updated)
    const handleStorageChange = () => {
      updateCount()
    }

    window.addEventListener('storage', handleStorageChange)
    
    // Custom event for same-tab updates
    window.addEventListener('cartUpdated', handleStorageChange)

    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('cartUpdated', handleStorageChange)
    }
  }, [])

  function updateCount() {
    const count = getCartItemCount()
    setItemCount(count)
  }

  // Don't render on server to avoid hydration mismatch
  if (!mounted) {
    return (
      <Link 
        href="/cart" 
        className="relative p-2 text-soft-black hover:text-warm-taupe transition-colors"
      >
        <ShoppingCart size={24} />
      </Link>
    )
  }

  return (
    <Link 
      href="/cart" 
      className="relative p-2 text-soft-black hover:text-warm-taupe transition-colors"
      aria-label={`Shopping cart with ${itemCount} items`}
    >
      <ShoppingCart size={24} />
      
      {/* Badge with count */}
      {itemCount > 0 && (
        <span className="absolute -top-1 -right-1 bg-warm-taupe text-white text-xs font-medium w-5 h-5 flex items-center justify-center">
          {itemCount > 99 ? '99+' : itemCount}
        </span>
      )}
    </Link>
  )
}

/**
 * Helper function to dispatch cart update event
 * Call this after modifying cart to update the badge
 */
export function notifyCartUpdate() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('cartUpdated'))
  }
}