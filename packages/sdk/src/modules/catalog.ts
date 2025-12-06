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
    return this.http.post('/catalog/products', request);
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
    return this.http.get(`/catalog/products/${productId}`);
  }

  /**
   * Get products by vendor
   * Public endpoint
   * 
   * @param vendorDid - Vendor's DID
   * @param options - Query options (status, limit, offset)
   * @returns List of products
   * 
   * @example
   * const products = await sdk.catalog.getByVendor('did:rangkai:...', {
   *   status: 'active',
   *   limit: 20,
   *   offset: 0
   * });
   */
  async getByVendor(
    vendorDid: string,
    options?: { 
      status?: 'active' | 'draft' | 'inactive' | 'out_of_stock' | 'discontinued';
      limit?: number; 
      offset?: number;
    }
  ): Promise<Product[]> {
    // ✅ FIXED: Use query parameters to match protocol route
    // Protocol expects: GET /catalog/products?vendorDid=xxx&status=xxx&limit=xx&offset=xx
    const params: Record<string, any> = {
      vendorDid, // Pass vendorDid as query parameter
    };
    
    // Add optional parameters if provided
    if (options?.status) params.status = options.status;
    if (options?.limit) params.limit = options.limit;
    if (options?.offset) params.offset = options.offset;
    
    return this.http.get('/catalog/products', params);
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
    // Convert SearchQuery object to URL query parameters
    // to match protocol's GET /catalog/search endpoint
    const params: Record<string, any> = {};
    
    // Main query text
    if (query.query) {
      params.q = query.query;
    }
    
    // Sorting and pagination
    if (query.sortBy) params.sortBy = query.sortBy;
    if (query.limit) params.limit = query.limit;
    if (query.offset) {
      // Protocol uses 'page' param, calculate from offset
      params.page = Math.floor(query.offset / (query.limit || 20)) + 1;
    }
    
    // Flatten filters object to individual query params
    if (query.filters) {
      if (query.filters.category) params.category = query.filters.category;
      if (query.filters.subcategory) params.subcategory = query.filters.subcategory;
      if (query.filters.minPrice !== undefined) params.minPrice = query.filters.minPrice.toString();
      if (query.filters.maxPrice !== undefined) params.maxPrice = query.filters.maxPrice.toString();
      if (query.filters.currency) params.currency = query.filters.currency;
      if (query.filters.originCountry) params.originCountry = query.filters.originCountry;
      if (query.filters.verifiedVendorsOnly !== undefined) {
        params.verifiedOnly = query.filters.verifiedVendorsOnly.toString();
      }
    }
    
    return this.http.get('/catalog/search', params);
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
    return this.http.put(`/catalog/products/${productId}`, updates);
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
    return this.http.delete(`/catalog/products/${productId}`);
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
    return this.http.get(`/catalog/products/${productId}/stats`);
  }
}