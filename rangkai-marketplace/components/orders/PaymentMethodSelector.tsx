/**
 * Payment Method Selector Component
 * Allows user to choose between Bitcoin, Stripe, PayPal, etc.
 * Integrates with BitcoinPaymentFlow when Bitcoin is selected
 */

'use client'

import { useState } from 'react'
import { CreditCard, Bitcoin, Zap, Building2, DollarSign, Info } from 'lucide-react'
import type { PaymentMethod } from '@rangkai/sdk'

// ============================================================================
// TYPES
// ============================================================================

export interface PaymentMethodOption {
  id: PaymentMethod
  name: string
  description: string
  icon: React.ReactNode
  enabled: boolean
  recommended?: boolean
  processingTime?: string
  fees?: string
}

interface PaymentMethodSelectorProps {
  value: PaymentMethod
  onChange: (method: PaymentMethod) => void
  amount?: number
  currency?: string
}

// ============================================================================
// PAYMENT METHOD OPTIONS
// ============================================================================

const PAYMENT_METHODS: PaymentMethodOption[] = [
  {
    id: 'bitcoin_onchain',
    name: 'Bitcoin (On-chain)',
    description: 'Pay with Bitcoin - Secure escrow, 3 confirmations required',
    icon: <Bitcoin size={24} />,
    enabled: true,
    recommended: true,
    processingTime: '~30 minutes',
    fees: '0.5% platform fee + network fee'
  },
  {
    id: 'lightning',
    name: 'Lightning Network',
    description: 'Instant Bitcoin payments - Coming soon',
    icon: <Zap size={24} />,
    enabled: false,
    processingTime: 'Instant',
    fees: '0.5% platform fee'
  },
  {
    id: 'stripe',
    name: 'Credit / Debit Card',
    description: 'Pay with Visa, Mastercard, Amex via Stripe',
    icon: <CreditCard size={24} />,
    enabled: true,
    processingTime: 'Instant',
    fees: '3% platform fee + 2.9% + $0.30 Stripe fee'
  },
  {
    id: 'paypal',
    name: 'PayPal',
    description: 'Pay with your PayPal balance or linked account',
    icon: <DollarSign size={24} />,
    enabled: true,
    processingTime: 'Instant',
    fees: '3% platform fee + 2.9% + $0.30 PayPal fee'
  },
  {
    id: 'bank_transfer',
    name: 'Bank Transfer',
    description: 'Direct bank transfer - Manual verification required',
    icon: <Building2 size={24} />,
    enabled: true,
    processingTime: '1-3 business days',
    fees: '3% platform fee'
  }
]

// ============================================================================
// COMPONENT
// ============================================================================

