/**
 * Catalog Routes (Layer 1)
 * 
 * REST API endpoints for product management and search
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import { config } from '../core/config';
import { 
  ProductService,
  SearchService,
} from '../../core/layer1-catalog';
import type {
  CreateProductRequest,
  UpdateProductRequest,
  SearchQuery,
} from '../../core/layer1-catalog/types';
import {
  validateBody,
  validateParams,
  validateQuery,
  commonSchemas,
} from '../middleware/validation.middleware';
import {
  authenticate,
  optionalAuth,
  requirePermissions,
} from '../middleware/auth.middleware';
import { asyncHandler } from '../middleware/error.middleware';
import { PERMISSIONS } from '../core/auth';
import { NotFoundError, ValidationError } from '../core/errors';
import { parsePagination, formatPaginatedResponse } from '../core/utils';

const router = Router();

// Initialize Supabase client
const supabase = createClient(
  config.supabaseUrl,
  config.supabaseServiceKey
);

// Initialize services
const productService = new ProductService(supabase);
const searchService = new SearchService(supabase);

/**
 * Validation Schemas
 */

// Category schema
const categorySchema = z.object({
  primary: z.enum(['footwear', 'bags', 'textiles', 'electronics', 'home', 'craft', 'other']),
  subcategory: z.string(),
  tags: z.array(z.string()).optional(),
});

// Price schema
const priceSchema = z.object({
  amount: z.number().positive(),
  currency: z.enum(['USD', 'EUR', 'GBP', 'MYR', 'SGD', 'AUD', 'BTC']),
});

// Images schema
const imagesSchema = z.object({
  primary: z.string().url(),
  gallery: z.array(z.string().url()).optional(),
  thumbnail: z.string().url().optional(),
});

// Create product schema
const createProductSchema = z.object({
  vendorDid: z.string().regex(/^did:[a-z0-9]+:[a-zA-Z0-9._-]+$/),
  clientId: z.string(),
  category: categorySchema,
  basic: z.object({
    name: z.string().min(1).max(200),
    description: z.string().min(1).max(5000),
    shortDescription: z.string().max(300).optional(),
    images: imagesSchema,
    sku: z.string().optional(),
    brand: z.string().optional(),
    condition: z.enum(['new', 'used', 'refurbished']),
  }),
  advanced: z.object({
    attributes: z.record(z.any()),
    customization: z.array(z.any()).optional(),
    variants: z.array(z.any()).optional(),
    materials: z.array(z.string()).optional(),
    certifications: z.array(z.any()).optional(),
    keywords: z.array(z.string()).max(30).optional(),
  }),
  pricing: z.object({
    basePrice: priceSchema,
    tiers: z.array(z.any()).optional(),
    moq: z.number().int().positive(),
    sample: z.object({
      available: z.boolean(),
      price: priceSchema.optional(),
      leadTime: z.number().optional(),
      maxQuantity: z.number().optional(),
    }).optional(),
  }),
  logistics: z.object({
    weight: z.object({
      value: z.number().positive(),
      unit: z.enum(['kg', 'lb', 'g']),
    }),
    dimensions: z.object({
      length: z.number().positive(),
      width: z.number().positive(),
      height: z.number().positive(),
      unit: z.enum(['cm', 'in']),
    }),
    originCountry: z.string().length(2),
    leadTime: z.number().int().positive(),
    shippingMethods: z.array(z.string()).optional(),
  }),
  visibility: z.enum(['public', 'private', 'unlisted']).optional(),
});

// Update product schema
const updateProductSchema = z.object({
  basic: z.object({
    name: z.string().min(1).max(200).optional(),
    description: z.string().min(1).max(5000).optional(),
    shortDescription: z.string().max(300).optional(),
    images: imagesSchema.optional(),
    brand: z.string().optional(),
    condition: z.enum(['new', 'used', 'refurbished']).optional(),
  }).optional(),
  pricing: z.any().optional(),
  logistics: z.any().optional(),
  status: z.enum(['draft', 'active', 'inactive', 'out_of_stock', 'discontinued']).optional(),
  visibility: z.enum(['public', 'private', 'unlisted']).optional(),
});

// Search query schema
const searchQuerySchema = z.object({
  q: z.string().optional(),
  category: z.string().optional(),
  subcategory: z.string().optional(),
  minPrice: z.string().transform(val => parseFloat(val)).optional(),
  maxPrice: z.string().transform(val => parseFloat(val)).optional(),
  currency: z.string().optional(),
  originCountry: z.string().optional(),
  verifiedOnly: z.string().transform(val => val === 'true').optional(),
  sortBy: z.enum(['relevance', 'price_asc', 'price_desc', 'newest', 'popular', 'vendor_reputation']).optional(),
  page: z.string().optional(),
  limit: z.string().optional(),
});

/**
 * POST /api/v1/catalog/products
 * Create a new product
 * Requires authentication
 */
router.post(
  '/products',
  authenticate(),
  requirePermissions(PERMISSIONS.CATALOG_WRITE),
  validateBody(createProductSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const productData: CreateProductRequest = req.body;
    
    // Verify vendor owns this product
    if (req.user?.sub !== productData.vendorDid) {
      throw new ValidationError('You can only create products for your own vendor account');
    }
    
    // Create product
    const result = await productService.createProduct(productData);
    
    res.status(201).json({
      success: true,
      data: {
        productId: result.productId,
        status: result.status,
        createdAt: result.createdAt,
      },
    });
  })
);

