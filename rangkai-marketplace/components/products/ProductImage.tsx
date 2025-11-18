'use client'

import Image from 'next/image'
import { useState } from 'react'

interface ProductImageProps {
  src: string
  alt: string
  width?: number
  height?: number
  priority?: boolean
  className?: string
}

/**
 * Optimized product image component with fallback
 */
export default function ProductImage({
  src,
  alt,
  width = 400,
  height = 400,
  priority = false,
  className = ''
}: ProductImageProps) {
  const [error, setError] = useState(false)

  // Fallback image (placeholder from Unsplash)
  const fallbackSrc = 'https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=800&q=80'

  return (
    <div className={`relative overflow-hidden bg-light-cream ${className}`}>
      <Image
        src={error ? fallbackSrc : src}
        alt={alt}
        width={width}
        height={height}
        priority={priority}
        className="object-cover w-full h-full transition-transform duration-300 hover:scale-105"
        onError={() => setError(true)}
      />
      
      {/* Loading skeleton */}
      <div className="absolute inset-0 bg-barely-beige animate-pulse -z-10" />
    </div>
  )
}