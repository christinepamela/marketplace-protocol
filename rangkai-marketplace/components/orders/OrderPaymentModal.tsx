/**
 * Order Payment Modal Component
 * Handles the complete payment flow for an order
 * 
 * Features:
 * - Payment method selection
 * - Bitcoin payment flow with QR code
 * - Stripe payment redirect
 * - PayPal payment redirect
 * - Bank transfer instructions
 * - Payment confirmation
 */

'use client'

import { useState } from 'react'
import { X, ArrowLeft, ExternalLink } from 'lucide-react'
import type { Order, PaymentMethod } from '@rangkai/sdk'
import PaymentMethodSelector from './PaymentMethodSelector'
import BitcoinPaymentFlow from './BitcoinPaymentFlow'

// ============================================================================
// TYPES
// ============================================================================

interface OrderPaymentModalProps {
  order: Order
  isOpen: boolean
  onClose: () => void
  onPaymentComplete: () => void
}

type PaymentStep = 'select_method' | 'bitcoin_payment' | 'stripe_payment' | 'paypal_payment' | 'bank_transfer'

// ============================================================================
// COMPONENT
// ============================================================================

export default function OrderPaymentModal({
  order,
  isOpen,
  onClose,
  onPaymentComplete
}: OrderPaymentModalProps) {
  const [currentStep, setCurrentStep] = useState<PaymentStep>('select_method')
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('bitcoin_onchain')
  const [stripeUrl, setStripeUrl] = useState<string>('')
  const [paypalUrl, setPaypalUrl] = useState<string>('')

  if (!isOpen) return null

  /**
   * Handle payment method selection
   */
  const handleMethodSelected = async (method: PaymentMethod) => {
    setSelectedMethod(method)

    // Route to appropriate payment step
    switch (method) {
      case 'bitcoin_onchain':
        setCurrentStep('bitcoin_payment')
        break

      case 'stripe':
        await initiateStripePayment()
        break

      case 'paypal':
        await initiatePayPalPayment()
        break

      case 'bank_transfer':
        setCurrentStep('bank_transfer')
        break

      case 'lightning':
        // Coming soon - show message
        alert('Lightning Network payments coming soon!')
        break
    }
  }

  /**
   * Initiate Stripe payment session
   */
  const initiateStripePayment = async () => {
  try {
    const token = localStorage.getItem('rangkai_token')
    
    const response = await fetch(`/api/orders/${order.id}/stripe-payment`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`  // ← ADD THIS
      }
    })

    if (!response.ok) {
      throw new Error('Failed to initiate Stripe payment')
    }

    const data = await response.json()
    
    if (data.clientSecret) {
      // We have a PaymentIntent — show Stripe Elements inline
      setStripeUrl(data.clientSecret)
      setCurrentStep('stripe_payment')
    } else if (data.url) {
      // Redirect-based checkout
      setStripeUrl(data.url)
      setCurrentStep('stripe_payment')
    }

  } catch (error) {
    console.error('Stripe payment error:', error)
    alert('Failed to initiate payment. Please try again.')
  }
}

  /**
   * Initiate PayPal payment
   */
  const initiatePayPalPayment = async () => {
    try {
      const response = await fetch(`/api/orders/${order.id}/paypal-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      if (!response.ok) {
        throw new Error('Failed to initiate PayPal payment')
      }

      const { url } = await response.json()
      setPaypalUrl(url)
      setCurrentStep('paypal_payment')

    } catch (error) {
      console.error('PayPal payment error:', error)
      alert('Failed to initiate payment. Please try again.')
    }
  }

  /**
   * Go back to method selection
   */
  const goBack = () => {
    setCurrentStep('select_method')
  }

  /**
   * Handle successful payment
   */
  const handlePaymentSuccess = () => {
    onPaymentComplete()
    onClose()
  }

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="fixed inset-0 bg-soft-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-warm-white max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-warm-white border-b border-barely-beige p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {currentStep !== 'select_method' && (
              <button
                onClick={goBack}
                className="p-2 hover:bg-light-cream transition-colors"
              >
                <ArrowLeft size={20} className="text-warm-gray" />
              </button>
            )}
            <div>
              <h2 className="text-xl font-serif font-medium text-soft-black">
                {currentStep === 'select_method' && 'Select Payment Method'}
                {currentStep === 'bitcoin_payment' && 'Pay with Bitcoin'}
                {currentStep === 'stripe_payment' && 'Pay with Card'}
                {currentStep === 'paypal_payment' && 'Pay with PayPal'}
                {currentStep === 'bank_transfer' && 'Bank Transfer Instructions'}
              </h2>
              <p className="text-sm text-warm-gray">
                Order #{order.orderNumber} • ${order.total.amount.toFixed(2)} {order.total.currency}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 hover:bg-light-cream transition-colors"
          >
            <X size={24} className="text-warm-gray" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Step 1: Select Payment Method */}
          {currentStep === 'select_method' && (
            <div>
              <p className="text-warm-gray mb-6">
                Choose how you'd like to pay for your order. All payment methods are secure
                and funds are held in escrow until delivery.
              </p>

              <PaymentMethodSelector
                value={selectedMethod}
                onChange={setSelectedMethod}
                amount={order.total.amount}
                currency={order.total.currency}
              />

              <button
                onClick={() => handleMethodSelected(selectedMethod)}
                className="btn btn-primary w-full mt-6"
              >
                Continue with {selectedMethod === 'bitcoin_onchain' ? 'Bitcoin' : 
                              selectedMethod === 'stripe' ? 'Card' :
                              selectedMethod === 'paypal' ? 'PayPal' :
                              selectedMethod === 'lightning' ? 'Lightning' :
                              'Bank Transfer'}
              </button>
            </div>
          )}

          {/* Step 2: Bitcoin Payment */}
          {currentStep === 'bitcoin_payment' && (
            <BitcoinPaymentFlow
              order={order}
              onPaymentConfirmed={handlePaymentSuccess}
              onCancel={goBack}
            />
          )}

          {/* Step 3: Stripe Payment */}
          {currentStep === 'stripe_payment' && (
            <div className="bg-white border border-barely-beige p-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-warm-taupe bg-opacity-10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <ExternalLink size={32} className="text-warm-taupe" />
                </div>

                <h3 className="text-lg font-serif font-medium text-soft-black mb-2">
                  Complete Payment with Stripe
                </h3>

                <p className="text-warm-gray mb-6">
                  You'll be redirected to Stripe's secure checkout page to complete your payment.
                </p>

                <a
                  href={stripeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-primary inline-flex items-center gap-2"
                >
                  Go to Stripe Checkout
                  <ExternalLink size={18} />
                </a>

                <p className="text-xs text-warm-gray mt-4">
                  After completing payment on Stripe, you'll be redirected back to your order.
                </p>
              </div>
            </div>
          )}

          {/* Step 4: PayPal Payment */}
          {currentStep === 'paypal_payment' && (
            <div className="bg-white border border-barely-beige p-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-warm-taupe bg-opacity-10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <ExternalLink size={32} className="text-warm-taupe" />
                </div>

                <h3 className="text-lg font-serif font-medium text-soft-black mb-2">
                  Complete Payment with PayPal
                </h3>

                <p className="text-warm-gray mb-6">
                  You'll be redirected to PayPal to complete your payment.
                </p>

                <a
                  href={paypalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-primary inline-flex items-center gap-2"
                >
                  Go to PayPal
                  <ExternalLink size={18} />
                </a>

                <p className="text-xs text-warm-gray mt-4">
                  After completing payment on PayPal, you'll be redirected back to your order.
                </p>
              </div>
            </div>
          )}

          {/* Step 5: Bank Transfer Instructions */}
          {currentStep === 'bank_transfer' && (
            <div className="bg-white border border-barely-beige p-6">
              <h3 className="text-lg font-serif font-medium text-soft-black mb-4">
                Bank Transfer Instructions
              </h3>

              <div className="space-y-4">
                <div className="bg-light-cream border border-barely-beige p-4">
                  <p className="text-sm font-medium text-soft-black mb-3">
                    Transfer Details:
                  </p>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-warm-gray">Bank Name:</span>
                      <span className="text-soft-black font-medium">Rangkai Protocol Bank</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-warm-gray">Account Name:</span>
                      <span className="text-soft-black font-medium">Rangkai Marketplace Ltd</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-warm-gray">Account Number:</span>
                      <span className="text-soft-black font-mono">1234567890</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-warm-gray">Routing Number:</span>
                      <span className="text-soft-black font-mono">987654321</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-warm-gray">Amount:</span>
                      <span className="text-soft-black font-medium">
                        ${order.total.amount.toFixed(2)} {order.total.currency}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 p-4">
                  <p className="text-sm font-medium text-yellow-900 mb-2">
                    ⚠️ Important:
                  </p>
                  <ul className="text-sm text-yellow-800 space-y-1 list-disc list-inside">
                    <li>Include order number <strong>#{order.orderNumber}</strong> in transfer reference</li>
                    <li>Transfer exact amount: ${order.total.amount.toFixed(2)}</li>
                    <li>Verification may take 1-3 business days</li>
                    <li>You'll receive email confirmation once payment is verified</li>
                  </ul>
                </div>

                <button
                  onClick={onClose}
                  className="btn btn-primary w-full"
                >
                  I've Made the Transfer
                </button>

                <p className="text-xs text-warm-gray text-center">
                  We'll notify you once we verify your payment
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
