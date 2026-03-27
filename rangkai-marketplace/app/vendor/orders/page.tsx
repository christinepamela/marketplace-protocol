'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/lib/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getVendorOrders, confirmOrder, shipOrder } from '@/lib/api/orders'
import VendorSidebar from '@/components/vendor/VendorSidebar'
import type { Order, OrderStatus } from '@rangkai/sdk'
import {
  Package,
  CheckCircle,
  Truck,
  Clock,
  Loader2,
  ChevronRight,
  MapPin,
  Hash
} from 'lucide-react'

type StatusTab = 'all' | 'paid' | 'confirmed' | 'shipped' | 'delivered' | 'completed'

const STATUS_TABS: { key: StatusTab; label: string }[] = [
  { key: 'all',       label: 'All Orders' },
  { key: 'paid',      label: 'Paid — Action Required' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'shipped',   label: 'Shipped' },
  { key: 'delivered', label: 'Delivered' },
  { key: 'completed', label: 'Completed' },
]

const STATUS_BADGE: Record<string, string> = {
  payment_pending: 'bg-yellow-100 text-yellow-800',
  paid:            'bg-blue-100 text-blue-800',
  confirmed:       'bg-purple-100 text-purple-800',
  shipped:         'bg-indigo-100 text-indigo-800',
  delivered:       'bg-teal-100 text-teal-800',
  completed:       'bg-green-100 text-green-800',
  cancelled:       'bg-red-100 text-red-800',
}

