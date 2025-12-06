'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/contexts/AuthContext'
import { sdk } from '@/lib/sdk'
import type { Product, PrimaryCategory, CurrencyCode } from '@rangkai/sdk'
import ImageUploader from '@/components/vendor/ImageUploader'
import { Loader2, Save, Eye } from 'lucide-react'

interface ProductFormProps {
  product?: Product // If editing
  mode: 'create' | 'edit'
}

type FormData = {
  // Category
  category: {
    primary: PrimaryCategory
    subcategory: string
    tags: string[]
  }
  // Basic
  basic: {
    name: string
    description: string
    shortDescription: string
    brand: string
    sku: string
    condition: 'new' | 'used' | 'refurbished'
    images: {
      primary: string
      gallery: string[]
    }
  }
  // Advanced
  advanced: {
    materials: string[]
    keywords: string[]
    attributes: Record<string, string>
  }
  // Pricing
  pricing: {
    basePrice: {
      amount: number
      currency: CurrencyCode
    }
    moq: number
  }
  // Logistics
  logistics: {
    weight: {
      value: number
      unit: 'kg' | 'lb' | 'g'
    }
    dimensions: {
      length: number
      width: number
      height: number
      unit: 'cm' | 'in'
    }
    originCountry: string
    leadTime: number
  }
  // Status
  status: 'draft' | 'active' | 'inactive'
  visibility: 'public' | 'private' | 'unlisted'
}

const INITIAL_FORM_DATA: FormData = {
  category: {
    primary: 'other',
    subcategory: '',
    tags: []
  },
  basic: {
    name: '',
    description: '',
    shortDescription: '',
    brand: '',
    sku: '',
    condition: 'new',
    images: {
      primary: '',
      gallery: []
    }
  },
  advanced: {
    materials: [],
    keywords: [],
    attributes: {}
  },
  pricing: {
    basePrice: {
      amount: 0,
      currency: 'USD'
    },
    moq: 1
  },
  logistics: {
    weight: {
      value: 0,
      unit: 'kg'
    },
    dimensions: {
      length: 0,
      width: 0,
      height: 0,
      unit: 'cm'
    },
    originCountry: '',
    leadTime: 7
  },
  status: 'draft',
  visibility: 'public'
}

const PRIMARY_CATEGORIES: PrimaryCategory[] = [
  'footwear', 'bags', 'textiles', 'electronics', 'home', 'craft', 'other'
]

const CURRENCIES: CurrencyCode[] = ['USD', 'EUR', 'GBP', 'MYR', 'SGD', 'AUD', 'BTC']

