/**
 * Order Card Component
 * Displays order summary in list view
 */

import Link from 'next/link'
import type { Order } from '@rangkai/sdk'
import OrderStatus from './OrderStatus'
import { Package, Calendar, DollarSign } from 'lucide-react'

interface OrderCardProps {
  order: Order
  viewMode: 'buyer' | 'vendor'
}

export default function OrderCard({ order, viewMode }: OrderCardProps) {
  const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0)
  const formattedDate = new Date(order.createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })

  // Get other party's info
  const otherParty = viewMode === 'buyer' 
    ? { label: 'Vendor', did: order.vendorDid }
    : { label: 'Buyer', did: order.buyerDid }

  return (
    <Link
      href={`/orders/${order.id}`}
      className="block bg-white border border-barely-beige p-6 hover:shadow-md transition-shadow"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-medium text-soft-black mb-1">
            Order #{order.orderNumber}
          </h3>
          <div className="flex items-center gap-2 text-sm text-warm-gray">
            <Calendar size={14} />
            <span>{formattedDate}</span>
          </div>
        </div>
        <OrderStatus status={order.status} />
      </div>

      {/* Items summary */}
      <div className="mb-4">
        <div className="flex items-center gap-2 text-sm text-warm-gray mb-2">
          <Package size={14} />
          <span>{itemCount} item{itemCount !== 1 ? 's' : ''}</span>
        </div>
        <div className="text-sm text-soft-black">
          {order.items.slice(0, 2).map((item, idx) => (
            <div key={idx} className="truncate">
              {item.quantity}x {item.productName}
            </div>
          ))}
          {order.items.length > 2 && (
            <div className="text-warm-gray">
              +{order.items.length - 2} more item{order.items.length - 2 !== 1 ? 's' : ''}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-4 border-t border-barely-beige">
        <div className="text-sm text-warm-gray">
          {otherParty.label}: <span className="font-mono text-xs">{otherParty.did.slice(0, 20)}...</span>
        </div>
        <div className="flex items-center gap-2 text-lg font-medium text-soft-black">
          <DollarSign size={18} />
          <span>{order.total.amount.toFixed(2)} {order.total.currency}</span>
        </div>
      </div>

      {/* Shipping info (if available) */}
      {order.trackingNumber && (
        <div className="mt-3 pt-3 border-t border-barely-beige text-sm text-warm-gray">
          Tracking: <span className="font-mono">{order.trackingNumber}</span>
        </div>
      )}
    </Link>
  )
}