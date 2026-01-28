'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useProvider } from '@/lib/contexts/ProviderContext';
import { sdk } from '@/lib/sdk';
import Link from 'next/link';
import { ArrowLeft, MapPin, FileText, AlertCircle } from 'lucide-react';

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
  tracking_number: string;
  status: ShipmentStatus;
  order_id: string;
}

const statusOptions: { value: ShipmentStatus; label: string; description: string }[] = [
  { value: 'pending_pickup', label: 'Pending Pickup', description: 'Waiting to be collected' },
  { value: 'picked_up', label: 'Picked Up', description: 'Package collected from sender' },
  { value: 'in_transit', label: 'In Transit', description: 'Package is on the way' },
  { value: 'out_for_delivery', label: 'Out for Delivery', description: 'Package is out for final delivery' },
  { value: 'delivered', label: 'Delivered', description: 'Package successfully delivered' },
  { value: 'failed_delivery', label: 'Failed Delivery', description: 'Delivery attempt unsuccessful' },
  { value: 'returning', label: 'Returning', description: 'Package being returned to sender' },
  { value: 'returned', label: 'Returned', description: 'Package returned to sender' },
  { value: 'lost', label: 'Lost', description: 'Package cannot be located' },
  { value: 'cancelled', label: 'Cancelled', description: 'Shipment cancelled' }
];

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

