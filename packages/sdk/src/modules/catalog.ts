/**
 * Catalog Module (Layer 1)
 * Product discovery and search
 */

import type { HttpClient } from '../client';
import type {
  Product,
  SearchQuery,
  SearchResults,
  Category,
  BasicSpecifications,
  AdvancedSpecifications,
  ProductPricing,
  LogisticsInfo,
  ProductVisibility,
} from '../types';

// ============================================================================
// REQUEST/RESPONSE TYPES
// ============================================================================

export interface CreateProductRequest {
  vendorDid: string;
  clientId: string;
  category: Category;
  basic: BasicSpecifications;
  advanced: AdvancedSpecifications;
  pricing: ProductPricing;
  logistics: LogisticsInfo;
  visibility?: ProductVisibility;
}

export interface CreateProductResponse {
  productId: string;
  status: string;
  createdAt: string;
}

export interface UpdateProductRequest {
  productId: string;
  updates: Partial<Omit<Product, 'id' | 'vendorDid' | 'clientId' | 'createdAt'>>;
}

// ============================================================================
// CATALOG MODULE
// ============================================================================

export class CatalogModule {
  constructor(private readonly http: HttpClient) {}

  /**
   * Create new product listing
   * Requires authentication
   * 
   * @param request - Product details
   * @returns Created product ID and status
   * 
   * @example
   * const product = await sdk.catalog.create({
   *   vendorDid: 'did:rangkai:...',
   *   clientId: 'my-marketplace',
   *   category: {
   *     primary: 'footwear',
   *     subcategory: 'leather-shoes',
   *     tags: ['handmade', 'custom']
   *   },
   *   basic: {
   *     name: 'Custom Leather Oxford Shoes',
   *     description: '...',
   *     images: { primary: 'https://...' },
   *     condition: 'new'
   *   },
   *   pricing: { basePrice: { amount: 150, currency: 'USD' }, moq: 1 },
   *   logistics: { ... }
   * });
   */
  async create(request: CreateProductRequest): Promise<CreateProductResponse> {
    return this.http.post('/products', request);
  }

  /**
   * Get product by ID
   * Public endpoint
   * 
   * @param productId - Product UUID
   * @returns Product details
   * 
   * @example
   * const product = await sdk.catalog.getById('uuid-here');
   */
  async getById(productId: string): Promise<Product> {
    return this.http.get(`/products/${productId}`);
  }

  /**
   * Get products by vendor
   * Public endpoint
   * 
   * @param vendorDid - Vendor's DID
   * @param options - Query options
   * @returns List of products
   * 
   * @example
   * const products = await sdk.catalog.getByVendor('did:rangkai:...', {
   *   limit: 20,
   *   offset: 0
   * });
   */
  async getByVendor(
    vendorDid: string,
    options?: { limit?: number; offset?: number }
  ): Promise<Product[]> {
    return this.http.get(`/products/vendor/${vendorDid}`, options);
  }

  /**
   * Search products
   * Public endpoint - federated search across all marketplaces
   * 
   * @param query - Search query with filters
   * @returns Search results with relevance scores
   * 
   * @example
   * const results = await sdk.catalog.search({
   *   query: 'leather shoes',
   *   filters: {
   *     category: 'footwear',
   *     minPrice: 50,
   *     maxPrice: 200,
   *     originCountry: 'US',
   *     verifiedVendorsOnly: true
   *   },
   *   sortBy: 'price_asc',
   *   limit: 20
   * });
   */
  async search(query: SearchQuery): Promise<SearchResults> {
    return this.http.post('/products/search', query);
  }

  /**
   * Update product
   * Requires authentication - can only update own products
   * 
   * @param productId - Product UUID
   * @param updates - Fields to update
   * @returns Updated product
   * 
   * @example
   * await sdk.catalog.update('uuid-here', {
   *   status: 'active',
   *   pricing: { basePrice: { amount: 140, currency: 'USD' }, moq: 1 }
   * });
   */
  async update(productId: string, updates: Partial<Product>): Promise<Product> {
    return this.http.put(`/products/${productId}`, updates);
  }

  /**
   * Delete product
   * Requires authentication - can only delete own products
   * 
   * @param productId - Product UUID
   * @returns Deletion confirmation
   * 
   * @example
   * await sdk.catalog.delete('uuid-here');
   */
  async delete(productId: string): Promise<{ message: string }> {
    return this.http.delete(`/products/${productId}`);
  }

  /**
   * Get product stats (views, inquiries, orders)
   * Requires authentication - can only view own product stats
   * 
   * @param productId - Product UUID
   * @returns Analytics data
   * 
   * @example
   * const stats = await sdk.catalog.getStats('uuid-here');
   * console.log(`Views: ${stats.views}, Orders: ${stats.orders}`);
   */
  async getStats(productId: string): Promise<{
    views: number;
    inquiries: number;
    orders: number;
  }> {
    return this.http.get(`/products/${productId}/stats`);
  }
}