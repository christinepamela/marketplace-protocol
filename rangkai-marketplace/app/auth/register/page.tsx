'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, AlertCircle, Check } from 'lucide-react'
import { useAuth } from '@/lib/contexts/AuthContext'
import { register, validateRegistrationData } from '@/lib/api/auth'
import type { IdentityType, BusinessType } from '@rangkai/sdk'

export default function RegisterPage() {
  const router = useRouter()
  const { login } = useAuth()
  
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<string[]>([])
  const [success, setSuccess] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    displayName: '',
    email: '',
    password: '',
    confirmPassword: '',
    type: 'kyc' as IdentityType,
    businessType: 'manufacturer' as BusinessType,
    country: '',
    bio: ''
  })

  // Handle field change
  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setErrors([]) // Clear errors on change
  }

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrors([])

    try {
      // Validate form data
      const validationErrors = validateRegistrationData(formData)
      
      // Check password confirmation
      if (formData.password !== formData.confirmPassword) {
        validationErrors.push('Passwords do not match')
      }

      if (validationErrors.length > 0) {
        setErrors(validationErrors)
        setLoading(false)
        return
      }

      // Register user
      const response = await register({
        type: formData.type,
        businessType: formData.businessType,
        displayName: formData.displayName,
        email: formData.email,
        password: formData.password,
        country: formData.country,
        bio: formData.bio
      })

      // ✅ ONLY CHANGE: Pass refresh token to login
      console.log('✅ Registration successful:', {
        did: response.did,
        hasToken: !!response.token,
        hasRefreshToken: !!response.refreshToken,
        identityType: formData.type
      })
      
      await login(response.token, response.refreshToken, response.did)

      // Show success
      setSuccess(true)

      // Redirect after 1 second
      setTimeout(() => {
        // Check if there's a redirect path
        const redirectPath = localStorage.getItem('redirect_after_login')
        if (redirectPath) {
          localStorage.removeItem('redirect_after_login')
          router.push(redirectPath)
        } else {
          router.push('/products')
        }
      }, 1000)

    } catch (error: any) {
      console.error('Registration failed:', error)
      setErrors([error.message || 'Registration failed. Please try again.'])
    } finally {
      setLoading(false)
    }
  }

  // Success state
  if (success) {
    return (
      <div className="container-custom section-padding">
        <div className="max-w-md mx-auto">
          <div className="bg-green-50 border border-green-200 p-6 text-center">
            <Check size={48} className="mx-auto text-green-600 mb-4" />
            <h2 className="text-xl font-medium text-soft-black mb-2">
              Registration Successful!
            </h2>
            <p className="text-warm-gray">
              Redirecting you to the marketplace...
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container-custom section-padding">
      {/* Back link */}
      <Link 
        href="/"
        className="inline-flex items-center gap-2 text-warm-gray hover:text-soft-black transition-colors mb-8"
      >
        <ArrowLeft size={20} />
        <span>Back to Home</span>
      </Link>

      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-medium text-soft-black mb-2">
            Create Your Account
          </h1>
          <p className="text-warm-gray">
            Join Rangkai to start buying or selling
          </p>
        </div>

        {/* Error messages */}
        {errors.length > 0 && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200">
            <div className="flex items-start gap-2">
              <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-800 mb-2">
                  Please fix the following errors:
                </p>
                <ul className="text-sm text-red-700 list-disc list-inside space-y-1">
                  {errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Registration form */}
        <form onSubmit={handleSubmit} className="bg-white border border-barely-beige p-8 space-y-6">
          {/* Identity Type */}
          <div>
            <label className="block text-sm font-medium text-soft-black mb-3">
              Account Type *
            </label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { value: 'kyc', label: 'Business (KYC)', desc: 'Full verification' },
                { value: 'nostr', label: 'Nostr', desc: 'Decentralized ID' },
                { value: 'anonymous', label: 'Anonymous', desc: 'Limited access' }
              ].map(option => (
                <label
                  key={option.value}
                  className={`
                    flex flex-col p-3 border cursor-pointer transition-colors
                    ${formData.type === option.value 
                      ? 'border-warm-taupe bg-light-cream' 
                      : 'border-barely-beige hover:bg-light-cream'
                    }
                  `}
                >
                  <input
                    type="radio"
                    name="type"
                    value={option.value}
                    checked={formData.type === option.value}
                    onChange={(e) => handleChange('type', e.target.value as IdentityType)}
                    className="sr-only"
                  />
                  <span className="text-sm font-medium text-soft-black">{option.label}</span>
                  <span className="text-xs text-warm-gray mt-1">{option.desc}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Business Type */}
          <div>
            <label className="block text-sm font-medium text-soft-black mb-2">
              I am a *
            </label>
            <select
              value={formData.businessType}
              onChange={(e) => handleChange('businessType', e.target.value as BusinessType)}
              className="input w-full"
              required
            >
              <option value="manufacturer">Manufacturer</option>
              <option value="artisan">Artisan / Craftsperson</option>
              <option value="trader">Trader / Wholesaler</option>
              <option value="buyer">Buyer</option>
            </select>
          </div>

          {/* Display Name */}
          <div>
            <label className="block text-sm font-medium text-soft-black mb-2">
              Display Name / Business Name *
            </label>
            <input
              type="text"
              value={formData.displayName}
              onChange={(e) => handleChange('displayName', e.target.value)}
              className="input w-full"
              placeholder="Your name or business name"
              required
            />
          </div>

          {/* Email */}
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

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-soft-black mb-2">
              Password *
            </label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => handleChange('password', e.target.value)}
              className="input w-full"
              placeholder="Minimum 8 characters"
              required
              minLength={8}
            />
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-sm font-medium text-soft-black mb-2">
              Confirm Password *
            </label>
            <input
              type="password"
              value={formData.confirmPassword}
              onChange={(e) => handleChange('confirmPassword', e.target.value)}
              className="input w-full"
              placeholder="Re-enter password"
              required
              minLength={8}
            />
          </div>

          {/* Country */}
          <div>
            <label className="block text-sm font-medium text-soft-black mb-2">
              Country
            </label>
            <input
              type="text"
              value={formData.country}
              onChange={(e) => handleChange('country', e.target.value)}
              className="input w-full"
              placeholder="e.g., Malaysia"
            />
          </div>

          {/* Bio */}
          <div>
            <label className="block text-sm font-medium text-soft-black mb-2">
              Bio (Optional)
            </label>
            <textarea
              value={formData.bio}
              onChange={(e) => handleChange('bio', e.target.value)}
              className="input w-full"
              rows={3}
              placeholder="Tell us about yourself or your business..."
            />
          </div>

          {/* Submit button */}
          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>

          {/* Terms */}
          <p className="text-xs text-warm-gray text-center">
            By creating an account, you agree to our Terms of Service and Privacy Policy.
          </p>
        </form>

        {/* Already have account */}
        <p className="text-center text-sm text-warm-gray mt-6">
          Already have an account?{' '}
          <Link href="/auth/login" className="text-warm-taupe hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}