export default function UpdateTrackingPage() {
  const params = useParams();
  const router = useRouter();
  const { provider } = useProvider();
  
  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    status: '' as ShipmentStatus,
    location: '',
    notes: ''
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (params.id && provider?.id) {
      loadShipment();
    }
  }, [params.id, provider?.id]);

  const loadShipment = async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await sdk.logistics.getShipment(params.id as string);
      setShipment(data);
      
      // Pre-select current status
      setFormData(prev => ({ 
        ...prev, 
        status: data.status,
        location: data.current_location || ''
      }));
    } catch (err) {
      console.error('Error loading shipment:', err);
      setError('Failed to load shipment details');
    } finally {
      setLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.status) {
      errors.status = 'Please select a status';
    }

    // Require location for certain statuses
    if (['in_transit', 'out_for_delivery', 'delivered'].includes(formData.status) && !formData.location.trim()) {
      errors.location = 'Location is required for this status';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm() || !shipment) return;

    try {
      setSubmitting(true);
      setError(null);

      // Update tracking
      await sdk.logistics.updateTracking(shipment.id, {
        status: formData.status,
        location: formData.location.trim() || undefined,
        notes: formData.notes.trim() || undefined
      });

      // Success - redirect to shipment details
      router.push(`/shipments/${shipment.id}?updated=true`);
    } catch (err: any) {
      console.error('Error updating tracking:', err);
      setError(err.message || 'Failed to update tracking');
      setSubmitting(false);
    }
  };

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (formErrors[field]) {
      setFormErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  if (!provider) {
    return (
      <div className="min-h-screen bg-warm-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-warm-gray">Please log in to update tracking</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-warm-white flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-warm-taupe"></div>
          <p className="mt-4 text-warm-gray">Loading shipment...</p>
        </div>
      </div>
    );
  }

  if (error && !shipment) {
    return (
      <div className="min-h-screen bg-warm-white">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white border border-barely-beige rounded-lg p-8 text-center">
            <p className="text-red-600 mb-4">{error}</p>
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

  const selectedStatus = statusOptions.find(opt => opt.value === formData.status);

  return (
    <div className="min-h-screen bg-warm-white">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href={`/shipments/${shipment?.id}`}
            className="inline-flex items-center text-warm-taupe hover:text-soft-black mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Shipment Details
          </Link>
          <h1 className="text-3xl font-light text-soft-black mb-2">Update Tracking</h1>
          <p className="text-warm-gray">
            Tracking: <span className="font-medium">{shipment?.tracking_number}</span>
          </p>
        </div>

        {/* Current Status */}
        {shipment && (
          <div className="bg-white border border-barely-beige rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <span className="text-sm text-warm-gray">Current Status:</span>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[shipment.status]}`}>
                {statusOptions.find(opt => opt.value === shipment.status)?.label}
              </span>
            </div>
          </div>
        )}

        {/* Update Form */}
        <div className="bg-white border border-barely-beige rounded-lg p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Status Selection */}
            <div>
              <label className="block text-sm font-medium text-soft-black mb-3">
                New Status *
              </label>
              <div className="grid grid-cols-1 gap-3">
                {statusOptions.map((option) => (
                  <label
                    key={option.value}
                    className={`relative flex items-start p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      formData.status === option.value
                        ? 'border-warm-taupe bg-light-cream'
                        : 'border-barely-beige hover:border-warm-gray'
                    }`}
                  >
                    <input
                      type="radio"
                      value={option.value}
                      checked={formData.status === option.value}
                      onChange={(e) => handleChange('status', e.target.value as ShipmentStatus)}
                      className="mt-1 h-4 w-4 text-warm-taupe focus:ring-warm-taupe"
                      disabled={submitting}
                    />
                    <div className="ml-3 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-soft-black">{option.label}</span>
                        <span className={`px-2 py-1 rounded text-xs ${statusColors[option.value]}`}>
                          {option.value}
                        </span>
                      </div>
                      <p className="text-sm text-warm-gray mt-1">{option.description}</p>
                    </div>
                  </label>
                ))}
              </div>
              {formErrors.status && (
                <p className="mt-2 text-sm text-red-600 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {formErrors.status}
                </p>
              )}
            </div>

            {/* Location */}
            <div>
              <label className="block text-sm font-medium text-soft-black mb-2">
                <MapPin className="w-4 h-4 inline mr-1" />
                Location {['in_transit', 'out_for_delivery', 'delivered'].includes(formData.status) && '*'}
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => handleChange('location', e.target.value)}
                placeholder="e.g., Singapore Hub, Kuala Lumpur Sorting Center"
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-warm-taupe ${
                  formErrors.location ? 'border-red-500' : 'border-barely-beige'
                }`}
                disabled={submitting}
              />
              {formErrors.location && (
                <p className="mt-1 text-sm text-red-600">{formErrors.location}</p>
              )}
              <p className="mt-1 text-xs text-warm-gray">
                Current location of the package
              </p>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-soft-black mb-2">
                <FileText className="w-4 h-4 inline mr-1" />
                Notes (Optional)
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
                placeholder="Add any additional information about this update..."
                rows={4}
                className="w-full px-4 py-2 border border-barely-beige rounded-lg focus:outline-none focus:ring-2 focus:ring-warm-taupe"
                disabled={submitting}
              />
              <p className="mt-1 text-xs text-warm-gray">
                Max 500 characters
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-800 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-2" />
                  {error}
                </p>
              </div>
            )}

            {/* Info Box */}
            {selectedStatus && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="text-sm font-medium text-blue-900 mb-1">
                  Status: {selectedStatus.label}
                </h3>
                <p className="text-sm text-blue-800">{selectedStatus.description}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-4 pt-4 border-t border-barely-beige">
              <Link
                href={`/shipments/${shipment?.id}`}
                className="px-6 py-2 border border-barely-beige text-warm-gray rounded-lg hover:bg-light-cream transition-colors"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2 bg-warm-taupe text-white rounded-lg hover:bg-soft-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {submitting ? 'Updating...' : 'Update Tracking'}
              </button>
            </div>
          </form>
        </div>

        {/* Note about Proof of Delivery */}
        {formData.status === 'delivered' && (
          <div className="mt-6 bg-amber-50 border border-amber-200 rounded-lg p-4">
            <h3 className="text-sm font-medium text-amber-900 mb-2">
              📝 Note: Proof of Delivery
            </h3>
            <p className="text-sm text-amber-800">
              The backend supports proof of delivery via the separate <code>addProofOfDelivery()</code> method. 
              File upload functionality can be added in a future enhancement.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}