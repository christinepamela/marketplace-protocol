'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, AlertCircle, Truck, CheckCircle, Clock, RefreshCw, Search } from 'lucide-react'
import type { Cart } from '@/lib/stores/cart'
import type { ShippingAddress, PaymentMethod } from '@rangkai/sdk'
import { getCart, validateCart, clearCart, groupCartByVendor } from '@/lib/stores/cart'
import { createOrdersFromCart, validateShippingAddress } from '@/lib/api/cart'
import {
  broadcastBuyerQuoteRequest,
  getBuyerPendingQuoteRequests,
  acceptIncomingQuote,
  searchLogisticsProviders,
  getFavouriteProviders,
  directQuoteRequest,
  type BuyerQuoteRequest,
  type IncomingQuote,
} from '@/lib/api/logistics'
import { notifyCartUpdate } from '@/components/cart/CartButton'
import CartSummary from '@/components/cart/CartSummary'
import ProtectedRoute from '@/components/auth/ProtectedRoute'
import { sdk } from '@/lib/sdk'
import { getCurrentUserDid } from '@/lib/contexts/AuthContext'

// ============================================================================
// TYPES
// ============================================================================

// Per-vendor logistics state for L15c pool flow
interface VendorPoolState {
  // 'idle'       — KYC buyer, hasn't requested quotes yet
  // 'browsing'   — buyer is viewing provider list (L15d)
  // 'requesting' — broadcast or direct request in flight
  // 'waiting'    — request done, polling for provider responses
  // 'received'   — at least one quote came in, buyer must accept one
  // 'accepted'   — buyer accepted a quote, ready to submit order
  status: 'idle' | 'browsing' | 'requesting' | 'waiting' | 'received' | 'accepted'
  quoteRequestId: string | null
  incomingQuotes: IncomingQuote[]
  acceptedQuote: { quoteId: string; cost: number; currency: string; providerName: string } | null
  // L15d browse state
  browseProviders: any[]
  browseLoading: boolean
  favouriteProviderIds: Set<string>
}

// ============================================================================
// HELPERS
// ============================================================================

function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency || 'USD',
  }).format(amount)
}

// ============================================================================
// CHECKOUT PAGE
// ============================================================================