export default function VendorOrdersPage() {
  const { user } = useAuth()
  const router = useRouter()

  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<StatusTab>('paid')

  // Per-order action state
  const [confirmingId, setConfirmingId] = useState<string | null>(null)
  const [shippingId, setShippingId] = useState<string | null>(null)
  const [trackingInputId, setTrackingInputId] = useState<string | null>(null)
  const [trackingNumber, setTrackingNumber] = useState('')
  const [actionError, setActionError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) {
      router.push('/auth/register')
    }
  }, [user, router])

  const fetchOrders = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const options = activeTab !== 'all' ? { status: activeTab as OrderStatus } : {}
      const data = await getVendorOrders(user.did, options)
      setOrders(data)
    } catch (error) {
      console.error('Failed to fetch vendor orders:', error)
    } finally {
      setLoading(false)
    }
  }, [user, activeTab])

  useEffect(() => {
    fetchOrders()
  }, [fetchOrders])

  const handleConfirm = async (orderId: string) => {
    setConfirmingId(orderId)
    setActionError(null)
    try {
      await confirmOrder(orderId)
      await fetchOrders()
    } catch (error) {
      console.error('Failed to confirm order:', error)
      setActionError('Failed to confirm order. Please try again.')
    } finally {
      setConfirmingId(null)
    }
  }

  const handleShipOpen = (orderId: string) => {
    setTrackingInputId(orderId)
    setTrackingNumber('')
    setActionError(null)
  }

  const handleShipSubmit = async (orderId: string) => {
    setShippingId(orderId)
    setActionError(null)
    try {
      await shipOrder(orderId, trackingNumber || undefined)
      setTrackingInputId(null)
      setTrackingNumber('')
      await fetchOrders()
    } catch (error) {
      console.error('Failed to ship order:', error)
      setActionError('Failed to mark as shipped. Please try again.')
    } finally {
      setShippingId(null)
    }
  }

  if (!user) return null

  const paidCount = orders.filter(o => o.status === 'paid').length

  return (
    <div className="flex min-h-screen bg-warm-white">
      <VendorSidebar stats={{ totalProducts: 0, activeOrders: paidCount, totalRevenue: '' }} />

      <main className="flex-1 p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-medium text-soft-black mb-2">Orders</h1>
          <p className="text-warm-gray">Manage and fulfil incoming orders</p>
        </div>

        {/* Status tabs */}
        <div className="flex gap-1 mb-6 border-b border-barely-beige overflow-x-auto">
          {STATUS_TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`
                px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors
                ${activeTab === tab.key
                  ? 'border-soft-black text-soft-black'
                  : 'border-transparent text-warm-gray hover:text-soft-black'
                }
              `}
            >
              {tab.label}
              {tab.key === 'paid' && paidCount > 0 && (
                <span className="ml-2 bg-blue-600 text-white text-xs px-1.5 py-0.5 rounded-full">
                  {paidCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Error banner */}
        {actionError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded">
            {actionError}
          </div>
        )}

        {/* Orders list */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={32} className="animate-spin text-warm-gray" />
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-20">
            <Package size={64} className="mx-auto text-warm-gray mb-4" />
            <h3 className="text-xl font-medium mb-2">No orders found</h3>
            <p className="text-warm-gray">
              {activeTab === 'paid'
                ? 'No paid orders waiting for confirmation.'
                : `No orders with status: ${activeTab}`}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map(order => (
              <div
                key={order.id}
                className="bg-white border border-barely-beige p-6"
              >
                {/* Order header row */}
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="font-medium text-soft-black text-lg">
                        Order #{order.orderNumber}
                      </h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${STATUS_BADGE[order.status] || 'bg-gray-100 text-gray-700'}`}>
                        {order.status.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-sm text-warm-gray">
                      Placed {new Date(order.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric', month: 'short', day: 'numeric',
                        hour: '2-digit', minute: '2-digit'
                      })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-medium text-soft-black">
                      ${order.total.amount.toFixed(2)}
                    </p>
                    <p className="text-xs text-warm-gray">{order.total.currency}</p>
                  </div>
                </div>

                {/* Items */}
                <div className="mb-4 pb-4 border-b border-barely-beige space-y-1">
                  {order.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-sm">
                      <span className="text-soft-black">
                        {item.productName}
                        {item.variantName && (
                          <span className="text-warm-gray"> — {item.variantName}</span>
                        )}
                        <span className="text-warm-gray"> × {item.quantity}</span>
                      </span>
                      <span className="text-soft-black">
                        ${item.totalPrice.amount.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Shipping address */}
                <div className="mb-4 pb-4 border-b border-barely-beige">
                  <div className="flex items-start gap-2 text-sm">
                    <MapPin size={15} className="text-warm-taupe mt-0.5 shrink-0" />
                    <div className="text-soft-black">
                      <span className="font-medium">{order.shippingAddress.name}</span>
                      {' — '}
                      {order.shippingAddress.addressLine1}
                      {order.shippingAddress.addressLine2 && `, ${order.shippingAddress.addressLine2}`}
                      {', '}
                      {order.shippingAddress.city}
                      {order.shippingAddress.state && `, ${order.shippingAddress.state}`}
                      {' '}
                      {order.shippingAddress.postalCode}
                      {', '}
                      {order.shippingAddress.country}
                    </div>
                  </div>
                  {order.shippingAddress.phone && (
                    <p className="text-xs text-warm-gray mt-1 ml-[23px]">
                      Phone: {order.shippingAddress.phone}
                    </p>
                  )}
                </div>

                {/* Tracking number (if shipped) */}
                {order.trackingNumber && (
                  <div className="mb-4 pb-4 border-b border-barely-beige flex items-center gap-2 text-sm">
                    <Hash size={15} className="text-warm-taupe shrink-0" />
                    <span className="text-warm-gray">Tracking:</span>
                    <span className="font-mono text-soft-black">{order.trackingNumber}</span>
                  </div>
                )}

                {/* Action row */}
                <div className="flex items-center gap-3 flex-wrap">
                  {/* Confirm Order */}
                  {order.status === 'paid' && (
                    <button
                      onClick={() => handleConfirm(order.id)}
                      disabled={confirmingId === order.id}
                      className="btn btn-primary flex items-center gap-2"
                    >
                      {confirmingId === order.id ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <CheckCircle size={16} />
                      )}
                      Confirm Order
                    </button>
                  )}

                  {/* Mark as Shipped */}
                  {order.status === 'confirmed' && trackingInputId !== order.id && (
                    <button
                      onClick={() => handleShipOpen(order.id)}
                      className="btn btn-primary flex items-center gap-2"
                    >
                      <Truck size={16} />
                      Mark as Shipped
                    </button>
                  )}

                  {/* Tracking number inline form */}
                  {order.status === 'confirmed' && trackingInputId === order.id && (
                    <div className="flex items-center gap-2 w-full">
                      <input
                        type="text"
                        value={trackingNumber}
                        onChange={e => setTrackingNumber(e.target.value)}
                        placeholder="Tracking number (optional)"
                        className="input flex-1 text-sm"
                        autoFocus
                      />
                      <button
                        onClick={() => handleShipSubmit(order.id)}
                        disabled={shippingId === order.id}
                        className="btn btn-primary flex items-center gap-2"
                      >
                        {shippingId === order.id ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <Truck size={16} />
                        )}
                        Confirm Ship
                      </button>
                      <button
                        onClick={() => setTrackingInputId(null)}
                        className="btn btn-secondary"
                      >
                        Cancel
                      </button>
                    </div>
                  )}

                  {/* Status info for non-actionable states */}
                  {['shipped', 'delivered', 'completed'].includes(order.status) && (
                    <div className="flex items-center gap-2 text-sm text-warm-gray">
                      <Clock size={15} />
                      {order.status === 'shipped' && 'Waiting for buyer to confirm delivery'}
                      {order.status === 'delivered' && 'Waiting for buyer to complete order'}
                      {order.status === 'completed' && 'Order complete — payment released'}
                    </div>
                  )}

                  {/* View full detail */}
                  <Link
                    href={`/orders/${order.id}`}
                    className="ml-auto flex items-center gap-1 text-sm text-warm-taupe hover:text-soft-black transition-colors"
                  >
                    Full Detail
                    <ChevronRight size={15} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