export default function PaymentMethodSelector({
  value,
  onChange,
  amount,
  currency = 'USD'
}: PaymentMethodSelectorProps) {
  const [expandedMethod, setExpandedMethod] = useState<PaymentMethod | null>(null)

  /**
   * Calculate estimated fees for display
   */
  const calculateFees = (method: PaymentMethod): string => {
    if (!amount) return 'N/A'

    let fee = 0
    switch (method) {
      case 'bitcoin_onchain':
        fee = amount * 0.005 // 0.5%
        return `~$${fee.toFixed(2)}`
      
      case 'lightning':
        fee = amount * 0.005 // 0.5%
        return `~$${fee.toFixed(2)}`
      
      case 'stripe':
        fee = (amount * 0.03) + (amount * 0.029) + 0.30
        return `~$${fee.toFixed(2)}`
      
      case 'paypal':
        fee = (amount * 0.03) + (amount * 0.029) + 0.30
        return `~$${fee.toFixed(2)}`
      
      case 'bank_transfer':
        fee = amount * 0.03 // 3%
        return `~$${fee.toFixed(2)}`
      
      default:
        return 'N/A'
    }
  }

  /**
   * Toggle method details
   */
  const toggleDetails = (methodId: PaymentMethod) => {
    if (expandedMethod === methodId) {
      setExpandedMethod(null)
    } else {
      setExpandedMethod(methodId)
    }
  }

  return (
    <div className="space-y-3">
      {PAYMENT_METHODS.map((method) => {
        const isSelected = value === method.id
        const isExpanded = expandedMethod === method.id

        return (
          <div key={method.id}>
            <label
              className={`
                relative block p-4 border cursor-pointer transition-all
                ${method.enabled ? 'hover:bg-light-cream' : 'opacity-50 cursor-not-allowed'}
                ${isSelected ? 'border-warm-taupe bg-light-cream' : 'border-barely-beige bg-white'}
              `}
            >
              <div className="flex items-start gap-3">
                {/* Radio button */}
                <input
                  type="radio"
                  name="paymentMethod"
                  value={method.id}
                  checked={isSelected}
                  onChange={(e) => method.enabled && onChange(e.target.value as PaymentMethod)}
                  disabled={!method.enabled}
                  className="mt-1 w-4 h-4 flex-shrink-0"
                />

                {/* Icon */}
                <div className={`
                  w-12 h-12 flex items-center justify-center border border-barely-beige flex-shrink-0
                  ${isSelected ? 'bg-warm-taupe text-white' : 'bg-white text-warm-taupe'}
                `}>
                  {method.icon}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium text-soft-black">
                      {method.name}
                    </p>
                    {method.recommended && (
                      <span className="px-2 py-0.5 text-xs bg-warm-taupe text-white">
                        Recommended
                      </span>
                    )}
                    {!method.enabled && (
                      <span className="px-2 py-0.5 text-xs bg-warm-gray text-white">
                        Coming Soon
                      </span>
                    )}
                  </div>

                  <p className="text-sm text-warm-gray mb-2">
                    {method.description}
                  </p>

                  {/* Quick info */}
                  <div className="flex items-center gap-4 text-xs text-warm-gray">
                    <span>⏱️ {method.processingTime}</span>
                    {amount && (
                      <span>💰 Est. fees: {calculateFees(method.id)}</span>
                    )}
                  </div>
                </div>

                {/* Info button */}
                {method.enabled && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault()
                      toggleDetails(method.id)
                    }}
                    className="flex-shrink-0 p-2 hover:bg-white transition-colors"
                    title="More details"
                  >
                    <Info size={18} className="text-warm-gray" />
                  </button>
                )}
              </div>

              {/* Expanded details */}
              {isExpanded && method.enabled && (
                <div className="mt-4 pt-4 border-t border-barely-beige">
                  <div className="space-y-3">
                    {/* Processing time */}
                    <div>
                      <p className="text-xs font-medium text-soft-black mb-1">
                        Processing Time
                      </p>
                      <p className="text-xs text-warm-gray">
                        {method.processingTime}
                      </p>
                    </div>

                    {/* Fees breakdown */}
                    <div>
                      <p className="text-xs font-medium text-soft-black mb-1">
                        Fee Structure
                      </p>
                      <p className="text-xs text-warm-gray">
                        {method.fees}
                      </p>
                      {amount && (
                        <p className="text-xs text-soft-black mt-1">
                          For ${amount.toFixed(2)}: {calculateFees(method.id)} in fees
                        </p>
                      )}
                    </div>

                    {/* Method-specific info */}
                    {method.id === 'bitcoin_onchain' && (
                      <div className="bg-light-cream p-3 border border-barely-beige">
                        <p className="text-xs font-medium text-soft-black mb-2">
                          How Bitcoin Payment Works:
                        </p>
                        <ol className="text-xs text-warm-gray space-y-1 list-decimal list-inside">
                          <li>We generate a unique Bitcoin address for your order</li>
                          <li>You send Bitcoin from your wallet to this address</li>
                          <li>We monitor the blockchain for your payment</li>
                          <li>After 3 confirmations (~30 min), payment is complete</li>
                          <li>Funds held in escrow until delivery confirmation</li>
                        </ol>
                      </div>
                    )}

                    {method.id === 'stripe' && (
                      <div className="bg-light-cream p-3 border border-barely-beige">
                        <p className="text-xs text-warm-gray">
                          Secure payment processing by Stripe. We never see your card details.
                          Supports Visa, Mastercard, American Express, and more.
                        </p>
                      </div>
                    )}

                    {method.id === 'bank_transfer' && (
                      <div className="bg-light-cream p-3 border border-barely-beige">
                        <p className="text-xs text-warm-gray">
                          After placing your order, you'll receive bank transfer instructions.
                          Please include your order number in the transfer reference.
                          Manual verification may take 1-3 business days.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </label>
          </div>
        )
      })}

      {/* Security notice */}
      <div className="bg-light-cream border border-barely-beige p-4 mt-4">
        <p className="text-xs text-warm-gray">
          🔒 All payments are secure. For Bitcoin payments, funds are held in escrow until 
          delivery is confirmed. For card payments, we use industry-standard encryption.
        </p>
      </div>
    </div>
  )
}
