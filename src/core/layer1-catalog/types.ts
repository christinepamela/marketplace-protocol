/**
 * Layer 1: Discovery & Catalog
 * Core type definitions for product listings and federated search
 */

// ============================================================================
// CATEGORY TYPES
// ============================================================================

/**
 * Primary product categories
 */
export type PrimaryCategory = 
  | 'footwear'
  | 'bags'
  | 'textiles'
  | 'electronics'
  | 'home'
  | 'craft'
  | 'other';

/**
 * Category structure
 */
export interface Category {
  primary: PrimaryCategory;
  subcategory: string; // e.g., "leather-shoes", "cotton-fabric"
  tags?: string[]; // Additional searchable tags
}

// ============================================================================
// PRICING TYPES
// ============================================================================

/**
 * Currency codes (ISO 4217)
 */
export type CurrencyCode = 'USD' | 'EUR' | 'GBP' | 'MYR' | 'SGD' | 'AUD' | 'BTC';

/**
 * Price in a specific currency
 */
export interface Price {
  amount: number;
  currency: CurrencyCode;
}

/**
 * Tiered pricing structure (quantity-based)
 */
export interface PriceTier {
  minQuantity: number;
  maxQuantity?: number; // undefined = no upper limit
  pricePerUnit: number;
  currency: CurrencyCode;
}

/**
 * Complete pricing information
 */
export interface ProductPricing {
  // Base price (for 1 unit or minimum order quantity)
  basePrice: Price;
  
  // Tiered pricing (optional)
  tiers?: PriceTier[];
  
  // Minimum order quantity
  moq: number; // Minimum order quantity (default: 1)
  
  // Sample pricing (optional)
  sample?: {
    available: boolean;
    price?: Price;
    leadTime?: number; // days
    maxQuantity?: number; // max samples per order
  };
}

// ============================================================================
// PRODUCT SPECIFICATIONS
// ============================================================================

/**
 * Shipping dimensions
 */
export interface Dimensions {
  length: number;
  width: number;
  height: number;
  unit: 'cm' | 'in';
}

/**
 * Shipping weight
 */
export interface Weight {
  value: number;
  unit: 'kg' | 'lb' | 'g';
}

/**
 * Logistics information
 */
export interface LogisticsInfo {
  weight: Weight;
  dimensions: Dimensions;
  originCountry: string; // ISO country code
  leadTime: number; // Production lead time in days
  shippingMethods?: string[]; // Supported methods (e.g., "air", "sea", "express")
}

/**
 * Product images
 */
export interface ProductImages {
  primary: string; // Main product image URL
  gallery?: string[]; // Additional images
  thumbnail?: string; // Optimized thumbnail
}

/**
 * Customization options (for made-to-order products)
 */
export interface CustomizationOption {
  name: string; // e.g., "Color", "Size"
  type: 'select' | 'text' | 'number';
  options?: string[]; // For select type
  required: boolean;
  additionalCost?: Price; // Extra cost for this option
}

/**
 * Certifications and compliance
 */
export interface Certification {
  name: string; // e.g., "ISO 9001", "CE", "Fair Trade"
  issuedBy: string;
  validUntil?: Date;
  documentUrl?: string; // Certificate image/PDF
}

/**
 * Basic product specifications
 */
export interface BasicSpecifications {
  name: string;
  description: string;
  shortDescription?: string; // For search results
  images: ProductImages;
  sku?: string; // Stock keeping unit
  brand?: string;
  condition: 'new' | 'used' | 'refurbished';
}

/**
 * Advanced product specifications
 */
export interface AdvancedSpecifications {
  // Flexible metadata for category-specific attributes
  // e.g., for footwear: { "sizes": ["39", "40", "41"], "material": "leather" }
  attributes: Record<string, any>;
  
  // Customization options
  customization?: CustomizationOption[];
  
  // Variants (e.g., different colors/sizes)
  variants?: ProductVariant[];
  
  // Materials used
  materials?: string[];
  
  // Certifications
  certifications?: Certification[];
  
  // Keywords for search
  keywords?: string[];
}

/**
 * Product variant (e.g., different size/color)
 */
export interface ProductVariant {
  id: string;
  name: string; // e.g., "Red - Size 40"
  sku?: string;
  attributes: Record<string, string>; // e.g., { "color": "red", "size": "40" }
  priceModifier?: number; // Additional cost vs base price
  stockAvailable?: number;
  images?: ProductImages;
}

// ============================================================================
// PRODUCT TYPES
// ============================================================================

/**
 * Product status
 */
export type ProductStatus = 'draft' | 'active' | 'inactive' | 'out_of_stock' | 'discontinued';

/**
 * Product visibility
 */
export type ProductVisibility = 'public' | 'private' | 'unlisted';

/**
 * Complete product listing
 */
export interface Product {
  // Core identifiers
  id: string;
  vendorDid: string; // Link to vendor identity (Layer 0)
  clientId: string; // Which marketplace client this belongs to
  
