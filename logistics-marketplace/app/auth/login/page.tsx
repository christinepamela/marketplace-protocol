'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Package, LogIn } from 'lucide-react'
import { useProvider } from '@/lib/contexts/ProviderContext'

export default function LoginPage() {
  const router = useRouter()
  const { login } = useProvider()
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email.trim() || !password.trim()) {
      alert('❌ Email and password are required')
      return
    }

    setLoading(true)

    try {
      const response = await fetch('http://localhost:3000/api/v1/identity/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error?.message || 'Login failed')
      }

      const data = await response.json()

      await login(
        data.data.token,
        data.data.refreshToken || null,
        data.data.did
      )

      router.push('/dashboard')

    } catch (error: any) {
      console.error('Login error:', error)
      alert(`❌ Login failed: ${error.message || 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-warm-white flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Package className="w-16 h-16 text-warm-taupe" />
          </div>
          <h1 className="text-3xl font-bold text-soft-black mb-2">
            Logistics Provider Login
          </h1>
          <p className="text-warm-gray">
            Sign in to your provider account
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-soft-black mb-2">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border border-barely-beige rounded-lg focus:ring-2 focus:ring-warm-taupe focus:outline-none"
              placeholder="you@example.com"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-soft-black mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border border-barely-beige rounded-lg focus:ring-2 focus:ring-warm-taupe focus:outline-none"
              placeholder="Enter your password"
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-warm-taupe text-white py-3 rounded-lg font-medium hover:bg-soft-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <LogIn className="w-5 h-5" />
                Sign In
              </>
            )}
          </button>
        </form>

        <p className="text-center text-sm text-warm-gray mt-6">
          Don't have an account?{' '}
          <Link href="/auth/register" className="text-warm-taupe hover:underline">
            Register as a provider
          </Link>
        </p>
      </div>
    </div>
  )
}