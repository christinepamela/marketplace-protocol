'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, AlertCircle } from 'lucide-react'
import { useAuth } from '@/lib/contexts/AuthContext'
import { login } from '@/lib/api/auth'

export default function LoginPage() {
  const router = useRouter()
  const { login: authLogin } = useAuth()

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const response = await login({
        email: formData.email,
        password: formData.password
      })

      await authLogin(response.token, response.refreshToken, response.did)

      const redirectPath = localStorage.getItem('redirect_after_login')
      if (redirectPath) {
        localStorage.removeItem('redirect_after_login')
        router.push(redirectPath)
      } else {
        router.push('/products')
      }
    } catch (error: any) {
      setError('Invalid email or password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container-custom section-padding">
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-warm-gray hover:text-soft-black transition-colors mb-8"
      >
        <ArrowLeft size={20} />
        <span>Back to Home</span>
      </Link>

      <div className="max-w-md mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-medium text-soft-black mb-2">
            Sign In
          </h1>
          <p className="text-warm-gray">
            Welcome back to Rangkai
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200">
            <div className="flex items-center gap-2">
              <AlertCircle size={20} className="text-red-600 flex-shrink-0" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white border border-barely-beige p-8 space-y-6">
          <div>
            <label className="block text-sm font-medium text-soft-black mb-2">
              Email Address *
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
              className="input w-full"
              placeholder="you@example.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-soft-black mb-2">
              Password *
            </label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => handleChange('password', e.target.value)}
              className="input w-full"
              placeholder="Your password"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p className="text-center text-sm text-warm-gray mt-6">
          Don't have an account?{' '}
          <Link href="/auth/register" className="text-warm-taupe hover:underline">
            Create one
          </Link>
        </p>
      </div>
    </div>
  )
}