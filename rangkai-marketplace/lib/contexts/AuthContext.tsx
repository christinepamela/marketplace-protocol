'use client'

import { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react'
import { sdk } from '@/lib/sdk'
import type { Identity } from '@rangkai/sdk'

// ============================================================================
// TYPES
// ============================================================================

interface AuthUser {
  did: string
  identity: Identity
  token: string
}

interface AuthContextType {
  user: AuthUser | null
  loading: boolean
  login: (token: string, refreshToken: string | null, did: string) => Promise<void>
  logout: () => void
  isAuthenticated: boolean
}

// ============================================================================
// STORAGE KEYS
// ============================================================================

const TOKEN_KEY = 'rangkai_token'
const REFRESH_TOKEN_KEY = 'rangkai_refresh_token' // ✅ NEW
const USER_DID_KEY = 'rangkai_user_did'

// ============================================================================
// CONTEXT
// ============================================================================

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// ============================================================================
// PROVIDER
// ============================================================================

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null) // ✅ NEW: Store timer reference

  // Initialize auth on mount
  useEffect(() => {
    initializeAuth()
    
    // Cleanup: Clear refresh timer on unmount
    return () => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current)
      }
    }
  }, [])

  async function initializeAuth() {
    try {
      // Check if token exists in localStorage
      const token = localStorage.getItem(TOKEN_KEY)
      const did = localStorage.getItem(USER_DID_KEY)
      const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY) // ✅ NEW

      if (!token || !did) {
        setLoading(false)
        return
      }

      // Set token in SDK
      sdk.setToken(token)

      // Fetch user identity
      const identity = await sdk.identity.getByDid(did)

      setUser({
        did,
        identity,
        token
      })
      
      // ✅ NEW: Schedule token refresh if refresh token exists
      if (refreshToken) {
        scheduleTokenRefresh(refreshToken)
      }
    } catch (error) {
      console.error('Failed to initialize auth:', error)
      // Clear invalid token
      clearAuthStorage()
      sdk.clearToken()
    } finally {
      setLoading(false)
    }
  }

  /**
   * ✅ NEW: Schedule automatic token refresh
   * Refreshes 5 minutes before expiry (1 hour token = refresh at 55 min)
   */
  function scheduleTokenRefresh(refreshToken: string) {
    // Clear existing timer
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current)
    }
    
    // For 1-hour tokens, refresh after 55 minutes (5 min buffer)
    const refreshInterval = 55 * 60 * 1000 // 55 minutes in milliseconds
    
    refreshTimerRef.current = setTimeout(async () => {
      try {
        console.log('🔄 Auto-refreshing token...')
        
        const response = await sdk.identity.refresh({ refreshToken })
        
        // Update stored token
        localStorage.setItem(TOKEN_KEY, response.token)
        sdk.setToken(response.token)
        
        // Update user state with new token
        if (user) {
          setUser({
            ...user,
            token: response.token
          })
        }
        
        console.log('✅ Token refreshed successfully')
        
        // Schedule next refresh
        scheduleTokenRefresh(refreshToken)
      } catch (error) {
        console.error('❌ Failed to refresh token:', error)
        // If refresh fails, log user out
        logout()
      }
    }, refreshInterval)
  }

  async function login(token: string, refreshToken: string | null, did: string) {
    try {
      // Save to localStorage
      localStorage.setItem(TOKEN_KEY, token)
      localStorage.setItem(USER_DID_KEY, did)
      
      // ✅ NEW: Save refresh token if provided (KYC/Nostr only)
      if (refreshToken) {
        localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken)
      } else {
        localStorage.removeItem(REFRESH_TOKEN_KEY)
      }

      // Set token in SDK
      sdk.setToken(token)

      // Fetch user identity
      const identity = await sdk.identity.getByDid(did)

      setUser({
        did,
        identity,
        token
      })
      
      // ✅ NEW: Schedule token refresh if refresh token exists
      if (refreshToken) {
        scheduleTokenRefresh(refreshToken)
      }
    } catch (error) {
      console.error('Failed to login:', error)
      throw error
    }
  }

  function logout() {
    // ✅ NEW: Clear refresh timer
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current)
      refreshTimerRef.current = null
    }
    
    // Clear localStorage
    clearAuthStorage()

    // Clear SDK token
    sdk.clearToken()

    // Clear user state
    setUser(null)
  }
  
  // ✅ NEW: Helper to clear all auth storage
  function clearAuthStorage() {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(REFRESH_TOKEN_KEY)
    localStorage.removeItem(USER_DID_KEY)
  }

  const value: AuthContextType = {
    user,
    loading,
    login,
    logout,
    isAuthenticated: !!user
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

// ============================================================================
// HOOK
// ============================================================================

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get current user DID (client-side only)
 */
export function getCurrentUserDid(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(USER_DID_KEY)
}

/**
 * Get current token (client-side only)
 */
export function getCurrentToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(TOKEN_KEY)
}

/**
 * Get current refresh token (client-side only)
 * ✅ NEW
 */
export function getCurrentRefreshToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(REFRESH_TOKEN_KEY)
}

/**
 * Check if user is authenticated (client-side only)
 */
export function isAuthenticated(): boolean {
  if (typeof window === 'undefined') return false
  return !!localStorage.getItem(TOKEN_KEY)
}