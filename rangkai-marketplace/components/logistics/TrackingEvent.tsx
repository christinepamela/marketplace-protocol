import React from 'react'
import { 
  Package, 
  Truck, 
  MapPin, 
  CheckCircle, 
  XCircle, 
  Clock,
  AlertCircle 
} from 'lucide-react'
import type { TrackingEvent as TrackingEventType, ShipmentStatus } from '@rangkai/sdk'

interface TrackingEventProps {
  event: TrackingEventType
  isLast?: boolean
  isCurrent?: boolean
}

export default function TrackingEvent({ event, isLast, isCurrent }: TrackingEventProps) {
  
  const getStatusIcon = (status: ShipmentStatus) => {
    switch (status) {
      case 'pending_pickup':
        return <Clock className="w-5 h-5" />
      case 'picked_up':
        return <Package className="w-5 h-5" />
      case 'in_transit':
        return <Truck className="w-5 h-5" />
      case 'out_for_delivery':
        return <MapPin className="w-5 h-5" />
      case 'delivered':
        return <CheckCircle className="w-5 h-5" />
      case 'failed_delivery':
      case 'returning':
      case 'returned':
        return <XCircle className="w-5 h-5" />
      case 'lost':
      case 'cancelled':
        return <AlertCircle className="w-5 h-5" />
      default:
        return <Package className="w-5 h-5" />
    }
  }

  const getStatusColor = (status: ShipmentStatus) => {
    switch (status) {
      case 'delivered':
        return 'text-green-600 bg-green-50 border-green-200'
      case 'in_transit':
      case 'out_for_delivery':
        return 'text-blue-600 bg-blue-50 border-blue-200'
      case 'pending_pickup':
      case 'picked_up':
        return 'text-amber-600 bg-amber-50 border-amber-200'
      case 'failed_delivery':
      case 'returning':
      case 'returned':
      case 'lost':
      case 'cancelled':
        return 'text-red-600 bg-red-50 border-red-200'
      default:
        return 'text-warm-gray bg-warm-white border-barely-beige'
    }
  }

  const getStatusLabel = (status: ShipmentStatus) => {
    return status
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  const formatDate = (date: Date | string) => {
    const d = new Date(date)
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const iconColorClass = isCurrent 
    ? getStatusColor(event.status).split(' ')[0] 
    : 'text-warm-gray'

  return (
    <div className="flex gap-4">
      {/* Timeline line and icon */}
      <div className="flex flex-col items-center">
        {/* Icon */}
        <div className={`
          flex items-center justify-center w-10 h-10 rounded-full border-2
          ${isCurrent ? getStatusColor(event.status) : 'bg-warm-white border-barely-beige text-warm-gray'}
        `}>
          {getStatusIcon(event.status)}
        </div>
        
        {/* Connecting line */}
        {!isLast && (
          <div className={`
            w-0.5 flex-1 min-h-[40px]
            ${isCurrent ? 'bg-warm-taupe' : 'bg-barely-beige'}
          `} />
        )}
      </div>

      {/* Event details */}
      <div className={`flex-1 pb-6 ${isLast ? 'pb-0' : ''}`}>
        <div className="flex items-start justify-between mb-1">
          <h4 className={`font-medium ${isCurrent ? 'text-soft-black' : 'text-warm-gray'}`}>
            {getStatusLabel(event.status)}
          </h4>
          <span className="text-sm text-warm-gray">
            {formatDate(event.timestamp)}
          </span>
        </div>

        {event.location && (
          <p className="text-sm text-warm-gray flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            {event.location}
          </p>
        )}

        {event.notes && (
          <p className="text-sm text-warm-gray mt-1 italic">
            {event.notes}
          </p>
        )}
      </div>
    </div>
  )
}