/**
 * Product API Functions
 * Helper functions to interact with the catalog SDK
 */

import { sdk } from '@/lib/sdk'
import type { Product, SearchQuery, SearchResults, SearchFilters } from '@rangkai/sdk'

/**
 * Get products with optional filters
 */
export async function getProducts(options?: {
  category?: string
  limit?: number
  offset?: number
  sortBy?: 'newest' | 'price_asc' | 'price_desc' | 'popular'
}): Promise<SearchResults> {
  try {
    const result = await sdk.catalog.search({
      filters: options?.category ? { category: options.category as any } : undefined,
      limit: options?.limit || 20,
      offset: options?.offset || 0,
      sortBy: options?.sortBy || 'newest'
    })
    
    return result
  } catch (error) {
    console.error('Failed to fetch products:', error)
    console.error('Error details:', error)
    
    // Return mock data if API fails (temporary for development)
    return getMockSearchResults()
  }
}

/**
 * Mock data for development (temporary)
 */
function getMockSearchResults(): SearchResults {
  return {
    items: [],
    total: 0,
    query: {},
    executionTime: 0,
    searchedClients: []
  }
}

/**
 * Get single product by ID
 */
export async function getProduct(id: string): Promise<Product> {
  try {
    const product = await sdk.catalog.getProduct(id)
    return product
  } catch (error) {
    console.error('Failed to fetch product:', error)
    throw error
  }
}

/**
 * Search products with text query and filters
 */
export async function searchProducts(
  query: string,
  filters?: SearchFilters,
  options?: {
    sortBy?: 'relevance' | 'price_asc' | 'price_desc' | 'newest' | 'popular'
    limit?: number
    offset?: number
  }
): Promise<SearchResults> {
  try {
    const result = await sdk.catalog.search({
      query,
      filters,
      sortBy: options?.sortBy || 'relevance',
      limit: options?.limit || 20,
      offset: options?.offset || 0
    })
    
    return result
  } catch (error) {
    console.error('Failed to search products:', error)
    throw error
  }
}

/**
 * Get products by vendor
 */
export async function getVendorProducts(vendorDid: string): Promise<Product[]> {
  try {
    // This will be implemented when we add vendor profile pages
    // For now, use search with vendor filter
    const result = await sdk.catalog.search({
      filters: {
        // Add vendor filter when SDK supports it
      } as any,
      limit: 50
    })
    
    // Filter client-side for now
    return result.items
      .map(item => item.product)
      .filter(p => p.vendorDid === vendorDid)
  } catch (error) {
    console.error('Failed to fetch vendor products:', error)
    throw error
  }
}

/**
 * Get vendor reputation
 */
export async function getVendorReputation(vendorDid: string) {
  try {
    const reputation = await sdk.identity.getReputation(vendorDid)
    return reputation
  } catch (error) {
    console.error('Failed to fetch vendor reputation:', error)
    // Return default if not found
    return {
      vendorDid,
      score: 0,
      metrics: {
        transactionsCompleted: 0,
        averageRating: 0,
        totalRatings: 0
      }
    }
  }
}

/**
 * Get vendor identity
 */
export async function getVendorIdentity(vendorDid: string) {
  try {
    const identity = await sdk.identity.getIdentity(vendorDid)
    return identity
  } catch (error) {
    console.error('Failed to fetch vendor identity:', error)
    return null
  }
}