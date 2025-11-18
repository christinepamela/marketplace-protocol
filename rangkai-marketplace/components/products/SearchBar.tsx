'use client'

import { Search, X } from 'lucide-react'
import { useState, useEffect } from 'react'

interface SearchBarProps {
  defaultValue?: string
  onSearch: (query: string) => void
  placeholder?: string
}

/**
 * Search bar with debounced input
 */
export default function SearchBar({
  defaultValue = '',
  onSearch,
  placeholder = 'Search for products...'
}: SearchBarProps) {
  const [query, setQuery] = useState(defaultValue)

  // Debounce search (wait 500ms after user stops typing)
  useEffect(() => {
    const timer = setTimeout(() => {
      onSearch(query)
    }, 500)

    return () => clearTimeout(timer)
  }, [query, onSearch])

  const handleClear = () => {
    setQuery('')
    onSearch('')
  }

  return (
    <div className="relative">
      <div className="relative">
        <Search 
          className="absolute left-4 top-1/2 -translate-y-1/2 text-warm-gray" 
          size={20}
        />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className="input pl-12 pr-12 w-full"
        />
        {query && (
          <button
            onClick={handleClear}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-warm-gray hover:text-soft-black transition-colors"
            aria-label="Clear search"
          >
            <X size={20} />
          </button>
        )}
      </div>
    </div>
  )
}