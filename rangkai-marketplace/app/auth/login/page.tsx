'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/**
 * Login Page
 * 
 * Note: Currently, the protocol doesn't have a separate login endpoint.
 * Users register and immediately receive a token.
 * 
 * For now, this page redirects to register.
 * In the future, we can implement session management and login.
 */
export default function LoginPage() {
  const router = useRouter()

  useEffect(() => {
    router.push('/auth/register')
  }, [router])

  return (
    <div className="container-custom section-padding">
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-barely-beige border-t-warm-taupe mx-auto mb-4"></div>
          <p className="text-warm-gray">Redirecting to registration...</p>
        </div>
      </div>
    </div>
  )
}