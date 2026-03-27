/**
 * Order Actions Component (Updated with Payment Modal + Inline Ship Form)
 * Action buttons for order management based on status and user role
 */

'use client'

import { useState } from 'react'
import { CreditCard, CheckCircle, Package, Truck, XCircle, Loader2 } from 'lucide-react'
import type { Order } from '@rangkai/sdk'
import { getAvailableActions } from '@/lib/api/orders'
import OrderPaymentModal from './OrderPaymentModal'
import {
  confirmOrder,
  shipOrder,
  confirmDelivery,
  completeOrder,
  cancelOrder
} from '@/lib/api/orders'

interface OrderActionsProps {
  order: Order
  userDid: string
  onActionComplete: () => void
}

export default function OrderActions({ order, userDid, onActionComplete }: OrderActionsProps) {
  const [loading, setLoading] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [showCancelDialog, setShowCancelDialog] = useState(false)
  const [cancelReason, setCancelReason] = useState('')

  // Inline ship form state
  const [showShipForm, setShowShipForm] = useState(false)
  const [trackingNumber, setTrackingNumber] = useState('')

  const actions = getAvailableActions(order, userDid)
  const isBuyer = order.buyerDid === userDid
  const isVendor = order.vendorDid === userDid

  const handlePay = () => {
    setShowPaymentModal(true)
  }

  const handlePaymentComplete = async () => {
    setShowPaymentModal(false)
    onActionComplete()
  }

  const handleConfirm = async () => {
    if (!confirm('Confirm that you have received payment and will process this order?')) {
      return
    }
    setLoading(true)
    try {
      await confirmOrder(order.id)
      onActionComplete()
    } catch (error) {
      console.error('Failed to confirm order:', error)
      alert('Failed to confirm order. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleShipSubmit = async () => {
    setLoading(true)
    try {
      await shipOrder(order.id, trackingNumber || undefined)
      setShowShipForm(false)
      setTrackingNumber('')
      onActionComplete()
    } catch (error) {
      console.error('Failed to mark as shipped:', error)
      alert('Failed to mark order as shipped. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleConfirmDelivery = async () => {
    if (!confirm('Confirm that you have received your order in good condition?')) {
      return
    }
    setLoading(true)
    try {
      await confirmDelivery(order.id)
      onActionComplete()
    } catch (error) {
      console.error('Failed to confirm delivery:', error)
      alert('Failed to confirm delivery. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleComplete = async () => {
    if (!confirm('Complete this order? This will release payment to the vendor.')) {
      return
    }
    setLoading(true)
    try {
      await completeOrder(order.id)
      onActionComplete()
    } catch (error) {
      console.error('Failed to complete order:', error)
      alert('Failed to complete order. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleCancelSubmit = async () => {
    if (!cancelReason.trim()) {
      alert('Please provide a reason for cancellation')
      return
    }
    setLoading(true)
    try {
      await cancelOrder(order.id, cancelReason)
      setShowCancelDialog(false)
      onActionComplete()
    } catch (error) {
      console.error('Failed to cancel order:', error)
      alert('Failed to cancel order. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (!actions.canPay && !actions.canConfirm && !actions.canShip &&
      !actions.canConfirmDelivery && !actions.canComplete && !actions.canCancel) {
    return (
      <div className="text-center py-6 text-warm-gray text-sm">
        {isBuyer && 'No actions available at this time'}
        {isVendor && 'Waiting for buyer action'}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Pay Now (Buyer) */}
      {actions.canPay && (
        <button
          onClick={handlePay}
          disabled={loading}
          className="btn btn-primary w-full flex items-center justify-center gap-2"
        >
          <CreditCard size={18} />
          Pay Now
        </button>
      )}

      {/* Confirm Order (Vendor) */}
      {actions.canConfirm && (
        <button
          onClick={handleConfirm}
          disabled={loading}
          className="btn btn-primary w-full flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle size={18} />}
          Confirm Order
        </button>
      )}

      {/* Mark as Shipped (Vendor) — inline form replaces prompt() */}
      {actions.canShip && !showShipForm && (
        <button
          onClick={() => setShowShipForm(true)}
          disabled={loading}
          className="btn btn-primary w-full flex items-center justify-center gap-2"
        >
          <Truck size={18} />
          Mark as Shipped
        </button>
      )}

      {actions.canShip && showShipForm && (
        <div className="border border-barely-beige p-4 bg-light-cream space-y-3">
          <p className="text-sm font-medium text-soft-black">Enter tracking number</p>
          <input
            type="text"
            value={trackingNumber}
            onChange={e => setTrackingNumber(e.target.value)}
            placeholder="Tracking number (optional)"
            className="input w-full text-sm"
            disabled={loading}
            autoFocus
          />
          <div className="flex gap-2">
            <button
              onClick={handleShipSubmit}
              disabled={loading}
              className="btn btn-primary flex-1 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Truck size={16} />}
              Confirm Shipped
            </button>
            <button
              onClick={() => { setShowShipForm(false); setTrackingNumber('') }}
              disabled={loading}
              className="btn btn-secondary flex-1"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Confirm Delivery (Buyer) */}
      {actions.canConfirmDelivery && (
        <button
          onClick={handleConfirmDelivery}
          disabled={loading}
          className="btn btn-primary w-full flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 size={18} className="animate-spin" /> : <Package size={18} />}
          Confirm Delivery
        </button>
      )}

      {/* Complete Order (Buyer) */}
      {actions.canComplete && (
        <button
          onClick={handleComplete}
          disabled={loading}
          className="btn btn-primary w-full flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle size={18} />}
          Complete Order
        </button>
      )}

      {/* Cancel Order */}
      {actions.canCancel && (
        <>
          {!showCancelDialog ? (
            <button
              onClick={() => setShowCancelDialog(true)}
              disabled={loading}
              className="btn btn-ghost w-full flex items-center justify-center gap-2 text-red-600 hover:bg-red-50"
            >
              <XCircle size={18} />
              Cancel Order
            </button>
          ) : (
            <div className="border border-barely-beige p-4 bg-light-cream">
              <p className="text-sm font-medium text-soft-black mb-3">
                Cancel this order?
              </p>
              <textarea
                value={cancelReason}
                onChange={e => setCancelReason(e.target.value)}
                placeholder="Reason for cancellation (required)"
                className="input w-full mb-3 min-h-[80px]"
                disabled={loading}
              />
              <div className="flex gap-2">
                <button
                  onClick={handleCancelSubmit}
                  disabled={loading || !cancelReason.trim()}
                  className="btn btn-primary flex-1 bg-red-600 hover:bg-red-700 border-red-600"
                >
                  {loading ? <Loader2 size={18} className="animate-spin" /> : 'Confirm Cancellation'}
                </button>
                <button
                  onClick={() => { setShowCancelDialog(false); setCancelReason('') }}
                  disabled={loading}
                  className="btn btn-secondary flex-1"
                >
                  Keep Order
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Payment Modal */}
      <OrderPaymentModal
        order={order}
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        onPaymentComplete={handlePaymentComplete}
      />

      {/* Help text */}
      <div className="pt-3 border-t border-barely-beige">
        <p className="text-xs text-warm-gray">
          {isBuyer && actions.canPay && 'Click "Pay Now" to complete your payment and start order processing.'}
          {isBuyer && actions.canConfirmDelivery && 'Confirm delivery once you receive your order.'}
          {isBuyer && actions.canComplete && 'Complete the order to release payment to vendor.'}
          {isVendor && actions.canConfirm && 'Confirm the order after verifying payment.'}
          {isVendor && actions.canShip && 'Enter a tracking number (optional) then confirm shipment.'}
        </p>
      </div>
    </div>
  )
}
