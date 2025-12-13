/**
 * Provider Context
 * Manages provider authentication state
 */

'use client'

import { createContext, useContext, useState, useEffect } from 'react'
import { sdk } from '@/lib/sdk'
import type { LogisticsProvider } from '@rangkai/sdk'

interface ProviderContextType {
  provider: LogisticsProvider | null
  loading: boolean
  login: (did: string) => Promise<void>
  logout: () => void
}

const ProviderContext = createContext<ProviderContextType | undefined>(undefined)

export function ProviderProvider({ children }: { children: React.ReactNode }) {
  const [provider, setProvider] = useState<LogisticsProvider | null>(null)
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    const loadProvider = async () => {
      const token = localStorage.getItem('rangkai_token')
      if (!token) {
        setLoading(false)
        return
      }
      
      try {
        // Decode JWT to get provider info
        const decoded = JSON.parse(atob(token.split('.')[1]))
        const userDid = decoded.did || decoded.sub
        
        // Search for provider with this DID
        const providers = await sdk.logistics.searchProviders({})
        const userProvider = providers.find(p => p.identity_did === userDid)
        
        if (userProvider) {
          setProvider(userProvider)
        }
      } catch (error) {
        console.error('Failed to load provider:', error)
      } finally {
        setLoading(false)
      }
    }
    
    loadProvider()
  }, [])
  
  const login = async (did: string) => {
    const providers = await sdk.logistics.searchProviders({})
    const userProvider = providers.find(p => p.identity_did === did)
    if (userProvider) {
      setProvider(userProvider)
    }
  }
  
  const logout = () => {
    localStorage.removeItem('rangkai_token')
    setProvider(null)
  }
  
  return (
    <ProviderContext.Provider value={{ provider, loading, login, logout }}>
      {children}
    </ProviderContext.Provider>
  )
}

export function useProvider() {
  const context = useContext(ProviderContext)
  if (!context) {
    throw new Error('useProvider must be used within ProviderProvider')
  }
  return context
}