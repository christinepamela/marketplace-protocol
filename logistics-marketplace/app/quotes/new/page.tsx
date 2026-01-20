'use client'

import { useState, useEffect } from 'react'
import { useProvider } from '@/lib/contexts/ProviderContext'
import { useRouter, useSearchParams } from 'next/navigation'
import { sdk } from '@/lib/sdk'
import { 
  Package, 
  MapPin, 
  DollarSign, 
  Truck,
  Clock,
  Shield,
  AlertCircle,
  CheckCircle2,
  ArrowLeft
} from 'lucide-react'

interface Opportunity {
  id: string
  order_id: string
  destination_country: string
  weight_kg: number
  dimensions: {
    length_cm: number
    width_cm: number
    height_cm: number
  }
  declared_value: number
  currency: string
  insurance_required: boolean
}

export default function SubmitQuotePage() {
  const { provider, loading: providerLoading } = useProvider()
  const router = useRouter()
  const searchParams = useSearchParams()
  const opportunityId = searchParams.get('opportunity')

  const [opportunity, setOpportunity] = useState<Opportunity | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const [formData, setFormData] = useState({
    method: 'standard' as 'standard' | 'express' | 'freight',
    price: '',
    days: '',
    insurance: false,
    validHours: '24',
    notes: ''
  })

  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (providerLoading) return
    
    if (!provider) {
      router.push('/register')
      return
    }

    if (!opportunityId) {
      router.push('/opportunities')
      return
    }

    loadOpportunity()
  }, [provider, providerLoading, opportunityId, router])

  async function loadOpportunity() {
    if (!opportunityId) return

    try {
      setLoading(true)
      setError(null)

      const opportunities = await sdk.logistics.getOpportunities()
      const opp = opportunities.find(o => o.id === opportunityId)

      if (!opp) {
        setError('Opportunity not found or no longer available')
        setTimeout(() => router.push('/opportunities'), 2000)
        return
      }

      setOpportunity(opp)
    } catch (err) {
      console.error('Failed to load opportunity:', err)
      setError('Failed to load opportunity details')
    } finally {
      setLoading(false)
    }
  }

  function handleChange(field: string, value: any) {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (formErrors[field]) {
      setFormErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
  }

  function validateForm(): boolean {
    const errors: Record<string, string> = {}

    const price = parseFloat(formData.price)
    if (!formData.price || isNaN(price) || price <= 0) {
      errors.price = 'Price must be greater than 0'
    }

    const days = parseInt(formData.days)
    if (!formData.days || isNaN(days) || days <= 0) {
      errors.days = 'Estimated days must be greater than 0'
    }

    const hours = parseInt(formData.validHours)
    if (!formData.validHours || isNaN(hours) || hours < 1) {
      errors.validHours = 'Valid hours must be at least 1'
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!validateForm() || !provider || !opportunity) return

    try {
      setSubmitting(true)
      setError(null)

      await sdk.logistics.submitQuote({
        order_id: opportunity.order_id,
        provider_id: provider.id,
        method: formData.method,
        price_fiat: parseFloat(formData.price),
        currency: 'USD',
        estimated_days: parseInt(formData.days),
        insurance_included: formData.insurance,
        valid_hours: parseInt(formData.validHours)
      })

      setSuccess(true)
      setTimeout(() => {
        router.push('/quotes?submitted=true')
      }, 1500)

    } catch (err: any) {
      console.error('Failed to submit quote:', err)
      setError(err.message || 'Failed to submit quote. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (providerLoading || loading) {
    return (
      <div className="min-h-screen bg-warm-white flex items-center justify-center">
        <div className="text-warm-gray">Loading...</div>
      </div>
    )
  }

  if (error && !opportunity) {
    return (
      <div className="min-h-screen bg-warm-white flex items-center justify-center">
        <div className="max-w-md w-full bg-white border border-barely-beige rounded-lg p-8 text-center">
          <AlertCircle className="w-16 h-16 mx-auto mb-4 text-red-600" />
          <h2 className="text-xl font-medium text-soft-black mb-2">
            Opportunity Not Available
          </h2>
          <p className="text-warm-gray mb-6">{error}</p>
          <button
            onClick={() => router.push('/opportunities')}
            className="bg-warm-taupe text-white px-6 py-2 rounded-lg hover:bg-soft-black transition-colors"
          >
            Back to Opportunities
          </button>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen bg-warm-white flex items-center justify-center">
        <div className="max-w-md w-full bg-white border border-barely-beige rounded-lg p-8 text-center">
          <CheckCircle2 className="w-16 h-16 mx-auto mb-4 text-green-600" />
          <h2 className="text-xl font-medium text-soft-black mb-2">
            Quote Submitted Successfully!
          </h2>
          <p className="text-warm-gray">
            Redirecting to your quotes...
          </p>
        </div>
      </div>
    )
  }

  if (!opportunity) return null

  return (
    <div className="min-h-screen bg-warm-white">
      <main className="max-w-4xl mx-auto p-8">
        <div className="mb-6">
          <button
            onClick={() => router.push('/opportunities')}
            className="flex items-center gap-2 text-warm-gray hover:text-soft-black mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Opportunities
          </button>
          <h1 className="text-3xl font-medium text-soft-black mb-2">
            Submit Quote
          </h1>
          <p className="text-warm-gray">
            Provide your shipping quote for this order
          </p>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <p className="text-red-800">{error}</p>
          </div>
        )}

        <div className="bg-white border border-barely-beige rounded-lg p-6 mb-6">
          <h2 className="text-lg font-medium text-soft-black mb-4 flex items-center gap-2">
            <Package className="w-5 h-5" />
            Order Summary
          </h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-warm-gray mb-1">Order Number</p>
              <p className="font-medium text-soft-black">
                #{opportunity.order_id.slice(0, 8)}
              </p>
            </div>

            <div>
              <p className="text-sm text-warm-gray mb-1 flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                Destination
              </p>
              <p className="font-medium text-soft-black">
                {opportunity.destination_country}
              </p>
            </div>

            <div>
              <p className="text-sm text-warm-gray mb-1">Weight</p>
              <p className="font-medium text-soft-black">
                {opportunity.weight_kg} kg
              </p>
            </div>

            <div>
              <p className="text-sm text-warm-gray mb-1">Dimensions</p>
              <p className="font-medium text-soft-black text-sm">
                {opportunity.dimensions.length_cm} × {opportunity.dimensions.width_cm} × {opportunity.dimensions.height_cm} cm
              </p>
            </div>

            <div>
              <p className="text-sm text-warm-gray mb-1 flex items-center gap-1">
                <DollarSign className="w-4 h-4" />
                Declared Value
              </p>
              <p className="font-medium text-soft-black">
                ${opportunity.declared_value} {opportunity.currency}
              </p>
            </div>

            <div>
              <p className="text-sm text-warm-gray mb-1 flex items-center gap-1">
                <Shield className="w-4 h-4" />
                Insurance
              </p>
              <p className={`font-medium ${opportunity.insurance_required ? 'text-green-600' : 'text-warm-gray'}`}>
                {opportunity.insurance_required ? 'Required' : 'Optional'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-barely-beige rounded-lg p-6">
          <h2 className="text-lg font-medium text-soft-black mb-6">
            Your Quote Details
          </h2>

          <div className="mb-6">
            <label className="block text-sm font-medium text-soft-black mb-2 flex items-center gap-2">
              <Truck className="w-4 h-4" />
              Shipping Method
            </label>
            <select
              value={formData.method}
              onChange={(e) => handleChange('method', e.target.value)}
              className="w-full px-4 py-3 border border-barely-beige rounded-lg focus:ring-2 focus:ring-warm-taupe focus:outline-none"
            >
              <option value="standard">Standard Shipping (5-7 days)</option>
              <option value="express">Express Shipping (2-3 days)</option>
              <option value="freight">Freight Shipping (10-14 days)</option>
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium text-soft-black mb-2 flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                Your Price (USD)
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.price}
                onChange={(e) => handleChange('price', e.target.value)}
                placeholder="0.00"
                className={`w-full px-4 py-3 border ${formErrors.price ? 'border-red-500' : 'border-barely-beige'} rounded-lg focus:ring-2 focus:ring-warm-taupe focus:outline-none`}
              />
              {formErrors.price && (
                <p className="text-red-600 text-sm mt-1">{formErrors.price}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-soft-black mb-2 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Estimated Delivery (days)
              </label>
              <input
                type="number"
                value={formData.days}
                onChange={(e) => handleChange('days', e.target.value)}
                placeholder="3"
                className={`w-full px-4 py-3 border ${formErrors.days ? 'border-red-500' : 'border-barely-beige'} rounded-lg focus:ring-2 focus:ring-warm-taupe focus:outline-none`}
              />
              {formErrors.days && (
                <p className="text-red-600 text-sm mt-1">{formErrors.days}</p>
              )}
            </div>
          </div>

          <div className="mb-6">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.insurance}
                onChange={(e) => handleChange('insurance', e.target.checked)}
                className="w-5 h-5 text-warm-taupe border-barely-beige rounded focus:ring-warm-taupe"
              />
              <div>
                <p className="font-medium text-soft-black flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  Include Insurance Coverage
                </p>
                <p className="text-sm text-warm-gray">
                  {opportunity.insurance_required 
                    ? 'Insurance is required for this shipment' 
                    : 'Optional insurance protection for the shipment'}
                </p>
              </div>
            </label>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-soft-black mb-2">
              Quote Valid For (hours)
            </label>
            <input
              type="number"
              value={formData.validHours}
              onChange={(e) => handleChange('validHours', e.target.value)}
              min="1"
              className={`w-full px-4 py-3 border ${formErrors.validHours ? 'border-red-500' : 'border-barely-beige'} rounded-lg focus:ring-2 focus:ring-warm-taupe focus:outline-none`}
            />
            {formErrors.validHours && (
              <p className="text-red-600 text-sm mt-1">{formErrors.validHours}</p>
            )}
            <p className="text-sm text-warm-gray mt-1">
              Your quote will expire after this many hours
            </p>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-soft-black mb-2">
              Additional Notes (Optional)
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              rows={4}
              placeholder="Any special handling, restrictions, or additional information..."
              className="w-full px-4 py-3 border border-barely-beige rounded-lg focus:ring-2 focus:ring-warm-taupe focus:outline-none resize-none"
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex-1 bg-warm-taupe text-white px-6 py-3 rounded-lg hover:bg-soft-black transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Submitting...' : 'Submit Quote'}
            </button>
            <button
              onClick={() => router.push('/opportunities')}
              className="px-6 py-3 border border-barely-beige text-warm-gray rounded-lg hover:bg-light-cream transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}