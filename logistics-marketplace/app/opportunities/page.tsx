'use client'

import { useState, useEffect } from 'react'
import { useProvider } from '@/lib/contexts/ProviderContext'
import { useRouter } from 'next/navigation'
import { sdk } from '@/lib/sdk'
import { 
  MapPin, 
  Package, 
  DollarSign, 
  Shield,
  Star,
  Users,
  AlertCircle,
  Filter,
  Search
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
  vendor_rating?: number
  vendor_sales?: number
  quotes_count: number
  created_at: string
}

export default function OpportunitiesPage() {
  const { provider, loading: providerLoading } = useProvider()
  const router = useRouter()
  
  const [opportunities, setOpportunities] = useState<Opportunity[]>([])
  const [filteredOpportunities, setFilteredOpportunities] = useState<Opportunity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Filters
  const [filters, setFilters] = useState({
    service_region: '',
    min_weight_kg: 0,
    max_weight_kg: 100,
    sort: 'newest' as 'newest' | 'value' | 'destination'
  })
  
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    if (providerLoading) return
    
    if (!provider) {
      router.push('/register')
      return
    }

    loadOpportunities()
  }, [provider, providerLoading, router])

  useEffect(() => {
    applyFilters()
  }, [opportunities, filters])

  async function loadOpportunities() {
    if (!provider) return

    try {
      setLoading(true)
      setError(null)

      // Load opportunities from API
      const data = await sdk.logistics.getOpportunities({
        service_region: filters.service_region || undefined,
        min_weight_kg: filters.min_weight_kg || undefined,
        max_weight_kg: filters.max_weight_kg || undefined
      })

      setOpportunities(data)
    } catch (err) {
      console.error('Failed to load opportunities:', err)
      setError('Failed to load opportunities. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  function applyFilters() {
    let filtered = [...opportunities]

    // Apply weight filters
    if (filters.min_weight_kg > 0) {
      filtered = filtered.filter(o => o.weight_kg >= filters.min_weight_kg)
    }
    if (filters.max_weight_kg < 100) {
      filtered = filtered.filter(o => o.weight_kg <= filters.max_weight_kg)
    }

    // Apply region filter
    if (filters.service_region) {
      filtered = filtered.filter(o => 
        o.destination_country === filters.service_region
      )
    }

    // Apply sorting
    switch (filters.sort) {
      case 'newest':
        filtered.sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )
        break
      case 'value':
        filtered.sort((a, b) => b.declared_value - a.declared_value)
        break
      case 'destination':
        filtered.sort((a, b) => 
          a.destination_country.localeCompare(b.destination_country)
        )
        break
    }

    setFilteredOpportunities(filtered)
  }

  function handleFilterChange(key: string, value: any) {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  function resetFilters() {
    setFilters({
      service_region: '',
      min_weight_kg: 0,
      max_weight_kg: 100,
      sort: 'newest'
    })
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
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-medium text-soft-black mb-2">
            Available Opportunities
          </h1>
          <p className="text-warm-gray">
            Browse orders that need shipping quotes
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Filters Bar */}
        <div className="bg-white border border-barely-beige rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-soft-black flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Filters
            </h2>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="text-sm text-warm-taupe hover:text-soft-black"
            >
              {showFilters ? 'Hide' : 'Show'} Filters
            </button>
          </div>

          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Region Filter */}
              <div>
                <label className="block text-sm font-medium text-soft-black mb-2">
                  Destination Region
                </label>
                <select
                  value={filters.service_region}
                  onChange={(e) => handleFilterChange('service_region', e.target.value)}
                  className="w-full px-3 py-2 border border-barely-beige rounded-lg focus:ring-2 focus:ring-warm-taupe focus:outline-none"
                >
                  <option value="">All Regions</option>
                  {provider.service_regions.map(region => (
                    <option key={region} value={region}>{region}</option>
                  ))}
                </select>
              </div>

              {/* Weight Range */}
              <div>
                <label className="block text-sm font-medium text-soft-black mb-2">
                  Min Weight (kg)
                </label>
                <input
                  type="number"
                  value={filters.min_weight_kg}
                  onChange={(e) => handleFilterChange('min_weight_kg', Number(e.target.value))}
                  min="0"
                  className="w-full px-3 py-2 border border-barely-beige rounded-lg focus:ring-2 focus:ring-warm-taupe focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-soft-black mb-2">
                  Max Weight (kg)
                </label>
                <input
                  type="number"
                  value={filters.max_weight_kg}
                  onChange={(e) => handleFilterChange('max_weight_kg', Number(e.target.value))}
                  min="0"
                  className="w-full px-3 py-2 border border-barely-beige rounded-lg focus:ring-2 focus:ring-warm-taupe focus:outline-none"
                />
              </div>

              {/* Sort */}
              <div>
                <label className="block text-sm font-medium text-soft-black mb-2">
                  Sort By
                </label>
                <select
                  value={filters.sort}
                  onChange={(e) => handleFilterChange('sort', e.target.value)}
                  className="w-full px-3 py-2 border border-barely-beige rounded-lg focus:ring-2 focus:ring-warm-taupe focus:outline-none"
                >
                  <option value="newest">Newest First</option>
                  <option value="value">Highest Value</option>
                  <option value="destination">By Destination</option>
                </select>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between mt-4 pt-4 border-t border-barely-beige">
            <p className="text-sm text-warm-gray">
              Showing {filteredOpportunities.length} of {opportunities.length} opportunities
            </p>
            <button
              onClick={resetFilters}
              className="text-sm text-warm-taupe hover:text-soft-black"
            >
              Reset Filters
            </button>
          </div>
        </div>

        {/* Opportunities List */}
        {loading ? (
          <div className="text-center py-12 text-warm-gray">
            <Package className="w-16 h-16 mx-auto mb-4 opacity-50 animate-pulse" />
            <p>Loading opportunities...</p>
          </div>
        ) : filteredOpportunities.length === 0 ? (
          <div className="bg-white border border-barely-beige rounded-lg p-12 text-center">
            <Search className="w-16 h-16 mx-auto mb-4 text-warm-gray opacity-50" />
            <h3 className="text-lg font-medium text-soft-black mb-2">
              No Opportunities Found
            </h3>
            <p className="text-warm-gray mb-4">
              {opportunities.length === 0 
                ? "There are no shipping opportunities available at the moment."
                : "Try adjusting your filters to see more results."
              }
            </p>
            {opportunities.length > 0 && (
              <button
                onClick={resetFilters}
                className="text-warm-taupe hover:text-soft-black"
              >
                Reset Filters
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredOpportunities.map((opportunity) => (
              <div
                key={opportunity.id}
                className="bg-white border border-barely-beige rounded-lg p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium">
                        NEW
                      </span>
                      <h3 className="text-lg font-medium text-soft-black">
                        Order #{opportunity.id?.slice(0, 8) || 'N/A'}
                      </h3>
                    </div>
                    <div className="flex items-center gap-2 text-warm-gray">
                      <MapPin className="w-4 h-4" />
                      <span className="text-sm">
                        Destination: {opportunity.destination_country}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 pb-4 border-b border-barely-beige">
                  <div>
                    <p className="text-xs text-warm-gray mb-1">Weight</p>
                    <p className="font-medium text-soft-black">
                      {opportunity.weight_kg} kg
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-warm-gray mb-1">Dimensions</p>
                    <p className="font-medium text-soft-black text-sm">
                      {opportunity.dimensions.length_cm} × {opportunity.dimensions.width_cm} × {opportunity.dimensions.height_cm} cm
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-warm-gray mb-1">Declared Value</p>
                    <div className="flex items-center gap-1">
                      <DollarSign className="w-4 h-4 text-warm-taupe" />
                      <p className="font-medium text-soft-black">
                        {opportunity.declared_value} {opportunity.currency}
                      </p>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs text-warm-gray mb-1">Insurance</p>
                    <div className="flex items-center gap-1">
                      {opportunity.insurance_required ? (
                        <>
                          <Shield className="w-4 h-4 text-green-600" />
                          <p className="font-medium text-green-600">Required</p>
                        </>
                      ) : (
                        <>
                          <Shield className="w-4 h-4 text-warm-gray" />
                          <p className="font-medium text-warm-gray">Optional</p>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Vendor Info & Competition */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {/* Vendor Rating */}
                    {opportunity.vendor_rating && (
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-warm-gray">Vendor:</span>
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                          <span className="font-medium text-soft-black">
                            {opportunity.vendor_rating.toFixed(1)}
                          </span>
                          <span className="text-sm text-warm-gray">
                            ({opportunity.vendor_sales} sales)
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Competition */}
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-warm-taupe" />
                      <span className="text-sm text-warm-gray">
                        {opportunity.quotes_count} quote{opportunity.quotes_count !== 1 ? 's' : ''} submitted
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => router.push(`/quotes/new?opportunity=${opportunity.id}`)}
                      className="bg-warm-taupe text-white px-6 py-2 rounded-lg hover:bg-soft-black transition-colors font-medium"
                    >
                      Submit Quote
                    </button>
                    <button
                      className="border border-barely-beige text-warm-gray px-4 py-2 rounded-lg hover:bg-light-cream transition-colors"
                    >
                      Save for Later
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}