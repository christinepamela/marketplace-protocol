/**
 * Utility functions for formatting data
 */

import type { Price, CurrencyCode } from '@rangkai/sdk'

/**
 * Format price with currency symbol
 */
export function formatPrice(price: Price): string {
  const symbols: Record<CurrencyCode, string> = {
    USD: '$',
    EUR: '€',
    GBP: '£',
    MYR: 'RM',
    SGD: 'S$',
    AUD: 'A$',
    BTC: '₿'
  }

  const symbol = symbols[price.currency] || price.currency
  const formatted = price.amount.toFixed(2)

  // For most currencies, symbol goes before
  if (price.currency === 'MYR') {
    return `${symbol} ${formatted}`
  }

  return `${symbol}${formatted}`
}

/**
 * Format price range (for tiered pricing)
 */
export function formatPriceRange(min: number, max: number, currency: CurrencyCode): string {
  return `${formatPrice({ amount: min, currency })} - ${formatPrice({ amount: max, currency })}`
}

/**
 * Format date relative to now (e.g., "2 days ago")
 */
export function formatDateRelative(date: Date | string): string {
  const now = new Date()
  const then = new Date(date)
  const seconds = Math.floor((now.getTime() - then.getTime()) / 1000)

  if (seconds < 60) return 'just now'
  
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  
  const months = Math.floor(days / 30)
  if (months < 12) return `${months}mo ago`
  
  const years = Math.floor(months / 12)
  return `${years}y ago`
}

/**
 * Format date as readable string (e.g., "Jan 15, 2025")
 */
export function formatDate(date: Date | string): string {
  const d = new Date(date)
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

/**
 * Format reputation score (0-500) to star rating (0-5)
 */
export function formatReputation(score: number): {
  stars: number
  label: string
} {
  // Convert 0-500 to 0-5 stars
  const stars = Math.min(5, Math.max(0, score / 100))
  
  let label: string
  if (stars >= 4.5) label = 'Excellent'
  else if (stars >= 4.0) label = 'Very Good'
  else if (stars >= 3.0) label = 'Good'
  else if (stars >= 2.0) label = 'Fair'
  else label = 'New Vendor'

  return {
    stars: Math.round(stars * 10) / 10, // Round to 1 decimal
    label
  }
}

/**
 * Format large numbers with K/M suffix
 */
export function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M'
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K'
  }
  return num.toString()
}

/**
 * Format weight with unit
 */
export function formatWeight(value: number, unit: 'kg' | 'lb' | 'g'): string {
  return `${value}${unit}`
}

/**
 * Format dimensions
 */
export function formatDimensions(
  length: number,
  width: number,
  height: number,
  unit: 'cm' | 'in'
): string {
  return `${length} × ${width} × ${height} ${unit}`
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength - 3) + '...'
}

/**
 * Get star emoji based on rating
 */
export function getStarRating(rating: number): string {
  const fullStars = Math.floor(rating)
  const hasHalfStar = rating % 1 >= 0.5
  
  let stars = '⭐'.repeat(fullStars)
  if (hasHalfStar && fullStars < 5) {
    stars += '½'
  }
  
  return stars || '☆' // Empty star if no rating
}