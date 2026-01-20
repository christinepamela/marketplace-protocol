'use client'

import { useState, useEffect } from 'react'
import { useProvider } from '@/lib/contexts/ProviderContext'
import { useRouter, useSearchParams } from 'next/navigation'
import { sdk } from '@/lib/sdk'
import { 
  Package, 
  MapPin, 
  DollarSign, 
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  TrendingUp,
  ExternalLink
} from 'lucide-react'

interface ShippingQuote {
  id: string
  order_id: string
  provider_id: string
  method: string
  price_fiat: number
  currency: string
  estimated_days: number
  insurance_included: boolean
  status: 'pending' | 'accepted' | 'rejected' | 'expired'
  valid_until: string
  created_at: string
}

type TabType = 'all' | 'pending' | 'accepted' | 'rejected' | 'expired'

export default function MyQuotesPage() {
  const { provider, loading: providerLoading } = useProvider()
  const router = useRouter()
  const searchParams = useSearchParams()
  const showSuccess = searchParams.get('submitted') === 'true'

  const [quotes, setQuotes] = useState<ShippingQuote[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentTab, setCurrentTab] = useState<TabType>('all')
  const [successMessage, setSuccessMessage] = useState(showSuccess)

  const [counts, setCounts] = useState({
    all: 0,
    pending: 0,
    accepted: 0,
    rejected: 0,
    expired: 0
  })

  useEffect(() => {
    if (providerLoading) return
    
    if (!provider) {
      router.push('/register')
      return
    }

    loadQuotes()
  }, [provider, providerLoading, router, currentTab])

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(false), 5000)
      return () => clearTimeout(timer)
    }
  }, [successMessage])

  async function loadQuotes() {
    if (!provider) return

    try {
      setLoading(true)
      setError(null)

      const statusFilter = currentTab === 'all' ? undefined : currentTab
      const data = await sdk.logistics.getProviderQuotes(provider.id, statusFilter)

      setQuotes(data)
      
      if (currentTab === 'all') {
        setCounts({
          all: data.length,
          pending: data.filter(q => q.status === 'pending').length,
          accepted: data.filter(q => q.status === 'accepted').length,
          rejected: data.filter(q => q.status === 'rejected').length,
          expired: data.filter(q => q.status === 'expired').length
        })
      }

    } catch (err) {
      console.error('Failed to load quotes:', err)
      setError('Failed to load quotes. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  function getTimeRemaining(validUntil: string): string {
    const now = new Date()
    const expiry = new Date(validUntil)
    const diff = expiry.getTime() - now.getTime()

    if (diff <= 0) return 'Expired'

    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

    if (hours > 0) {
      return `${hours}h ${minutes}m remaining`
    }
    return `${minutes}m remaining`
  }

  function getStatusBadge(status: ShippingQuote['status']) {
    const configs = {
      pending: {
        bg: 'bg-yellow-100',
        text: 'text-yellow-800',
        icon: Clock,
        label: 'PENDING'
      },
      accepted: {
        bg: 'bg-green-100',
        text: 'text-green-800',
        icon: CheckCircle2,
        label: 'ACCEPTED'
      },
      rejected: {
        bg: 'bg-red-100',
        text: 'text-red-800',
        icon: XCircle,
        label: 'REJECTED'
      },
      expired: {
        bg: 'bg-gray-100',
        text: 'text-gray-800',
        icon: AlertCircle,
        label: 'EXPIRED'
      }
    }

    const config = configs[status]
    const Icon = config.icon

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text} flex items-center gap-1`}>
        <Icon className="w-3 h-3" />
        {config.label}
      </span>
    )
  }

  function getMethodLabel(method: string): string {
    const labels: Record<string, string> = {
      standard: 'Standard',
      express: 'Express',
      freight: 'Freight'
    }
    return labels[method] || method
  }

  if (providerLoading || !provider) {
    return (
      <div className="min-h-screen bg-warm-white flex items-center justify-center">
        <div className="text-warm-gray">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-warm-white">
      <main className="max-w-7xl mx-auto p-8">
        <div className="mb-6">
          <h1 className="text-3xl font-medium text-soft-black mb-2">
            My Quotes
          </h1>
          <p className="text-warm-gray">
            Track and manage your shipping quotes
          </p>
        </div>

        {successMessage && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
            <p className="text-green-800">Quote submitted successfully!</p>
          </div>
        )}

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <p className="text-red-800">{error}</p>
          </div>
        )}

        <div className="bg-white border border-barely-beige rounded-lg p-6 mb-6">
          <div className="flex items-center gap-2 mb-6 overflow-x-auto">
            <button
              onClick={() => setCurrentTab('all')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
                currentTab === 'all'
                  ? 'bg-warm-taupe text-white'
                  : 'bg-light-cream text-warm-gray hover:bg-barely-beige'
              }`}
            >
              All ({counts.all})
            </button>
            <button
              onClick={() => setCurrentTab('pending')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
                currentTab === 'pending'
                  ? 'bg-warm-taupe text-white'
                  : 'bg-light-cream text-warm-gray hover:bg-barely-beige'
              }`}
            >
              Pending ({counts.pending})
            </button>
            <button
              onClick={() => setCurrentTab('accepted')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
                currentTab === 'accepted'
                  ? 'bg-warm-taupe text-white'
                  : 'bg-light-cream text-warm-gray hover:bg-barely-beige'
              }`}
            >
              Accepted ({counts.accepted})
            </button>
            <button
              onClick={() => setCurrentTab('rejected')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
                currentTab === 'rejected'
                  ? 'bg-warm-taupe text-white'
                  : 'bg-light-cream text-warm-gray hover:bg-barely-beige'
              }`}
            >
              Rejected ({counts.rejected})
            </button>
            <button
              onClick={() => setCurrentTab('expired')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
                currentTab === 'expired'
                  ? 'bg-warm-taupe text-white'
                  : 'bg-light-cream text-warm-gray hover:bg-barely-beige'
              }`}
            >
              Expired ({counts.expired})
            </button>
          </div>

          {loading ? (
            <div className="text-center py-12 text-warm-gray">
              <Package className="w-16 h-16 mx-auto mb-4 opacity-50 animate-pulse" />
              <p>Loading quotes...</p>
            </div>
          ) : quotes.length === 0 ? (
            <div className="text-center py-12">
              <TrendingUp className="w-16 h-16 mx-auto mb-4 text-warm-gray opacity-50" />
              <h3 className="text-lg font-medium text-soft-black mb-2">
                No {currentTab !== 'all' ? currentTab : ''} quotes yet
              </h3>
              <p className="text-warm-gray mb-4">
                {currentTab === 'all' 
                  ? "You haven't submitted any quotes yet."
                  : `You don't have any ${currentTab} quotes.`}
              </p>
              <button
                onClick={() => router.push('/opportunities')}
                className="bg-warm-taupe text-white px-6 py-2 rounded-lg hover:bg-soft-black transition-colors"
              >
                Browse Opportunities
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {quotes.map((quote) => (
                <div
                  key={quote.id}
                  className="bg-white border border-barely-beige rounded-lg p-6 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-medium text-soft-black">
                          Order #{quote.order_id.slice(0, 8)}
                        </h3>
                        {getStatusBadge(quote.status)}
                      </div>
                      <p className="text-sm text-warm-gray">
                        Submitted {new Date(quote.created_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 pb-4 border-b border-barely-beige">
                    <div>
                      <p className="text-xs text-warm-gray mb-1">Your Quote</p>
                      <div className="flex items-center gap-1">
                        <DollarSign className="w-4 h-4 text-warm-taupe" />
                        <p className="font-medium text-soft-black">
                          {quote.price_fiat} {quote.currency}
                        </p>
                      </div>
                    </div>

                    <div>
                      <p className="text-xs text-warm-gray mb-1">Method</p>
                      <p className="font-medium text-soft-black">
                        {getMethodLabel(quote.method)}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-warm-gray mb-1">Delivery</p>
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4 text-warm-taupe" />
                        <p className="font-medium text-soft-black">
                          {quote.estimated_days} days
                        </p>
                      </div>
                    </div>

                    <div>
                      <p className="text-xs text-warm-gray mb-1">Insurance</p>
                      <p className="font-medium text-soft-black">
                        {quote.insurance_included ? 'Included' : 'Not included'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    {quote.status === 'pending' && (
                      <div className="flex items-center gap-2 text-amber-600">
                        <Clock className="w-4 h-4" />
                        <span className="text-sm font-medium">
                          {getTimeRemaining(quote.valid_until)}
                        </span>
                      </div>
                    )}
                    {quote.status === 'accepted' && (
                      <div className="flex items-center gap-2 text-green-600">
                        <CheckCircle2 className="w-4 h-4" />
                        <span className="text-sm font-medium">
                          Quote accepted by vendor
                        </span>
                      </div>
                    )}
                    {quote.status === 'rejected' && (
                      <div className="flex items-center gap-2 text-red-600">
                        <XCircle className="w-4 h-4" />
                        <span className="text-sm font-medium">
                          Quote not selected
                        </span>
                      </div>
                    )}
                    {quote.status === 'expired' && (
                      <div className="flex items-center gap-2 text-gray-600">
                        <AlertCircle className="w-4 h-4" />
                        <span className="text-sm font-medium">
                          Quote expired on {new Date(quote.valid_until).toLocaleDateString()}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      {quote.status === 'accepted' && (
                        <button
                          onClick={() => router.push(`/shipments?order=${quote.order_id}`)}
                          className="flex items-center gap-2 text-warm-taupe hover:text-soft-black text-sm font-medium"
                        >
                          View Shipment
                          <ExternalLink className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {!loading && quotes.length > 0 && (
          <div className="text-center">
            <button
              onClick={() => router.push('/opportunities')}
              className="border border-barely-beige text-warm-gray px-6 py-3 rounded-lg hover:bg-light-cream transition-colors"
            >
              Browse More Opportunities
            </button>
          </div>
        )}
      </main>
    </div>
  )
}