'use client'

import { useState, useRef } from 'react'
import { Upload, X, Image as ImageIcon } from 'lucide-react'
import Image from 'next/image'

interface ImageUploaderProps {
  maxImages?: number
  onImagesChange: (images: string[]) => void
  initialImages?: string[]
  label?: string
  required?: boolean
}

export default function ImageUploader({
  maxImages = 5,
  onImagesChange,
  initialImages = [],
  label = 'Product Images',
  required = false
}: ImageUploaderProps) {
  const [images, setImages] = useState<string[]>(initialImages)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    // Check if adding these files would exceed max
    if (images.length + files.length > maxImages) {
      alert(`Maximum ${maxImages} images allowed`)
      return
    }

    setUploading(true)

    try {
      // Convert files to base64 for preview (in production, upload to S3/R2)
      const imagePromises = files.map(file => {
        return new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = (e) => resolve(e.target?.result as string)
          reader.onerror = reject
          reader.readAsDataURL(file)
        })
      })

      const newImages = await Promise.all(imagePromises)
      const updatedImages = [...images, ...newImages]
      
      setImages(updatedImages)
      onImagesChange(updatedImages)
    } catch (error) {
      console.error('Failed to upload images:', error)
      alert('Failed to upload images. Please try again.')
    } finally {
      setUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const removeImage = (index: number) => {
    const updatedImages = images.filter((_, i) => i !== index)
    setImages(updatedImages)
    onImagesChange(updatedImages)
  }

  const moveImage = (fromIndex: number, toIndex: number) => {
    const updatedImages = [...images]
    const [movedImage] = updatedImages.splice(fromIndex, 1)
    updatedImages.splice(toIndex, 0, movedImage)
    setImages(updatedImages)
    onImagesChange(updatedImages)
  }

  return (
    <div>
      {/* Label */}
      <label className="block text-sm font-medium text-soft-black mb-2">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>

      {/* Instructions */}
      <p className="text-sm text-warm-gray mb-4">
        First image will be the main product photo. Max {maxImages} images.
      </p>

      {/* Image Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-4">
        {images.map((image, index) => (
          <div
            key={index}
            className="relative aspect-square border-2 border-barely-beige rounded overflow-hidden group"
          >
            {/* Image */}
            <Image
              src={image}
              alt={`Product image ${index + 1}`}
              fill
              className="object-cover"
            />

            {/* Primary Badge */}
            {index === 0 && (
              <div className="absolute top-2 left-2 bg-soft-black text-white text-xs px-2 py-1 rounded">
                Primary
              </div>
            )}

            {/* Actions Overlay */}
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              {/* Move Left */}
              {index > 0 && (
                <button
                  onClick={() => moveImage(index, index - 1)}
                  className="p-2 bg-white rounded-full hover:bg-light-cream transition-colors"
                  title="Move left"
                >
                  ←
                </button>
              )}

              {/* Remove */}
              <button
                onClick={() => removeImage(index)}
                className="p-2 bg-white rounded-full hover:bg-red-100 transition-colors"
                title="Remove image"
              >
                <X size={16} className="text-red-600" />
              </button>

              {/* Move Right */}
              {index < images.length - 1 && (
                <button
                  onClick={() => moveImage(index, index + 1)}
                  className="p-2 bg-white rounded-full hover:bg-light-cream transition-colors"
                  title="Move right"
                >
                  →
                </button>
              )}
            </div>
          </div>
        ))}

        {/* Upload Button */}
        {images.length < maxImages && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="aspect-square border-2 border-dashed border-barely-beige rounded hover:border-warm-gray transition-colors flex flex-col items-center justify-center gap-2 text-warm-gray hover:text-soft-black disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading ? (
              <>
                <div className="w-8 h-8 border-2 border-warm-gray border-t-transparent rounded-full animate-spin" />
                <span className="text-xs">Uploading...</span>
              </>
            ) : (
              <>
                <Upload size={24} />
                <span className="text-xs">Add Image</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Validation Message */}
      {required && images.length === 0 && (
        <p className="text-sm text-red-600">
          At least one image is required
        </p>
      )}

      {/* Helper Text */}
      <p className="text-xs text-warm-gray mt-2">
        Recommended: Square images, minimum 800x800px, JPG or PNG
      </p>
    </div>
  )
}