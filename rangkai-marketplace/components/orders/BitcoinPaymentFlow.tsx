/**
 * Bitcoin Payment Flow Component
 * Handles Bitcoin payment with QR code, real-time monitoring, and confirmation
 * 
 * Features:
 * - Generate Bitcoin payment address (escrow)
 * - Display QR code for easy mobile payment
 * - Real-time payment monitoring (polling)
 * - Payment confirmation animation
 * - Copy address functionality
 * - Countdown timer for payment expiry
 */

'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '@/lib/contexts/AuthContext'
import { Copy, Check, Clock, Loader2, Bitcoin, AlertCircle, ExternalLink, Wallet } from 'lucide-react'
import type { Order } from '@rangkai/sdk'

// ============================================================================
// TYPES
// ============================================================================

interface BitcoinPaymentAddress {
  orderId: string
  address: string
  expectedAmount: number // satoshis
  usdAmount: number
  expiresAt: string
  btcAmount: string // formatted BTC amount
}

interface BitcoinPaymentStatus {
  address: string
  confirmed: boolean
  confirmations: number
  amountReceived: number
  txid?: string
}

interface BitcoinPaymentFlowProps {
  order: Order
  onPaymentConfirmed: () => void
  onCancel?: () => void
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function BitcoinPaymentFlow({ 
  order, 
  onPaymentConfirmed,
  onCancel 
}: BitcoinPaymentFlowProps) {
  const { user } = useAuth()
  const getToken = () => localStorage.getItem('rangkai_token')
  // State
  const [loading, setLoading] = useState(true)
  const [paymentAddress, setPaymentAddress] = useState<BitcoinPaymentAddress | null>(null)
  const [paymentStatus, setPaymentStatus] = useState<BitcoinPaymentStatus | null>(null)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [timeRemaining, setTimeRemaining] = useState<string>('')
  
  // Polling interval ref
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  const hasGeneratedRef = useRef(false)

  useEffect(() => {
    if (hasGeneratedRef.current) return
    hasGeneratedRef.current = true
    generatePaymentAddress()
    
    // Cleanup polling on unmount
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
      }
    }
  }, [])

  /**
   * Generate Bitcoin payment address from backend
   */
  const generatePaymentAddress = async () => {
    setLoading(true)
    setError(null)

    try {
      // Call backend to generate Bitcoin escrow address
      const response = await fetch(`/api/orders/${order.id}/bitcoin-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`
        },
        body: JSON.stringify({
          amount: order.total.amount,
          currency: order.total.currency
        })
      })

      if (!response.ok) {
        throw new Error('Failed to generate payment address')
      }

      const data = await response.json()
      
      setPaymentAddress({
        orderId: order.id,
        address: data.address,
        expectedAmount: data.expectedAmount,
        usdAmount: data.usdAmount,
        expiresAt: data.expiresAt,
        btcAmount: formatSatoshisToBTC(data.expectedAmount)
      })

      // Start monitoring for payment
      startPaymentMonitoring(data.address)

    } catch (err) {
      console.error('Failed to generate payment address:', err)
      setError('Failed to generate payment address. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // ============================================================================
  // PAYMENT MONITORING
  // ============================================================================

  /**
   * Start polling for payment confirmation
   */
  const startPaymentMonitoring = (address: string) => {
    // Initial check
    checkPaymentStatus(address)

    // Poll every 30 seconds
    pollIntervalRef.current = setInterval(() => {
      checkPaymentStatus(address)
    }, 30000) // 30 seconds
  }

  /**
   * Check if payment has been received
   */
  const checkPaymentStatus = async (address: string) => {
    try {
      const response = await fetch(`/api/orders/${order.id}/bitcoin-status`, {
        headers: {
          'Authorization': `Bearer ${getToken()}` // ✅ FIXED: Send auth token
        }
      })
      if (!response.ok) {
        throw new Error('Failed to check payment status')
      }

      const status: BitcoinPaymentStatus = await response.json()
      setPaymentStatus(status)

      // If payment confirmed, stop polling and notify parent
      if (status.confirmed) {
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current)
        }
        
        // Wait 1 second to show success state, then notify parent
        setTimeout(() => {
          onPaymentConfirmed()
        }, 1500)
      }

    } catch (err) {
      console.error('Failed to check payment status:', err)
      // Don't show error to user - monitoring will retry
    }
  }

  // ============================================================================
  // COUNTDOWN TIMER
  // ============================================================================

  useEffect(() => {
    if (!paymentAddress) return

    const updateTimer = () => {
      const now = new Date().getTime()
      const expiry = new Date(paymentAddress.expiresAt).getTime()
      const distance = expiry - now

      if (distance < 0) {
        setTimeRemaining('Expired')
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current)
        }
        return
      }

      const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((distance % (1000 * 60)) / 1000)

      setTimeRemaining(`${hours}h ${minutes}m ${seconds}s`)
    }

    updateTimer()
    const interval = setInterval(updateTimer, 1000)

    return () => clearInterval(interval)
  }, [paymentAddress])

  // ============================================================================
  // ACTIONS
  // ============================================================================

  /**
   * Copy address to clipboard
   */
  const copyAddress = useCallback(() => {
    if (!paymentAddress) return

    navigator.clipboard.writeText(paymentAddress.address)
    setCopied(true)

    setTimeout(() => {
      setCopied(false)
    }, 2000)
  }, [paymentAddress])

  /**
   * Open in wallet (universal Bitcoin URI)
   */
  const openInWallet = useCallback(() => {
    if (!paymentAddress) return

    const uri = `bitcoin:${paymentAddress.address}?amount=${paymentAddress.btcAmount}`
    window.open(uri, '_blank')
  }, [paymentAddress])

  /**
   * View on blockchain explorer
   */
  const viewOnExplorer = useCallback(() => {
    if (!paymentAddress) return

    // Determine network (testnet vs mainnet)
    const isTestnet = paymentAddress.address.startsWith('tb1')
    const explorerUrl = isTestnet
      ? `https://blockstream.info/testnet/address/${paymentAddress.address}`
      : `https://blockstream.info/address/${paymentAddress.address}`
    
    window.open(explorerUrl, '_blank')
  }, [paymentAddress])

  // ============================================================================
  // RENDER HELPERS
  // ============================================================================

  /**
   * Format satoshis to BTC
   */
  function formatSatoshisToBTC(satoshis: number): string {
    return (satoshis / 100_000_000).toFixed(8)
  }

  /**
   * Get confirmation progress percentage
   */
  function getConfirmationProgress(): number {
    if (!paymentStatus || paymentStatus.confirmations === 0) return 0
    return Math.min((paymentStatus.confirmations / 3) * 100, 100)
  }

  // ============================================================================
  // RENDER
  // ============================================================================

  // Loading state
  if (loading) {
    return (
      <div className="bg-white border border-barely-beige p-8">
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 size={48} className="animate-spin text-warm-taupe mb-4" />
          <p className="text-warm-gray">Generating payment address...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="bg-white border border-barely-beige p-8">
        <div className="flex flex-col items-center justify-center py-8">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-4">
            <AlertCircle size={32} className="text-red-600" />
          </div>
          <p className="text-soft-black font-medium mb-2">Payment Setup Failed</p>
          <p className="text-sm text-warm-gray mb-6 text-center max-w-md">
            {error}
          </p>
          <button
            onClick={generatePaymentAddress}
            className="btn btn-primary"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  if (!paymentAddress) return null

  // Payment confirmed - Success state
  if (paymentStatus?.confirmed) {
    return (
      <div className="bg-white border border-barely-beige p-8">
        <div className="flex flex-col items-center justify-center py-12">
          {/* Success icon */}
          <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mb-4">
            <Check size={48} className="text-green-600" />
          </div>

          <h3 className="text-2xl font-serif font-medium text-soft-black mb-2">
            Payment Confirmed!
          </h3>
          
          <p className="text-warm-gray text-center mb-6">
            Your Bitcoin payment has been confirmed with {paymentStatus.confirmations} confirmations.
          </p>

          {paymentStatus.txid && (
            <div className="bg-light-cream border border-barely-beige p-4 mb-6">
              <p className="text-xs text-warm-gray mb-1">Transaction ID:</p>
              <p className="font-mono text-xs text-soft-black break-all">
                {paymentStatus.txid}
              </p>
            </div>
          )}

          <p className="text-sm text-warm-gray">
            Redirecting you to order details...
          </p>
        </div>
      </div>
    )
  }

  // Main payment UI
  return (
    <div className="bg-white border border-barely-beige">
      {/* Header */}
      <div className="border-b border-barely-beige p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-warm-taupe bg-opacity-10 rounded-full flex items-center justify-center">
              <Bitcoin size={24} className="text-warm-taupe" />
            </div>
            <div>
              <h3 className="text-lg font-serif font-medium text-soft-black">
                Pay with Bitcoin
              </h3>
              <p className="text-sm text-warm-gray">
                Order #{order.orderNumber}
              </p>
            </div>
          </div>

          {/* Timer */}
          <div className="flex items-center gap-2 text-sm">
            <Clock size={16} className="text-warm-gray" />
            <span className="text-warm-gray">
              Expires in: <span className="font-medium text-soft-black">{timeRemaining}</span>
            </span>
          </div>
        </div>

        {/* Amount */}
        <div className="bg-light-cream p-4 border border-barely-beige">
          <p className="text-sm text-warm-gray mb-1">Amount to Pay</p>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-serif font-medium text-soft-black">
              {paymentAddress.btcAmount}
            </span>
            <span className="text-lg text-warm-gray">BTC</span>
          </div>
          <p className="text-sm text-warm-gray mt-1">
            ≈ ${paymentAddress.usdAmount.toFixed(2)} USD
          </p>
        </div>
      </div>

      {/* QR Code & Address */}
      <div className="p-6">
        <div className="flex flex-col items-center mb-6">
          {/* QR Code */}
          <div className="bg-white p-4 border-2 border-barely-beige mb-4">
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=bitcoin:${paymentAddress.address}?amount=${paymentAddress.btcAmount}`}
              alt="Bitcoin payment QR code"
              className="w-48 h-48"
            />
          </div>

          <p className="text-sm text-warm-gray text-center mb-4">
            Scan QR code with your wallet, or copy the address below
          </p>

          {/* Address */}
          <div className="w-full bg-light-cream border border-barely-beige p-4 mb-4">
            <p className="text-xs text-warm-gray mb-2">Bitcoin Address</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 font-mono text-sm text-soft-black break-all">
                {paymentAddress.address}
              </code>
              <button
                onClick={copyAddress}
                className="flex-shrink-0 p-2 hover:bg-white transition-colors border border-barely-beige"
                title="Copy address"
              >
                {copied ? (
                  <Check size={18} className="text-green-600" />
                ) : (
                  <Copy size={18} className="text-warm-gray" />
                )}
              </button>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 w-full">
            <button
              onClick={openInWallet}
              className="btn btn-primary flex-1 flex items-center justify-center gap-2"
            >
              <Wallet size={18} />
              Open in Wallet
            </button>
            <button
              onClick={viewOnExplorer}
              className="btn btn-secondary flex items-center justify-center gap-2"
            >
              <ExternalLink size={18} />
              View Address
            </button>
          </div>
        </div>

        {/* Payment status */}
        <div className="border-t border-barely-beige pt-6">
          {paymentStatus && paymentStatus.confirmations > 0 ? (
            // Payment detected - waiting for confirmations
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Loader2 size={20} className="animate-spin text-warm-taupe" />
                  <span className="text-sm font-medium text-soft-black">
                    Payment Detected
                  </span>
                </div>
                <span className="text-sm text-warm-gray">
                  {paymentStatus.confirmations} / 3 confirmations
                </span>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-barely-beige h-2 mb-3">
                <div
                  className="bg-warm-taupe h-2 transition-all duration-500"
                  style={{ width: `${getConfirmationProgress()}%` }}
                />
              </div>

              <p className="text-xs text-warm-gray">
                Your payment is being confirmed on the Bitcoin network. 
                This typically takes 10-30 minutes.
              </p>

              {paymentStatus.txid && (
                <div className="mt-3 p-3 bg-light-cream border border-barely-beige">
                  <p className="text-xs text-warm-gray mb-1">Transaction ID:</p>
                  <code className="font-mono text-xs text-soft-black break-all">
                    {paymentStatus.txid}
                  </code>
                </div>
              )}
            </div>
          ) : (
            // Waiting for payment
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Loader2 size={20} className="animate-spin text-warm-gray" />
                <span className="text-sm font-medium text-soft-black">
                  Waiting for Payment
                </span>
              </div>

              <p className="text-sm text-warm-gray mb-4">
                Send exactly <span className="font-medium text-soft-black">{paymentAddress.btcAmount} BTC</span> to 
                the address above. Your payment will be detected automatically.
              </p>

              <div className="bg-light-cream border border-barely-beige p-4">
                <p className="text-xs text-warm-gray mb-2">⚠️ Important:</p>
                <ul className="text-xs text-warm-gray space-y-1 list-disc list-inside">
                  <li>Send only Bitcoin (BTC) to this address</li>
                  <li>Do not send from an exchange (use a personal wallet)</li>
                  <li>This address expires in {timeRemaining}</li>
                  <li>3 confirmations required (~30 minutes)</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Cancel option */}
        {onCancel && (
          <div className="border-t border-barely-beige pt-6 mt-6">
            <button
              onClick={onCancel}
              className="btn btn-ghost w-full text-warm-gray hover:text-soft-black"
            >
              Cancel Payment
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
