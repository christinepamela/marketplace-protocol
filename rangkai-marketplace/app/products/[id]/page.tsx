'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import type { Product } from '@rangkai/sdk'
import { getProduct, getVendorReputation, getVendorIdentity } from '@/lib/api/products'
import ProductImage from '@/components/products/ProductImage'
import VendorBadge from '@/components/products/VendorBadge'
import { formatPrice, formatWeight, formatDimensions } from '@/lib/utils/formatters'
import { ShoppingCart, Package, Truck, Shield, ArrowLeft } from 'lucide-react'

export default function ProductDetailPage() {
  const params = useParams()
  const productId = params.id as string

  const [product, setProduct] = useState<Product | null>(null)
  const [vendor, setVendor] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [selectedImage, setSelectedImage] = useState(0)

  useEffect(() => {
    async function loadProduct() {
      try {
        const productData = await getProduct(productId)
        setProduct(productData)

        // Load vendor info
        const [reputation, identity] = await Promise.all([
          getVendorReputation(productData.vendorDid),
          getVendorIdentity(productData.vendorDid)
        ])

        setVendor({
          ...identity?.publicProfile,
          reputation
        })
      } catch (error) {
        console.error('Failed to load product:', error)
      } finally {
        setLoading(false)
      }
    }

    loadProduct()
  }, [productId])

  if (loading) {
    return (
      <div className="container-custom section-padding">
        <div className="animate-pulse">
          <div className="h-8 bg-light-cream w-1/4 mb-8" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div className="aspect-square bg-light-cream" />
            <div className="space-y-4">
              <div className="h-12 bg-light-cream" />
              <div className="h-6 bg-light-cream w-1/3" />
              <div className="h-24 bg-light-cream" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="container-custom section-padding text-center">
        <h1 className="mb-4">Product Not Found</h1>
        <p className="text-warm-gray mb-6">
          The product you're looking for doesn't exist or has been removed.
        </p>
        <Link href="/products" className="btn btn-primary">
          Browse Products
        </Link>
      </div>
    )
  }

  const { basic, pricing, logistics, category, advanced } = product
  const images = [basic.images.primary, ...(basic.images.gallery || [])]

  return (
    <div className="container-custom section-padding">
      {/* Back button */}
      <Link 
        href="/products"
        className="inline-flex items-center gap-2 text-sm text-warm-gray hover:text-soft-black mb-8 transition-colors"
      >
        <ArrowLeft size={16} />
        Back to Products
      </Link>

      {/* Main content */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-16">
        {/* Images */}
        <div className="space-y-4">
          {/* Main image */}
          <ProductImage
            src={images[selectedImage]}
            alt={basic.name}
            width={800}
            height={800}
            priority
            className="w-full aspect-square"
          />

          {/* Thumbnail gallery */}
          {images.length > 1 && (
            <div className="grid grid-cols-5 gap-2">
              {images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedImage(idx)}
                  className={`aspect-square border-2 transition-colors ${
                    idx === selectedImage
                      ? 'border-soft-black'
                      : 'border-barely-beige hover:border-warm-gray'
                  }`}
                >
                  <ProductImage
                    src={img}
                    alt={`${basic.name} ${idx + 1}`}
                    width={100}
                    height={100}
                    className="w-full h-full"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product info */}
        <div className="space-y-6">
          {/* Name and category */}
          <div>
            <div className="flex items-center gap-2 text-sm text-warm-gray mb-2">
              <Link href={`/products?category=${category.primary}`} className="hover:text-soft-black">
                {category.primary}
              </Link>
              <span>→</span>
              <span>{category.subcategory}</span>
            </div>
            <h1 className="mb-2">{basic.name}</h1>
            {basic.brand && (
              <p className="text-warm-gray">by {basic.brand}</p>
            )}
          </div>

          {/* Price */}
          <div className="py-4 border-y border-barely-beige">
            <div className="text-4xl font-medium text-soft-black mb-2">
              {formatPrice(pricing.basePrice)}
            </div>
            <div className="flex items-center gap-4 text-sm text-warm-gray">
              <span>MOQ: {pricing.moq} units</span>
              {pricing.sample?.available && (
                <span className="text-muted-sage">• Sample available</span>
              )}
            </div>
          </div>

          {/* Description */}
          <div>
            <h3 className="text-lg font-medium mb-2">Description</h3>
            <p className="text-warm-gray leading-relaxed">
              {basic.description}
            </p>
          </div>

          {/* Attributes */}
          {advanced.attributes && Object.keys(advanced.attributes).length > 0 && (
            <div>
              <h3 className="text-lg font-medium mb-3">Specifications</h3>
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(advanced.attributes).map(([key, value]) => (
                  <div key={key} className="flex flex-col">
                    <span className="text-sm text-warm-gray capitalize">
                      {key.replace(/_/g, ' ')}
                    </span>
                    <span className="text-sm font-medium text-soft-black">
                      {Array.isArray(value) ? value.join(', ') : String(value)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* CTA Button */}
          <button className="btn btn-primary w-full">
            <ShoppingCart size={20} className="mr-2" />
            Add to Cart (Coming Soon)
          </button>

          {/* Vendor info */}
          {vendor && (
            <div className="p-6 bg-light-cream border border-barely-beige">
              <h3 className="text-sm font-medium mb-3">Sold by</h3>
              <VendorBadge
                displayName={vendor.displayName}
                verified={vendor.verified}
                reputation={vendor.reputation}
                size="lg"
                showRating={true}
              />
              {vendor.country && (
                <p className="text-sm text-warm-gray mt-2">
                  📍 {vendor.country}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Additional info tabs */}
      <div className="border-t border-barely-beige pt-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Shipping */}
          <div className="text-center">
            <Truck className="w-12 h-12 mx-auto mb-4 text-warm-taupe" />
            <h3 className="font-medium mb-2">Shipping</h3>
            <p className="text-sm text-warm-gray">
              Ships from {logistics.originCountry}<br />
              {logistics.leadTime} days lead time<br />
              {formatWeight(logistics.weight.value, logistics.weight.unit)}
            </p>
          </div>

          {/* Quality */}
          <div className="text-center">
            <Package className="w-12 h-12 mx-auto mb-4 text-warm-taupe" />
            <h3 className="font-medium mb-2">Quality</h3>
            <p className="text-sm text-warm-gray">
              Condition: {basic.condition}<br />
              {advanced.materials && advanced.materials.length > 0 && (
                <>Materials: {advanced.materials.join(', ')}</>
              )}
            </p>
          </div>

          {/* Protection */}
          <div className="text-center">
            <Shield className="w-12 h-12 mx-auto mb-4 text-warm-taupe" />
            <h3 className="font-medium mb-2">Buyer Protection</h3>
            <p className="text-sm text-warm-gray">
              7-day escrow<br />
              Dispute resolution<br />
              Rating system
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}