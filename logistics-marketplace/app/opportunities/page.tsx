'use client'

import { useState, useEffect, useCallback } from 'react'
import { useProvider } from '@/lib/contexts/ProviderContext'
import { useRouter } from 'next/navigation'
import { sdk } from '@/lib/sdk'
import {
  MapPin,
  Package,
  Shield,
  Users,
  AlertCircle,
  RefreshCw,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'

// ============================================================================
// TYPES — match the actual /opportunities API response shape (L6, S30)
// ============================================================================

interface QuoteRequest {
  id: string
  requester_did: string
  product_id: string | null
  origin_country: string
  destination_country: string | null  // null = global broadcast (L12)
  target_provider_id: string | null   // null = open broadcast, set = direct request (L15d)
  weight_kg: number
  dimensions_cm: {
    length: number
    width: number
    height: number
  } | null
  incoterm: string | null
  hs_code: string | null
  insurance_required: boolean
  status: string
  created_at: string
  expires_at: string | null
  product: {
    id: string
    basic: { name: string } | null
    logistics: any
    incoterm: string | null
  } | null
  // quotes_count is not in the API response — compute from a separate query or omit
}

// ============================================================================
// HELPERS
// ============================================================================

function formatRoute(origin: string, destination: string | null): string {
  if (!destination) return `${origin} → any destination`
  return `${origin} → ${destination}`
}

function formatDimensions(dims: { length: number; width: number; height: number } | null): string {
  if (!dims) return '—'
  return `${dims.length} × ${dims.width} × ${dims.height} cm`
}

function timeAgo(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime()
  const minutes = Math.floor(diff / 60_000)
  if (minutes < 2) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(diff / 3_600_000)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

// ============================================================================
// QUOTE MODAL — inline, no separate page needed
// ============================================================================

interface QuoteModalProps {
  opportunity: QuoteRequest
  providerId: string
  onClose: () => void
  onSubmitted: () => void
}

function QuoteModal({ opportunity, providerId, onClose, onSubmitted }: QuoteModalProps) {
  const [method, setMethod] = useState<'standard' | 'express' | 'freight'>('standard')
  const [priceFiat, setPriceFiat] = useState('')
  const [currency] = useState('USD')
  const [days, setDays] = useState('')
  const [insurance, setInsurance] = useState(false)
  const [validHours, setValidHours] = useState('48')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit() {
    if (!priceFiat || !days) {
      setError('Price and estimated days are required.')
      return
    }
    if (!opportunity.product_id) {
      setError('This opportunity has no product ID — cannot submit quote.')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      await sdk.logistics.submitQuote({
        provider_id: providerId,
        product_id: opportunity.product_id,
        order_id: undefined,
        method,
        price_fiat: parseFloat(priceFiat),
        currency,
        estimated_days: parseInt(days, 10),
        insurance_included: insurance,
        valid_hours: parseInt(validHours, 10),
      } as any)

      onSubmitted()
    } catch (err: any) {
      console.error('Quote submission failed:', err)
      setError(err?.message || 'Failed to submit quote. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const productName = opportunity.product?.basic?.name || opportunity.product_id?.slice(0, 8) || 'Unknown product'

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-lg border border-barely-beige p-6 w-full max-w-md mx-4">
        <h2 className="text-lg font-medium text-soft-black mb-1">Submit a quote</h2>
        <p className="text-sm text-warm-gray mb-4">
          {productName} · {formatRoute(opportunity.origin_country, opportunity.destination_country)}
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-soft-black mb-1">Shipping method</label>
            <select
              value={method}
              onChange={e => setMethod(e.target.value as any)}
              className="input w-full"
            >
              <option value="standard">Standard</option>
              <option value="express">Express</option>
              <option value="freight">Freight</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-soft-black mb-1">Price (USD) *</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={priceFiat}
                onChange={e => setPriceFiat(e.target.value)}
                className="input w-full"
                placeholder="25.00"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-soft-black mb-1">Est. days *</label>
              <input
                type="number"
                min="1"
                value={days}
                onChange={e => setDays(e.target.value)}
                className="input w-full"
                placeholder="5"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-soft-black mb-1">Quote valid for (hours)</label>
            <input
              type="number"
              min="1"
              value={validHours}
              onChange={e => setValidHours(e.target.value)}
              className="input w-full"
              placeholder="48"
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={insurance}
              onChange={e => setInsurance(e.target.checked)}
              className="w-4 h-4"
            />
            <span className="text-sm text-soft-black">Insurance included</span>
          </label>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            type="button"
            onClick={onClose}
            className="btn flex-1"
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="btn btn-primary flex-1"
          >
            {submitting ? 'Submitting…' : 'Submit quote'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// OPPORTUNITY CARD
// ============================================================================

interface OpportunityCardProps {
  opportunity: QuoteRequest
  providerId: string
  onQuoteSubmitted: () => void
}

function OpportunityCard({ opportunity, providerId, onQuoteSubmitted }: OpportunityCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [quoted, setQuoted] = useState(false)

  const productName = opportunity.product?.basic?.name || `Product ${opportunity.product_id?.slice(0, 8) || '—'}`
  const isGlobalBroadcast = !opportunity.destination_country

  return (
    <>
      <div className="bg-white border border-barely-beige p-5 hover:border-warm-taupe transition-colors">
        {/* Header row */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              {isGlobalBroadcast && (
                <span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200">
                  global broadcast
                </span>
              )}
              {opportunity.target_provider_id && (
                <span className="text-xs px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200">
                  direct request
                </span>
              )}
              <h3 className="text-base font-medium text-soft-black truncate">{productName}</h3>
            </div>
            <div className="flex items-center gap-1 text-warm-gray">
              <MapPin size={13} />
              <span className="text-sm">{formatRoute(opportunity.origin_country, opportunity.destination_country)}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-xs text-warm-gray">{timeAgo(opportunity.created_at)}</span>
            <button
              type="button"
              onClick={() => setExpanded(v => !v)}
              className="text-warm-gray hover:text-soft-black transition-colors"
              aria-label={expanded ? 'Collapse' : 'Expand'}
            >
              {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          </div>
        </div>

        {/* Summary row */}
        <div className="mt-3 flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-1 text-sm text-soft-black">
            <Package size={13} className="text-warm-gray" />
            <span>{opportunity.weight_kg} kg</span>
          </div>
          {opportunity.incoterm && (
            <span className="text-sm text-soft-black">{opportunity.incoterm}</span>
          )}
          {opportunity.insurance_required && (
            <div className="flex items-center gap-1 text-sm text-green-700">
              <Shield size={13} />
              <span>Insurance required</span>
            </div>
          )}
        </div>

        {/* Expanded detail */}
        {expanded && (
          <div className="mt-4 pt-4 border-t border-barely-beige space-y-2">
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
              <div className="text-warm-gray">Dimensions</div>
              <div className="text-soft-black">{formatDimensions(opportunity.dimensions_cm)}</div>

              {opportunity.hs_code && (
                <>
                  <div className="text-warm-gray">HS code</div>
                  <div className="text-soft-black font-mono text-xs">{opportunity.hs_code}</div>
                </>
              )}

              <div className="text-warm-gray">Request ID</div>
              <div className="text-soft-black font-mono text-xs">{opportunity.id.slice(0, 12)}…</div>

              {opportunity.expires_at && (
                <>
                  <div className="text-warm-gray">Expires</div>
                  <div className="text-soft-black">{new Date(opportunity.expires_at).toLocaleDateString()}</div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="mt-4 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setExpanded(v => !v)}
            className="text-sm text-warm-gray hover:text-soft-black transition-colors"
          >
            {expanded ? 'Show less' : 'Show details'}
          </button>
          <button
            type="button"
            onClick={() => !quoted && setShowModal(true)}
            disabled={quoted}
            className={`btn text-sm ${quoted ? 'opacity-50 cursor-not-allowed' : 'btn-primary'}`}
          >
            {quoted ? 'Quote submitted' : 'Submit quote'}
          </button>
        </div>
      </div>

      {showModal && (
        <QuoteModal
          opportunity={opportunity}
          providerId={providerId}
          onClose={() => setShowModal(false)}
          onSubmitted={() => {
            setShowModal(false)
            setQuoted(true)
            onQuoteSubmitted()
          }}
        />
      )}
    </>
  )
}

// ============================================================================
// MAIN PAGE
// ============================================================================

export default function OpportunitiesPage() {
  const { provider, loading: providerLoading } = useProvider()
  const router = useRouter()

  const [opportunities, setOpportunities] = useState<QuoteRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [regionFilter, setRegionFilter] = useState('')

  useEffect(() => {
    if (providerLoading) return
    if (!provider) {
      router.push('/auth/register')
      return
    }
    loadOpportunities()
  }, [provider, providerLoading, router])

  const loadOpportunities = useCallback(async () => {
    if (!provider) return
    try {
      setLoading(true)
      setError(null)
      const data = await sdk.logistics.getOpportunities()
      setOpportunities(data || [])
    } catch (err) {
      console.error('Failed to load opportunities:', err)
      setError('Failed to load opportunities. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [provider])

  function handleQuoteSubmitted() {
    setSuccessMessage('Quote submitted successfully. The requester will be notified.')
    setTimeout(() => setSuccessMessage(null), 5000)
    loadOpportunities()
  }

  if (providerLoading || !provider) {
    return (
      <div className="min-h-screen bg-warm-white flex items-center justify-center">
        <p className="text-warm-gray">Loading…</p>
      </div>
    )
  }

  // Client-side destination filter (weight filtering happens server-side)
  const filtered = regionFilter
    ? opportunities.filter(o =>
        o.destination_country?.toLowerCase() === regionFilter.toLowerCase() ||
        (!o.destination_country && regionFilter === '')
      )
    : opportunities

  const globalCount = opportunities.filter(o => !o.destination_country).length
  const destinationCountries = Array.from(
    new Set(opportunities.map(o => o.destination_country).filter(Boolean))
  ) as string[]

  return (
    <div className="min-h-screen bg-warm-white">
      <main className="max-w-4xl mx-auto p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-medium text-soft-black mb-1">Opportunities</h1>
            <p className="text-sm text-warm-gray">
              {loading ? 'Loading…' : `${opportunities.length} open request${opportunities.length !== 1 ? 's' : ''} matching your profile`}
              {globalCount > 0 && !loading && ` · ${globalCount} global broadcast${globalCount !== 1 ? 's' : ''}`}
            </p>
          </div>
          <button
            type="button"
            onClick={loadOpportunities}
            disabled={loading}
            className="btn text-sm flex items-center gap-1.5"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        {/* Success message */}
        {successMessage && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 text-sm text-green-800">
            {successMessage}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 flex items-center gap-2">
            <AlertCircle size={16} className="text-red-600 flex-shrink-0" />
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Destination filter — only show if there are multiple destinations */}
        {destinationCountries.length > 0 && (
          <div className="mb-4 flex items-center gap-3 flex-wrap">
            <span className="text-sm text-warm-gray">Filter by destination:</span>
            <button
              type="button"
              onClick={() => setRegionFilter('')}
              className={`text-sm px-3 py-1 border transition-colors ${regionFilter === '' ? 'border-soft-black text-soft-black' : 'border-barely-beige text-warm-gray hover:border-warm-taupe'}`}
            >
              All
            </button>
            {destinationCountries.map(country => (
              <button
                key={country}
                type="button"
                onClick={() => setRegionFilter(country)}
                className={`text-sm px-3 py-1 border transition-colors ${regionFilter === country ? 'border-soft-black text-soft-black' : 'border-barely-beige text-warm-gray hover:border-warm-taupe'}`}
              >
                {country}
              </button>
            ))}
          </div>
        )}

        {/* List */}
        {loading ? (
          <div className="text-center py-16 text-warm-gray">
            <Package size={40} className="mx-auto mb-3 opacity-30 animate-pulse" />
            <p className="text-sm">Loading opportunities…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 border border-barely-beige bg-white">
            <Users size={40} className="mx-auto mb-3 text-warm-gray opacity-30" />
            <p className="font-medium text-soft-black mb-1">
              {opportunities.length === 0 ? 'No opportunities yet' : 'No matches for this filter'}
            </p>
            <p className="text-sm text-warm-gray">
              {opportunities.length === 0
                ? 'Open requests matching your routes and Incoterms will appear here.'
                : 'Try a different destination filter.'}
            </p>
            {opportunities.length > 0 && (
              <button
                type="button"
                onClick={() => setRegionFilter('')}
                className="mt-3 text-sm text-warm-taupe hover:text-soft-black transition-colors"
              >
                Show all
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(opp => (
              <OpportunityCard
                key={opp.id}
                opportunity={opp}
                providerId={provider.id}
                onQuoteSubmitted={handleQuoteSubmitted}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}