  // Category
  category: Category;
  
  // Specifications
  basic: BasicSpecifications;
  advanced: AdvancedSpecifications;
  
  // Pricing
  pricing: ProductPricing;
  
  // Logistics
  logistics: LogisticsInfo;
  
  // Status and visibility
  status: ProductStatus;
  visibility: ProductVisibility;
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  lastSyncedAt?: Date; // Last time synced to federated index
  
  // Analytics (optional)
  stats?: {
    views: number;
    inquiries: number;
    orders: number;
  };
}

// ============================================================================
// SEARCH TYPES
// ============================================================================

/**
 * Search filters
 */
export interface SearchFilters {
  // Category filters
  category?: PrimaryCategory;
  subcategory?: string;
  tags?: string[];
  
  // Price range
  minPrice?: number;
  maxPrice?: number;
  currency?: CurrencyCode;
  
  // Location
  originCountry?: string;
  shipsTo?: string; // Country code
  
  // Product attributes
  condition?: 'new' | 'used' | 'refurbished';
  sampleAvailable?: boolean;
  customizationAvailable?: boolean;
  certifications?: string[]; // e.g., ["ISO 9001", "Fair Trade"]
  
  // Vendor filters
  verifiedVendorsOnly?: boolean;
  minVendorReputation?: number; // 0-500
  
  // Logistics
  maxLeadTime?: number; // days
  
  // Flexible attribute filters (category-specific)
  attributes?: Record<string, any>;
}

/**
 * Search sort options
 */
export type SearchSortBy = 
  | 'relevance'
  | 'price_asc'
  | 'price_desc'
  | 'newest'
  | 'popular'
  | 'vendor_reputation';

/**
 * Search query
 */
export interface SearchQuery {
  // Search text
  query?: string;
  
  // Filters
  filters?: SearchFilters;
  
  // Sorting
  sortBy?: SearchSortBy;
  
  // Pagination
  limit?: number;
  offset?: number;
  
  // Federated search options
  clientIds?: string[]; // Search specific clients only (undefined = all)
  includeInactive?: boolean; // Include inactive products
}

/**
 * Search result item
 */
export interface SearchResultItem {
  product: Product;
  
  // Search relevance
  score: number; // 0-1
  
  // Vendor info (from Layer 0)
  vendor: {
    did: string;
    displayName: string;
    reputation: number;
    verified: boolean;
    country?: string;
  };
  
  // Highlighting (matched terms)
  highlights?: {
    field: string;
    snippets: string[];
  }[];
}

/**
 * Search results
 */
export interface SearchResults {
  items: SearchResultItem[];
  total: number;
  query: SearchQuery;
  executionTime: number; // milliseconds
  
  // Federated info
  searchedClients: string[];
  
  // Aggregations (for faceted search)
  aggregations?: {
    categories: Record<PrimaryCategory, number>;
    countries: Record<string, number>;
    priceRanges: Record<string, number>;
  };
}

// ============================================================================
// PRODUCT INDEX (for federated search)
// ============================================================================

/**
 * Lightweight product index entry (for fast search)
 */
export interface ProductIndexEntry {
  productId: string;
  vendorDid: string;
  clientId: string;
  
  // Searchable fields
  name: string;
  shortDescription?: string;
  category: Category;
  keywords: string[];
  
  // Filter fields
  basePrice: Price;
  originCountry: string;
  sampleAvailable: boolean;
  leadTime: number;
  
  // Status
  status: ProductStatus;
  visibility: ProductVisibility;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  indexedAt: Date;
}

// ============================================================================
// API REQUEST/RESPONSE TYPES
// ============================================================================

/**
 * Create product request
 */
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

/**
 * Create product response
 */
export interface CreateProductResponse {
  productId: string;
  status: ProductStatus;
  createdAt: Date;
}

/**
 * Update product request
 */
export interface UpdateProductRequest {
  productId: string;
  updates: Partial<Omit<Product, 'id' | 'vendorDid' | 'clientId' | 'createdAt'>>;
}

/**
 * Batch product sync request (for federated index)
 */
export interface SyncProductsRequest {
  clientId: string;
  products: ProductIndexEntry[];
}

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

/**
 * Minimum required fields for a valid product
 */
export const REQUIRED_PRODUCT_FIELDS = [
  'vendorDid',
  'clientId',
  'category',
  'basic.name',
  'basic.description',
  'basic.images.primary',
  'pricing.basePrice',
  'pricing.moq',
  'logistics.weight',
  'logistics.dimensions',
  'logistics.originCountry',
  'logistics.leadTime'
] as const;

/**
 * Maximum allowed values
 */
export const PRODUCT_LIMITS = {
  nameMaxLength: 200,
  descriptionMaxLength: 5000,
  shortDescriptionMaxLength: 300,
  imagesMax: 10,
  variantsMax: 50,
  customizationOptionsMax: 20,
  keywordsMax: 30,
  priceTiersMax: 10
} as const;