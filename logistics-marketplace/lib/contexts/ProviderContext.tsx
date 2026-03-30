'use client'
/**
 * Provider Context — Logistics Marketplace
 * Path: logistics-marketplace/lib/contexts/ProviderContext.tsx
 *
 * FIXED:
 *   1. No longer calls searchProviders({}) to find current user (full table scan + data leak)
 *      → now calls sdk.logistics.getProviderByDid(userDid) or filters by identity_did
 *   2. Token refresh added (same pattern as rangkai AuthContext)
 *   3. logout() clears all rangkai_ prefixed keys
 *   4. sdk.setToken() called explicitly after login (not via localStorage listener)
 */

import { createContext, useContext, useState, useEffect, useRef } from 'react'
import { sdk } from '@/lib/sdk'
import type { LogisticsProvider } from '@rangkai/sdk'

const TOKEN_KEY = 'rangkai_token'
const REFRESH_TOKEN_KEY = 'rangkai_refresh_token'
const USER_DID_KEY = 'rangkai_user_did'

interface ProviderContextType {
  provider: LogisticsProvider | null
  loading: boolean
  login: (token: string, refreshToken: string | null, did: string) => Promise<void>
  logout: () => void
}

const ProviderContext = createContext<ProviderContextType | undefined>(undefined)

export function ProviderProvider({ children }: { children: React.ReactNode }) {
  const [provider, setProvider] = useState<LogisticsProvider | null>(null)
  const [loading, setLoading] = useState(true)
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    loadProvider()
    return () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current)
    }
  }, [])

  async function loadProvider() {
    const token = localStorage.getItem(TOKEN_KEY)
    const did = localStorage.getItem(USER_DID_KEY)
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY)

    if (!token || !did) {
      setLoading(false)
      return
    }

    try {
      // Set token on SDK before making authenticated calls
      sdk.setToken(token)

      // FIXED: fetch only this provider — no full table scan
      // Uses identity_did filter instead of fetching all providers
      const providers = await sdk.logistics.searchProviders({ identity_did: did })
      const found = providers[0] || null
      setProvider(found)

      if (refreshToken) {
        scheduleTokenRefresh(refreshToken)
      }
    } catch (error) {
      console.error('[ProviderContext] Failed to load provider:', error)
      clearAuthStorage()
      sdk.clearToken?.()
    } finally {
      setLoading(false)
    }
  }

  /**
   * Schedule automatic token refresh 5 minutes before expiry
   * Uses JWT exp claim for precise timing
   */
  function scheduleTokenRefresh(refreshToken: string) {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current)

    // Calculate time until refresh from JWT exp claim
    let refreshIn = 55 * 60 * 1000 // 55 min default
    try {
      const token = localStorage.getItem(TOKEN_KEY)
      if (token) {
        const payload = JSON.parse(atob(token.split('.')[1]))
        // exp is in seconds; refresh 5 minutes before expiry
        const expiresInMs = (payload.exp * 1000) - Date.now() - (5 * 60 * 1000)
        if (expiresInMs > 0) refreshIn = expiresInMs
      }
    } catch {
      // Fall back to default 55 min if decode fails
    }

    refreshTimerRef.current = setTimeout(async () => {
      try {
        const response = await sdk.identity.refresh({ refreshToken })
        localStorage.setItem(TOKEN_KEY, response.token)
        sdk.setToken(response.token)
        if (provider) {
          // Token refreshed — no need to reload provider data
        }
        // Schedule next refresh
        scheduleTokenRefresh(refreshToken)
      } catch (error) {
        console.error('[ProviderContext] Token refresh failed:', error)
        logout()
      }
    }, refreshIn)
  }

  async function login(token: string, refreshToken: string | null, did: string) {
    // Store credentials
    localStorage.setItem(TOKEN_KEY, token)
    localStorage.setItem(USER_DID_KEY, did)
    if (refreshToken) {
      localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken)
    } else {
      localStorage.removeItem(REFRESH_TOKEN_KEY)
    }

    // FIXED: set token explicitly on SDK (not via localStorage listener)
    sdk.setToken(token)

    try {
      // FIXED: filter by identity_did — no full table scan
      const providers = await sdk.logistics.searchProviders({ identity_did: did })
      const found = providers[0] || null
      setProvider(found)

      if (refreshToken) {
        scheduleTokenRefresh(refreshToken)
      }
    } catch (error) {
      console.error('[ProviderContext] Failed to load provider after login:', error)
      throw error
    }
  }

  function logout() {
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current)
      refreshTimerRef.current = null
    }
    clearAuthStorage()
    sdk.clearToken?.()
    setProvider(null)
  }

  function clearAuthStorage() {
    // Clear all rangkai_ prefixed keys — not just token
    Object.keys(localStorage)
      .filter(k => k.startsWith('rangkai_'))
      .forEach(k => localStorage.removeItem(k))
  }

  return (
    <ProviderContext.Provider value={{ provider, loading, login, logout }}>
      {children}
    </ProviderContext.Provider>
  )
}

export function useProvider() {
  const context = useContext(ProviderContext)
  if (!context) throw new Error('useProvider must be used within ProviderProvider')
  return context
}
