'use client'

import { useState, useRef, useEffect } from 'react'

// Common B2B trading countries — name shown to user, ISO code stored
const COUNTRIES = [
  { code: 'AU', name: 'Australia' },
  { code: 'BD', name: 'Bangladesh' },
  { code: 'BR', name: 'Brazil' },
  { code: 'CN', name: 'China' },
  { code: 'EG', name: 'Egypt' },
  { code: 'ET', name: 'Ethiopia' },
  { code: 'FR', name: 'France' },
  { code: 'DE', name: 'Germany' },
  { code: 'GH', name: 'Ghana' },
  { code: 'HK', name: 'Hong Kong' },
  { code: 'IN', name: 'India' },
  { code: 'ID', name: 'Indonesia' },
  { code: 'IT', name: 'Italy' },
  { code: 'JP', name: 'Japan' },
  { code: 'KE', name: 'Kenya' },
  { code: 'KR', name: 'South Korea' },
  { code: 'MY', name: 'Malaysia' },
  { code: 'MX', name: 'Mexico' },
  { code: 'MA', name: 'Morocco' },
  { code: 'MM', name: 'Myanmar' },
  { code: 'NG', name: 'Nigeria' },
  { code: 'PK', name: 'Pakistan' },
  { code: 'PH', name: 'Philippines' },
  { code: 'PL', name: 'Poland' },
  { code: 'PT', name: 'Portugal' },
  { code: 'SA', name: 'Saudi Arabia' },
  { code: 'SG', name: 'Singapore' },
  { code: 'ZA', name: 'South Africa' },
  { code: 'ES', name: 'Spain' },
  { code: 'LK', name: 'Sri Lanka' },
  { code: 'TW', name: 'Taiwan' },
  { code: 'TH', name: 'Thailand' },
  { code: 'TR', name: 'Turkey' },
  { code: 'AE', name: 'United Arab Emirates' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'US', name: 'United States' },
  { code: 'VN', name: 'Vietnam' },
]

interface CountryComboboxProps {
  value: string           // ISO code stored in form state
  onChange: (code: string) => void
  placeholder?: string
  required?: boolean
  className?: string
  error?: boolean
}

export default function CountryCombobox({
  value,
  onChange,
  placeholder = 'Type a country…',
  required = false,
  className = '',
  error = false,
}: CountryComboboxProps) {
  // Display text the user sees while typing
  const [inputValue, setInputValue] = useState('')
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // When the stored ISO value changes externally (e.g. edit mode pre-fill),
  // sync the display text to the country name
  useEffect(() => {
    if (value) {
      const match = COUNTRIES.find(c => c.code === value)
      setInputValue(match ? match.name : value)
    } else {
      setInputValue('')
    }
  }, [value])

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
        // If user typed something that doesn't match, revert to last valid value
        if (value) {
          const match = COUNTRIES.find(c => c.code === value)
          setInputValue(match ? match.name : value)
        }
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [value])

  const filtered = inputValue.length === 0
    ? COUNTRIES
    : COUNTRIES.filter(c =>
        c.name.toLowerCase().includes(inputValue.toLowerCase()) ||
        c.code.toLowerCase().includes(inputValue.toLowerCase())
      )

  function handleSelect(country: { code: string; name: string }) {
    onChange(country.code)
    setInputValue(country.name)
    setOpen(false)
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    setInputValue(e.target.value)
    setOpen(true)
    // If the typed text exactly matches a country name or code, store it
    const exact = COUNTRIES.find(
      c => c.name.toLowerCase() === e.target.value.toLowerCase() ||
           c.code.toLowerCase() === e.target.value.toLowerCase()
    )
    if (exact) {
      onChange(exact.code)
    } else {
      onChange('')
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        required={required}
        value={inputValue}
        onChange={handleInputChange}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        autoComplete="off"
        className={`input w-full ${error ? 'border-red-500' : ''} ${className}`}
      />
      {open && filtered.length > 0 && (
        <ul className="absolute z-50 mt-1 w-full max-h-48 overflow-y-auto bg-white border border-barely-beige shadow-md">
          {filtered.map(country => (
            <li
              key={country.code}
              onMouseDown={() => handleSelect(country)}
              className={`px-3 py-2 text-sm cursor-pointer hover:bg-light-cream flex justify-between ${
                country.code === value ? 'bg-light-cream font-medium' : ''
              }`}
            >
              <span>{country.name}</span>
              <span className="text-warm-gray text-xs ml-2">{country.code}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}