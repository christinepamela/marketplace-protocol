'use client';

import { useEffect, useState } from 'react';
import { useProvider } from '@/lib/contexts/ProviderContext';
import { sdk } from '@/lib/sdk';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Package, Search, Filter, TruckIcon, MapPin, CheckCircle2 } from 'lucide-react';

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
  created_at: string;
  updated_at: string;
}

type StatusTab = 'all' | 'active' | 'in_transit' | 'delivered' | 'issues';

const statusColors: Record<ShipmentStatus, string> = {
  pending_pickup: 'bg-yellow-100 text-yellow-800',
  picked_up: 'bg-blue-100 text-blue-800',
  in_transit: 'bg-blue-100 text-blue-800',
  out_for_delivery: 'bg-purple-100 text-purple-800',
  delivered: 'bg-green-100 text-green-800',
  failed_delivery: 'bg-red-100 text-red-800',
  returning: 'bg-orange-100 text-orange-800',
  returned: 'bg-gray-100 text-gray-800',
  lost: 'bg-red-100 text-red-800',
  cancelled: 'bg-gray-100 text-gray-800'
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

export default function ShipmentsPage() {
  const { provider } = useProvider();
  const searchParams = useSearchParams();
  const showSuccess = searchParams.get('success') === 'created';
  
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<StatusTab>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [successMessage, setSuccessMessage] = useState(showSuccess);

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  useEffect(() => {
    if (provider?.id) {
      loadShipments();
    }
  }, [provider?.id, activeTab]);

  const loadShipments = async () => {
    if (!provider?.id) return;

    try {
      setLoading(true);
      setError(null);

      let statusFilter: ShipmentStatus | undefined;
      if (activeTab === 'in_transit') statusFilter = 'in_transit';
      else if (activeTab === 'delivered') statusFilter = 'delivered';

      const data = await sdk.logistics.getProviderShipments(
        provider.id,
        statusFilter
      );
      setShipments(data);
    } catch (err) {
      console.error('Error loading shipments:', err);
      setError('Failed to load shipments');
    } finally {
      setLoading(false);
    }
  };

  const filterShipments = (shipments: Shipment[]): Shipment[] => {
    let filtered = shipments;

    if (activeTab === 'active') {
      filtered = filtered.filter(s => 
        ['pending_pickup', 'picked_up', 'in_transit', 'out_for_delivery'].includes(s.status)
      );
    } else if (activeTab === 'in_transit') {
      filtered = filtered.filter(s => s.status === 'in_transit');
    } else if (activeTab === 'delivered') {
      filtered = filtered.filter(s => s.status === 'delivered');
    } else if (activeTab === 'issues') {
      filtered = filtered.filter(s => 
        ['failed_delivery', 'returning', 'returned', 'lost'].includes(s.status)
      );
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(s =>
        s.tracking_number.toLowerCase().includes(query) ||
        s.order_id.toLowerCase().includes(query)
      );
    }

    return filtered;
  };

  const getTabCount = (tab: StatusTab): number => {
    if (tab === 'all') return shipments.length;
    if (tab === 'active') {
      return shipments.filter(s => 
        ['pending_pickup', 'picked_up', 'in_transit', 'out_for_delivery'].includes(s.status)
      ).length;
    }
    if (tab === 'in_transit') {
      return shipments.filter(s => s.status === 'in_transit').length;
    }
    if (tab === 'delivered') {
      return shipments.filter(s => s.status === 'delivered').length;
    }
    if (tab === 'issues') {
      return shipments.filter(s => 
        ['failed_delivery', 'returning', 'returned', 'lost'].includes(s.status)
      ).length;
    }
    return 0;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const filteredShipments = filterShipments(shipments);

  if (!provider) {
    return (
      <div className="min-h-screen bg-warm-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-warm-gray">Please log in to view your shipments</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-warm-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-light text-soft-black mb-2">My Shipments</h1>
          <p className="text-warm-gray">Track and manage all your shipments</p>
        </div>

        {/* Success Message */}
        {successMessage && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
            <p className="text-green-800">Shipment created successfully!</p>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white border border-barely-beige rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-warm-gray mb-1">Active</p>
                <p className="text-2xl font-light text-soft-black">
                  {getTabCount('active')}
                </p>
              </div>
              <TruckIcon className="w-8 h-8 text-blue-500" />
            </div>
          </div>

          <div className="bg-white border border-barely-beige rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-warm-gray mb-1">In Transit</p>
                <p className="text-2xl font-light text-soft-black">
                  {getTabCount('in_transit')}
                </p>
              </div>
              <MapPin className="w-8 h-8 text-blue-500" />
            </div>
          </div>

          <div className="bg-white border border-barely-beige rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-warm-gray mb-1">Delivered</p>
                <p className="text-2xl font-light text-soft-black">
                  {getTabCount('delivered')}
                </p>
              </div>
              <Package className="w-8 h-8 text-green-500" />
            </div>
          </div>

          <div className="bg-white border border-barely-beige rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-warm-gray mb-1">Issues</p>
                <p className="text-2xl font-light text-soft-black">
                  {getTabCount('issues')}
                </p>
              </div>
              <Filter className="w-8 h-8 text-red-500" />
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="bg-white border border-barely-beige rounded-lg p-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-warm-gray w-5 h-5" />
            <input
              type="text"
              placeholder="Search by tracking number or order ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-barely-beige rounded-lg focus:outline-none focus:ring-2 focus:ring-warm-taupe focus:border-transparent"
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white border border-barely-beige rounded-lg mb-6">
          <div className="flex gap-2 p-2 overflow-x-auto">
            {[
              { key: 'all', label: 'All Shipments' },
              { key: 'active', label: 'Active' },
              { key: 'in_transit', label: 'In Transit' },
              { key: 'delivered', label: 'Delivered' },
              { key: 'issues', label: 'Issues' }
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as StatusTab)}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors whitespace-nowrap ${
                  activeTab === tab.key
                    ? 'bg-warm-taupe text-white'
                    : 'bg-light-cream text-warm-gray hover:bg-barely-beige'
                }`}
              >
                {tab.label}
                <span className="ml-2 py-0.5 px-2 rounded-full bg-white/20 text-xs">
                  {getTabCount(tab.key as StatusTab)}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Shipments List */}
        <div className="bg-white border border-barely-beige rounded-lg">
          {loading ? (
            <div className="p-12 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-warm-taupe"></div>
              <p className="mt-4 text-warm-gray">Loading shipments...</p>
            </div>
          ) : error ? (
            <div className="p-12 text-center">
              <p className="text-red-600 mb-4">{error}</p>
              <button
                onClick={loadShipments}
                className="px-4 py-2 bg-warm-taupe text-white rounded-lg hover:bg-soft-black transition-colors"
              >
                Try Again
              </button>
            </div>
          ) : filteredShipments.length === 0 ? (
            <div className="p-12 text-center">
              <Package className="w-16 h-16 text-warm-gray mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium text-soft-black mb-2">
                No shipments found
              </h3>
              <p className="text-warm-gray mb-6">
                {searchQuery
                  ? 'Try adjusting your search terms'
                  : activeTab === 'all'
                  ? "You haven't created any shipments yet"
                  : `No ${activeTab} shipments at the moment`}
              </p>
              {activeTab === 'all' && !searchQuery && (
                <Link
                  href="/quotes?status=accepted"
                  className="inline-block px-6 py-3 bg-warm-taupe text-white rounded-lg hover:bg-soft-black transition-colors"
                >
                  View Accepted Quotes
                </Link>
              )}
            </div>
          ) : (
            <div className="divide-y divide-barely-beige">
              {filteredShipments.map((shipment) => (
                <Link
                  key={shipment.id}
                  href={`/shipments/${shipment.id}`}
                  className="block p-6 hover:bg-light-cream transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-medium text-soft-black">
                          {shipment.tracking_number}
                        </h3>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[shipment.status]}`}>
                          {statusLabels[shipment.status]}
                        </span>
                      </div>

                      <div className="space-y-1 text-sm text-warm-gray">
                        <p>Order ID: {shipment.order_id.substring(0, 8)}...</p>
                        {shipment.current_location && (
                          <p className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {shipment.current_location}
                          </p>
                        )}
                      </div>

                      <div className="mt-3 flex items-center gap-4 text-xs text-warm-gray">
                        <span>Created: {formatDate(shipment.created_at)}</span>
                        <span>•</span>
                        <span>Est. Delivery: {formatDate(shipment.estimated_delivery)}</span>
                      </div>
                    </div>

                    <div className="ml-4">
                      <TruckIcon className="w-6 h-6 text-warm-gray" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}