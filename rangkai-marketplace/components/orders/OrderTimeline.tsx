/**
 * Order Timeline Component
 * Visual timeline of order status changes
 */

import type { OrderStatusChange } from '@rangkai/sdk'
import { CheckCircle2, Circle, XCircle } from 'lucide-react'

interface OrderTimelineProps {
  history: OrderStatusChange[]
}

export default function OrderTimeline({ history }: OrderTimelineProps) {
  // Sort by timestamp (newest first)
  const sortedHistory = [...history].sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  )

  const getStatusIcon = (status: string, isLatest: boolean) => {
    if (status === 'cancelled' || status === 'payment_failed') {
      return <XCircle size={20} className="text-red-600" />
    }
    if (isLatest) {
      return <CheckCircle2 size={20} className="text-green-600" />
    }
    return <Circle size={20} className="text-warm-gray" />
  }

  const formatTimestamp = (timestamp: Date | string) => {
    const date = new Date(timestamp)
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusLabel = (status: string): string => {
    return status
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  if (history.length === 0) {
    return (
      <div className="text-center py-8 text-warm-gray">
        No status changes yet
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {sortedHistory.map((change, index) => {
        const isLatest = index === 0
        const isLast = index === sortedHistory.length - 1

        return (
          <div key={`${change.orderId}-${change.timestamp}`} className="flex gap-4">
            {/* Timeline connector */}
            <div className="flex flex-col items-center">
              {getStatusIcon(change.toStatus, isLatest)}
              {!isLast && (
                <div className="w-0.5 h-full bg-barely-beige mt-2" />
              )}
            </div>

            {/* Content */}
            <div className={`flex-1 pb-6 ${isLatest ? '' : 'text-warm-gray'}`}>
              <div className={`font-medium mb-1 ${isLatest ? 'text-soft-black' : ''}`}>
                {getStatusLabel(change.toStatus)}
              </div>
              <div className="text-sm text-warm-gray mb-1">
                {formatTimestamp(change.timestamp)}
              </div>
              {change.changedBy && (
                <div className="text-xs text-warm-gray font-mono">
                  By: {change.changedBy.slice(0, 30)}...
                </div>
              )}
              {change.reason && (
                <div className="text-sm text-warm-gray mt-2 italic">
                  "{change.reason}"
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}