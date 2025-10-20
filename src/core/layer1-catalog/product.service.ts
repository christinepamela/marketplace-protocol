/**
 * Product Service
 * Handles product CRUD operations and management
 */

import { v4 as uuidv4 } from 'uuid';
import type {
  Product,
  ProductStatus,
  ProductVisibility,
  CreateProductRequest,
  CreateProductResponse,
  UpdateProductRequest,
  REQUIRED_PRODUCT_FIELDS
} from './types';

// Import constants separately (not as types)
import { PRODUCT_LIMITS } from './types';

export class ProductService {
  private dbClient: any; // Supabase client
  
  constructor(dbClient: any) {
    this.dbClient = dbClient;
  }

  /**
   * Create a new product
   */
  async createProduct(request: CreateProductRequest): Promise<CreateProductResponse> {
    // Validate required fields
    this.validateProductRequest(request);
    
    // Generate product ID
    const productId = uuidv4();
    
    // Build product object
    const product: Product = {
      id: productId,
      vendorDid: request.vendorDid,
      clientId: request.clientId,
      category: request.category,
      basic: request.basic,
      advanced: request.advanced,
      pricing: request.pricing,
      logistics: request.logistics,
      status: 'draft', // New products start as draft
      visibility: request.visibility || 'public',
      createdAt: new Date(),
      updatedAt: new Date(),
      stats: {
        views: 0,
        inquiries: 0,
        orders: 0
      }
    };
    
    // Store in database
    await this.storeProduct(product);
    
    // Trigger index sync (async, don't wait)
    this.triggerIndexSync(product).catch(err => 
      console.error('Failed to sync to index:', err)
    );
    
    return {
      productId,
      status: product.status,
      createdAt: product.createdAt
    };
  }

  /**
   * Get product by ID
   */
  async getProductById(productId: string): Promise<Product | null> {
    const { data, error } = await this.dbClient
      .from('products')
      .select('*')
      .eq('id', productId)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw error;
    }
    
