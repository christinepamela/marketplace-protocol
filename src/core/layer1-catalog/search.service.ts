/**
 * Search Service
 * Handles federated product search across multiple client marketplaces
 */

import type {
  SearchQuery,
  SearchResults,
  SearchResultItem,
  ProductIndexEntry,
  SyncProductsRequest,
  Product
} from './types';

export class SearchService {
  private dbClient: any; // Supabase client
  
  constructor(dbClient: any) {
    this.dbClient = dbClient;
  }

  /**
   * Federated search across all or specific clients
   */
  async search(query: SearchQuery): Promise<SearchResults> {
    const startTime = Date.now();
    
    // Build search query
    let dbQuery = this.buildSearchQuery(query);
    
    // Execute search
    const { data, error, count } = await dbQuery;
    if (error) throw error;
    
    // Enrich results with vendor info
    const items = await this.enrichResults(data || []);
    
    // Calculate relevance scores
    const scoredItems = this.calculateRelevanceScores(items, query);
    
    // Sort results
    const sortedItems = this.sortResults(scoredItems, query.sortBy || 'relevance');
    
    // Apply pagination
    const paginatedItems = this.paginateResults(
      sortedItems,
      query.offset || 0,
      query.limit || 20
    );
    
    const executionTime = Date.now() - startTime;
    
    // Build aggregations for faceted search
    const aggregations = await this.buildAggregations(query);
    
    return {
      items: paginatedItems,
      total: count || sortedItems.length,
      query,
      executionTime,
      searchedClients: query.clientIds || await this.getAllClientIds(),
      aggregations
    };
  }

  /**
   * Sync products to federated index
   */
  async syncProducts(request: SyncProductsRequest): Promise<void> {
    const { clientId, products } = request;
    
    // Delete existing entries for this client
    await this.dbClient
      .from('product_index')
      .delete()
      .eq('client_id', clientId);
    
    // Insert new entries
    if (products.length > 0) {
      const indexEntries = products.map(p => ({
        product_id: p.productId,
        vendor_did: p.vendorDid,
        client_id: p.clientId,
        name: p.name,
        short_description: p.shortDescription,
        category: p.category,
        keywords: p.keywords,
        base_price: p.basePrice,
        origin_country: p.originCountry,
        sample_available: p.sampleAvailable,
        lead_time: p.leadTime,
        status: p.status,
        visibility: p.visibility,
        created_at: p.createdAt,
        updated_at: p.updatedAt,
        indexed_at: new Date()
      }));
      
      const { error } = await this.dbClient
        .from('product_index')
        .insert(indexEntries);
      
      if (error) throw error;
    }
  }

  /**
   * Index a single product
   */
  async indexProduct(product: Product): Promise<void> {
    // Only index active, public products
    if (product.status !== 'active' || product.visibility !== 'public') {
      await this.removeFromIndex(product.id);
      return;
    }
    
    const indexEntry: ProductIndexEntry = {
      productId: product.id,
      vendorDid: product.vendorDid,
      clientId: product.clientId,
      name: product.basic.name,
      shortDescription: product.basic.shortDescription,
      category: product.category,
      keywords: product.advanced.keywords || [],
      basePrice: product.pricing.basePrice,
      originCountry: product.logistics.originCountry,
      sampleAvailable: product.pricing.sample?.available || false,
      leadTime: product.logistics.leadTime,
      status: product.status,
      visibility: product.visibility,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
      indexedAt: new Date()
    };
    
    // Upsert (insert or update)
    const { error } = await this.dbClient
      .from('product_index')
      .upsert({
        product_id: indexEntry.productId,
        vendor_did: indexEntry.vendorDid,
        client_id: indexEntry.clientId,
        name: indexEntry.name,
        short_description: indexEntry.shortDescription,
        category: indexEntry.category,
        keywords: indexEntry.keywords,
        base_price: indexEntry.basePrice,
        origin_country: indexEntry.originCountry,
        sample_available: indexEntry.sampleAvailable,
        lead_time: indexEntry.leadTime,
        status: indexEntry.status,
        visibility: indexEntry.visibility,
        created_at: indexEntry.createdAt,
        updated_at: indexEntry.updatedAt,
        indexed_at: indexEntry.indexedAt
      }, {
        onConflict: 'product_id'
      });
    
    if (error) throw error;
  }

