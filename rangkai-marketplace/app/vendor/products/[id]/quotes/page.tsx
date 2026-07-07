'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/lib/contexts/AuthContext'
import VendorSidebar from '@/components/vendor/VendorSidebar'
import { sdk } from '@/lib/sdk'
import type { Product } from '@rangkai/sdk'
import { ArrowLeft, Loader2, Star, Package, Clock, Shield, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'

interface QuoteWithProvider {
  id: string
  product_id: string
  provider_id: string
  method: string
  price_sats?: number
  price_fiat?: number
  currency: string
  estimated_days: number
  insurance_included: boolean
  status: 'pending' | 'accepted' | 'rejected' | 'expired'
  valid_until: string
  created_at: string
  provider: {
    business_name: string
    average_rating?: number
    total_deliveries: number
  }
}

export default function ProductQuotesPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const productId = params.id as string

  const [product, setProduct] = useState<Product | null>(null)
  const [quotes, setQuotes] = useState<QuoteWithProvider[]>([])
  const [loading, setLoading] = useState(true)
  const [acceptingId, setAcceptingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) {
      router.push('/auth/register')
      return
    }
    loadData()
  }, [user, productId, router])

  async function loadData() {
    if (!user) return

    try {
      const productData = await sdk.catalog.getById(productId)

      if (productData.vendorDid !== user.did) {
        alert('You do not have permission to view this product')
        router.push('/vendor/products')
        return
      }

      setProduct(productData)

      const quotesData = await sdk.logistics.getQuotesForProduct(productId)
      setQuotes(quotesData)
    } catch (err) {
      console.error('Failed to load quotes:', err)
      setError('Failed to load quotes. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function handleAccept(quoteId: string) {
    if (!confirm('Accept this quote? Other pending quotes for this product will be rejected.')) {
      return
    }

    setAcceptingId(quoteId)
    setError(null)

    try {
      await sdk.logistics.acceptQuote(quoteId)
      await loadData()
    } catch (err: any) {
      console.error('Failed to accept quote:', err)
      setError(err?.message || 'Failed to accept quote. Please try again.')
    } finally {
      setAcceptingId(null)
    }
  }

  function formatPrice(quote: QuoteWithProvider): string {
    if (quote.price_fiat) return `$${quote.price_fiat.toFixed(2)} ${quote.currency}`
    if (quote.price_sats) return `${quote.price_sats.toLocaleString()} sats`
    return 'Price not set'
  }

  const hasAcceptedQuote = quotes.some(q => q.status === 'accepted')
  const pendingQuotes = quotes.filter(q => q.status === 'pending')
  const acceptedQuote = quotes.find(q => q.status === 'accepted')

  if (!user) return null

  return (
    <div className="flex min-h-screen bg-warm-white">
      <VendorSidebar />

      <main className="flex-1 p-8">
        <div className="mb-8">
          <Link
            href={`/vendor/products/${productId}/edit`}
            className="inline-flex items-center gap-2 text-sm text-warm-gray hover:text-soft-black mb-4 transition-colors"
          >
            <ArrowLeft size={16} />
            Back to Edit Product
          </Link>

          <h1 className="text-3xl font-medium text-soft-black mb-2">
            Logistics Quotes
          </h1>
          {product && (
            <p className="text-warm-gray">
              For "{product.basic.name}"
            </p>
          )}
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded p-4 text-red-800 text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={32} className="animate-spin text-warm-gray" />
          </div>
        ) : quotes.length === 0 ? (
          <div className="bg-white border border-barely-beige rounded p-12 text-center">
            <Package size={64} className="mx-auto text-warm-gray mb-4 opacity-50" />
            <h3 className="text-xl font-medium mb-2">No quotes yet</h3>
            <p className="text-warm-gray">
              You've broadcast a request for logistics quotes on this product. Check back once providers respond, or come back here anytime — this page updates as new quotes arrive.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {acceptedQuote && (
              <div>
                <h2 className="text-lg font-medium text-soft-black mb-3 flex items-center gap-2">
                  <CheckCircle2 size={20} className="text-green-600" />
                  Accepted — buyers will see this as a shipping option
                </h2>
                <div className="bg-green-50 border border-green-200 rounded p-6">
                  <QuoteCard quote={acceptedQuote} formatPrice={formatPrice} />
                </div>
              </div>
            )}

            {pendingQuotes.length > 0 && (
              <div>
                <h2 className="text-lg font-medium text-soft-black mb-3">
                  {hasAcceptedQuote ? 'Other pending quotes' : `Pending quotes (${pendingQuotes.length})`}
                </h2>
                <div className="space-y-4">
                  {pendingQuotes.map(quote => (
                    <div key={quote.id} className="bg-white border border-barely-beige rounded p-6">
                      <QuoteCard quote={quote} formatPrice={formatPrice} />
                      {!hasAcceptedQuote && (
                        <button
                          onClick={() => handleAccept(quote.id)}
                          disabled={acceptingId === quote.id}
                          className="btn btn-primary mt-4 disabled:opacity-50"
                        >
                          {acceptingId === quote.id ? 'Accepting...' : 'Accept This Quote'}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}

function QuoteCard({
  quote,
  formatPrice
}: {
  quote: QuoteWithProvider
  formatPrice: (q: QuoteWithProvider) => string
}) {
  return (
    <div>
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-medium text-soft-black">{quote.provider.business_name}</h3>
          <div className="flex items-center gap-1 text-sm mt-1">
            <Star size={14} className="fill-amber-400 text-amber-400" />
            <span>{quote.provider.average_rating?.toFixed(1) || 'New'}</span>
            <span className="text-warm-gray">({quote.provider.total_deliveries} deliveries)</span>
          </div>
        </div>
        <p className="text-xl font-medium text-soft-black">{formatPrice(quote)}</p>
      </div>

      <div className="flex items-center gap-6 text-sm text-warm-gray">
        <div className="flex items-center gap-1">
          <Clock size={14} />
          <span>{quote.estimated_days} days · {quote.method}</span>
        </div>
        {quote.insurance_included && (
          <div className="flex items-center gap-1">
            <Shield size={14} />
            <span>Insurance included</span>
          </div>
        )}
        <span>Valid until {new Date(quote.valid_until).toLocaleDateString()}</span>
      </div>
    </div>
  )
}
