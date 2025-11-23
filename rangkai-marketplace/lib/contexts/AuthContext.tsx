'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
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
  login: (token: string, did: string) => Promise<void>
  logout: () => void
  isAuthenticated: boolean
}

// ============================================================================
// STORAGE KEYS
// ============================================================================

const TOKEN_KEY = 'rangkai_token'
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

  // Initialize auth on mount
  useEffect(() => {
    initializeAuth()
  }, [])

  async function initializeAuth() {
    try {
      // Check if token exists in localStorage
      const token = localStorage.getItem(TOKEN_KEY)
      const did = localStorage.getItem(USER_DID_KEY)

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
    } catch (error) {
      console.error('Failed to initialize auth:', error)
      // Clear invalid token
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem(USER_DID_KEY)
      sdk.clearToken()
    } finally {
      setLoading(false)
    }
  }

  async function login(token: string, did: string) {
    try {
      // Save to localStorage
      localStorage.setItem(TOKEN_KEY, token)
      localStorage.setItem(USER_DID_KEY, did)

      // Set token in SDK
      sdk.setToken(token)

      // Fetch user identity
      const identity = await sdk.identity.getByDid(did)

      setUser({
        did,
        identity,
        token
      })
    } catch (error) {
      console.error('Failed to login:', error)
      throw error
    }
  }

  function logout() {
    // Clear localStorage
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_DID_KEY)

    // Clear SDK token
    sdk.clearToken()

    // Clear user state
    setUser(null)
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
 * Check if user is authenticated (client-side only)
 */
export function isAuthenticated(): boolean {
  if (typeof window === 'undefined') return false
  return !!localStorage.getItem(TOKEN_KEY)
}