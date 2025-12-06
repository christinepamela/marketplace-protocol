'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import VendorSidebar from '@/components/vendor/VendorSidebar'
import VendorProductCard from '@/components/vendor/VendorProductCard'
import { sdk } from '@/lib/sdk'
import type { Product } from '@rangkai/sdk'
import { Plus, Search, Loader2, Package } from 'lucide-react'
import Link from 'next/link'

export default function VendorProductsPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'draft' | 'inactive'>('all')

  useEffect(() => {
    if (!user) {
      router.push('/auth/register')
      return
    }

    loadProducts()
  }, [user, router])

  async function loadProducts() {
    if (!user) return

    try {
      const data = await sdk.catalog.getByVendor(user.did)
      setProducts(data)
    } catch (error) {
      console.error('Failed to load products:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(productId: string) {
    try {
      await sdk.catalog.delete(productId)
      setProducts(prev => prev.filter(p => p.id !== productId))
      alert('Product deleted successfully')
    } catch (error) {
      console.error('Failed to delete product:', error)
      alert('Failed to delete product')
    }
  }

  async function handleToggleStatus(productId: string, newStatus: 'active' | 'inactive') {
    try {
      await sdk.catalog.update(productId, { status: newStatus })
      setProducts(prev => 
        prev.map(p => p.id === productId ? { ...p, status: newStatus } : p)
      )
    } catch (error) {
      console.error('Failed to update product status:', error)
      alert('Failed to update product status')
    }
  }

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.basic.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === 'all' || product.status === statusFilter
    return matchesSearch && matchesStatus
  })

  if (!user) {
    return null
  }

  return (
    <div className="flex min-h-screen bg-warm-white">
      <VendorSidebar />

      <main className="flex-1 p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-medium text-soft-black mb-2">
              My Products
            </h1>
            <p className="text-warm-gray">
              Manage your product listings
            </p>
          </div>

          <Link
            href="/vendor/products/new"
            className="btn btn-primary"
          >
            <Plus size={20} className="mr-2" />
            Add Product
          </Link>
        </div>

        {/* Filters */}
        <div className="bg-white border border-barely-beige rounded p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-warm-gray" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search products..."
                className="input w-full pl-10"
              />
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="input w-full md:w-48"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="draft">Draft</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          <div className="mt-3 text-sm text-warm-gray">
            {filteredProducts.length} product(s) found
          </div>
        </div>

        {/* Products Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={32} className="animate-spin text-warm-gray" />
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-20">
            <Package size={64} className="mx-auto text-warm-gray mb-4 opacity-50" />
            <h3 className="text-xl font-medium mb-2">
              {searchQuery || statusFilter !== 'all'
                ? 'No products match your filters'
                : 'No products yet'
              }
            </h3>
            <p className="text-warm-gray mb-6">
              {searchQuery || statusFilter !== 'all'
                ? 'Try adjusting your search or filters'
                : 'Start by adding your first product'
              }
            </p>
            {!searchQuery && statusFilter === 'all' && (
              <Link
                href="/vendor/products/new"
                className="btn btn-primary inline-flex"
              >
                <Plus size={20} className="mr-2" />
                Add Your First Product
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProducts.map((product) => (
              <VendorProductCard
                key={product.id}
                product={product}
                onDelete={handleDelete}
                onToggleStatus={handleToggleStatus}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}