'use client'

import { usePathname } from 'next/navigation'
import { useProvider } from '@/lib/contexts/ProviderContext'
import ProviderHeader from './ProviderHeader'

export default function ConditionalHeader() {
  const pathname = usePathname()
  const { provider } = useProvider()

  // Hide on auth pages and before provider is loaded
  if (!pathname || pathname.startsWith('/auth')) return null
  if (!provider) return null

  return <ProviderHeader />
}