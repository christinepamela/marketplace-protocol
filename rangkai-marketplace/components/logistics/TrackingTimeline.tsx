import React from 'react'
import { Package, AlertCircle } from 'lucide-react'
import TrackingEvent from './TrackingEvent'
import type { TrackingEvent as TrackingEventType, Shipment } from '@rangkai/sdk'

interface TrackingTimelineProps {
  shipment: Shipment | null
  events: TrackingEventType[]
  loading?: boolean
}

export default function TrackingTimeline({ 
  shipment, 
  events, 
  loading 
}: TrackingTimelineProps) {
  
  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-warm-taupe" />
      </div>
    )
  }

  if (!shipment) {
    return (
      <div className="text-center py-8">
        <Package className="w-12 h-12 mx-auto text-warm-gray opacity-50 mb-3" />
        <p className="text-warm-gray">No shipment information available</p>
        <p className="text-sm text-warm-gray mt-1">
          Tracking will appear once the order is shipped
        </p>
      </div>
    )
  }

  if (!events || events.length === 0) {
    return (
      <div className="text-center py-8">
        <AlertCircle className="w-12 h-12 mx-auto text-amber-500 mb-3" />
        <p className="text-warm-gray">No tracking events yet</p>
        <p className="text-sm text-warm-gray mt-1">
          Tracking information will be updated by the logistics provider
        </p>
      </div>
    )
  }

  // Sort events by timestamp (newest first)
  const sortedEvents = [...events].sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  )

  // Find the most recent event (current status)
  const currentEventIndex = 0

  const formatEstimatedDelivery = (date?: Date | string) => {
    if (!date) return 'Not available'
    const d = new Date(date)
    return d.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered':
        return 'text-green-600'
      case 'in_transit':
      case 'out_for_delivery':
        return 'text-blue-600'
      case 'failed_delivery':
      case 'lost':
      case 'cancelled':
        return 'text-red-600'
      default:
        return 'text-amber-600'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header with tracking number */}
      <div className="bg-light-cream border border-barely-beige rounded-lg p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="text-sm font-medium text-warm-gray mb-1">
              Tracking Number
            </h3>
            <p className="font-mono text-sm text-soft-black">
              {shipment.tracking_number}
            </p>
          </div>
          
          <div className="text-right">
            <h3 className="text-sm font-medium text-warm-gray mb-1">
              Current Status
            </h3>
            <p className={`text-sm font-medium capitalize ${getStatusColor(shipment.status)}`}>
              {shipment.status.replace('_', ' ')}
            </p>
          </div>
        </div>

        {/* Estimated delivery */}
        {shipment.estimated_delivery && shipment.status !== 'delivered' && (
          <div className="mt-3 pt-3 border-t border-barely-beige">
            <p className="text-sm text-warm-gray">
              Estimated Delivery: <span className="text-soft-black font-medium">
                {formatEstimatedDelivery(shipment.estimated_delivery)}
              </span>
            </p>
          </div>
        )}

        {/* Current location */}
        {shipment.current_location && (
          <div className="mt-2">
            <p className="text-sm text-warm-gray">
              Current Location: <span className="text-soft-black">
                {shipment.current_location}
              </span>
            </p>
          </div>
        )}
      </div>

      {/* Timeline */}
      <div className="space-y-0">
        <h3 className="text-sm font-medium text-soft-black mb-4">
          Tracking History
        </h3>
        
        {sortedEvents.map((event, index) => (
          <TrackingEvent
            key={event.id}
            event={event}
            isLast={index === sortedEvents.length - 1}
            isCurrent={index === currentEventIndex}
          />
        ))}
      </div>

      {/* Delivery proof (if delivered) */}
      {shipment.status === 'delivered' && shipment.proof_of_delivery_hash && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-green-900 mb-2">
            ✓ Delivery Confirmed
          </h4>
          <p className="text-xs text-green-700 font-mono">
            Proof: {shipment.proof_of_delivery_hash}
          </p>
        </div>
      )}

      {/* Problem states */}
      {(shipment.status === 'failed_delivery' || 
        shipment.status === 'returning' || 
        shipment.status === 'returned') && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-red-900 mb-1">
            Delivery Issue
          </h4>
          <p className="text-sm text-red-700">
            {shipment.status === 'failed_delivery' && 
              'Delivery attempt failed. The carrier will retry or contact you.'}
            {shipment.status === 'returning' && 
              'Package is being returned to sender.'}
            {shipment.status === 'returned' && 
              'Package has been returned to sender.'}
          </p>
          <p className="text-xs text-red-600 mt-2">
            Please contact support if you need assistance.
          </p>
        </div>
      )}
    </div>
  )
}