  /**
   * Remove product from index
   */
  async removeFromIndex(productId: string): Promise<void> {
    await this.dbClient
      .from('product_index')
      .delete()
      .eq('product_id', productId);
  }

  /**
   * Get search suggestions (autocomplete)
   */
  async getSuggestions(partialQuery: string, limit: number = 10): Promise<string[]> {
    const { data, error } = await this.dbClient
      .from('product_index')
      .select('name')
      .ilike('name', `%${partialQuery}%`)
      .eq('status', 'active')
      .eq('visibility', 'public')
      .limit(limit);
    
    if (error) throw error;
    
   return Array.from(new Set(data.map((d: any) => d.name)));
  }

  // ============================================================================
  // PRIVATE METHODS - QUERY BUILDING
  // ============================================================================

  /**
   * Build database query from search parameters
   */
  private buildSearchQuery(query: SearchQuery) {
    let dbQuery = this.dbClient
      .from('product_index')
      .select('*, products!inner(*)', { count: 'exact' })
      .eq('status', 'active')
      .eq('visibility', 'public');
    
    // Filter by client IDs
    if (query.clientIds && query.clientIds.length > 0) {
      dbQuery = dbQuery.in('client_id', query.clientIds);
    }
    
    // Text search
    if (query.query) {
      dbQuery = dbQuery.or(
        `name.ilike.%${query.query}%,short_description.ilike.%${query.query}%,keywords.cs.{${query.query}}`
      );
    }
    
    // Apply filters
    if (query.filters) {
      dbQuery = this.applyFilters(dbQuery, query.filters);
    }
    
    return dbQuery;
  }

  /**
   * Apply search filters
   */
  private applyFilters(dbQuery: any, filters: any) {
    // Category filters
    if (filters.category) {
      dbQuery = dbQuery.eq('category->>primary', filters.category);
    }
    
    if (filters.subcategory) {
      dbQuery = dbQuery.eq('category->>subcategory', filters.subcategory);
    }
    
    // Price range
    if (filters.minPrice !== undefined) {
      dbQuery = dbQuery.gte('base_price->>amount', filters.minPrice);
    }
    
    if (filters.maxPrice !== undefined) {
      dbQuery = dbQuery.lte('base_price->>amount', filters.maxPrice);
    }
    
    // Location
    if (filters.originCountry) {
      dbQuery = dbQuery.eq('origin_country', filters.originCountry);
    }
    
    // Sample availability
    if (filters.sampleAvailable !== undefined) {
      dbQuery = dbQuery.eq('sample_available', filters.sampleAvailable);
    }
    
    // Lead time
    if (filters.maxLeadTime !== undefined) {
      dbQuery = dbQuery.lte('lead_time', filters.maxLeadTime);
    }
    
    // Vendor reputation (requires join)
    if (filters.minVendorReputation !== undefined) {
      dbQuery = dbQuery.gte('products.vendor_reputation', filters.minVendorReputation);
    }
    
    return dbQuery;
  }

  // ============================================================================
  // PRIVATE METHODS - RESULT PROCESSING
  // ============================================================================

  /**
   * Enrich results with vendor information
   */
  private async enrichResults(indexResults: any[]): Promise<SearchResultItem[]> {
    const enriched: SearchResultItem[] = [];
    
    for (const result of indexResults) {
      // Get full product details
      const { data: productData } = await this.dbClient
        .from('products')
        .select('*')
        .eq('id', result.product_id)
        .single();
      
      if (!productData) continue;
      
      // Get vendor info from Layer 0
      const { data: identityData } = await this.dbClient
        .from('identities')
        .select('public_profile, verification_status')
        .eq('did', result.vendor_did)
        .single();
      
      const { data: reputationData } = await this.dbClient
        .from('reputations')
        .select('score')
        .eq('vendor_did', result.vendor_did)
        .single();
      
      const product = this.mapIndexResultToProduct(productData);
      
      enriched.push({
        product,
        score: 1.0, // Will be calculated
        vendor: {
          did: result.vendor_did,
          displayName: identityData?.public_profile?.displayName || 'Unknown',
          reputation: reputationData?.score || 0,
          verified: identityData?.verification_status === 'verified',
          country: identityData?.public_profile?.country
        }
      });
    }
    
    return enriched;
  }

