'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useProvider } from '@/lib/contexts/ProviderContext';
import { sdk } from '@/lib/sdk';
import Link from 'next/link';
import { ArrowLeft, Package, MapPin, Clock, FileText, CheckCircle, Edit, CheckCircle2 } from 'lucide-react';

type ShipmentStatus = 
  | 'pending_pickup'
  | 'picked_up'
  | 'in_transit'
  | 'out_for_delivery'
  | 'delivered'
  | 'failed_delivery'
  | 'returning'
  | 'returned'
  | 'lost'
  | 'cancelled';

interface Shipment {
  id: string;
  order_id: string;
  quote_id: string;
  tracking_number: string;
  status: ShipmentStatus;
  estimated_delivery: string;
  current_location?: string;
  proof_of_delivery_hash?: string;
  created_at: string;
  updated_at: string;
}

interface TrackingEvent {
  id: string;
  shipment_id: string;
  status: ShipmentStatus;
  location?: string;
  notes?: string;
  timestamp: string;
  created_at: string;
}

const statusColors: Record<ShipmentStatus, string> = {
  pending_pickup: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  picked_up: 'bg-blue-100 text-blue-800 border-blue-200',
  in_transit: 'bg-blue-100 text-blue-800 border-blue-200',
  out_for_delivery: 'bg-purple-100 text-purple-800 border-purple-200',
  delivered: 'bg-green-100 text-green-800 border-green-200',
  failed_delivery: 'bg-red-100 text-red-800 border-red-200',
  returning: 'bg-orange-100 text-orange-800 border-orange-200',
  returned: 'bg-gray-100 text-gray-800 border-gray-200',
  lost: 'bg-red-100 text-red-800 border-red-200',
  cancelled: 'bg-gray-100 text-gray-800 border-gray-200'
};

const statusLabels: Record<ShipmentStatus, string> = {
  pending_pickup: 'Pending Pickup',
  picked_up: 'Picked Up',
  in_transit: 'In Transit',
  out_for_delivery: 'Out for Delivery',
  delivered: 'Delivered',
  failed_delivery: 'Failed Delivery',
  returning: 'Returning',
  returned: 'Returned',
  lost: 'Lost',
  cancelled: 'Cancelled'
};

const statusIcons: Record<ShipmentStatus, string> = {
  pending_pickup: '⏳',
  picked_up: '📦',
  in_transit: '🚚',
  out_for_delivery: '🚛',
  delivered: '✅',
  failed_delivery: '❌',
  returning: '↩️',
  returned: '📮',
  lost: '❓',
  cancelled: '🚫'
};

