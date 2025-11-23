'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/contexts/AuthContext'

interface ProtectedRouteProps {
  children: React.ReactNode
  redirectTo?: string
}

/**
 * Protected Route Component
 * Redirects to login if user is not authenticated
 * 
 * @example
 * <ProtectedRoute>
 *   <CheckoutPage />
 * </ProtectedRoute>
 */
export default function ProtectedRoute({ 
  children, 
  redirectTo = '/auth/register' 
}: ProtectedRouteProps) {
  const { isAuthenticated, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      // Save current path to redirect back after login
      const currentPath = window.location.pathname
      localStorage.setItem('redirect_after_login', currentPath)
      
      router.push(redirectTo)
    }
  }, [isAuthenticated, loading, router, redirectTo])

  // Show loading state while checking auth
  if (loading) {
    return (
      <div className="container-custom section-padding">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="animate-spin w-12 h-12 border-4 border-barely-beige border-t-warm-taupe mx-auto mb-4"></div>
            <p className="text-warm-gray">Loading...</p>
          </div>
        </div>
      </div>
    )
  }

  // Show nothing while redirecting
  if (!isAuthenticated) {
    return null
  }

  // Render protected content
  return <>{children}</>
}