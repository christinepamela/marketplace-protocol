/**
 * Order Actions Component
 * Action buttons for order management
 */

import { useState } from 'react'
import type { Order } from '@rangkai/sdk'
import { 
  confirmOrder, 
  shipOrder, 
  confirmDelivery, 
  completeOrder, 
  cancelOrder,
  getAvailableActions 
} from '@/lib/api/orders'
import { CheckCircle, Truck, PackageCheck, XCircle, Loader2 } from 'lucide-react'

interface OrderActionsProps {
  order: Order
  userDid: string
  onActionComplete: () => void
}

export default function OrderActions({ order, userDid, onActionComplete }: OrderActionsProps) {
  const [loading, setLoading] = useState(false)
  const [showTrackingInput, setShowTrackingInput] = useState(false)
  const [trackingNumber, setTrackingNumber] = useState('')
  const [showCancelInput, setShowCancelInput] = useState(false)
  const [cancelReason, setCancelReason] = useState('')

  const actions = getAvailableActions(order, userDid)
  const isBuyer = order.buyerDid === userDid
  const isVendor = order.vendorDid === userDid

  // No actions available
  if (!isBuyer && !isVendor) {
    return (
      <div className="text-sm text-warm-gray italic">
        You don't have permission to perform actions on this order
      </div>
    )
  }

  if (!Object.values(actions).some(v => v)) {
    return (
      <div className="text-sm text-warm-gray italic">
        No actions available for this order
      </div>
    )
  }

  // Handle confirm order
  const handleConfirm = async () => {
    if (!confirm('Confirm this order? This means you accept the order and will fulfill it.')) return
    
    setLoading(true)
    try {
      await confirmOrder(order.id)
      alert('✅ Order confirmed successfully!')
      onActionComplete()
    } catch (error: any) {
      alert(`❌ Failed to confirm order: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  // Handle ship order
  const handleShip = async () => {
    setLoading(true)
    try {
      await shipOrder(order.id, trackingNumber || undefined)
      alert('✅ Order marked as shipped!')
      setShowTrackingInput(false)
      setTrackingNumber('')
      onActionComplete()
    } catch (error: any) {
      alert(`❌ Failed to ship order: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  // Handle confirm delivery
  const handleConfirmDelivery = async () => {
    if (!confirm('Confirm that you received this order?')) return
    
    setLoading(true)
    try {
      await confirmDelivery(order.id)
      alert('✅ Delivery confirmed!')
      onActionComplete()
    } catch (error: any) {
      alert(`❌ Failed to confirm delivery: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  // Handle complete order
  const handleComplete = async () => {
    if (!confirm('Complete this order? This will release the escrow to the vendor.')) return
    
    setLoading(true)
    try {
      await completeOrder(order.id)
      alert('✅ Order completed! Escrow released.')
      onActionComplete()
    } catch (error: any) {
      alert(`❌ Failed to complete order: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  // Handle cancel
  const handleCancel = async () => {
    if (!cancelReason.trim()) {
      alert('Please provide a reason for cancellation')
      return
    }
    
    setLoading(true)
    try {
      await cancelOrder(order.id, cancelReason)
      alert('✅ Order cancelled')
      setShowCancelInput(false)
      setCancelReason('')
      onActionComplete()
    } catch (error: any) {
      alert(`❌ Failed to cancel order: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Vendor Actions */}
      {isVendor && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-warm-gray uppercase">Vendor Actions</h3>
          
          {/* Confirm Order */}
          {actions.canConfirm && (
            <button
              onClick={handleConfirm}
              disabled={loading}
              className="btn btn-primary w-full disabled:opacity-50"
            >
              {loading ? (
                <Loader2 size={18} className="mr-2 animate-spin" />
              ) : (
                <CheckCircle size={18} className="mr-2" />
              )}
              Confirm Order
            </button>
          )}

          {/* Ship Order */}
          {actions.canShip && (
            <div>
              {!showTrackingInput ? (
                <button
                  onClick={() => setShowTrackingInput(true)}
                  disabled={loading}
                  className="btn btn-primary w-full disabled:opacity-50"
                >
                  <Truck size={18} className="mr-2" />
                  Mark as Shipped
                </button>
              ) : (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={trackingNumber}
                    onChange={(e) => setTrackingNumber(e.target.value)}
                    placeholder="Tracking number (optional)"
                    className="input w-full"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleShip}
                      disabled={loading}
                      className="btn btn-primary flex-1 disabled:opacity-50"
                    >
                      {loading ? (
                        <Loader2 size={18} className="mr-2 animate-spin" />
                      ) : (
                        <CheckCircle size={18} className="mr-2" />
                      )}
                      Confirm Shipment
                    </button>
                    <button
                      onClick={() => setShowTrackingInput(false)}
                      disabled={loading}
                      className="btn btn-secondary"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Buyer Actions */}
      {isBuyer && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-warm-gray uppercase">Buyer Actions</h3>
          
          {/* Confirm Delivery */}
          {actions.canConfirmDelivery && (
            <button
              onClick={handleConfirmDelivery}
              disabled={loading}
              className="btn btn-primary w-full disabled:opacity-50"
            >
              {loading ? (
                <Loader2 size={18} className="mr-2 animate-spin" />
              ) : (
                <PackageCheck size={18} className="mr-2" />
              )}
              Confirm Delivery
            </button>
          )}

          {/* Complete Order */}
          {actions.canComplete && (
            <button
              onClick={handleComplete}
              disabled={loading}
              className="btn btn-primary w-full disabled:opacity-50"
            >
              {loading ? (
                <Loader2 size={18} className="mr-2 animate-spin" />
              ) : (
                <CheckCircle size={18} className="mr-2" />
              )}
              Complete Order (Release Escrow)
            </button>
          )}
        </div>
      )}

      {/* Cancel Action (Both) */}
      {actions.canCancel && (
        <div className="pt-3 border-t border-barely-beige">
          {!showCancelInput ? (
            <button
              onClick={() => setShowCancelInput(true)}
              disabled={loading}
              className="btn btn-secondary w-full text-red-600 border-red-200 hover:bg-red-50 disabled:opacity-50"
            >
              <XCircle size={18} className="mr-2" />
              Cancel Order
            </button>
          ) : (
            <div className="space-y-2">
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Reason for cancellation..."
                className="input w-full"
                rows={3}
              />
              <div className="flex gap-2">
                <button
                  onClick={handleCancel}
                  disabled={loading}
                  className="btn btn-secondary flex-1 text-red-600 border-red-200 hover:bg-red-50 disabled:opacity-50"
                >
                  {loading ? (
                    <Loader2 size={18} className="mr-2 animate-spin" />
                  ) : (
                    <XCircle size={18} className="mr-2" />
                  )}
                  Confirm Cancellation
                </button>
                <button
                  onClick={() => {
                    setShowCancelInput(false)
                    setCancelReason('')
                  }}
                  disabled={loading}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}