export default function ProductForm({ product, mode }: ProductFormProps) {
  const router = useRouter()
  const { user } = useAuth()
  const [formData, setFormData] = useState<FormData>(INITIAL_FORM_DATA)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Load existing product data if editing
  useEffect(() => {
    if (mode === 'edit' && product) {
      setFormData({
        category: product.category,
        basic: {
          ...product.basic,
          images: {
            primary: product.basic.images.primary,
            gallery: product.basic.images.gallery || []
          }
        },
        advanced: {
          materials: product.advanced.materials || [],
          keywords: product.advanced.keywords || [],
          attributes: product.advanced.attributes || {}
        },
        pricing: product.pricing,
        logistics: product.logistics,
        status: product.status,
        visibility: product.visibility
      })
    }
  }, [mode, product])

  const handleImagesChange = (images: string[]) => {
    setFormData(prev => ({
      ...prev,
      basic: {
        ...prev.basic,
        images: {
          primary: images[0] || '',
          gallery: images.slice(1)
        }
      }
    }))
  }

  const handleArrayInput = (field: 'materials' | 'keywords' | 'tags', value: string) => {
    const items = value.split(',').map(item => item.trim()).filter(Boolean)
    
    if (field === 'tags') {
      setFormData(prev => ({
        ...prev,
        category: { ...prev.category, tags: items }
      }))
    } else {
      setFormData(prev => ({
        ...prev,
        advanced: { ...prev.advanced, [field]: items }
      }))
    }
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    // Required fields
    if (!formData.basic.name) newErrors.name = 'Product name is required'
    if (!formData.basic.description) newErrors.description = 'Description is required'
    if (!formData.basic.images.primary) newErrors.images = 'At least one image is required'
    if (!formData.category.subcategory) newErrors.subcategory = 'Subcategory is required'
    if (formData.pricing.basePrice.amount <= 0) newErrors.price = 'Price must be greater than 0'
    if (formData.pricing.moq < 1) newErrors.moq = 'MOQ must be at least 1'
    if (!formData.logistics.originCountry) newErrors.originCountry = 'Origin country is required'
    if (formData.logistics.leadTime < 1) newErrors.leadTime = 'Lead time must be at least 1 day'

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent, saveAs: 'draft' | 'active') => {
    e.preventDefault()

    if (!user) {
      alert('You must be logged in to create products')
      return
    }

    // Only validate if publishing (not draft)
    if (saveAs === 'active' && !validateForm()) {
      alert('Please fix the errors before publishing')
      return
    }

    setLoading(true)

    try {
      const productData = {
        vendorDid: user.did,
        clientId: 'rangkai-marketplace',
        category: formData.category,
        basic: formData.basic,
        advanced: formData.advanced,
        pricing: {
          ...formData.pricing,
          basePrice: {
            ...formData.pricing.basePrice,
            amount: Number(formData.pricing.basePrice.amount) || 0  // ✅ ADDED
          }
        },
        logistics: {
          ...formData.logistics,
          weight: {
            ...formData.logistics.weight,
            value: Number(formData.logistics.weight.value) || 0  // ✅ ADDED
          },
          dimensions: {
            ...formData.logistics.dimensions,
            length: Number(formData.logistics.dimensions.length) || 0,  // ✅ ADDED
            width: Number(formData.logistics.dimensions.width) || 0,    // ✅ ADDED
            height: Number(formData.logistics.dimensions.height) || 0   // ✅ ADDED
          }
        },
        status: saveAs,
        visibility: formData.visibility
      }

      if (mode === 'create') {
        const result = await sdk.catalog.create(productData)
        alert('Product created successfully!')
        router.push('/vendor/products')
      } else if (mode === 'edit' && product) {
        await sdk.catalog.update(product.id, productData)
        alert('Product updated successfully!')
        router.push('/vendor/products')
      }
    } catch (error: any) {
      console.error('Failed to save product:', error)
      alert(error.message || 'Failed to save product. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form className="max-w-4xl mx-auto space-y-8">
      {/* Section 1: Category */}
      <section className="bg-white p-6 border border-barely-beige rounded">
        <h2 className="text-xl font-medium text-soft-black mb-4">Category</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-soft-black mb-2">
              Primary Category <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.category.primary}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                category: { ...prev.category, primary: e.target.value as PrimaryCategory }
              }))}
              className="input w-full"
            >
              {PRIMARY_CATEGORIES.map(cat => (
                <option key={cat} value={cat}>
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-soft-black mb-2">
              Subcategory <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.category.subcategory}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                category: { ...prev.category, subcategory: e.target.value }
              }))}
              placeholder="e.g., leather-shoes, canvas-bags"
              className={`input w-full ${errors.subcategory ? 'border-red-500' : ''}`}
            />
            {errors.subcategory && (
              <p className="text-sm text-red-600 mt-1">{errors.subcategory}</p>
            )}
          </div>
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium text-soft-black mb-2">
            Tags (comma-separated)
          </label>
          <input
            type="text"
            value={formData.category.tags.join(', ')}
            onChange={(e) => handleArrayInput('tags', e.target.value)}
            placeholder="handmade, custom, premium"
            className="input w-full"
          />
        </div>
      </section>

      {/* Section 2: Basic Information */}
      <section className="bg-white p-6 border border-barely-beige rounded">
        <h2 className="text-xl font-medium text-soft-black mb-4">Basic Information</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-soft-black mb-2">
              Product Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.basic.name}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                basic: { ...prev.basic, name: e.target.value }
              }))}
              placeholder="Custom Leather Oxford Shoes"
              className={`input w-full ${errors.name ? 'border-red-500' : ''}`}
            />
            {errors.name && (
              <p className="text-sm text-red-600 mt-1">{errors.name}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-soft-black mb-2">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              value={formData.basic.description}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                basic: { ...prev.basic, description: e.target.value }
              }))}
              placeholder="Detailed product description..."
              rows={5}
              className={`input w-full ${errors.description ? 'border-red-500' : ''}`}
            />
            {errors.description && (
              <p className="text-sm text-red-600 mt-1">{errors.description}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-soft-black mb-2">
              Short Description
            </label>
            <input
              type="text"
              value={formData.basic.shortDescription}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                basic: { ...prev.basic, shortDescription: e.target.value }
              }))}
              placeholder="One-line summary"
              className="input w-full"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-soft-black mb-2">
                Brand
              </label>
              <input
                type="text"
                value={formData.basic.brand}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  basic: { ...prev.basic, brand: e.target.value }
                }))}
                placeholder="Your Brand"
                className="input w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-soft-black mb-2">
                SKU
              </label>
              <input
                type="text"
                value={formData.basic.sku}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  basic: { ...prev.basic, sku: e.target.value }
                }))}
                placeholder="SKU-001"
                className="input w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-soft-black mb-2">
                Condition <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.basic.condition}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  basic: { ...prev.basic, condition: e.target.value as any }
                }))}
                className="input w-full"
              >
                <option value="new">New</option>
                <option value="used">Used</option>
                <option value="refurbished">Refurbished</option>
              </select>
            </div>
          </div>

          {/* Images */}
          <ImageUploader
            onImagesChange={handleImagesChange}
            initialImages={[
              formData.basic.images.primary,
              ...formData.basic.images.gallery
            ].filter(Boolean)}
            required
          />
          {errors.images && (
            <p className="text-sm text-red-600 mt-1">{errors.images}</p>
          )}
        </div>
      </section>

      {/* Section 3: Advanced Specifications */}
      <section className="bg-white p-6 border border-barely-beige rounded">
        <h2 className="text-xl font-medium text-soft-black mb-4">
          Advanced Specifications
        </h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-soft-black mb-2">
              Materials (comma-separated)
            </label>
            <input
              type="text"
              value={formData.advanced.materials.join(', ')}
              onChange={(e) => handleArrayInput('materials', e.target.value)}
              placeholder="leather, rubber, cotton"
              className="input w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-soft-black mb-2">
              Keywords (comma-separated)
            </label>
            <input
              type="text"
              value={formData.advanced.keywords.join(', ')}
              onChange={(e) => handleArrayInput('keywords', e.target.value)}
              placeholder="handmade, durable, eco-friendly"
              className="input w-full"
            />
          </div>
        </div>
      </section>

      {/* Section 4: Pricing */}
      <section className="bg-white p-6 border border-barely-beige rounded">
        <h2 className="text-xl font-medium text-soft-black mb-4">Pricing</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-soft-black mb-2">
              Price <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={formData.pricing.basePrice.amount}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                pricing: {
                  ...prev.pricing,
                  basePrice: {
                    ...prev.pricing.basePrice,
                    amount: parseFloat(e.target.value)
                  }
                }
              }))}
              className={`input w-full ${errors.price ? 'border-red-500' : ''}`}
            />
            {errors.price && (
              <p className="text-sm text-red-600 mt-1">{errors.price}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-soft-black mb-2">
              Currency <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.pricing.basePrice.currency}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                pricing: {
                  ...prev.pricing,
                  basePrice: {
                    ...prev.pricing.basePrice,
                    currency: e.target.value as CurrencyCode
                  }
                }
              }))}
              className="input w-full"
            >
              {CURRENCIES.map(curr => (
                <option key={curr} value={curr}>{curr}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-soft-black mb-2">
              MOQ (Minimum Order Quantity) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min="1"
              value={formData.pricing.moq}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                pricing: { ...prev.pricing, moq: parseInt(e.target.value) }
              }))}
              className={`input w-full ${errors.moq ? 'border-red-500' : ''}`}
            />
            {errors.moq && (
              <p className="text-sm text-red-600 mt-1">{errors.moq}</p>
            )}
          </div>
        </div>
      </section>

      {/* Section 5: Logistics */}
      <section className="bg-white p-6 border border-barely-beige rounded">
        <h2 className="text-xl font-medium text-soft-black mb-4">Logistics</h2>
        
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-soft-black mb-2">
                Weight <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.logistics.weight.value}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    logistics: {
                      ...prev.logistics,
                      weight: { ...prev.logistics.weight, value: parseFloat(e.target.value) }
                    }
                  }))}
                  className="input flex-1"
                />
                <select
                  value={formData.logistics.weight.unit}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    logistics: {
                      ...prev.logistics,
                      weight: { ...prev.logistics.weight, unit: e.target.value as any }
                    }
                  }))}
                  className="input w-24"
                >
                  <option value="kg">kg</option>
                  <option value="lb">lb</option>
                  <option value="g">g</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-soft-black mb-2">
                Dimensions (L × W × H) <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  min="0"
                  placeholder="L"
                  value={formData.logistics.dimensions.length}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    logistics: {
                      ...prev.logistics,
                      dimensions: { ...prev.logistics.dimensions, length: parseFloat(e.target.value) }
                    }
                  }))}
                  className="input flex-1"
                />
                <input
                  type="number"
                  min="0"
                  placeholder="W"
                  value={formData.logistics.dimensions.width}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    logistics: {
                      ...prev.logistics,
                      dimensions: { ...prev.logistics.dimensions, width: parseFloat(e.target.value) }
                    }
                  }))}
                  className="input flex-1"
                />
                <input
                  type="number"
                  min="0"
                  placeholder="H"
                  value={formData.logistics.dimensions.height}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    logistics: {
                      ...prev.logistics,
                      dimensions: { ...prev.logistics.dimensions, height: parseFloat(e.target.value) }
                    }
                  }))}
                  className="input flex-1"
                />
                <select
                  value={formData.logistics.dimensions.unit}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    logistics: {
                      ...prev.logistics,
                      dimensions: { ...prev.logistics.dimensions, unit: e.target.value as any }
                    }
                  }))}
                  className="input w-20"
                >
                  <option value="cm">cm</option>
                  <option value="in">in</option>
                </select>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-soft-black mb-2">
                Origin Country <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.logistics.originCountry}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  logistics: { ...prev.logistics, originCountry: e.target.value }
                }))}
                placeholder="Malaysia"
                className={`input w-full ${errors.originCountry ? 'border-red-500' : ''}`}
              />
              {errors.originCountry && (
                <p className="text-sm text-red-600 mt-1">{errors.originCountry}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-soft-black mb-2">
                Lead Time (days) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="1"
                value={formData.logistics.leadTime}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  logistics: { ...prev.logistics, leadTime: parseInt(e.target.value) }
                }))}
                className={`input w-full ${errors.leadTime ? 'border-red-500' : ''}`}
              />
              {errors.leadTime && (
                <p className="text-sm text-red-600 mt-1">{errors.leadTime}</p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Section 6: Status & Visibility */}
      <section className="bg-white p-6 border border-barely-beige rounded">
        <h2 className="text-xl font-medium text-soft-black mb-4">
          Status & Visibility
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-soft-black mb-2">
              Visibility
            </label>
            <select
              value={formData.visibility}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                visibility: e.target.value as any
              }))}
              className="input w-full"
            >
              <option value="public">Public (Searchable)</option>
              <option value="unlisted">Unlisted (Direct link only)</option>
              <option value="private">Private (Hidden)</option>
            </select>
          </div>
        </div>
      </section>

      {/* Action Buttons */}
      <div className="flex items-center justify-between pt-6 border-t border-barely-beige">
        <button
          type="button"
          onClick={() => router.back()}
          className="btn btn-secondary"
        >
          Cancel
        </button>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={(e) => handleSubmit(e, 'draft')}
            disabled={loading}
            className="btn btn-secondary"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <Save className="w-5 h-5 mr-2" />
                Save as Draft
              </>
            )}
          </button>

          <button
            type="button"
            onClick={(e) => handleSubmit(e, 'active')}
            disabled={loading}
            className="btn btn-primary"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <Eye className="w-5 h-5 mr-2" />
                Publish Product
              </>
            )}
          </button>
        </div>
      </div>
    </form>
  )
}