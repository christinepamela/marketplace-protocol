/**
 * Order Status Badge Component
 * Color-coded status indicators
 */

import type { OrderStatus } from '@rangkai/sdk'

interface OrderStatusProps {
  status: OrderStatus
  size?: 'sm' | 'md' | 'lg'
}

const STATUS_CONFIG: Record<OrderStatus, { label: string; color: string }> = {
  draft: { label: 'Draft', color: 'bg-warm-gray text-white' },
  payment_pending: { label: 'Payment Pending', color: 'bg-amber-100 text-amber-800' },
  payment_failed: { label: 'Payment Failed', color: 'bg-red-100 text-red-800' },
  paid: { label: 'Paid', color: 'bg-blue-100 text-blue-800' },
  confirmed: { label: 'Confirmed', color: 'bg-indigo-100 text-indigo-800' },
  processing: { label: 'Processing', color: 'bg-purple-100 text-purple-800' },
  shipped: { label: 'Shipped', color: 'bg-cyan-100 text-cyan-800' },
  delivered: { label: 'Delivered', color: 'bg-teal-100 text-teal-800' },
  completed: { label: 'Completed', color: 'bg-green-100 text-green-800' },
  cancelled: { label: 'Cancelled', color: 'bg-gray-100 text-gray-800' },
  disputed: { label: 'Disputed', color: 'bg-orange-100 text-orange-800' },
  refunded: { label: 'Refunded', color: 'bg-pink-100 text-pink-800' },
}

const SIZE_STYLES = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-3 py-1 text-sm',
  lg: 'px-4 py-1.5 text-base',
}

export default function OrderStatus({ status, size = 'md' }: OrderStatusProps) {
  const config = STATUS_CONFIG[status] || { label: status, color: 'bg-gray-100 text-gray-800' }
  
  return (
    <span
      className={`
        inline-flex items-center rounded-full font-medium
        ${config.color}
        ${SIZE_STYLES[size]}
      `}
    >
      {config.label}
    </span>
  )
}