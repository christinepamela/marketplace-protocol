'use client'
/**
 * Bitcoin Payment Flow Component
 * Path: rangkai-marketplace/components/orders/BitcoinPaymentFlow.tsx
 *
 * FIXED:
 *   - QR code now generated client-side using react-qr-code
 *     (was using api.qrserver.com — leaked every payment address to a third party)
 *   - Token read from useAuth() instead of localStorage directly
 *
 * INSTALL: npm install react-qr-code  (in rangkai-marketplace/)
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '@/lib/contexts/AuthContext'
import { Copy, Check, Clock, Loader2, Bitcoin, AlertCircle, ExternalLink, Wallet } from 'lucide-react'
import QRCode from 'react-qr-code'  // ← replaces api.qrserver.com
import type { Order } from '@rangkai/sdk'

interface BitcoinPaymentAddress {
  orderId: string
  address: string
  expectedAmount: number
  usdAmount: number
  expiresAt: string
  btcAmount: string
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

function formatSatoshisToBTC(satoshis: number): string {
  return (satoshis / 100_000_000).toFixed(8)
}

export default function BitcoinPaymentFlow({
  order,
  onPaymentConfirmed,
  onCancel
}: BitcoinPaymentFlowProps) {
  const { user } = useAuth()  // ← FIXED: use auth context, not localStorage directly
  const getToken = () => user?.token ?? localStorage.getItem('rangkai_token') ?? ''

  const [loading, setLoading] = useState(true)
  const [paymentAddress, setPaymentAddress] = useState<BitcoinPaymentAddress | null>(null)
  const [paymentStatus, setPaymentStatus] = useState<BitcoinPaymentStatus | null>(null)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [timeRemaining, setTimeRemaining] = useState<string>('')
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const hasGeneratedRef = useRef(false)

  useEffect(() => {
    if (hasGeneratedRef.current) return
    hasGeneratedRef.current = true
    generatePaymentAddress()
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
    }
  }, [])

  const generatePaymentAddress = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/orders/${order.id}/bitcoin-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`
        },
        body: JSON.stringify({ amount: order.total.amount, currency: order.total.currency })
      })

      if (!response.ok) throw new Error('Failed to generate payment address')

      const data = await response.json()

      // Dust limit check — Bitcoin network rejects amounts below 546 satoshis
      if (data.expectedAmount < 546) {
        throw new Error(
          `Order amount too small for Bitcoin (${data.expectedAmount} sat). ` +
          `Minimum is 546 satoshis (~$0.003 USD).`
        )
      }

      setPaymentAddress({
        orderId: order.id,
        address: data.address,
        expectedAmount: data.expectedAmount,
        usdAmount: data.usdAmount,
        expiresAt: data.expiresAt,
        btcAmount: formatSatoshisToBTC(data.expectedAmount)
      })

      startPaymentMonitoring(data.address)
    } catch (err: any) {
      console.error('Failed to generate payment address:', err)
      setError(err.message || 'Failed to generate payment address. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const startPaymentMonitoring = (address: string) => {
    checkPaymentStatus(address)
    pollIntervalRef.current = setInterval(() => checkPaymentStatus(address), 30_000)
  }

  const checkPaymentStatus = async (address: string) => {
    try {
      const response = await fetch(`/api/orders/${order.id}/bitcoin-status`, {
        headers: { 'Authorization': `Bearer ${getToken()}` }
      })
      if (!response.ok) return

      const status: BitcoinPaymentStatus = await response.json()
      setPaymentStatus(status)

      if (status.confirmed) {
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
        setTimeout(() => onPaymentConfirmed(), 1500)
      }
    } catch (err) {
      // Silent — polling will retry in 30s
    }
  }

  // Countdown timer
  useEffect(() => {
    if (!paymentAddress) return
    const updateTimer = () => {
      const distance = new Date(paymentAddress.expiresAt).getTime() - Date.now()
      if (distance < 0) {
        setTimeRemaining('Expired')
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
        return
      }
      const h = Math.floor(distance / (1000 * 60 * 60))
      const m = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60))
      const s = Math.floor((distance % (1000 * 60)) / 1000)
      setTimeRemaining(`${h}h ${m}m ${s}s`)
    }
    updateTimer()
    const id = setInterval(updateTimer, 1000)
    return () => clearInterval(id)
  }, [paymentAddress])

  const copyAddress = useCallback(() => {
    if (!paymentAddress) return
    navigator.clipboard.writeText(paymentAddress.address)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [paymentAddress])

  const openInWallet = useCallback(() => {
    if (!paymentAddress) return
    window.location.href =
      `bitcoin:${paymentAddress.address}?amount=${paymentAddress.btcAmount}`
  }, [paymentAddress])

  const viewOnExplorer = useCallback(() => {
    if (!paymentAddress) return
    const base = process.env.NEXT_PUBLIC_BITCOIN_NETWORK === 'testnet'
      ? 'https://blockstream.info/testnet/address/'
      : 'https://blockstream.info/address/'
    window.open(`${base}${paymentAddress.address}`, '_blank')
  }, [paymentAddress])

  const getConfirmationProgress = () => {
    if (!paymentStatus) return 0
    return Math.min((paymentStatus.confirmations / 3) * 100, 100)
  }

  // ── Loading state ──────────────────────────────────────────────────────────
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

  // ── Error state ────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="bg-white border border-barely-beige p-8">
        <div className="flex flex-col items-center justify-center py-12">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-4">
            <AlertCircle size={32} className="text-red-600" />
          </div>
          <p className="text-soft-black font-medium mb-2">Payment Setup Failed</p>
          <p className="text-sm text-warm-gray mb-6 text-center max-w-md">{error}</p>
          <button onClick={generatePaymentAddress} className="btn btn-primary">
            Try Again
          </button>
        </div>
      </div>
    )
  }

  if (!paymentAddress) return null

  // ── Success state ──────────────────────────────────────────────────────────
  if (paymentStatus?.confirmed) {
    return (
      <div className="bg-white border border-barely-beige p-8">
        <div className="flex flex-col items-center justify-center py-12">
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
              <p className="font-mono text-xs text-soft-black break-all">{paymentStatus.txid}</p>
            </div>
          )}
          <p className="text-sm text-warm-gray">Redirecting you to order details...</p>
        </div>
      </div>
    )
  }

  // ── Main payment UI ────────────────────────────────────────────────────────
  // Bitcoin URI for the QR code (BIP-21 format)
  const bitcoinUri = `bitcoin:${paymentAddress.address}?amount=${paymentAddress.btcAmount}`

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
              <h3 className="text-lg font-serif font-medium text-soft-black">Pay with Bitcoin</h3>
              <p className="text-sm text-warm-gray">Order #{order.orderNumber}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Clock size={16} className="text-warm-gray" />
            <span className="text-warm-gray">
              Expires in: <span className="font-medium text-soft-black">{timeRemaining}</span>
            </span>
          </div>
        </div>
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
          {/*
            FIXED: QR code generated entirely in the browser using react-qr-code.
            Previously used api.qrserver.com which sent every Bitcoin payment address
            to a third-party server. The address never leaves the user's browser now.
          */}
          <div className="bg-white p-4 border-2 border-barely-beige mb-4">
            <QRCode
              value={bitcoinUri}
              size={192}
              style={{ height: 'auto', maxWidth: '100%', width: '100%' }}
              viewBox="0 0 192 192"
            />
          </div>

          <p className="text-sm text-warm-gray text-center mb-4">
            Scan QR code with your Bitcoin wallet, or copy the address below
          </p>

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
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Loader2 size={20} className="animate-spin text-warm-taupe" />
                  <span className="text-sm font-medium text-soft-black">Payment Detected</span>
                </div>
                <span className="text-sm text-warm-gray">
                  {paymentStatus.confirmations} / 3 confirmations
                </span>
              </div>
              <div className="w-full bg-barely-beige h-2 mb-3">
                <div
                  className="bg-warm-taupe h-2 transition-all duration-500"
                  style={{ width: `${getConfirmationProgress()}%` }}
                />
              </div>
              <p className="text-xs text-warm-gray">
                Your payment is being confirmed on the Bitcoin network. This typically takes 10–30 minutes.
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
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Loader2 size={20} className="animate-spin text-warm-gray" />
                <span className="text-sm font-medium text-soft-black">Waiting for Payment</span>
              </div>
              <p className="text-sm text-warm-gray mb-4">
                Send exactly{' '}
                <span className="font-medium text-soft-black">{paymentAddress.btcAmount} BTC</span>{' '}
                to the address above. Your payment will be detected automatically.
              </p>
              <div className="bg-light-cream border border-barely-beige p-4">
                <p className="text-xs text-warm-gray mb-2">Important:</p>
                <ul className="text-xs text-warm-gray space-y-1 list-disc list-inside">
                  <li>Send only Bitcoin (BTC) to this address</li>
                  <li>Do not send from an exchange — use a personal wallet</li>
                  <li>This address expires in {timeRemaining}</li>
                  <li>3 confirmations required (~30 minutes)</li>
                </ul>
              </div>
            </div>
          )}
        </div>

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