/**
 * GET /api/v1/catalog/products/:id
 * Get product by ID
 * Public endpoint
 */
router.get(
  '/products/:id',
  validateParams(commonSchemas.uuidParam),
  optionalAuth(),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    
    const product = await productService.getProductById(id);
    
    if (!product) {
      throw new NotFoundError('Product', id);
    }
    
    // Check visibility
    const isOwner = req.user?.sub === product.vendorDid;
    const hasReadPermission = req.permissions?.includes(PERMISSIONS.CATALOG_READ);
    
    if (product.visibility === 'private' && !isOwner && !hasReadPermission) {
      throw new NotFoundError('Product', id);
    }
    
    res.json({
      success: true,
      data: product,
    });
  })
);

/**
 * PUT /api/v1/catalog/products/:id
 * Update product
 * Requires authentication and ownership
 */
router.put(
  '/products/:id',
  validateParams(commonSchemas.uuidParam),
  validateBody(updateProductSchema),
  authenticate(),
  requirePermissions(PERMISSIONS.CATALOG_WRITE),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    
    // Get existing product
    const product = await productService.getProductById(id);
    
    if (!product) {
      throw new NotFoundError('Product', id);
    }
    
    // Verify ownership
    if (req.user?.sub !== product.vendorDid) {
      throw new ValidationError('You can only update your own products');
    }
    
    // Merge updates with existing data to avoid validation errors on partial updates
    const mergedUpdates: any = {};
    
    if (req.body.basic) {
      mergedUpdates.basic = {
        ...product.basic,
        ...req.body.basic,
      };
    }
    
    if (req.body.pricing) {
      mergedUpdates.pricing = {
        ...product.pricing,
        ...req.body.pricing,
      };
    }
    
    if (req.body.logistics) {
      mergedUpdates.logistics = {
        ...product.logistics,
        ...req.body.logistics,
      };
    }
    
    if (req.body.status) {
      mergedUpdates.status = req.body.status;
    }
    
    if (req.body.visibility) {
      mergedUpdates.visibility = req.body.visibility;
    }
    
    // Update product
    const updateRequest: UpdateProductRequest = {
      productId: id,
      updates: mergedUpdates,
    };
    
    await productService.updateProduct(updateRequest);
    
    // Get updated product
    const updated = await productService.getProductById(id);
    
    res.json({
      success: true,
      data: updated,
    });
  })
);

/**
 * DELETE /api/v1/catalog/products/:id
 * Delete product (soft delete - sets to inactive)
 * Requires authentication and ownership
 */
router.delete(
  '/products/:id',
  validateParams(commonSchemas.uuidParam),
  authenticate(),
  requirePermissions(PERMISSIONS.CATALOG_WRITE),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    
    // Get existing product
    const product = await productService.getProductById(id);
    
    if (!product) {
      throw new NotFoundError('Product', id);
    }
    
    // Verify ownership
    if (req.user?.sub !== product.vendorDid) {
      throw new ValidationError('You can only delete your own products');
    }
    
    // Soft delete
    await productService.deleteProduct(id);
    
    res.json({
      success: true,
      message: 'Product deleted successfully',
    });
  })
);

/**
 * GET /api/v1/catalog/products
 * List products with filters
 * Public endpoint
 */
router.get(
  '/products',
  validateQuery(z.object({
    vendorDid: z.string().optional(),
    clientId: z.string().optional(),
    status: z.string().optional(),
    page: z.string().optional(),
    limit: z.string().optional(),
  })),
  asyncHandler(async (req: Request, res: Response) => {
    const { vendorDid, clientId, status, page, limit } = req.query as any;
    const pagination = parsePagination(page, limit);
    
    let products: any[] = [];
    
    if (vendorDid) {
      // Get products by vendor
      products = await productService.getProductsByVendor(vendorDid, {
        status: status as any,
        limit: pagination.limit,
        offset: pagination.offset,
      });
    } else if (clientId) {
      // Get products by client
      products = await productService.getProductsByClient(clientId, {
        status: status as any,
        limit: pagination.limit,
        offset: pagination.offset,
      });
    } else {
      // No filter specified - return empty for now
      // In production, you might want to implement a general list method
      products = [];
    }
    
    res.json({
      success: true,
      ...formatPaginatedResponse(products, products.length, pagination),
    });
  })
);

/**
 * GET /api/v1/catalog/search
 * Federated product search
 * Public endpoint
 */
router.get(
  '/search',
  validateQuery(searchQuerySchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { q, category, subcategory, minPrice, maxPrice, currency,
            originCountry, verifiedOnly, sortBy, page, limit } = req.query as any;
    
    const pagination = parsePagination(page, limit);
    
    const searchQuery: SearchQuery = {
      query: q,
      filters: {
        category: category as any,
        subcategory,
        minPrice,
        maxPrice,
        currency: currency as any,
        originCountry,
        verifiedVendorsOnly: verifiedOnly,
      },
      sortBy: sortBy || 'relevance',
      limit: pagination.limit,
      offset: pagination.offset,
    };
    
    const results = await searchService.search(searchQuery);
    
    res.json({
      success: true,
      data: results,
    });
  })
);

export default router;