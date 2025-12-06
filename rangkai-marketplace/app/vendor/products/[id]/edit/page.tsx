'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/lib/contexts/AuthContext'
import VendorSidebar from '@/components/vendor/VendorSidebar'
import ProductForm from '@/components/vendor/ProductForm'
import { sdk } from '@/lib/sdk'
import type { Product } from '@rangkai/sdk'
import { ArrowLeft, Loader2 } from 'lucide-react'
import Link from 'next/link'

export default function EditProductPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const productId = params.id as string

  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      router.push('/auth/register')
      return
    }

    loadProduct()
  }, [user, productId, router])

  async function loadProduct() {
    try {
      const data = await sdk.catalog.getById(productId)
      
      // Check if user owns this product
      if (data.vendorDid !== user?.did) {
        alert('You do not have permission to edit this product')
        router.push('/vendor/products')
        return
      }

      setProduct(data)
    } catch (error) {
      console.error('Failed to load product:', error)
      alert('Failed to load product')
      router.push('/vendor/products')
    } finally {
      setLoading(false)
    }
  }

  if (!user) {
    return null
  }

  return (
    <div className="flex min-h-screen bg-warm-white">
      <VendorSidebar />

      <main className="flex-1 p-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/vendor/products"
            className="inline-flex items-center gap-2 text-sm text-warm-gray hover:text-soft-black mb-4 transition-colors"
          >
            <ArrowLeft size={16} />
            Back to Products
          </Link>

          <h1 className="text-3xl font-medium text-soft-black mb-2">
            Edit Product
          </h1>
          <p className="text-warm-gray">
            Update your product listing
          </p>
        </div>

        {/* Loading or Form */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={32} className="animate-spin text-warm-gray" />
          </div>
        ) : product ? (
          <ProductForm mode="edit" product={product} />
        ) : (
          <div className="text-center py-20">
            <p className="text-warm-gray">Product not found</p>
          </div>
        )}
      </main>
    </div>
  )
}