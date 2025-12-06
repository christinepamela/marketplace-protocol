'use client'

import { useAuth } from '@/lib/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import VendorSidebar from '@/components/vendor/VendorSidebar'
import ProductForm from '@/components/vendor/ProductForm'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function NewProductPage() {
  const { user } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!user) {
      router.push('/auth/register')
    }
  }, [user, router])

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
            Add New Product
          </h1>
          <p className="text-warm-gray">
            Create a new product listing for your store
          </p>
        </div>

        {/* Form */}
        <ProductForm mode="create" />
      </main>
    </div>
  )
}