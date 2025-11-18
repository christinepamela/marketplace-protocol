'use client'

import { useState } from 'react'
import type { SearchFilters } from '@rangkai/sdk'

interface FilterSidebarProps {
  onFilterChange: (filters: SearchFilters) => void
  initialFilters?: SearchFilters
}

/**
 * Filter sidebar for product search
 */
export default function FilterSidebar({ 
  onFilterChange,
  initialFilters = {}
}: FilterSidebarProps) {
  const [filters, setFilters] = useState<SearchFilters>(initialFilters)

  const updateFilter = (key: keyof SearchFilters, value: any) => {
    const newFilters = { ...filters, [key]: value }
    setFilters(newFilters)
    onFilterChange(newFilters)
  }

  const clearFilters = () => {
    setFilters({})
    onFilterChange({})
  }

  const hasFilters = Object.keys(filters).length > 0

  return (
    <div className="bg-white border border-barely-beige p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-soft-black">Filters</h3>
        {hasFilters && (
          <button
            onClick={clearFilters}
            className="text-sm text-warm-taupe hover:text-soft-black transition-colors"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Gender Filter */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-soft-black">Gender</h4>
        <div className="space-y-2">
          {['Men', 'Women', 'Unisex', 'Kids'].map((gender) => (
            <label key={gender} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.attributes?.gender?.includes(gender)}
                onChange={(e) => {
                  const current = filters.attributes?.gender || []
                  const updated = e.target.checked
                    ? [...current, gender]
                    : current.filter(g => g !== gender)
                  updateFilter('attributes', { ...filters.attributes, gender: updated })
                }}
                className="w-4 h-4"
              />
              <span className="text-sm text-warm-gray">{gender}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Price Range */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-soft-black">Price Range</h4>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <input
              type="number"
              placeholder="Min"
              value={filters.minPrice || ''}
              onChange={(e) => updateFilter('minPrice', e.target.value ? Number(e.target.value) : undefined)}
              className="input text-sm w-full"
            />
            <span className="text-warm-gray">-</span>
            <input
              type="number"
              placeholder="Max"
              value={filters.maxPrice || ''}
              onChange={(e) => updateFilter('maxPrice', e.target.value ? Number(e.target.value) : undefined)}
              className="input text-sm w-full"
            />
          </div>
        </div>
      </div>

      {/* Material Filter */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-soft-black">Material</h4>
        <div className="space-y-2">
          {['Leather', 'Suede', 'Canvas', 'Synthetic'].map((material) => (
            <label key={material} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.attributes?.material?.includes(material)}
                onChange={(e) => {
                  const current = filters.attributes?.material || []
                  const updated = e.target.checked
                    ? [...current, material]
                    : current.filter(m => m !== material)
                  updateFilter('attributes', { ...filters.attributes, material: updated })
                }}
                className="w-4 h-4"
              />
              <span className="text-sm text-warm-gray">{material}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Style Filter */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-soft-black">Style</h4>
        <div className="space-y-2">
          {['Casual', 'Formal', 'Sport', 'Traditional'].map((style) => (
            <label key={style} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.attributes?.style?.includes(style)}
                onChange={(e) => {
                  const current = filters.attributes?.style || []
                  const updated = e.target.checked
                    ? [...current, style]
                    : current.filter(s => s !== style)
                  updateFilter('attributes', { ...filters.attributes, style: updated })
                }}
                className="w-4 h-4"
              />
              <span className="text-sm text-warm-gray">{style}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Sample Available */}
      <div className="space-y-3">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={filters.sampleAvailable || false}
            onChange={(e) => updateFilter('sampleAvailable', e.target.checked || undefined)}
            className="w-4 h-4"
          />
          <span className="text-sm text-soft-black">Sample Available</span>
        </label>
      </div>

      {/* Verified Vendors Only */}
      <div className="space-y-3">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={filters.verifiedVendorsOnly || false}
            onChange={(e) => updateFilter('verifiedVendorsOnly', e.target.checked || undefined)}
            className="w-4 h-4"
          />
          <span className="text-sm text-soft-black">Verified Vendors Only</span>
        </label>
      </div>
    </div>
  )
}