export default function ShipmentDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { provider } = useProvider();
  const showUpdated = searchParams.get('updated') === 'true';
  
  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [events, setEvents] = useState<TrackingEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState(showUpdated);

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  useEffect(() => {
    if (params.id && provider?.id) {
      loadShipmentDetails();
    }
  }, [params.id, provider?.id]);

  const loadShipmentDetails = async () => {
    try {
      setLoading(true);
      setError(null);

      const shipmentData = await sdk.logistics.getShipment(params.id as string);
      setShipment(shipmentData);

      const eventsData = await sdk.logistics.getTrackingHistory(params.id as string);
      // Sort by timestamp descending (newest first)
      setEvents(eventsData.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      ));
    } catch (err) {
      console.error('Error loading shipment:', err);
      setError('Failed to load shipment details');
    } finally {
      setLoading(false);
    }
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (!provider) {
    return (
      <div className="min-h-screen bg-warm-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-warm-gray">Please log in to view shipment details</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-warm-white flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-warm-taupe"></div>
          <p className="mt-4 text-warm-gray">Loading shipment details...</p>
        </div>
      </div>
    );
  }

  if (error || !shipment) {
    return (
      <div className="min-h-screen bg-warm-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white border border-barely-beige rounded-lg p-8 text-center">
            <p className="text-red-600 mb-4">{error || 'Shipment not found'}</p>
            <Link
              href="/shipments"
              className="inline-block px-6 py-3 bg-warm-taupe text-white rounded-lg hover:bg-soft-black transition-colors"
            >
              Back to Shipments
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const canUpdate = !['delivered', 'cancelled', 'returned', 'lost'].includes(shipment.status);

  return (
    <div className="min-h-screen bg-warm-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/shipments"
            className="inline-flex items-center text-warm-taupe hover:text-soft-black mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Shipments
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-light text-soft-black mb-2">
                {shipment.tracking_number}
              </h1>
              <p className="text-warm-gray">Shipment Details & Tracking</p>
            </div>
            {canUpdate && (
              <Link
                href={`/shipments/${shipment.id}/update`}
                className="inline-flex items-center px-4 py-2 bg-warm-taupe text-white rounded-lg hover:bg-soft-black transition-colors"
              >
                <Edit className="w-4 h-4 mr-2" />
                Update Tracking
              </Link>
            )}
          </div>
        </div>

        {/* Success Message */}
        {successMessage && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
            <p className="text-green-800">Tracking updated successfully!</p>
          </div>
        )}

        {/* Current Status */}
        <div className="bg-white border border-barely-beige rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-medium text-soft-black">Current Status</h2>
            <span className={`px-4 py-2 rounded-full text-sm font-medium border ${statusColors[shipment.status]}`}>
              {statusIcons[shipment.status]} {statusLabels[shipment.status]}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-warm-gray mb-1">Order ID</p>
              <p className="font-medium text-soft-black">{shipment.order_id.substring(0, 8)}...</p>
            </div>
            {shipment.current_location && (
              <div>
                <p className="text-warm-gray mb-1">Current Location</p>
                <p className="font-medium text-soft-black flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  {shipment.current_location}
                </p>
              </div>
            )}
            <div>
              <p className="text-warm-gray mb-1">Created</p>
              <p className="font-medium text-soft-black">{formatDate(shipment.created_at)}</p>
            </div>
            <div>
              <p className="text-warm-gray mb-1">Estimated Delivery</p>
              <p className="font-medium text-soft-black">{formatDate(shipment.estimated_delivery)}</p>
            </div>
            {shipment.proof_of_delivery_hash && (
              <div>
                <p className="text-warm-gray mb-1">Proof of Delivery</p>
                <p className="font-medium text-soft-black flex items-center">
                  <CheckCircle className="w-4 h-4 mr-1 text-green-600" />
                  Verified
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Tracking Timeline */}
        <div className="bg-white border border-barely-beige rounded-lg p-6">
          <h2 className="text-lg font-medium text-soft-black mb-6 flex items-center">
            <Clock className="w-5 h-5 mr-2 text-warm-taupe" />
            Tracking History
          </h2>

          {events.length === 0 ? (
            <div className="text-center py-8 text-warm-gray">
              <MapPin className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No tracking events yet</p>
              {canUpdate && (
                <Link
                  href={`/shipments/${shipment.id}/update`}
                  className="inline-block mt-4 px-6 py-2 bg-warm-taupe text-white rounded-lg hover:bg-soft-black transition-colors"
                >
                  Add First Update
                </Link>
              )}
            </div>
          ) : (
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-barely-beige" />

              {/* Events */}
              <div className="space-y-6">
                {events.map((event, index) => (
                  <div key={event.id} className="relative pl-10">
                    {/* Timeline dot */}
                    <div className={`absolute left-0 w-8 h-8 rounded-full border-4 border-white ${
                      index === 0 ? 'bg-warm-taupe' : 'bg-gray-300'
                    } flex items-center justify-center text-white text-xs font-bold`}>
                      {statusIcons[event.status]}
                    </div>

                    {/* Event content */}
                    <div className="bg-light-cream rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${statusColors[event.status]}`}>
                            {statusLabels[event.status]}
                          </span>
                        </div>
                        <span className="text-xs text-warm-gray">
                          {formatDateTime(event.timestamp)}
                        </span>
                      </div>

                      {event.location && (
                        <div className="flex items-center text-sm text-soft-black mt-2">
                          <MapPin className="w-4 h-4 mr-2 text-warm-gray" />
                          {event.location}
                        </div>
                      )}

                      {event.notes && (
                        <div className="flex items-start text-sm text-warm-gray mt-2">
                          <FileText className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                          <p>{event.notes}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        {canUpdate && (
          <div className="mt-6 flex items-center justify-end gap-4">
            <Link
              href="/shipments"
              className="px-6 py-2 border border-barely-beige text-warm-gray rounded-lg hover:bg-light-cream transition-colors"
            >
              Back to List
            </Link>
            <Link
              href={`/shipments/${shipment.id}/update`}
              className="px-6 py-2 bg-warm-taupe text-white rounded-lg hover:bg-soft-black transition-colors"
            >
              Update Tracking
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}