function CheckoutPageContent() {
  const router = useRouter()
  const [cart, setCart] = useState<Cart | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState<string[]>([])

  // D31: KYC status of the current buyer
  const [isKycBuyer, setIsKycBuyer] = useState<boolean | null>(null) // null = still loading

  // Form state
  const [shippingAddress, setShippingAddress] = useState<Partial<ShippingAddress>>({
    name: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    postalCode: '',
    country: '',
    phone: '',
  })
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('stripe')

  // Non-KYC buyers: single ownLogistics checkbox (existing behaviour)
  const [ownLogistics, setOwnLogistics] = useState(false)

  // L15c: per-vendor pool state (KYC buyers only)
  const [vendorPoolState, setVendorPoolState] = useState<Record<string, VendorPoolState>>({})
  const [pollingActive, setPollingActive] = useState(false)

  // -------------------------------------------------------------------------
  // INIT
  // -------------------------------------------------------------------------

  useEffect(() => {
    loadCart()
    loadBuyerKycStatus()
  }, [])

  function loadCart() {
    const currentCart = getCart()
    if (!currentCart || currentCart.items.length === 0) {
      router.push('/cart')
      return
    }
    setCart(currentCart)
    setLoading(false)
    const cartErrors = validateCart(currentCart)
    setErrors(cartErrors)
  }

  async function loadBuyerKycStatus() {
    try {
      const did = getCurrentUserDid()
      if (!did) {
        setIsKycBuyer(false)
        return
      }
      const identity = await sdk.identity.getByDid(did)
      setIsKycBuyer(identity.type === 'kyc')
    } catch {
      // If we can't determine KYC status, default to non-KYC behaviour —
      // safer to show the checkbox than to block checkout entirely.
      setIsKycBuyer(false)
    }
  }

  // Initialise per-vendor pool state once we know both cart and KYC status
  useEffect(() => {
    if (!cart || isKycBuyer === null) return
    if (!isKycBuyer) return // non-KYC buyers don't need per-vendor pool state

    const vendorGroups = groupCartByVendor(cart)
    const initial: Record<string, VendorPoolState> = {}
    Object.keys(vendorGroups).forEach(vendorDid => {
      initial[vendorDid] = {
        status: 'idle',
        quoteRequestId: null,
        incomingQuotes: [],
        acceptedQuote: null,
        browseProviders: [],
        browseLoading: false,
        favouriteProviderIds: new Set(),
      }
    })
    setVendorPoolState(initial)
  }, [cart, isKycBuyer])

  // -------------------------------------------------------------------------
  // L15c: POOL FLOW
  // -------------------------------------------------------------------------

  async function handleRequestPoolQuotes(vendorDid: string) {
    setErrors([])
    if (!cart || !shippingAddress.country) {
      setErrors(['Please enter your destination country before requesting shipping quotes.'])
      return
    }

    // Get unique product IDs for this vendor's cart items
    const vendorGroups = groupCartByVendor(cart)
    const items = vendorGroups[vendorDid] || []
    const uniqueProductIds = Array.from(new Set(items.map(i => i.productId)))

    setVendorPoolState(prev => ({
      ...prev,
      [vendorDid]: { ...prev[vendorDid], status: 'requesting' },
    }))

    try {
      // Broadcast one RFQ per unique product in this vendor's cart group.
      // For carts with multiple products from the same vendor, this sends
      // individual per-product RFQs. R23 (consolidated bulk quote) is the
      // future path — for now this matches what the pool already understands.
      const results = await Promise.all(
        uniqueProductIds.map(pid =>
          broadcastBuyerQuoteRequest(pid, shippingAddress.country!)
        )
      )

      // Store the first quote request ID (simplification: we track one per vendor group)
      const firstRequestId = results[0]?.id || null

      setVendorPoolState(prev => ({
        ...prev,
        [vendorDid]: {
          ...prev[vendorDid],
          status: 'waiting',
          quoteRequestId: firstRequestId,
          incomingQuotes: [],
        },
      }))

      // Start polling for responses
      setPollingActive(true)
    } catch (error) {
      console.error('Failed to broadcast quote request:', error)
      setErrors(['Failed to request shipping quotes. Please try again.'])
      setVendorPoolState(prev => ({
        ...prev,
        [vendorDid]: { ...prev[vendorDid], status: 'idle' },
      }))
    }
  }

  async function handleBrowseProviders(vendorDid: string) {
    if (!cart || !shippingAddress.country) {
      setErrors(['Please enter your destination country before browsing providers.'])
      return
    }

    // Switch to browsing state immediately so the panel opens
    setVendorPoolState(prev => ({
      ...prev,
      [vendorDid]: { ...prev[vendorDid], status: 'browsing', browseLoading: true },
    }))

    try {
      // Load providers and favourites in parallel
      const [providers, favourites] = await Promise.all([
        searchLogisticsProviders({}),
        getFavouriteProviders(),
      ])

      const favouriteIds = new Set(favourites.map((p: any) => p.id as string))

      // Favourites float to the top, rest sorted by rating
      const sorted = [...providers].sort((a, b) => {
        const aFav = favouriteIds.has(a.id) ? 1 : 0
        const bFav = favouriteIds.has(b.id) ? 1 : 0
        if (bFav !== aFav) return bFav - aFav
        return (b.average_rating ?? 0) - (a.average_rating ?? 0)
      })

      setVendorPoolState(prev => ({
        ...prev,
        [vendorDid]: {
          ...prev[vendorDid],
          browseLoading: false,
          browseProviders: sorted,
          favouriteProviderIds: favouriteIds,
        },
      }))
    } catch {
      setVendorPoolState(prev => ({
        ...prev,
        [vendorDid]: { ...prev[vendorDid], status: 'idle', browseLoading: false },
      }))
      setErrors(['Failed to load providers. Please try again.'])
    }
  }

  async function handleDirectRequest(vendorDid: string, providerId: string, providerName: string) {
    setErrors([])
    if (!cart || !shippingAddress.country) return

    const vendorGroups = groupCartByVendor(cart)
    const items = vendorGroups[vendorDid] || []
    const uniqueProductIds = Array.from(new Set(items.map(i => i.productId)))

    setVendorPoolState(prev => ({
      ...prev,
      [vendorDid]: { ...prev[vendorDid], status: 'requesting' },
    }))

    try {
      const results = await Promise.all(
        uniqueProductIds.map(pid =>
          directQuoteRequest(pid, shippingAddress.country!, providerId)
        )
      )

      const firstRequestId = results[0]?.id || null

      setVendorPoolState(prev => ({
        ...prev,
        [vendorDid]: {
          ...prev[vendorDid],
          status: 'waiting',
          quoteRequestId: firstRequestId,
          incomingQuotes: [],
        },
      }))

      setPollingActive(true)
    } catch {
      setErrors(['Failed to send quote request. Please try again.'])
      setVendorPoolState(prev => ({
        ...prev,
        [vendorDid]: { ...prev[vendorDid], status: 'browsing' },
      }))
    }
  }

  // Poll for incoming quotes (runs while pollingActive is true)
  const pollForQuotes = useCallback(async () => {
    if (!isKycBuyer) return

    try {
      const pendingRequests = await getBuyerPendingQuoteRequests()

      setVendorPoolState(prev => {
        const next = { ...prev }
        let anyUpdated = false

        // For each vendor currently in 'waiting' state, check if any of their
        // quote requests now have incoming provider quotes
        Object.keys(next).forEach(vendorDid => {
          const vs = next[vendorDid]
          if (vs.status !== 'waiting') return

          if (!cart) return
          const vendorGroups = groupCartByVendor(cart)
          const items = vendorGroups[vendorDid] || []
          const vendorProductIds = new Set(items.map(i => i.productId))

          // Collect all incoming quotes from requests that belong to this vendor's products
          const allIncoming: IncomingQuote[] = []
          pendingRequests.forEach(r => {
            if (vendorProductIds.has(r.product_id)) {
              allIncoming.push(...r.quotes)
            }
          })

          if (allIncoming.length > 0) {
            next[vendorDid] = { ...vs, status: 'received', incomingQuotes: allIncoming }
            anyUpdated = true
          }
        })

        // If no vendor is still 'waiting', stop polling
        const stillWaiting = Object.values(next).some(vs => vs.status === 'waiting')
        if (!stillWaiting) setPollingActive(false)

        return anyUpdated ? next : prev
      })
    } catch {
      // Silent — polling failures don't block checkout
    }
  }, [isKycBuyer, cart])

  useEffect(() => {
    if (!pollingActive) return
    // Poll immediately, then every 10 seconds
    pollForQuotes()
    const interval = setInterval(pollForQuotes, 10_000)
    return () => clearInterval(interval)
  }, [pollingActive, pollForQuotes])

  async function handleAcceptIncomingQuote(vendorDid: string, quote: IncomingQuote) {
    try {
      await acceptIncomingQuote(quote.id)
      setVendorPoolState(prev => ({
        ...prev,
        [vendorDid]: {
          ...prev[vendorDid],
          status: 'accepted',
          acceptedQuote: {
            quoteId: quote.id,
            cost: quote.price_fiat ?? 0,
            currency: quote.currency || 'USD',
            providerName: quote.provider?.business_name || 'Provider',
          },
        },
      }))
    } catch (error) {
      console.error('Failed to accept quote:', error)
      setErrors(['Failed to accept quote. Please try again.'])
    }
  }

  // -------------------------------------------------------------------------
  // FORM
  // -------------------------------------------------------------------------

  const handleFieldChange = (field: keyof ShippingAddress, value: string) => {
    setShippingAddress(prev => ({ ...prev, [field]: value }))
  }

  // Whether a KYC buyer has satisfied the logistics requirement for every vendor
  function kycLogisticsReady(): boolean {
    // Non-KYC: no pool requirement — checkbox alone is sufficient
    if (!isKycBuyer) return true
    // KYC buyer hasn't ticked "arrange own logistics" — no pool step needed,
    // seller's existing accepted quote (L14) covers shipping
    if (!ownLogistics) return true
    // KYC buyer ticked the checkbox — must accept a pool quote for every vendor
    return Object.values(vendorPoolState).every(vs => vs.status === 'accepted')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!cart) return

    const cartErrors = validateCart(cart)
    if (cartErrors.length > 0) { setErrors(cartErrors); return }

    const addressErrors = validateShippingAddress(shippingAddress)
    if (addressErrors.length > 0) { setErrors(addressErrors); return }

    // D31: KYC buyers must have accepted a quote for every vendor group
    if (isKycBuyer && !kycLogisticsReady()) {
      setErrors(['Please accept a shipping quote for each seller before placing your order.'])
      return
    }

    setSubmitting(true)
    setErrors([])

    try {
      // Build the per-vendor accepted quotes map for createOrdersFromCart
      const acceptedLogisticsQuotes: Record<string, { quoteId: string; cost: number }> = {}
      if (isKycBuyer) {
        Object.entries(vendorPoolState).forEach(([vendorDid, vs]) => {
          if (vs.acceptedQuote) {
            acceptedLogisticsQuotes[vendorDid] = {
              quoteId: vs.acceptedQuote.quoteId,
              cost: vs.acceptedQuote.cost,
            }
          }
        })
      }

      const orderResponses = await createOrdersFromCart(
        cart,
        shippingAddress as ShippingAddress,
        paymentMethod,
        ownLogistics,
        Object.keys(acceptedLogisticsQuotes).length > 0 ? acceptedLogisticsQuotes : undefined
      )

      clearCart()
      notifyCartUpdate()
      const orderIds = orderResponses.map(r => r.orderId).join(',')
      router.push(`/orders?success=true&orderIds=${orderIds}`)
    } catch (error) {
      console.error('Checkout failed:', error)
      setErrors(['Failed to create order. Please try again.'])
    } finally {
      setSubmitting(false)
    }
  }

  // -------------------------------------------------------------------------
  // RENDER HELPERS
  // -------------------------------------------------------------------------

  function renderVendorPoolUI(vendorDid: string, vendorName: string) {
    const vs = vendorPoolState[vendorDid]
    if (!vs) return null

    switch (vs.status) {
      case 'idle':
        return (
          <div className="mt-3 space-y-2">
            <p className="text-sm text-warm-gray mb-3">
              Choose how you'd like to arrange shipping for items from{' '}
              <span className="font-medium text-soft-black">{vendorName}</span>:
            </p>
            <button
              type="button"
              onClick={() => handleRequestPoolQuotes(vendorDid)}
              className="btn btn-secondary text-sm w-full text-left flex items-center gap-2"
              disabled={!shippingAddress.country}
            >
              <Truck size={14} className="flex-shrink-0" />
              <div>
                <p className="font-medium">Broadcast to all providers</p>
                <p className="text-xs text-warm-gray font-normal">Any matching provider can respond with a quote</p>
              </div>
            </button>
            <button
              type="button"
              onClick={() => handleBrowseProviders(vendorDid)}
              className="btn btn-secondary text-sm w-full text-left flex items-center gap-2"
              disabled={!shippingAddress.country}
            >
              <Search size={14} className="flex-shrink-0" />
              <div>
                <p className="font-medium">Browse and choose a provider</p>
                <p className="text-xs text-warm-gray font-normal">Find a specific provider and send them a direct request</p>
              </div>
            </button>
            {!shippingAddress.country && (
              <p className="text-xs text-warm-gray mt-1">
                Enter your destination country above first.
              </p>
            )}
          </div>
        )

      case 'browsing':
        return (
          <div className="mt-3">
            {vs.browseLoading ? (
              <div className="flex items-center gap-2 text-sm text-warm-gray p-3">
                <div className="animate-spin w-4 h-4 border-2 border-warm-taupe border-t-transparent rounded-full" />
                Loading providers…
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-soft-black">
                    {vs.browseProviders.length} provider{vs.browseProviders.length !== 1 ? 's' : ''} available
                  </p>
                  <button
                    type="button"
                    onClick={() =>
                      setVendorPoolState(prev => ({
                        ...prev,
                        [vendorDid]: { ...prev[vendorDid], status: 'idle' },
                      }))
                    }
                    className="text-xs text-warm-gray hover:text-soft-black transition-colors"
                  >
                    ← Back
                  </button>
                </div>
                {vs.browseProviders.length === 0 ? (
                  <p className="text-sm text-warm-gray p-3 bg-light-cream border border-barely-beige">
                    No providers found. Try broadcasting to the pool instead.
                  </p>
                ) : (
                  vs.browseProviders.map(provider => (
                    <div
                      key={provider.id}
                      className="flex items-center justify-between p-3 border border-barely-beige bg-white"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-soft-black truncate">
                            {provider.business_name}
                          </p>
                          {vs.favouriteProviderIds.has(provider.id) && (
                            <span className="text-xs bg-warm-taupe text-white px-1.5 py-0.5 rounded">
                              Saved
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-warm-gray mt-0.5">
                          {provider.average_rating
                            ? `★ ${provider.average_rating.toFixed(1)}`
                            : 'No rating yet'}
                          {Array.isArray(provider.modes) && provider.modes.length > 0
                            ? ` · ${provider.modes.join(', ')}`
                            : ''}
                          {Array.isArray(provider.incoterms_supported) && provider.incoterms_supported.length > 0
                            ? ` · ${provider.incoterms_supported.join(', ')}`
                            : ''}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDirectRequest(vendorDid, provider.id, provider.business_name)}
                        className="btn btn-primary text-xs px-3 py-1.5 ml-3 flex-shrink-0"
                      >
                        Request quote
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )

      case 'requesting':
        return (
          <div className="mt-3 flex items-center gap-2 text-sm text-warm-gray">
            <div className="animate-spin w-4 h-4 border-2 border-warm-taupe border-t-transparent rounded-full" />
            Broadcasting to logistics pool…
          </div>
        )

      case 'waiting':
        return (
          <div className="mt-3 p-3 bg-light-cream border border-barely-beige">
            <div className="flex items-center gap-2 text-sm text-warm-gray">
              <Clock size={14} className="flex-shrink-0" />
              <span>Waiting for logistics providers to respond…</span>
              <button
                type="button"
                onClick={pollForQuotes}
                className="ml-auto text-warm-taupe hover:text-soft-black transition-colors"
                title="Check for new quotes"
              >
                <RefreshCw size={14} />
              </button>
            </div>
            <p className="text-xs text-warm-gray mt-1">
              This page checks automatically every 10 seconds. You can also refresh manually.
            </p>
          </div>
        )

      case 'received':
        return (
          <div className="mt-3 space-y-2">
            <p className="text-sm font-medium text-soft-black">
              {vs.incomingQuotes.length} quote{vs.incomingQuotes.length !== 1 ? 's' : ''} received
              — accept one to continue:
            </p>
            {vs.incomingQuotes.map(q => (
              <div
                key={q.id}
                className="flex items-center justify-between p-3 border border-barely-beige bg-white"
              >
                <div>
                  <p className="text-sm font-medium text-soft-black">
                    {q.provider?.business_name || 'Provider'}
                  </p>
                  <p className="text-xs text-warm-gray">
                    {q.method} · {q.estimated_days} day{q.estimated_days !== 1 ? 's' : ''}
                    {q.insurance_included ? ' · insured' : ''}
                    {q.provider?.average_rating
                      ? ` · ★ ${q.provider.average_rating.toFixed(1)}`
                      : ''}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-soft-black">
                    {q.price_fiat != null
                      ? formatCurrency(q.price_fiat, q.currency || 'USD')
                      : 'Price TBD'}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleAcceptIncomingQuote(vendorDid, q)}
                    className="btn btn-primary text-xs px-3 py-1.5"
                  >
                    Accept
                  </button>
                </div>
              </div>
            ))}
          </div>
        )

      case 'accepted':
        return (
          <div className="mt-3 flex items-center gap-2 p-3 bg-green-50 border border-green-200">
            <CheckCircle size={16} className="text-green-600 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-green-800">
                Shipping confirmed — {vs.acceptedQuote!.providerName}
              </p>
              <p className="text-xs text-green-700">
                {formatCurrency(vs.acceptedQuote!.cost, vs.acceptedQuote!.currency)} ·
                included in your order total
              </p>
            </div>
          </div>
        )
    }
  }

  // -------------------------------------------------------------------------
  // MAIN RENDER
  // -------------------------------------------------------------------------

  if (loading || isKycBuyer === null) {
    return (
      <div className="container-custom section-padding">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="animate-spin w-12 h-12 border-4 border-barely-beige border-t-warm-taupe mx-auto mb-4" />
            <p className="text-warm-gray">Loading checkout…</p>
          </div>
        </div>
      </div>
    )
  }

  if (!cart) return null

  const vendorGroups = groupCartByVendor(cart)

  return (
    <div className="container-custom section-padding">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/cart"
          className="inline-flex items-center gap-2 text-warm-gray hover:text-soft-black transition-colors mb-4"
        >
          <ArrowLeft size={20} />
          <span>Back to Cart</span>
        </Link>
        <h1 className="text-2xl font-medium text-soft-black">Checkout</h1>
      </div>

      {/* Errors */}
      {errors.length > 0 && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200">
          <div className="flex items-start gap-2">
            <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-800 mb-2">
                Please fix the following:
              </p>
              <ul className="text-sm text-red-700 list-disc list-inside space-y-1">
                {errors.map((error, i) => (
                  <li key={i}>{error}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left column */}
          <div className="lg:col-span-2 space-y-6">

            {/* Shipping Address */}
            <div className="bg-white border border-barely-beige p-6">
              <h2 className="text-lg font-medium text-soft-black mb-4">Shipping Address</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-soft-black mb-1">Full Name *</label>
                  <input type="text" required value={shippingAddress.name}
                    onChange={e => handleFieldChange('name', e.target.value)}
                    className="input w-full" placeholder="John Doe" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-soft-black mb-1">Address Line 1 *</label>
                  <input type="text" required value={shippingAddress.addressLine1}
                    onChange={e => handleFieldChange('addressLine1', e.target.value)}
                    className="input w-full" placeholder="123 Main Street" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-soft-black mb-1">Address Line 2</label>
                  <input type="text" value={shippingAddress.addressLine2}
                    onChange={e => handleFieldChange('addressLine2', e.target.value)}
                    className="input w-full" placeholder="Apartment, suite, etc. (optional)" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-soft-black mb-1">City *</label>
                    <input type="text" required value={shippingAddress.city}
                      onChange={e => handleFieldChange('city', e.target.value)}
                      className="input w-full" placeholder="Kuala Lumpur" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-soft-black mb-1">State / Province</label>
                    <input type="text" value={shippingAddress.state}
                      onChange={e => handleFieldChange('state', e.target.value)}
                      className="input w-full" placeholder="Selangor" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-soft-black mb-1">Postal Code *</label>
                    <input type="text" required value={shippingAddress.postalCode}
                      onChange={e => handleFieldChange('postalCode', e.target.value)}
                      className="input w-full" placeholder="50000" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-soft-black mb-1">Country *</label>
                    <input type="text" required value={shippingAddress.country}
                      onChange={e => handleFieldChange('country', e.target.value)}
                      className="input w-full" placeholder="MY" />
                    <p className="text-xs text-warm-gray mt-1">Use 2-letter ISO code, e.g. MY, SG, US, GB</p>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-soft-black mb-1">Phone Number *</label>
                  <input type="tel" required value={shippingAddress.phone}
                    onChange={e => handleFieldChange('phone', e.target.value)}
                    className="input w-full" placeholder="+60 12 345 6789" />
                </div>
              </div>
            </div>

            {/* Payment Method */}
            <div className="bg-white border border-barely-beige p-6">
              <h2 className="text-lg font-medium text-soft-black mb-4">Payment Method</h2>
              <div className="space-y-3">
                {[
                  { value: 'stripe', label: 'Credit / Debit Card', sub: 'Pay with Stripe' },
                  { value: 'bitcoin_onchain', label: 'Bitcoin (On-chain)', sub: 'Pay with Bitcoin' },
                  { value: 'lightning', label: 'Lightning Network', sub: 'Instant Bitcoin payments' },
                ].map(opt => (
                  <label key={opt.value}
                    className="flex items-center gap-3 p-4 border border-barely-beige cursor-pointer hover:bg-light-cream transition-colors">
                    <input type="radio" name="paymentMethod" value={opt.value}
                      checked={paymentMethod === opt.value}
                      onChange={e => setPaymentMethod(e.target.value as PaymentMethod)}
                      className="w-4 h-4" />
                    <div>
                      <p className="font-medium text-soft-black">{opt.label}</p>
                      <p className="text-sm text-warm-gray">{opt.sub}</p>
                    </div>
                  </label>
                ))}
              </div>
              <p className="text-xs text-warm-gray mt-4">
                Actual payment will be processed on the next page after order creation.
              </p>
            </div>

            {/* Logistics — D31: checkbox first for everyone, KYC buyers get pool flow beneath */}
            <div className="bg-white border border-barely-beige p-6">
              <h2 className="text-lg font-medium text-soft-black mb-4">Logistics</h2>

              {/* Step 1: self-arrange tick — shown to all buyers */}
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={ownLogistics}
                  onChange={e => setOwnLogistics(e.target.checked)}
                  className="w-4 h-4 mt-0.5"
                />
                <div>
                  <p className="font-medium text-soft-black">I'll arrange my own logistics</p>
                  <p className="text-sm text-warm-gray">
                    Skip seller-arranged shipping. You take responsibility for arranging and
                    paying for delivery yourself.
                  </p>
                </div>
              </label>

              {/* Step 2: KYC buyers who tick must use the pool — pool flow appears below checkbox */}
              {isKycBuyer && ownLogistics && (
                <div className="mt-5 space-y-6">
                  <p className="text-sm text-warm-gray">
                    As a verified buyer, arranging your own logistics means requesting quotes
                    through Rangkai's logistics pool. Request quotes for each seller's items
                    below, then accept one before placing your order.
                  </p>
                  {Object.entries(vendorGroups).map(([vendorDid, items]) => {
                    const rawName = items[0]?.vendorName || 'Vendor'
                    const vendorLabel =
                      rawName === 'Vendor'
                        ? `Vendor (…${vendorDid.slice(-6)})`
                        : rawName
                    return (
                      <div key={vendorDid} className="border-t border-barely-beige pt-4 first:border-t-0 first:pt-0">
                        <p className="text-sm font-medium text-soft-black mb-1">{vendorLabel}</p>
                        <p className="text-xs text-warm-gray">
                          {items.length} item{items.length !== 1 ? 's' : ''}
                        </p>
                        {renderVendorPoolUI(vendorDid, vendorLabel)}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right column — Order Summary */}
          <div className="lg:col-span-1">
            <div className="sticky top-8">
              <CartSummary
                cart={cart}
                showVendorBreakdown={true}
                ownLogistics={ownLogistics}
              />

              <button
                type="submit"
                disabled={
                  submitting ||
                  errors.length > 0 ||
                  !kycLogisticsReady()
                }
                className="btn btn-primary w-full mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting
                  ? 'Creating Order…'
                  : !kycLogisticsReady()
                  ? 'Accept a shipping quote to continue'
                  : 'Place Order'}
              </button>

              <p className="text-xs text-warm-gray text-center mt-4">
                By placing your order, you agree to our terms and conditions.
              </p>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}

export default function CheckoutPage() {
  return (
    <ProtectedRoute>
      <CheckoutPageContent />
    </ProtectedRoute>
  )
}