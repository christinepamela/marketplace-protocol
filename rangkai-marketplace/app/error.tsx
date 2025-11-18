'use client'

import { useEffect } from 'react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Error:', error)
  }, [error])

  return (
    <div className="container-custom section-padding">
      <div className="max-w-2xl mx-auto text-center">
        <h2 className="text-3xl font-medium mb-4">Something went wrong</h2>
        <p className="text-warm-gray mb-6">
          {error.message || 'An unexpected error occurred'}
        </p>
        <button
          onClick={reset}
          className="btn btn-primary"
        >
          Try again
        </button>
      </div>
    </div>
  )
}