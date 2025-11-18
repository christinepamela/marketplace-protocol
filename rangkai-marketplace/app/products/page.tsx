'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import type { SearchResults, SearchFilters } from '@rangkai/sdk'
import { searchProducts } from '@/lib/api/products'
import ProductGrid from '@/components/products/ProductGrid'
import SearchBar from '@/components/products/SearchBar'
import FilterSidebar from '@/components/products/FilterSidebar'
import { SlidersHorizontal, X } from 'lucide-react'

export default function ProductsPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  
  const [results, setResults] = useState<SearchResults | null>(null)
  const [loading, setLoading] = useState(true)
  const [showFilters, setShowFilters] = useState(false)
  const [query, setQuery] = useState(searchParams.get('q') || '')
  const [filters, setFilters] = useState<SearchFilters>({
    category: 'footwear' // Default to footwear for Phase 1
  })
  const [sortBy, setSortBy] = useState<'newest' | 'price_asc' | 'price_desc' | 'popular'>('newest')

  // Fetch products
  const fetchProducts = useCallback(async () => {
    setLoading(true)
    try {
      const data = await searchProducts(query, filters, { sortBy, limit: 20 })
      setResults(data)
    } catch (error) {
      console.error('Failed to fetch products:', error)
    } finally {
      setLoading(false)
    }
  }, [query, filters, sortBy])

  // Fetch on mount and when dependencies change
  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  // Handle search
  const handleSearch = useCallback((newQuery: string) => {
    setQuery(newQuery)
    // Update URL
    const params = new URLSearchParams(searchParams)
    if (newQuery) {
      params.set('q', newQuery)
    } else {
      params.delete('q')
    }
    router.push(`/products?${params.toString()}`)
  }, [searchParams, router])

  // Handle filter change
  const handleFilterChange = useCallback((newFilters: SearchFilters) => {
    setFilters({ ...newFilters, category: 'footwear' }) // Keep footwear category
  }, [])

  return (
    <div className="container-custom section-padding">
      {/* Header */}
      <div className="mb-8">
        <h1 className="mb-2">Footwear Collection</h1>
        <p className="text-lg text-warm-gray">
          Discover handcrafted shoes from artisans around the world
        </p>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <SearchBar
          defaultValue={query}
          onSearch={handleSearch}
          placeholder="Search for shoes, sandals, boots..."
        />
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          {/* Mobile filter toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="btn btn-secondary lg:hidden"
          >
            <SlidersHorizontal size={18} className="mr-2" />
            Filters
          </button>
          
          {/* Results count */}
          {results && (
            <p className="text-sm text-warm-gray">
              {results.total} products found
              {results.executionTime && (
                <span className="ml-2">
                  ({results.executionTime}ms)
                </span>
              )}
            </p>
          )}
        </div>

        {/* Sort dropdown */}
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as any)}
          className="input w-auto text-sm"
        >
          <option value="newest">Newest First</option>
          <option value="price_asc">Price: Low to High</option>
          <option value="price_desc">Price: High to Low</option>
          <option value="popular">Most Popular</option>
        </select>
      </div>

      {/* Main content */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Filters - Desktop */}
        <aside className="hidden lg:block">
          <FilterSidebar
            onFilterChange={handleFilterChange}
            initialFilters={filters}
          />
        </aside>

        {/* Filters - Mobile overlay */}
        {showFilters && (
          <div className="fixed inset-0 bg-soft-black bg-opacity-50 z-50 lg:hidden">
            <div className="absolute right-0 top-0 bottom-0 w-80 bg-warm-white overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-medium text-soft-black">Filters</h3>
                  <button
                    onClick={() => setShowFilters(false)}
                    className="text-warm-gray hover:text-soft-black"
                  >
                    <X size={24} />
                  </button>
                </div>
                <FilterSidebar
                  onFilterChange={handleFilterChange}
                  initialFilters={filters}
                />
              </div>
            </div>
          </div>
        )}

        {/* Product grid */}
        <div className="lg:col-span-3">
          <ProductGrid
            items={results?.items || []}
            loading={loading}
            emptyMessage="No footwear found. Try adjusting your filters."
          />

          {/* Pagination placeholder */}
          {results && results.total > 20 && (
            <div className="mt-12 text-center">
              <p className="text-sm text-warm-gray">
                Showing 1-20 of {results.total} products
              </p>
              <button className="btn btn-secondary mt-4">
                Load More
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}