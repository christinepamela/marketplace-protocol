/**
 * Provider Registration Page
 * Allows logistics providers to register with KYC verification
 */

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { sdk } from '@/lib/sdk'
import type { ShippingMethod } from '@rangkai/sdk'
import { Package, CheckCircle } from 'lucide-react'

export default function RegisterPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    business_name: '',
    service_regions: [] as string[],
    shipping_methods: [] as ShippingMethod[],
    insurance_available: false
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validation
    if (!formData.business_name.trim()) {
      alert('❌ Business name is required')
      return
    }
    
    if (formData.service_regions.length === 0) {
      alert('❌ Please select at least one service region')
      return
    }
    
    if (formData.shipping_methods.length === 0) {
      alert('❌ Please select at least one shipping method')
      return
    }
    
    setLoading(true)

    try {
      // Step 1: Create KYC identity via API
      const identityResponse = await fetch('http://localhost:3000/api/v1/identity/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'kyc',
          clientId: 'logistics-marketplace',
          publicProfile: {
            displayName: formData.business_name,
            country: formData.service_regions[0],
            businessType: 'trader'
          },
          kycData: {
            business_name: formData.business_name,
            service_regions: formData.service_regions
          }
        })
      })
      
      if (!identityResponse.ok) {
        const errorData = await identityResponse.json()
        throw new Error(errorData.message || 'Failed to create identity')
      }
      
      const identityData = await identityResponse.json()
      console.log('✅ Identity created:', identityData)

      // Step 2: Register provider
      const providerResponse = await fetch('http://localhost:3000/api/v1/logistics/providers', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${identityData.data.token}`
        },
        body: JSON.stringify({
          business_name: formData.business_name,
          identity_did: identityData.data.did,
          service_regions: formData.service_regions,
          shipping_methods: formData.shipping_methods,
          insurance_available: formData.insurance_available
        })
      })
      
      if (!providerResponse.ok) {
        const errorData = await providerResponse.json()
        throw new Error(errorData.message || 'Failed to register provider')
      }
      
      const providerData = await providerResponse.json()
      console.log('✅ Provider registered:', providerData)

      // Step 3: Store token
      localStorage.setItem('rangkai_token', identityData.data.token)

      alert('✅ Provider registered successfully!')
      router.push('/dashboard')
    } catch (error: any) {
      console.error('Registration error:', error)
      alert(`❌ Registration failed: ${error.message || 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  const toggleRegion = (region: string) => {
    setFormData(prev => ({
      ...prev,
      service_regions: prev.service_regions.includes(region)
        ? prev.service_regions.filter(r => r !== region)
        : [...prev.service_regions, region]
    }))
  }

  const toggleMethod = (method: ShippingMethod) => {
    setFormData(prev => ({
      ...prev,
      shipping_methods: prev.shipping_methods.includes(method)
        ? prev.shipping_methods.filter(m => m !== method)
        : [...prev.shipping_methods, method]
    }))
  }

  return (
    <div className="min-h-screen bg-warm-white flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white rounded-lg shadow-lg p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Package className="w-16 h-16 text-warm-taupe" />
          </div>
          <h1 className="text-3xl font-bold text-soft-black mb-2">
            Register as Logistics Provider
          </h1>
          <p className="text-warm-gray">
            Join the decentralized logistics marketplace
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Business Name */}
          <div>
            <label className="block text-sm font-medium text-soft-black mb-2">
              Business Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.business_name}
              onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
              className="w-full px-4 py-2 border border-barely-beige rounded-lg focus:ring-2 focus:ring-warm-taupe focus:outline-none"
              placeholder="e.g. FastShip Express"
              disabled={loading}
            />
          </div>

          {/* Service Regions */}
          <div>
            <label className="block text-sm font-medium text-soft-black mb-2">
              Service Regions <span className="text-red-500">*</span>
            </label>
            <p className="text-xs text-warm-gray mb-3">
              Select countries where you can provide shipping services
            </p>
            <div className="grid grid-cols-2 gap-3 max-h-96 overflow-y-auto p-2 border border-barely-beige rounded-lg">
              {[
                { code: 'MY', name: 'Malaysia' },
                { code: 'SG', name: 'Singapore' },
                { code: 'ID', name: 'Indonesia' },
                { code: 'TH', name: 'Thailand' },
                { code: 'PH', name: 'Philippines' },
                { code: 'VN', name: 'Vietnam' },
                { code: 'BN', name: 'Brunei' },
                { code: 'KH', name: 'Cambodia' },
                { code: 'LA', name: 'Laos' },
                { code: 'MM', name: 'Myanmar' },
                { code: 'TL', name: 'Timor-Leste' },
                { code: 'CN', name: 'China' },
                { code: 'JP', name: 'Japan' },
                { code: 'KR', name: 'South Korea' },
                { code: 'TW', name: 'Taiwan' },
                { code: 'HK', name: 'Hong Kong' },
                { code: 'MO', name: 'Macau' },
                { code: 'IN', name: 'India' },
                { code: 'PK', name: 'Pakistan' },
                { code: 'BD', name: 'Bangladesh' },
                { code: 'LK', name: 'Sri Lanka' },
                { code: 'NP', name: 'Nepal' },
                { code: 'BT', name: 'Bhutan' },
                { code: 'MV', name: 'Maldives' },
                { code: 'AU', name: 'Australia' },
                { code: 'NZ', name: 'New Zealand' },
                { code: 'PG', name: 'Papua New Guinea' },
                { code: 'FJ', name: 'Fiji' },
                { code: 'US', name: 'United States' },
                { code: 'CA', name: 'Canada' },
                { code: 'MX', name: 'Mexico' },
                { code: 'GB', name: 'United Kingdom' },
                { code: 'FR', name: 'France' },
                { code: 'DE', name: 'Germany' },
                { code: 'IT', name: 'Italy' },
                { code: 'ES', name: 'Spain' },
                { code: 'NL', name: 'Netherlands' },
                { code: 'BE', name: 'Belgium' },
                { code: 'CH', name: 'Switzerland' },
                { code: 'AT', name: 'Austria' },
                { code: 'AE', name: 'UAE' },
                { code: 'SA', name: 'Saudi Arabia' },
                { code: 'QA', name: 'Qatar' },
                { code: 'KW', name: 'Kuwait' },
                { code: 'BH', name: 'Bahrain' },
                { code: 'OM', name: 'Oman' }
              ].map(region => (
                <label 
                  key={region.code} 
                  className={`
                    flex items-center gap-2 p-3 border rounded-lg cursor-pointer transition-colors
                    ${formData.service_regions.includes(region.code) 
                      ? 'border-warm-taupe bg-light-cream' 
                      : 'border-barely-beige hover:border-warm-taupe'
                    }
                    ${loading ? 'opacity-50 cursor-not-allowed' : ''}
                  `}
                >
                  <input
                    type="checkbox"
                    checked={formData.service_regions.includes(region.code)}
                    onChange={() => toggleRegion(region.code)}
                    className="w-4 h-4 flex-shrink-0"
                    disabled={loading}
                  />
                  <span className="text-sm">
                    <span className="font-medium">{region.code}</span>
                    <span className="text-warm-gray"> - {region.name}</span>
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Shipping Methods */}
          <div>
            <label className="block text-sm font-medium text-soft-black mb-2">
              Shipping Methods <span className="text-red-500">*</span>
            </label>
            <p className="text-xs text-warm-gray mb-3">
              Select delivery speeds you can offer
            </p>
            <div className="space-y-2">
              {[
                { value: 'standard' as ShippingMethod, label: 'Standard (3-7 days)', desc: 'Regular delivery' },
                { value: 'express' as ShippingMethod, label: 'Express (1-3 days)', desc: 'Fast delivery' },
                { value: 'freight' as ShippingMethod, label: 'Freight (5-14 days)', desc: 'Large items' }
              ].map(method => (
                <label 
                  key={method.value} 
                  className={`
                    flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors
                    ${formData.shipping_methods.includes(method.value) 
                      ? 'border-warm-taupe bg-light-cream' 
                      : 'border-barely-beige hover:border-warm-taupe'
                    }
                    ${loading ? 'opacity-50 cursor-not-allowed' : ''}
                  `}
                >
                  <input
                    type="checkbox"
                    checked={formData.shipping_methods.includes(method.value)}
                    onChange={() => toggleMethod(method.value)}
                    className="w-4 h-4 mt-1"
                    disabled={loading}
                  />
                  <div>
                    <div className="font-medium text-soft-black">{method.label}</div>
                    <div className="text-xs text-warm-gray">{method.desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Insurance */}
          <div className="border border-barely-beige rounded-lg p-4">
            <label className={`flex items-start gap-3 cursor-pointer ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}>
              <input
                type="checkbox"
                checked={formData.insurance_available}
                onChange={(e) => setFormData({ ...formData, insurance_available: e.target.checked })}
                className="w-4 h-4 mt-1"
                disabled={loading}
              />
              <div>
                <div className="font-medium text-soft-black">I offer insurance coverage</div>
                <div className="text-xs text-warm-gray mt-1">
                  Package protection against loss or damage
                </div>
              </div>
            </label>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-warm-taupe text-white py-3 rounded-lg font-medium hover:bg-soft-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Registering...
              </>
            ) : (
              <>
                <CheckCircle className="w-5 h-5" />
                Register Provider
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}