'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, AlertCircle } from 'lucide-react'
import type { Cart } from '@/lib/stores/cart'
import type { ShippingAddress, PaymentMethod } from '@rangkai/sdk'
import { getCart, validateCart, clearCart } from '@/lib/stores/cart'
import { createOrdersFromCart, validateShippingAddress } from '@/lib/api/cart'
import { notifyCartUpdate } from '@/components/cart/CartButton'
import CartSummary from '@/components/cart/CartSummary'
import ProtectedRoute from '@/components/auth/ProtectedRoute'

function CheckoutPageContent() {
  const router = useRouter()
  const [cart, setCart] = useState<Cart | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState<string[]>([])

  // Form state
  const [shippingAddress, setShippingAddress] = useState<Partial<ShippingAddress>>({
    name: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    postalCode: '',
    country: '',
    phone: ''
  })
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('stripe')

  // Load cart on mount
  useEffect(() => {
    loadCart()
  }, [])

  function loadCart() {
    const currentCart = getCart()
    
    // Redirect if cart is empty
    if (!currentCart || currentCart.items.length === 0) {
      router.push('/cart')
      return
    }

    setCart(currentCart)
    setLoading(false)

    // Validate cart
    const cartErrors = validateCart(currentCart)
    setErrors(cartErrors)
  }

  // Handle form field change
  const handleFieldChange = (field: keyof ShippingAddress, value: string) => {
    setShippingAddress(prev => ({
      ...prev,
      [field]: value
    }))
  }

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!cart) return

    // Validate cart
    const cartErrors = validateCart(cart)
    if (cartErrors.length > 0) {
      setErrors(cartErrors)
      return
    }

    // Validate shipping address
    const addressErrors = validateShippingAddress(shippingAddress)
    if (addressErrors.length > 0) {
      setErrors(addressErrors)
      return
    }

    setSubmitting(true)
    setErrors([])

    try {
      // Create orders (one per vendor)
      const orderResponses = await createOrdersFromCart(
        cart,
        shippingAddress as ShippingAddress,
        paymentMethod
      )

      // Clear cart
      clearCart()
      notifyCartUpdate()

      // Redirect to orders page with success message
      const orderIds = orderResponses.map(r => r.orderId).join(',')
      router.push(`/orders?success=true&orderIds=${orderIds}`)

    } catch (error) {
      console.error('Checkout failed:', error)
      setErrors(['Failed to create order. Please try again.'])
    } finally {
      setSubmitting(false)
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="container-custom section-padding">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="animate-spin w-12 h-12 border-4 border-barely-beige border-t-warm-taupe mx-auto mb-4"></div>
            <p className="text-warm-gray">Loading checkout...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!cart) return null

  return (
    <div className="container-custom section-padding">
      {/* Header */}
      <div className="mb-8">
        <Link 
          href="/cart"
          className="inline-flex items-center gap-2 text-warm-gray hover:text-soft-black transition-colors mb-4"
        >
          <ArrowLeft size={20} />
          <span>Back to Cart</span>
        </Link>

        <h1 className="text-2xl font-medium text-soft-black">
          Checkout
        </h1>
      </div>

      {/* Error messages */}
      {errors.length > 0 && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200">
          <div className="flex items-start gap-2">
            <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-800 mb-2">
                Please fix the following errors:
              </p>
              <ul className="text-sm text-red-700 list-disc list-inside space-y-1">
                {errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Checkout form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Shipping Address */}
            <div className="bg-white border border-barely-beige p-6">
              <h2 className="text-lg font-medium text-soft-black mb-4">
                Shipping Address
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-soft-black mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={shippingAddress.name}
                    onChange={(e) => handleFieldChange('name', e.target.value)}
                    className="input w-full"
                    placeholder="John Doe"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-soft-black mb-1">
                    Address Line 1 *
                  </label>
                  <input
                    type="text"
                    required
                    value={shippingAddress.addressLine1}
                    onChange={(e) => handleFieldChange('addressLine1', e.target.value)}
                    className="input w-full"
                    placeholder="123 Main Street"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-soft-black mb-1">
                    Address Line 2
                  </label>
                  <input
                    type="text"
                    value={shippingAddress.addressLine2}
                    onChange={(e) => handleFieldChange('addressLine2', e.target.value)}
                    className="input w-full"
                    placeholder="Apartment, suite, etc. (optional)"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-soft-black mb-1">
                      City *
                    </label>
                    <input
                      type="text"
                      required
                      value={shippingAddress.city}
                      onChange={(e) => handleFieldChange('city', e.target.value)}
                      className="input w-full"
                      placeholder="New York"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-soft-black mb-1">
                      State / Province
                    </label>
                    <input
                      type="text"
                      value={shippingAddress.state}
                      onChange={(e) => handleFieldChange('state', e.target.value)}
                      className="input w-full"
                      placeholder="NY"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-soft-black mb-1">
                      Postal Code *
                    </label>
                    <input
                      type="text"
                      required
                      value={shippingAddress.postalCode}
                      onChange={(e) => handleFieldChange('postalCode', e.target.value)}
                      className="input w-full"
                      placeholder="10001"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-soft-black mb-1">
                      Country *
                    </label>
                    <input
                      type="text"
                      required
                      value={shippingAddress.country}
                      onChange={(e) => handleFieldChange('country', e.target.value)}
                      className="input w-full"
                      placeholder="United States"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-soft-black mb-1">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    required
                    value={shippingAddress.phone}
                    onChange={(e) => handleFieldChange('phone', e.target.value)}
                    className="input w-full"
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
              </div>
            </div>

            {/* Payment Method */}
            <div className="bg-white border border-barely-beige p-6">
              <h2 className="text-lg font-medium text-soft-black mb-4">
                Payment Method
              </h2>

              <div className="space-y-3">
                <label className="flex items-center gap-3 p-4 border border-barely-beige cursor-pointer hover:bg-light-cream transition-colors">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="stripe"
                    checked={paymentMethod === 'stripe'}
                    onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                    className="w-4 h-4"
                  />
                  <div>
                    <p className="font-medium text-soft-black">Credit / Debit Card</p>
                    <p className="text-sm text-warm-gray">Pay with Stripe</p>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-4 border border-barely-beige cursor-pointer hover:bg-light-cream transition-colors">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="bitcoin_onchain"
                    checked={paymentMethod === 'bitcoin_onchain'}
                    onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                    className="w-4 h-4"
                  />
                  <div>
                    <p className="font-medium text-soft-black">Bitcoin (On-chain)</p>
                    <p className="text-sm text-warm-gray">Pay with Bitcoin</p>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-4 border border-barely-beige cursor-pointer hover:bg-light-cream transition-colors">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="lightning"
                    checked={paymentMethod === 'lightning'}
                    onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                    className="w-4 h-4"
                  />
                  <div>
                    <p className="font-medium text-soft-black">Lightning Network</p>
                    <p className="text-sm text-warm-gray">Instant Bitcoin payments</p>
                  </div>
                </label>
              </div>

              <p className="text-xs text-warm-gray mt-4">
                Note: Actual payment will be processed on the next page after order creation.
              </p>
            </div>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="sticky top-8">
              <CartSummary cart={cart} showVendorBreakdown={true} />
              
              <button
                type="submit"
                disabled={submitting || errors.length > 0}
                className="btn btn-primary w-full mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Creating Order...' : 'Place Order'}
              </button>

              <p className="text-xs text-warm-gray text-center mt-4">
                By placing your order, you agree to our terms and conditions.
              </p>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}

export default function CheckoutPage() {
  return (
    <ProtectedRoute>
      <CheckoutPageContent />
    </ProtectedRoute>
  )
}