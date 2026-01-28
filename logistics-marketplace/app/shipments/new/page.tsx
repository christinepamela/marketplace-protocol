'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useProvider } from '@/lib/contexts/ProviderContext';
import { sdk } from '@/lib/sdk';
import Link from 'next/link';
import { ArrowLeft, Package, TruckIcon, Calendar, Hash } from 'lucide-react';

interface Quote {
  id: string;
  order_id: string;
  method: string;
  price_fiat: number;
  estimated_days: number;
  insurance_included: boolean;
  order?: {
    weight_kg: number;
    dimensions_cm: string;
    declared_value_fiat: number;
    destination_city: string;
    buyer_name?: string;
  };
}

export default function NewShipmentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { provider } = useProvider();
  
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    tracking_number: '',
    estimated_delivery: ''
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const quoteId = searchParams.get('quote');
    if (quoteId) {
      loadQuote(quoteId);
    } else {
      setError('No quote specified');
      setLoading(false);
    }
  }, [searchParams]);

  const loadQuote = async (quoteId: string) => {
    try {
      setLoading(true);
      
      if (!provider?.id) return;
      
      const quotes = await sdk.logistics.getProviderQuotes(provider.id, 'accepted');
      const foundQuote = quotes.find(q => q.id === quoteId);
      
      if (!foundQuote) {
        throw new Error('Quote not found or not accepted');
      }
      
      // ⭐ NEW: Fetch the actual order data
      const orderData = await sdk.orders.getOrder(foundQuote.order_id);
      
      // Attach order data to quote
      const quoteWithOrder = {
        ...foundQuote,
        order: {
          weight_kg: orderData.items[0]?.weight || 0, // Get from order items
          dimensions_cm: orderData.items[0]?.dimensions || 'N/A',
          declared_value_fiat: orderData.total.amount || 0,
          destination_city: orderData.shippingAddress.city,
          buyer_name: orderData.shippingAddress.name
        }
      };
      
      setQuote(quoteWithOrder as any);
      
      // Auto-calculate delivery
      if (foundQuote.estimated_days) {
        const deliveryDate = new Date();
        deliveryDate.setDate(deliveryDate.getDate() + foundQuote.estimated_days);
        setFormData(prev => ({
          ...prev,
          estimated_delivery: deliveryDate.toISOString().split('T')[0]
        }));
      }
    } catch (err) {
      console.error('Error loading quote:', err);
      setError('Failed to load quote details');
    } finally {
      setLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.tracking_number.trim()) {
      errors.tracking_number = 'Tracking number is required';
    } else if (formData.tracking_number.length < 5) {
      errors.tracking_number = 'Tracking number must be at least 5 characters';
    }

    if (!formData.estimated_delivery) {
      errors.estimated_delivery = 'Estimated delivery date is required';
    } else {
      const deliveryDate = new Date(formData.estimated_delivery);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (deliveryDate < today) {
        errors.estimated_delivery = 'Delivery date cannot be in the past';
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm() || !quote || !provider) return;

    try {
      setSubmitting(true);
      setError(null);

      console.log('Creating shipment with data:', {
        order_id: quote.order_id,
        quote_id: quote.id,
        tracking_number: formData.tracking_number.trim(),
        estimated_delivery: formData.estimated_delivery
      });

      // Convert date to ISO datetime
      const deliveryDate = new Date(formData.estimated_delivery);
      deliveryDate.setHours(23, 59, 59, 999); // End of day

      await sdk.logistics.createShipment({
        order_id: quote.order_id,
        quote_id: quote.id,
        tracking_number: formData.tracking_number.trim(),
        estimated_delivery: deliveryDate.toISOString()
      });


      // Success - redirect to shipments page
      router.push('/shipments?success=created');
    } catch (err: any) {
      console.error('Error creating shipment:', err);
      console.error('Error details:', {
        message: err.message,
        response: err.response,
        stack: err.stack
      });
      setError(err.message || 'Failed to create shipment');
      setSubmitting(false);
    }
  };

  const handleChange = (field: string, value: string) => {
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
          <p className="text-warm-gray">Please log in to create shipments</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-warm-white flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-warm-taupe"></div>
          <p className="mt-4 text-warm-gray">Loading quote details...</p>
        </div>
      </div>
    );
  }

  if (error && !quote) {
    return (
      <div className="min-h-screen bg-warm-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white border border-barely-beige rounded-lg p-8 text-center">
            <p className="text-red-600 mb-4">{error}</p>
            <Link
              href="/quotes?status=accepted"
              className="inline-block px-6 py-3 bg-warm-taupe text-white rounded-lg hover:bg-soft-black transition-colors"
            >
              Back to Quotes
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-warm-white">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/quotes?status=accepted"
            className="inline-flex items-center text-warm-taupe hover:text-soft-black mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Quotes
          </Link>
          <h1 className="text-3xl font-light text-soft-black mb-2">Create Shipment</h1>
          <p className="text-warm-gray">Set up tracking for this accepted quote</p>
        </div>

        {/* Quote Summary */}
        {quote && (
          <div className="bg-white border border-barely-beige rounded-lg p-6 mb-6">
            <h2 className="text-lg font-medium text-soft-black mb-4 flex items-center">
              <Package className="w-5 h-5 mr-2 text-warm-taupe" />
              Order Summary
            </h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-warm-gray">Order ID</p>
                <p className="font-medium text-soft-black">{quote.order_id.substring(0, 8)}...</p>
              </div>
              <div>
                <p className="text-warm-gray">Shipping Method</p>
                <p className="font-medium text-soft-black capitalize">{quote.method}</p>
              </div>
              {quote.order?.destination_city && (
                <div>
                  <p className="text-warm-gray">Destination</p>
                  <p className="font-medium text-soft-black">{quote.order.destination_city}</p>
                </div>
              )}
              <div>
                <p className="text-warm-gray">Quote Price</p>
                <p className="font-medium text-soft-black">RM {quote.price_fiat.toFixed(2)}</p>
              </div>
              {quote.order && (
                <>
                  <div>
                    <p className="text-warm-gray">Weight</p>
                    <p className="font-medium text-soft-black">{quote.order.weight_kg} kg</p>
                  </div>
                  <div>
                    <p className="text-warm-gray">Dimensions</p>
                    <p className="font-medium text-soft-black">{quote.order.dimensions_cm} cm </p>
                  </div>
                  {quote.order.buyer_name && (
                    <div>
                      <p className="text-warm-gray">Buyer</p>
                      <p className="font-medium text-soft-black">{quote.order.buyer_name}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-warm-gray">Declared Value</p>
                    <p className="font-medium text-soft-black">
                      RM {quote.order.declared_value_fiat?.toFixed(2)}
                    </p>
                  </div>
                </>
              )}
              <div>
                <p className="text-warm-gray">Insurance</p>
                <p className="font-medium text-soft-black">
                  {quote.insurance_included ? 'Included' : 'Not Included'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Shipment Form */}
        <div className="bg-white border border-barely-beige rounded-lg p-6">
          <h2 className="text-lg font-medium text-soft-black mb-6 flex items-center">
            <TruckIcon className="w-5 h-5 mr-2 text-warm-taupe" />
            Shipment Details
          </h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Tracking Number */}
            <div>
              <label className="block text-sm font-medium text-soft-black mb-2">
                <Hash className="w-4 h-4 inline mr-1" />
                Tracking Number *
              </label>
              <input
                type="text"
                value={formData.tracking_number}
                onChange={(e) => handleChange('tracking_number', e.target.value)}
                placeholder="Enter tracking number (e.g., TRK123456789)"
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-warm-taupe ${
                  formErrors.tracking_number ? 'border-red-500' : 'border-barely-beige'
                }`}
                disabled={submitting}
              />
              {formErrors.tracking_number && (
                <p className="mt-1 text-sm text-red-600">{formErrors.tracking_number}</p>
              )}
              <p className="mt-1 text-xs text-warm-gray">
                Unique identifier for tracking this shipment
              </p>
            </div>

            {/* Estimated Delivery */}
            <div>
              <label className="block text-sm font-medium text-soft-black mb-2">
                <Calendar className="w-4 h-4 inline mr-1" />
                Estimated Delivery Date *
              </label>
              <input
                type="date"
                value={formData.estimated_delivery}
                onChange={(e) => handleChange('estimated_delivery', e.target.value)}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-warm-taupe ${
                  formErrors.estimated_delivery ? 'border-red-500' : 'border-barely-beige'
                }`}
                disabled={submitting}
              />
              {formErrors.estimated_delivery && (
                <p className="mt-1 text-sm text-red-600">{formErrors.estimated_delivery}</p>
              )}
              <p className="mt-1 text-xs text-warm-gray">
                Based on your quote: approximately {quote?.estimated_days} days from now
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-4 pt-4 border-t border-barely-beige">
              <Link
                href="/quotes?status=accepted"
                className="px-6 py-2 border border-barely-beige text-warm-gray rounded-lg hover:bg-light-cream transition-colors"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2 bg-warm-taupe text-white rounded-lg hover:bg-soft-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Creating...' : 'Create Shipment'}
              </button>
            </div>
          </form>
        </div>

        {/* Info Box */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-blue-900 mb-2">Next Steps</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• After creating the shipment, you can update its status</li>
            <li>• Add location updates as the package moves</li>
            <li>• Mark as delivered when the package arrives</li>
            <li>• Upload proof of delivery for completed shipments</li>
          </ul>
        </div>
      </div>
    </div>
  );
}