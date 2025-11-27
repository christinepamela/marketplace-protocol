'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/contexts/AuthContext'
import { getOrder, getOrderHistory } from '@/lib/api/orders'
import type { Order, OrderStatusChange } from '@rangkai/sdk'
import OrderStatus from '@/components/orders/OrderStatus'
import OrderTimeline from '@/components/orders/OrderTimeline'
import OrderActions from '@/components/orders/OrderActions'
import { ArrowLeft, Package, MapPin, CreditCard, Truck, User, Loader2 } from 'lucide-react'

export default function OrderDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const orderId = params.id as string

  const [order, setOrder] = useState<Order | null>(null)
  const [history, setHistory] = useState<OrderStatusChange[]>([])
  const [loading, setLoading] = useState(true)

  const loadOrder = async () => {
    setLoading(true)
    try {
      const [orderData, historyData] = await Promise.all([
        getOrder(orderId),
        getOrderHistory(orderId)
      ])
      setOrder(orderData)
      setHistory(historyData)
    } catch (error) {
      console.error('Failed to load order:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadOrder()
  }, [orderId])

  if (loading) {
    return (
      <div className="container-custom section-padding">
        <div className="flex items-center justify-center py-20">
          <Loader2 size={48} className="animate-spin text-warm-gray" />
        </div>
      </div>
    )
  }

  if (!order || !user) {
    return (
      <div className="container-custom section-padding text-center">
        <h1 className="mb-4">Order Not Found</h1>
        <p className="text-warm-gray mb-6">
          The order you're looking for doesn't exist or you don't have permission to view it.
        </p>
        <Link href="/orders" className="btn btn-primary">
          Back to Orders
        </Link>
      </div>
    )
  }

  const isBuyer = order.buyerDid === user.did
  const isVendor = order.vendorDid === user.did

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="container-custom section-padding">
      {/* Back button */}
      <Link 
        href="/orders"
        className="inline-flex items-center gap-2 text-sm text-warm-gray hover:text-soft-black mb-8 transition-colors"
      >
        <ArrowLeft size={16} />
        Back to Orders
      </Link>

      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="mb-2">Order #{order.orderNumber}</h1>
          <p className="text-warm-gray">
            Placed on {formatDate(order.createdAt)}
          </p>
        </div>
        <OrderStatus status={order.status} size="lg" />
      </div>

      {/* Main content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left column - Order details */}
        <div className="lg:col-span-2 space-y-8">
          {/* Items */}
          <div className="bg-white border border-barely-beige p-6">
            <div className="flex items-center gap-2 mb-4">
              <Package size={20} className="text-warm-taupe" />
              <h2 className="text-lg font-medium">Order Items</h2>
            </div>
            <div className="space-y-4">
              {order.items.map((item, idx) => (
                <div key={idx} className="flex justify-between items-start pb-4 border-b border-barely-beige last:border-0 last:pb-0">
                  <div className="flex-1">
                    <h3 className="font-medium text-soft-black mb-1">
                      {item.productName}
                    </h3>
                    <p className="text-sm text-warm-gray">
                      Quantity: {item.quantity} × ${item.pricePerUnit.amount.toFixed(2)}
                    </p>
                    {item.variantName && (
                      <p className="text-sm text-warm-gray">
                        Variant: {item.variantName}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-soft-black">
                      ${item.totalPrice.amount.toFixed(2)}
                    </p>
                    <p className="text-xs text-warm-gray">
                      {item.totalPrice.currency}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="mt-6 pt-6 border-t border-barely-beige space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-warm-gray">Subtotal</span>
                <span className="text-soft-black">
                  ${order.subtotal.amount.toFixed(2)} {order.subtotal.currency}
                </span>
              </div>
              {order.shippingCost && (
                <div className="flex justify-between text-sm">
                  <span className="text-warm-gray">Shipping</span>
                  <span className="text-soft-black">
                    ${order.shippingCost.amount.toFixed(2)} {order.shippingCost.currency}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-lg font-medium pt-2 border-t border-barely-beige">
                <span>Total</span>
                <span>${order.total.amount.toFixed(2)} {order.total.currency}</span>
              </div>
            </div>
          </div>

          {/* Shipping Address */}
          <div className="bg-white border border-barely-beige p-6">
            <div className="flex items-center gap-2 mb-4">
              <MapPin size={20} className="text-warm-taupe" />
              <h2 className="text-lg font-medium">Shipping Address</h2>
            </div>
            <div className="text-sm text-soft-black space-y-1">
              <p className="font-medium">{order.shippingAddress.name}</p>
              <p>{order.shippingAddress.addressLine1}</p>
              {order.shippingAddress.addressLine2 && (
                <p>{order.shippingAddress.addressLine2}</p>
              )}
              <p>
                {order.shippingAddress.city}
                {order.shippingAddress.state && `, ${order.shippingAddress.state}`}
                {' '}{order.shippingAddress.postalCode}
              </p>
              <p>{order.shippingAddress.country}</p>
              <p className="text-warm-gray pt-2">
                Phone: {order.shippingAddress.phone}
              </p>
            </div>
          </div>

          {/* Payment & Shipping Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Payment */}
            <div className="bg-white border border-barely-beige p-6">
              <div className="flex items-center gap-2 mb-4">
                <CreditCard size={20} className="text-warm-taupe" />
                <h2 className="text-lg font-medium">Payment</h2>
              </div>
              <div className="text-sm space-y-2">
                <div>
                  <span className="text-warm-gray">Method: </span>
                  <span className="text-soft-black capitalize">
                    {order.paymentMethod.replace('_', ' ')}
                  </span>
                </div>
                <div>
                  <span className="text-warm-gray">Status: </span>
                  <span className="text-soft-black capitalize">{order.paymentStatus}</span>
                </div>
                {order.paidAt && (
                  <div className="text-warm-gray">
                    Paid: {formatDate(order.paidAt)}
                  </div>
                )}
              </div>
            </div>

            {/* Shipping */}
            <div className="bg-white border border-barely-beige p-6">
              <div className="flex items-center gap-2 mb-4">
                <Truck size={20} className="text-warm-taupe" />
                <h2 className="text-lg font-medium">Shipping</h2>
              </div>
              <div className="text-sm space-y-2">
                {order.trackingNumber ? (
                  <>
                    <div>
                      <span className="text-warm-gray">Tracking: </span>
                      <span className="text-soft-black font-mono text-xs">
                        {order.trackingNumber}
                      </span>
                    </div>
                    {order.shippedAt && (
                      <div className="text-warm-gray">
                        Shipped: {formatDate(order.shippedAt)}
                      </div>
                    )}
                    {order.estimatedDeliveryDate && (
                      <div className="text-warm-gray">
                        Est. delivery: {formatDate(order.estimatedDeliveryDate)}
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-warm-gray italic">
                    Not yet shipped
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Buyer/Vendor Info */}
          <div className="bg-white border border-barely-beige p-6">
            <div className="flex items-center gap-2 mb-4">
              <User size={20} className="text-warm-taupe" />
              <h2 className="text-lg font-medium">Order Parties</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-warm-gray block mb-1">Buyer:</span>
                <span className="text-soft-black font-mono text-xs">
                  {order.buyerDid}
                </span>
                {isBuyer && (
                  <span className="ml-2 text-xs text-green-600">(You)</span>
                )}
              </div>
              <div>
                <span className="text-warm-gray block mb-1">Vendor:</span>
                <span className="text-soft-black font-mono text-xs">
                  {order.vendorDid}
                </span>
                {isVendor && (
                  <span className="ml-2 text-xs text-green-600">(You)</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right column - Timeline & Actions */}
        <div className="space-y-8">
          {/* Timeline */}
          <div className="bg-white border border-barely-beige p-6">
            <h2 className="text-lg font-medium mb-6">Order Timeline</h2>
            <OrderTimeline history={history} />
          </div>

          {/* Actions */}
          <div className="bg-light-cream border border-barely-beige p-6">
            <h2 className="text-lg font-medium mb-6">Actions</h2>
            <OrderActions
              order={order}
              userDid={user.did}
              onActionComplete={loadOrder}
            />
          </div>
        </div>
      </div>
    </div>
  )
}