    return this.mapDatabaseToProduct(data);
  }

  /**
   * Update product
   */
  async updateProduct(request: UpdateProductRequest): Promise<void> {
    const { productId, updates } = request;
    
    // Get existing product
    const product = await this.getProductById(productId);
    if (!product) {
      throw new Error(`Product not found: ${productId}`);
    }
    
    // Validate updates
    if (updates.basic) {
      this.validateBasicSpecs(updates.basic);
    }
    
    if (updates.pricing) {
      this.validatePricing(updates.pricing);
    }
    
    // Apply updates
    const updatedProduct: Product = {
      ...product,
      ...updates,
      updatedAt: new Date()
    };
    
    // Save to database
    await this.updateProductInDb(updatedProduct);
    
    // Trigger index sync
    this.triggerIndexSync(updatedProduct).catch(err =>
      console.error('Failed to sync to index:', err)
    );
  }

  /**
   * Delete product (soft delete - mark as discontinued)
   */
  async deleteProduct(productId: string): Promise<void> {
    const product = await this.getProductById(productId);
    if (!product) {
      throw new Error(`Product not found: ${productId}`);
    }
    
    product.status = 'discontinued';
    product.visibility = 'private';
    product.updatedAt = new Date();
    
    await this.updateProductInDb(product);
    
    // Remove from search index
    await this.removeFromIndex(productId);
  }

  /**
   * Publish product (draft → active)
   */
  async publishProduct(productId: string): Promise<void> {
    const product = await this.getProductById(productId);
    if (!product) {
      throw new Error(`Product not found: ${productId}`);
    }
    
    // Validate product is ready for publishing
    this.validateForPublish(product);
    
    product.status = 'active';
    product.updatedAt = new Date();
    
    await this.updateProductInDb(product);
    await this.triggerIndexSync(product);
  }

  /**
   * Get products by vendor
   */
  async getProductsByVendor(
    vendorDid: string,
    filters?: {
      status?: ProductStatus;
      visibility?: ProductVisibility;
      limit?: number;
      offset?: number;
    }
  ): Promise<Product[]> {
    let query = this.dbClient
      .from('products')
      .select('*')
      .eq('vendor_did', vendorDid);
    
    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    
    if (filters?.visibility) {
      query = query.eq('visibility', filters.visibility);
    }
    
    if (filters?.limit) {
      query = query.limit(filters.limit);
    }
    
    if (filters?.offset) {
      query = query.range(
        filters.offset,
        filters.offset + (filters.limit || 10) - 1
      );
    }
    
    query = query.order('created_at', { ascending: false });
    
    const { data, error } = await query;
    if (error) throw error;
    
    return data.map(this.mapDatabaseToProduct);
  }

  /**
   * Get products by client
   */
  async getProductsByClient(
    clientId: string,
    filters?: {
      status?: ProductStatus;
      limit?: number;
      offset?: number;
    }
  ): Promise<Product[]> {
    let query = this.dbClient
      .from('products')
      .select('*')
      .eq('client_id', clientId);
    
    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    
    if (filters?.limit) {
      query = query.limit(filters.limit);
    }
    
    if (filters?.offset) {
      query = query.range(
        filters.offset,
        filters.offset + (filters.limit || 10) - 1
      );
    }
    
    query = query.order('created_at', { ascending: false });
    
    const { data, error } = await query;
    if (error) throw error;
    
    return data.map(this.mapDatabaseToProduct);
  }

  /**
   * Update product stats (views, inquiries, orders)
   */
  async incrementStat(
    productId: string,
    stat: 'views' | 'inquiries' | 'orders'
  ): Promise<void> {
    await this.dbClient.rpc('increment_product_stat', {
      p_product_id: productId,
      p_stat: stat
    });
  }

  /**
   * Bulk update product statuses
   */
  async bulkUpdateStatus(
    productIds: string[],
    status: ProductStatus
  ): Promise<void> {
    const { error } = await this.dbClient
      .from('products')
      .update({ 
        status,
        updated_at: new Date()
      })
      .in('id', productIds);
    
    if (error) throw error;
    
    // Trigger index sync for all products
    for (const productId of productIds) {
      const product = await this.getProductById(productId);
      if (product) {
        this.triggerIndexSync(product).catch(console.error);
      }
    }
  }

  // ============================================================================
  // VALIDATION METHODS
  // ============================================================================

  /**
   * Validate product request
   */
  private validateProductRequest(request: CreateProductRequest): void {
    // Validate basic specs
    this.validateBasicSpecs(request.basic);
    
    // Validate pricing
    this.validatePricing(request.pricing);
    
    // Validate logistics
    this.validateLogistics(request.logistics);
  }

  /**
   * Validate basic specifications
   */
  private validateBasicSpecs(basic: any): void {
    if (!basic.name || basic.name.trim().length === 0) {
      throw new Error('Product name is required');
    }
    
    if (basic.name.length > PRODUCT_LIMITS.nameMaxLength) {
      throw new Error(`Product name cannot exceed ${PRODUCT_LIMITS.nameMaxLength} characters`);
    }
    
    if (!basic.description || basic.description.trim().length === 0) {
      throw new Error('Product description is required');
    }
    
    if (basic.description.length > PRODUCT_LIMITS.descriptionMaxLength) {
      throw new Error(`Description cannot exceed ${PRODUCT_LIMITS.descriptionMaxLength} characters`);
    }
    
    if (!basic.images?.primary) {
      throw new Error('At least one product image is required');
    }
    
    if (basic.images.gallery && basic.images.gallery.length > PRODUCT_LIMITS.imagesMax) {
      throw new Error(`Cannot exceed ${PRODUCT_LIMITS.imagesMax} images`);
    }
  }

  /**
   * Validate pricing
   */
  private validatePricing(pricing: any): void {
    if (!pricing.basePrice || pricing.basePrice.amount <= 0) {
      throw new Error('Valid base price is required');
    }
    
    if (!pricing.moq || pricing.moq < 1) {
      throw new Error('Minimum order quantity must be at least 1');
    }
    
    // Validate tiered pricing
    if (pricing.tiers && pricing.tiers.length > 0) {
      if (pricing.tiers.length > PRODUCT_LIMITS.priceTiersMax) {
        throw new Error(`Cannot exceed ${PRODUCT_LIMITS.priceTiersMax} price tiers`);
      }
      
      // Validate tiers are in ascending order
      for (let i = 0; i < pricing.tiers.length - 1; i++) {
        if (pricing.tiers[i].minQuantity >= pricing.tiers[i + 1].minQuantity) {
          throw new Error('Price tiers must be in ascending order by quantity');
        }
      }
    }
    
    // Validate sample pricing
    if (pricing.sample?.available && !pricing.sample.price) {
      throw new Error('Sample price is required when samples are available');
    }
  }

  /**
   * Validate logistics info
   */
  private validateLogistics(logistics: any): void {
    if (!logistics.weight || logistics.weight.value <= 0) {
      throw new Error('Valid weight is required');
    }
    
    if (!logistics.dimensions) {
      throw new Error('Dimensions are required');
    }
    
    if (!logistics.originCountry) {
      throw new Error('Origin country is required');
    }
    
    if (!logistics.leadTime || logistics.leadTime < 0) {
      throw new Error('Valid lead time is required');
    }
  }

  /**
   * Validate product is ready for publishing
   */
  private validateForPublish(product: Product): void {
    if (product.status === 'active') {
      throw new Error('Product is already published');
    }
    
    // Ensure all required fields are present
    this.validateProductRequest({
      vendorDid: product.vendorDid,
      clientId: product.clientId,
      category: product.category,
      basic: product.basic,
      advanced: product.advanced,
      pricing: product.pricing,
      logistics: product.logistics
    });
  }

  // ============================================================================
  // DATABASE METHODS
  // ============================================================================

  /**
   * Store product in database
   */
  private async storeProduct(product: Product): Promise<void> {
    const { error } = await this.dbClient
      .from('products')
      .insert({
        id: product.id,
        vendor_did: product.vendorDid,
        client_id: product.clientId,
        category: product.category,
        basic: product.basic,
        advanced: product.advanced,
        pricing: product.pricing,
        logistics: product.logistics,
        status: product.status,
        visibility: product.visibility,
        stats: product.stats,
        created_at: product.createdAt,
        updated_at: product.updatedAt
      });
    
    if (error) throw error;
  }

  /**
   * Update product in database
   */
  private async updateProductInDb(product: Product): Promise<void> {
    const { error } = await this.dbClient
      .from('products')
      .update({
        category: product.category,
        basic: product.basic,
        advanced: product.advanced,
        pricing: product.pricing,
        logistics: product.logistics,
        status: product.status,
        visibility: product.visibility,
        stats: product.stats,
        updated_at: product.updatedAt,
        last_synced_at: product.lastSyncedAt
      })
      .eq('id', product.id);
    
    if (error) throw error;
  }

  /**
   * Trigger sync to federated search index
   */
  private async triggerIndexSync(product: Product): Promise<void> {
    // Only sync active, public products
    if (product.status !== 'active' || product.visibility !== 'public') {
      return;
    }
    
    // This will be handled by search.service.ts
    // For now, just update the last_synced_at timestamp
    await this.dbClient
      .from('products')
      .update({ last_synced_at: new Date() })
      .eq('id', product.id);
  }

  /**
   * Remove product from search index
   */
  private async removeFromIndex(productId: string): Promise<void> {
    await this.dbClient
      .from('product_index')
      .delete()
      .eq('product_id', productId);
  }

  /**
   * Map database record to Product object
   */
  private mapDatabaseToProduct(data: any): Product {
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