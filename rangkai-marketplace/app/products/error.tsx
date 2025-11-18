'use client'

import { useEffect } from 'react'
import Link from 'next/link'

export default function ProductsError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Products page error:', error)
  }, [error])

  return (
    <div className="container-custom section-padding">
      <div className="max-w-2xl mx-auto text-center">
        <div className="text-6xl mb-6">😕</div>
        <h2 className="text-3xl font-medium mb-4">Failed to Load Products</h2>
        <p className="text-warm-gray mb-6">
          {error.message === 'Failed to fetch products' 
            ? 'Could not connect to the product catalog. Make sure the API server is running.'
            : error.message || 'An unexpected error occurred'}
        </p>
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={reset}
            className="btn btn-primary"
          >
            Try Again
          </button>
          <Link href="/" className="btn btn-secondary">
            Go Home
          </Link>
        </div>
      </div>
    </div>
  )
}