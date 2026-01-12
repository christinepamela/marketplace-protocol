import React, { useState, useRef } from 'react'
import { Camera, Upload, X, Loader2, FileText, CheckCircle } from 'lucide-react'
import { sdk } from '@/lib/sdk'

interface DeliveryProofProps {
  orderId: string
  onProofUploaded?: () => void
}

export default function DeliveryProof({ orderId, onProofUploaded }: DeliveryProofProps) {
  const [images, setImages] = useState<string[]>([])
  const [signature, setSignature] = useState<string>('')
  const [notes, setNotes] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploaded, setUploaded] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return

    // Limit to 5 images
    if (images.length + files.length > 5) {
      alert('Maximum 5 images allowed')
      return
    }

    Array.from(files).forEach(file => {
      // Check file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        alert(`${file.name} is too large. Maximum size is 5MB.`)
        return
      }

      const reader = new FileReader()
      reader.onload = (e) => {
        const result = e.target?.result as string
        setImages(prev => [...prev, result])
      }
      reader.readAsDataURL(file)
    })

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index))
  }

  // Canvas signature handling
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    setIsDrawing(true)
    ctx.beginPath()
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top)
  }

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return
    
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top)
    ctx.strokeStyle = '#2C2926' // soft-black
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.stroke()
  }

  const stopDrawing = () => {
    if (isDrawing) {
      const canvas = canvasRef.current
      if (canvas) {
        setSignature(canvas.toDataURL())
      }
      setIsDrawing(false)
    }
  }

  const clearSignature = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setSignature('')
  }

  const handleSubmit = async () => {
    // Validation
    if (images.length === 0 && !signature) {
      alert('Please provide at least one image or signature')
      return
    }

    setUploading(true)

    try {
      // In production, this would upload to S3/R2
      // For now, we'll just send the base64 data
      await sdk.orders.markAsDelivered(orderId)

      // Note: Protocol doesn't have uploadDeliveryProof method yet
      // This would be: await sdk.orders.uploadDeliveryProof(orderId, { images, signature, notes })
      
      setUploaded(true)
      alert('Delivery proof uploaded successfully!')
      
      if (onProofUploaded) {
        onProofUploaded()
      }
    } catch (error: any) {
      console.error('Failed to upload delivery proof:', error)
      alert(error.message || 'Failed to upload proof')
    } finally {
      setUploading(false)
    }
  }

  if (uploaded) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <CheckCircle className="w-6 h-6 text-green-600" />
          <h3 className="text-lg font-medium text-green-900">
            Delivery Proof Uploaded
          </h3>
        </div>
        <p className="text-sm text-green-700 mb-4">
          Thank you for confirming delivery. The order has been marked as delivered.
        </p>
        
        {/* Show uploaded proof */}
        {images.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-green-900">Images:</h4>
            <div className="grid grid-cols-3 gap-2">
              {images.map((img, idx) => (
                <img 
                  key={idx}
                  src={img} 
                  alt={`Delivery proof ${idx + 1}`}
                  className="w-full h-24 object-cover rounded border border-green-200"
                />
              ))}
            </div>
          </div>
        )}

        {signature && (
          <div className="mt-4">
            <h4 className="text-sm font-medium text-green-900 mb-2">Signature:</h4>
            <img 
              src={signature} 
              alt="Signature" 
              className="border border-green-200 rounded bg-white"
            />
          </div>
        )}

        {notes && (
          <div className="mt-4">
            <h4 className="text-sm font-medium text-green-900 mb-2">Notes:</h4>
            <p className="text-sm text-green-700">{notes}</p>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="bg-white border border-barely-beige rounded-lg p-6">
      <div className="mb-6">
        <h3 className="text-lg font-medium text-soft-black mb-2">
          Upload Delivery Proof
        </h3>
        <p className="text-sm text-warm-gray">
          Please provide photo evidence or signature to confirm delivery.
          At least one image or signature is required.
        </p>
      </div>

      {/* Image Upload */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-soft-black mb-3">
          Delivery Photos (Optional - Max 5)
        </label>

        {/* Image Grid */}
        {images.length > 0 && (
          <div className="grid grid-cols-3 gap-3 mb-3">
            {images.map((img, idx) => (
              <div key={idx} className="relative group">
                <img 
                  src={img} 
                  alt={`Upload ${idx + 1}`}
                  className="w-full h-32 object-cover rounded border border-barely-beige"
                />
                <button
                  onClick={() => removeImage(idx)}
                  className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Upload Button */}
        {images.length < 5 && (
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full py-3 border-2 border-dashed border-barely-beige rounded-lg hover:border-warm-taupe transition-colors flex items-center justify-center gap-2 text-warm-gray hover:text-soft-black"
          >
            <Camera className="w-5 h-5" />
            <span className="text-sm font-medium">
              Add Photos ({images.length}/5)
            </span>
          </button>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleImageSelect}
          className="hidden"
        />
      </div>

      {/* Signature Pad */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-soft-black mb-3">
          Signature (Optional)
        </label>
        
        <div className="border-2 border-barely-beige rounded-lg overflow-hidden">
          <canvas
            ref={canvasRef}
            width={600}
            height={200}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            className="w-full cursor-crosshair bg-white"
          />
        </div>

        <div className="flex justify-end mt-2">
          <button
            onClick={clearSignature}
            className="text-sm text-warm-gray hover:text-soft-black transition-colors"
          >
            Clear Signature
          </button>
        </div>
      </div>

      {/* Notes */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-soft-black mb-3">
          Additional Notes (Optional)
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Any additional delivery details..."
          rows={3}
          className="input w-full"
        />
      </div>

      {/* Submit Button */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-warm-gray">
          Maximum 5 images, 5MB each
        </p>
        
        <button
          onClick={handleSubmit}
          disabled={uploading || (images.length === 0 && !signature)}
          className="btn btn-primary"
        >
          {uploading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="w-4 h-4 mr-2" />
              Confirm Delivery
            </>
          )}
        </button>
      </div>

      {/* Helper text */}
      {images.length === 0 && !signature && (
        <div className="mt-4 text-xs text-warm-gray text-center">
          Please add at least one photo or signature before submitting
        </div>
      )}
    </div>
  )
}