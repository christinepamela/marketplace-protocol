'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ShoppingBag } from 'lucide-react'
import type { Cart } from '@/lib/stores/cart'
import { 
  getCart, 
  updateQuantity, 
  removeFromCart,
  clearCart,
  validateCart 
} from '@/lib/stores/cart'
import { notifyCartUpdate } from '@/components/cart/CartButton'
import CartItemComponent from '@/components/cart/CartItem'
import CartSummary from '@/components/cart/CartSummary'

export default function CartPage() {
  const router = useRouter()
  const [cart, setCart] = useState<Cart | null>(null)
  const [loading, setLoading] = useState(true)
  const [errors, setErrors] = useState<string[]>([])

  // Load cart on mount
  useEffect(() => {
    loadCart()
  }, [])

  function loadCart() {
    const currentCart = getCart()
    setCart(currentCart)
    setLoading(false)

    // Validate cart
    const validationErrors = validateCart(currentCart)
    setErrors(validationErrors)
  }

  // Handle quantity update
  const handleUpdateQuantity = async (productId: string, quantity: number) => {
    const updatedCart = updateQuantity(productId, quantity)
    setCart(updatedCart)
    notifyCartUpdate()

    // Revalidate
    const validationErrors = validateCart(updatedCart)
    setErrors(validationErrors)
  }

  // Handle item removal
  const handleRemove = (productId: string) => {
    const updatedCart = removeFromCart(productId)
    setCart(updatedCart)
    notifyCartUpdate()

    // Revalidate
    const validationErrors = validateCart(updatedCart)
    setErrors(validationErrors)
  }

  // Handle clear cart
  const handleClearCart = () => {
    if (confirm('Are you sure you want to clear your entire cart?')) {
      const emptyCart = clearCart()
      setCart(emptyCart)
      notifyCartUpdate()
      setErrors([])
    }
  }

  // Handle proceed to checkout
  const handleCheckout = () => {
    if (errors.length > 0) {
      alert('Please fix the errors before proceeding to checkout.')
      return
    }

    router.push('/checkout')
  }

  // Loading state
  if (loading) {
    return (
      <div className="container-custom section-padding">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="animate-spin w-12 h-12 border-4 border-barely-beige border-t-warm-taupe mx-auto mb-4"></div>
            <p className="text-warm-gray">Loading cart...</p>
          </div>
        </div>
      </div>
    )
  }

  // Empty cart state
  if (!cart || cart.items.length === 0) {
    return (
      <div className="container-custom section-padding">
        <div className="max-w-2xl mx-auto text-center py-16">
          <ShoppingBag size={64} className="mx-auto text-warm-gray mb-4" />
          <h1 className="text-2xl font-medium text-soft-black mb-2">
            Your cart is empty
          </h1>
          <p className="text-warm-gray mb-8">
            Start shopping to add products to your cart
          </p>
          <Link href="/products" className="btn btn-primary">
            Browse Products
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="container-custom section-padding">
      {/* Header */}
      <div className="mb-8">
        <Link 
          href="/products"
          className="inline-flex items-center gap-2 text-warm-gray hover:text-soft-black transition-colors mb-4"
        >
          <ArrowLeft size={20} />
          <span>Continue Shopping</span>
        </Link>

        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-medium text-soft-black">
            Shopping Cart
          </h1>
          
          {cart.items.length > 0 && (
            <button
              onClick={handleClearCart}
              className="text-sm text-warm-gray hover:text-soft-black transition-colors"
            >
              Clear Cart
            </button>
          )}
        </div>
      </div>

      {/* Validation errors */}
      {errors.length > 0 && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200">
          <p className="text-sm font-medium text-red-800 mb-2">
            Please fix the following errors:
          </p>
          <ul className="text-sm text-red-700 list-disc list-inside space-y-1">
            {errors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Main content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Cart items */}
        <div className="lg:col-span-2">
          <div className="bg-white border border-barely-beige p-6">
            <div className="divide-y divide-barely-beige">
              {cart.items.map((item) => (
                <CartItemComponent
                  key={item.productId}
                  item={item}
                  onUpdateQuantity={handleUpdateQuantity}
                  onRemove={handleRemove}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="lg:col-span-1">
          <div className="sticky top-8 space-y-3">
            <CartSummary cart={cart} showVendorBreakdown={true} />
            
            <button
              onClick={handleCheckout}
              disabled={errors.length > 0}
              className="btn btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Proceed to Checkout
            </button>

            <Link
              href="/products"
              className="btn btn-secondary w-full block text-center"
            >
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}