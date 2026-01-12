'use client'

import { useEffect } from 'react'
import { useProvider } from '@/lib/contexts/ProviderContext'
import { useRouter } from 'next/navigation'
import { Package } from 'lucide-react'

export default function Home() {
  const { provider, loading } = useProvider()
  const router = useRouter()

  useEffect(() => {
    if (!loading) {
      if (provider) {
        router.push('/dashboard')
      } else {
        router.push('/auth/register')
      }
    }
  }, [provider, loading, router])

  return (
    <div className="min-h-screen bg-warm-white flex items-center justify-center">
      <div className="text-center">
        <Package className="w-16 h-16 mx-auto mb-4 text-warm-taupe animate-pulse" />
        <p className="text-warm-gray">Loading...</p>
      </div>
    </div>
  )
}