  /**
   * Calculate relevance scores
   */
  private calculateRelevanceScores(
    items: SearchResultItem[],
    query: SearchQuery
  ): SearchResultItem[] {
    if (!query.query) {
      // No text search, all scores are 1.0
      return items;
    }
    
    const queryLower = query.query.toLowerCase();
    
    return items.map(item => {
      let score = 0;
      
      // Exact name match: +1.0
      if (item.product.basic.name.toLowerCase() === queryLower) {
        score += 1.0;
      }
      // Name contains query: +0.5
      else if (item.product.basic.name.toLowerCase().includes(queryLower)) {
        score += 0.5;
      }
      
      // Description contains query: +0.3
      if (item.product.basic.description?.toLowerCase().includes(queryLower)) {
        score += 0.3;
      }
      
      // Keywords match: +0.2 per keyword
      if (item.product.advanced.keywords) {
        const matchingKeywords = item.product.advanced.keywords.filter(k =>
          k.toLowerCase().includes(queryLower)
        );
        score += matchingKeywords.length * 0.2;
      }
      
      // Vendor reputation bonus (0-0.2)
      score += (item.vendor.reputation / 500) * 0.2;
      
      // Verified vendor bonus: +0.1
      if (item.vendor.verified) {
        score += 0.1;
      }
      
      return {
        ...item,
        score: Math.min(score, 1.0) // Cap at 1.0
      };
    });
  }

  /**
   * Sort results
   */
  private sortResults(items: SearchResultItem[], sortBy: string): SearchResultItem[] {
    switch (sortBy) {
      case 'relevance':
        return items.sort((a, b) => b.score - a.score);
      
      case 'price_asc':
        return items.sort((a, b) => 
          a.product.pricing.basePrice.amount - b.product.pricing.basePrice.amount
        );
      
      case 'price_desc':
        return items.sort((a, b) => 
          b.product.pricing.basePrice.amount - a.product.pricing.basePrice.amount
        );
      
      case 'newest':
        return items.sort((a, b) => 
          b.product.createdAt.getTime() - a.product.createdAt.getTime()
        );
      
      case 'popular':
        return items.sort((a, b) => 
          (b.product.stats?.orders || 0) - (a.product.stats?.orders || 0)
        );
      
      case 'vendor_reputation':
        return items.sort((a, b) => b.vendor.reputation - a.vendor.reputation);
      
      default:
        return items;
    }
  }

  /**
   * Paginate results
   */
  private paginateResults(
    items: SearchResultItem[],
    offset: number,
    limit: number
  ): SearchResultItem[] {
    return items.slice(offset, offset + limit);
  }

  /**
   * Build aggregations for faceted search
   */
  private async buildAggregations(query: SearchQuery) {
    // Get category counts
    const { data: categoryCounts } = await this.dbClient
      .from('product_index')
      .select('category->primary', { count: 'exact' })
      .eq('status', 'active')
      .eq('visibility', 'public');
    
    // Get country counts
    const { data: countryCounts } = await this.dbClient
      .from('product_index')
      .select('origin_country', { count: 'exact' })
      .eq('status', 'active')
      .eq('visibility', 'public');
    
    return {
      categories: this.aggregateCounts(categoryCounts, 'primary'),
      countries: this.aggregateCounts(countryCounts, 'origin_country'),
      priceRanges: {
        '0-50': 0,
        '50-200': 0,
        '200-500': 0,
        '500+': 0
      }
    };
  }

  /**
   * Aggregate counts helper
   */
  private aggregateCounts(data: any[], field: string): Record<string, number> {
    const counts: Record<string, number> = {};
    data?.forEach(item => {
      const value = item[field];
      counts[value] = (counts[value] || 0) + 1;
    });
    return counts;
  }

  /**
   * Get all client IDs
   */
  private async getAllClientIds(): Promise<string[]> {
    const { data } = await this.dbClient
      .from('product_index')
      .select('client_id')
      .eq('status', 'active');
    
    return Array.from(new Set(data?.map((d: any) => d.client_id) || []));
  }

  /**
   * Map index result to Product
   */
  private mapIndexResultToProduct(data: any): Product {
    return {
      id: data.id,
      vendorDid: data.vendor_did,
      clientId: data.client_id,
      category: data.category,
      basic: data.basic,
      advanced: data.advanced,
      pricing: data.pricing,
      logistics: data.logistics,
      status: data.status,
      visibility: data.visibility,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
      lastSyncedAt: data.last_synced_at ? new Date(data.last_synced_at) : undefined,
      stats: data.stats
    };
  }
}