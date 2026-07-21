/**
 * Logistics Routes (Layer 3)
 * REST endpoints for logistics coordination
 */

import { Router } from 'express';
import { z } from 'zod';
import { ProviderService } from '../../core/layer3-logistics/provider.service';
import { QuoteService } from '../../core/layer3-logistics/quote.service';
import { ShipmentService } from '../../core/layer3-logistics/tracking.service';
import { authenticate, optionalAuth } from '../middleware/auth.middleware';
import { validateBody, validateQuery } from '../middleware/validation.middleware';
import { ApiError, ErrorCode, NotFoundError } from '../core/errors';
import type {
  ShippingMethod,
  CreateProviderInput,
  SubmitQuoteInput,
  CreateShipmentInput,
  UpdateShipmentStatusInput
} from '../../core/layer3-logistics/types';

const router = Router();
const requireAuth = authenticate();

// Helper to get user DID from JWT
function getUserDid(req: any): string {
  return req.user?.did || req.user?.sub;
}

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const registerProviderSchema = z.object({
  business_name: z.string().min(1),
  identity_did: z.string().startsWith('did:'),
  service_regions: z.array(z.string()).min(1),
  shipping_methods: z.array(z.enum(['standard', 'express', 'freight'])).min(1),
  insurance_available: z.boolean()
});

const submitQuoteSchema = z.object({
  provider_id: z.string().uuid(),
  method: z.enum(['standard', 'express', 'freight']),
  price_sats: z.number().positive().optional(),
  price_fiat: z.number().positive().optional(),
  currency: z.string().optional(),
  estimated_days: z.number().positive(),
  insurance_included: z.boolean(),
  valid_hours: z.number().positive().optional(),
  // Exactly one of order_id or product_id must be provided
  order_id: z.string().uuid().optional(),
  product_id: z.string().uuid().optional(),
  quote_type: z.enum(['product', 'order']).optional()
}).refine(
  data => !!(data.order_id) !== !!(data.product_id),
  { message: 'Exactly one of order_id or product_id must be provided' }
);

const createShipmentSchema = z.object({
  order_id: z.string().uuid(),
  quote_id: z.string().uuid(),
  tracking_number: z.string().min(1),
  estimated_delivery: z.string().datetime()
});

const updateShipmentSchema = z.object({
  status: z.enum([
    'pending_pickup', 'picked_up', 'in_transit', 'out_for_delivery',
    'delivered', 'failed_delivery', 'returning', 'returned', 'lost', 'cancelled'
  ]),
  location: z.string().optional(),
  notes: z.string().optional()
});

const providerSearchSchema = z.object({
  service_region: z.string().optional(),
  shipping_method: z.enum(['standard', 'express', 'freight']).optional(),
  insurance_required: z.string().transform(val => val === 'true').optional(),
  min_rating: z.string().transform(val => parseFloat(val)).optional()
});

// ============================================================================
// PROVIDER ROUTES
// ============================================================================

/**
 * @route   POST /api/v1/logistics/providers
 * @desc    Register new logistics provider
 * @access  Private (authenticated, KYC identity required)
 */
router.post(
  '/providers',
  requireAuth,
  validateBody(registerProviderSchema),
  async (req, res, next) => {
    try {
      const providerService = new ProviderService(req.supabase);
      const userDid = getUserDid(req);

      // Verify user owns the identity they're registering
      if (req.body.identity_did !== userDid) {
        throw new ApiError(
          ErrorCode.FORBIDDEN,
          'You can only register providers with your own identity'
        );
      }

      const provider = await providerService.registerProvider(req.body);

      res.status(201).json({
        success: true,
        data: provider
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   GET /api/v1/logistics/providers
 * @desc    Search for logistics providers
 * @access  Public (with optional filters)
 */
router.get(
  '/providers',
  validateQuery(providerSearchSchema),
  async (req, res, next) => {
    try {
      const providerService = new ProviderService(req.supabase);
      const providers = await providerService.findProviders(req.query);

      res.json({
        success: true,
        data: providers
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   GET /api/v1/logistics/providers/me
 * @desc    Get the authenticated user's own provider profile
 * @access  Private (authenticated logistics provider)
 * D34 — S36: replaces full-table scan + client-side find in ProviderContext
 */
router.get(
  '/providers/me',
  requireAuth,
  async (req, res, next) => {
    try {
      const userDid = getUserDid(req)
      const { data: provider, error } = await req.supabase
        .from('logistics_providers')
        .select('*')
        .eq('identity_did', userDid)
        .maybeSingle()

      if (error) throw error

      res.json({
        success: true,
        data: provider // null if this user has no provider profile
      })
    } catch (error) {
      next(error)
    }
  }
)

/**
 * @route   GET /api/v1/logistics/providers/:id
 * @desc    Get provider by ID with stats
 * @access  Public
 */
router.get(
  '/providers/:id',
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const providerService = new ProviderService(req.supabase);
      
      const stats = await providerService.getProviderStats(id);

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * ✅ NEW: GET /api/v1/logistics/providers/:id/quotes
 * @desc    Get all quotes for a provider
 * @access  Private (provider only)
 */
router.get(
  '/providers/:id/quotes',
  requireAuth,
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const { status } = req.query;
      const userDid = getUserDid(req);
      const providerService = new ProviderService(req.supabase);
      const quoteService = new QuoteService(req.supabase);

      // Verify ownership
      const provider = await providerService.getProvider(id);
      if (provider.identity_did !== userDid) {
        throw new ApiError(
          ErrorCode.FORBIDDEN,
          'You can only view your own quotes'
        );
      }

      // Get quotes filtered by status if provided
      let query = req.supabase
        .from('shipping_quotes')
        .select('*, order:orders(*)')
        .eq('provider_id', id);
      
      if (status) {
        query = query.eq('status', status);
      }
      
      const { data: quotes } = await query.order('created_at', { ascending: false });

      res.json({
        success: true,
        data: quotes || []
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * ✅ NEW: GET /api/v1/logistics/providers/:id/shipments
 * @desc    Get all shipments for a provider
 * @access  Private (provider only)
 */
router.get(
  '/providers/:id/shipments',
  requireAuth,
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const { status } = req.query;
      const userDid = getUserDid(req);
      const providerService = new ProviderService(req.supabase);

      // Verify ownership
      const provider = await providerService.getProvider(id);
      if (provider.identity_did !== userDid) {
        throw new ApiError(
          ErrorCode.FORBIDDEN,
          'You can only view your own shipments'
        );
      }

      // Get shipments filtered by status if provided
      let query = req.supabase
        .from('shipments')
        .select('*, order:orders(*)')
        .eq('provider_id', id);
      
      if (status) {
        query = query.eq('status', status);
      }
      
      const { data: shipments } = await query.order('created_at', { ascending: false });

      res.json({
        success: true,
        data: shipments || []
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   PUT /api/v1/logistics/providers/:id
 * @desc    Update provider capabilities
 * @access  Private (provider only)
 */
router.put(
  '/providers/:id',
  requireAuth,
  validateBody(z.object({
    service_regions: z.array(z.string()).optional(),
    shipping_methods: z.array(z.enum(['standard', 'express', 'freight'])).optional(),
    insurance_available: z.boolean().optional()
  })),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const userDid = getUserDid(req);
      const providerService = new ProviderService(req.supabase);

      // Verify ownership
      const provider = await providerService.getProvider(id);
      if (provider.identity_did !== userDid) {
        throw new ApiError(
          ErrorCode.FORBIDDEN,
          'You can only update your own provider profile'
        );
      }

      const updated = await providerService.updateProviderCapabilities(id, req.body);

      res.json({
        success: true,
        data: updated
      });
    } catch (error) {
      next(error);
    }
  }
);

// ============================================================================
// QUOTE ROUTES
// ============================================================================

/**
 * @route   POST /api/v1/logistics/quotes
 * @desc    Submit a quote for an order
 * @access  Private (provider only)
 */
router.post(
  '/quotes',
  requireAuth,
  validateBody(submitQuoteSchema),
  async (req, res, next) => {
    try {
      const quoteService = new QuoteService(req.supabase);
      const quote = await quoteService.submitQuote(req.body);

      res.status(201).json({
        success: true,
        data: quote
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   GET /api/v1/logistics/quotes/order/:orderId
 * @desc    Get all quotes for an order
 * @access  Private (buyer or vendor)
 */
router.get(
  '/quotes/order/:orderId',
  requireAuth,
  async (req, res, next) => {
    try {
      const { orderId } = req.params;
      const quoteService = new QuoteService(req.supabase);

      // TODO: Add ownership check - only buyer/vendor can view quotes
      const quotes = await quoteService.getQuotesWithProviders(orderId);

      res.json({
        success: true,
        data: quotes
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   GET /api/v1/logistics/quotes/product/:productId
 * @desc    Get all quotes (pending + accepted) for a product, with provider details
 * @access  Private (product owner only)
 * L13 — S32
 */
router.get(
  '/quotes/product/:productId',
  requireAuth,
  async (req, res, next) => {
    try {
      const { productId } = req.params;
      const userDid = getUserDid(req);

      // Verify product belongs to seller
      const { data: product, error: productError } = await req.supabase
        .from('products')
        .select('id, vendor_did')
        .eq('id', productId)
        .single();

      if (productError || !product) {
        throw new NotFoundError('Product not found');
      }

      if (product.vendor_did !== userDid) {
        throw new ApiError(ErrorCode.FORBIDDEN, 'You can only view quotes for your own products');
      }

      const quoteService = new QuoteService(req.supabase);
      const quotes = await quoteService.getQuotesWithProvidersForProduct(productId);

      res.json({
        success: true,
        data: quotes
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   GET /api/v1/logistics/quotes/product/:productId/accepted
 * @desc    Get the accepted shipping quote for a product, if any
 * @access  Public — buyer-facing (L14, S33). Deliberately narrower than the
 *          seller-only route above: returns only the accepted quote, never
 *          pending bids from competing providers.
 */
router.get(
  '/quotes/product/:productId/accepted',
  async (req, res, next) => {
    try {
      const { productId } = req.params;
      const quoteService = new QuoteService(req.supabase);
      const quote = await quoteService.getAcceptedQuoteForProduct(productId);

      res.json({
        success: true,
        data: quote
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   POST /api/v1/logistics/quotes/:id/accept
 * @desc    Accept a quote
 * @access  Private (buyer/vendor for order quotes, product owner for product quotes)
 */
router.post(
  '/quotes/:id/accept',
  requireAuth,
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const userDid = getUserDid(req);
      const quoteService = new QuoteService(req.supabase);

      // Ownership check (L13 — S32): fetch the quote first to know whether
      // it's product- or order-scoped, then verify the caller owns that
      // product or order before allowing the accept to proceed.
      const existingQuote = await quoteService.getQuote(id);

      if (existingQuote.product_id) {
        const { data: product, error: productError } = await req.supabase
          .from('products')
          .select('vendor_did')
          .eq('id', existingQuote.product_id)
          .single();

        if (productError || !product) {
          throw new NotFoundError('Product not found');
        }

        // Allow: product owner (seller accepting a standing quote for their product)
        // Allow: buyer who created an RFQ for this product (L15c — S34)
        if (product.vendor_did !== userDid) {
          const { data: rfq } = await req.supabase
            .from('quote_requests')
            .select('id')
            .eq('product_id', existingQuote.product_id)
            .eq('requester_did', userDid)
            .limit(1)
            .maybeSingle();

          if (!rfq) {
            throw new ApiError(ErrorCode.FORBIDDEN, 'You can only accept quotes for your own products or your own logistics requests');
          }
        }
      } else if (existingQuote.order_id) {
        const { data: order, error: orderError } = await req.supabase
          .from('orders')
          .select('buyer_did, vendor_did')
          .eq('id', existingQuote.order_id)
          .single();

        if (orderError || !order) {
          throw new NotFoundError('Order not found');
        }

        if (order.buyer_did !== userDid && order.vendor_did !== userDid) {
          throw new ApiError(ErrorCode.FORBIDDEN, 'You can only accept quotes for your own orders');
        }
      }

      const quote = await quoteService.acceptQuote(id);

      res.json({
        success: true,
        message: 'Quote accepted',
        data: quote
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   POST /api/v1/logistics/quotes/:id/reject
 * @desc    Reject a quote
 * @access  Private (buyer or vendor)
 */
router.post(
  '/quotes/:id/reject',
  requireAuth,
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const quoteService = new QuoteService(req.supabase);

      await quoteService.rejectQuote(id);

      res.json({
        success: true,
        message: 'Quote rejected'
      });
    } catch (error) {
      next(error);
    }
  }
);

// ============================================================================
// ✅ NEW: OPPORTUNITIES ROUTE
// ============================================================================

/**
 * GET /api/v1/logistics/opportunities
 * Get orders needing quotes (opportunities for providers)
 * 
 * FIXED: Matches actual product logistics structure:
 * {
 *   weight: { value: 2, unit: "kg" },
 *   dimensions: { length: 30, width: 30, height: 15, unit: "cm" }
 * }
 */
/**
 * GET /api/v1/logistics/opportunities
 * Get open quote requests filtered by logistics provider's profile
 * Reads from quote_requests table (not raw orders)
 * L6 — S30
 */
router.get(
  '/opportunities',
  requireAuth,
  async (req, res, next) => {
    try {
      const userDid = getUserDid(req);

      // Step 1: Get the authenticated logistics provider's profile
      const { data: providerData, error: providerError } = await req.supabase
        .from('logistics_providers')
        .select('id, routes, incoterms_supported, modes, weight_min_kg, weight_max_kg')
        .eq('identity_did', userDid)
        .single();

      if (providerError || !providerData) {
        throw new ApiError(ErrorCode.NOT_FOUND, 'Logistics provider profile not found for this user');
      }

      const provider = providerData;
      const hasRoutes = Array.isArray(provider.routes) && provider.routes.length > 0;
      const hasIncoterms = Array.isArray(provider.incoterms_supported) && provider.incoterms_supported.length > 0;

      // Step 2: Fetch open quote requests — broadcasts (null target) OR
      // direct requests specifically addressed to this provider (L15d — S35)
      const { data: requests, error: requestsError } = await req.supabase
        .from('quote_requests')
        .select(`
          *,
          product:products(id, basic, logistics, incoterm)
        `)
        .eq('status', 'open')
        .or(`target_provider_id.is.null,target_provider_id.eq.${provider.id}`)
        .order('created_at', { ascending: false })
        .limit(50);

      if (requestsError) throw requestsError;

      if (!requests || requests.length === 0) {
        return res.json({ success: true, data: [] });
      }

      // Step 3: Filter by provider profile
      // If provider has empty routes or incoterms (migration default), return all — graceful degradation
      const filtered = requests.filter(req => {
        // Route match: provider must serve this origin. No destination on the
        // request (L12 — S32: global broadcast at publish time) matches any of
        // the provider's routes from this origin. A specified destination
        // (order-level RFQ) requires an exact origin+destination match.
        if (hasRoutes) {
          const routeMatch = req.destination_country
            ? provider.routes.some(
                (r: any) =>
                  r.origin_country === req.origin_country &&
                  r.destination_country === req.destination_country
              )
            : provider.routes.some(
                (r: any) => r.origin_country === req.origin_country
              );
          if (!routeMatch) return false;
        }

        // Incoterm match: provider must support the requested Incoterm
        if (hasIncoterms && req.incoterm) {
          if (!provider.incoterms_supported.includes(req.incoterm)) return false;
        }

        // Weight match: if provider declares weight limits, apply them
        if (provider.weight_min_kg !== null && req.weight_kg < provider.weight_min_kg) return false;
        if (provider.weight_max_kg !== null && req.weight_kg > provider.weight_max_kg) return false;

        return true;
      });

      res.json({
        success: true,
        data: filtered
      });
    } catch (error) {
      console.error('Opportunities endpoint error:', error);
      next(error);
    }
  }
);

// ============================================================================
// L5: QUOTE REQUESTS (RFQ BROADCAST) — S30
// ============================================================================

/**
 * POST /api/v1/logistics/quote-requests
 * Seller broadcasts a request for logistics quotes on a product
 * KYC sellers only. Creates a quote_requests row visible to matching logistics providers.
 * L5 — S30
 */
const createQuoteRequestSchema = z.object({
  product_id: z.string().uuid(),
  origin_country: z.string().min(2).max(3),
  destination_country: z.string().min(2).max(3).optional(), // L12 (S32): omitted = broadcast to any destination the pool serves
  weight_kg: z.number().positive(),
  dimensions_cm: z.object({
    length: z.number().positive(),
    width: z.number().positive(),
    height: z.number().positive()
  }),
  incoterm: z.enum(['EXW', 'FOB', 'DAP', 'DDP']),
  hs_code: z.string().optional(),
  insurance_required: z.boolean().optional()
});

router.post(
  '/quote-requests',
  requireAuth,
  validateBody(createQuoteRequestSchema),
  async (req, res, next) => {
    try {
      const userDid = getUserDid(req);

      // Verify the product belongs to the seller making the request
      const { data: product, error: productError } = await req.supabase
        .from('products')
        .select('id, vendor_did')
        .eq('id', req.body.product_id)
        .single();

      if (productError || !product) {
        throw new NotFoundError('Product not found');
      }

      if (product.vendor_did !== userDid) {
        throw new ApiError(ErrorCode.FORBIDDEN, 'You can only request quotes for your own products');
      }

      // Create the quote request
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30); // 30-day validity

      const { data: quoteRequest, error: insertError } = await req.supabase
        .from('quote_requests')
        .insert({
          requester_did: userDid,
          product_id: req.body.product_id,
          origin_country: req.body.origin_country,
          destination_country: req.body.destination_country || null,
          weight_kg: req.body.weight_kg,
          dimensions_cm: req.body.dimensions_cm,
          incoterm: req.body.incoterm,
          hs_code: req.body.hs_code || null,
          insurance_required: req.body.insurance_required || false,
          status: 'open',
          expires_at: expiresAt.toISOString()
        })
        .select()
        .single();

      if (insertError) throw insertError;

      res.status(201).json({
        success: true,
        data: quoteRequest
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/logistics/quote-requests/product/:productId
 * Get all quote requests for a specific product (seller view)
 * L5 — S30
 */
router.get(
  '/quote-requests/product/:productId',
  requireAuth,
  async (req, res, next) => {
    try {
      const { productId } = req.params;
      const userDid = getUserDid(req);

      // Verify product belongs to seller
      const { data: product, error: productError } = await req.supabase
        .from('products')
        .select('id, vendor_did')
        .eq('id', productId)
        .single();

      if (productError || !product) {
        throw new NotFoundError('Product not found');
      }

      if (product.vendor_did !== userDid) {
        throw new ApiError(ErrorCode.FORBIDDEN, 'You can only view quote requests for your own products');
      }

      const { data: requests, error } = await req.supabase
        .from('quote_requests')
        .select('*')
        .eq('product_id', productId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      res.json({
        success: true,
        data: requests || []
      });
    } catch (error) {
      next(error);
    }
  }
);

// ============================================================================
// L15c (S34): BUYER-INITIATED QUOTE REQUEST
// ============================================================================

/**
 * POST /api/v1/logistics/quote-requests/buyer
 * Buyer broadcasts a request for logistics quotes on a specific product,
 * using their known destination country from their shipping address.
 * Unlike the seller-initiated path (POST /quote-requests), this is called
 * by the buyer — so the ownership check is reversed: we verify the caller
 * is NOT the product's vendor (any authenticated buyer can request a quote).
 *
 * Product logistics data (weight, dimensions, incoterm, hs_code) is read
 * directly from the product row so the buyer doesn't have to re-enter it.
 * destination_country is required here (buyer knows their address).
 * L15c — S34
 */
const createBuyerQuoteRequestSchema = z.object({
  product_id: z.string().uuid(),
  destination_country: z.string().min(2).max(3),
  target_provider_id: z.string().uuid().optional(), // L15d: direct request to a specific provider
});

router.post(
  '/quote-requests/buyer',
  requireAuth,
  validateBody(createBuyerQuoteRequestSchema),
  async (req, res, next) => {
    try {
      const userDid = getUserDid(req);

      // Fetch the product for its logistics data
      const { data: product, error: productError } = await req.supabase
        .from('products')
        .select('id, vendor_did, logistics, incoterm, hs_code')
        .eq('id', req.body.product_id)
        .single();

      if (productError || !product) {
        throw new NotFoundError('Product not found');
      }

      // Buyers request quotes — sellers do not request quotes on their own products via this path
      if (product.vendor_did === userDid) {
        throw new ApiError(
          ErrorCode.FORBIDDEN,
          'Use the seller quote-request endpoint for your own products'
        );
      }

      // Pull logistics data from the product row
      const logistics = product.logistics || {};
      const weight_kg =
        logistics.weight?.unit === 'kg'
          ? logistics.weight?.value
          : logistics.weight?.unit === 'lb'
          ? (logistics.weight?.value || 0) * 0.453592
          : logistics.weight?.unit === 'g'
          ? (logistics.weight?.value || 0) / 1000
          : logistics.weight?.value || 1; // fallback: 1 kg

      const dimensions_cm = {
        length: logistics.dimensions?.length || 1,
        width: logistics.dimensions?.width || 1,
        height: logistics.dimensions?.height || 1,
      };

      const origin_country = logistics.originCountry || 'MY';
      const incoterm = product.incoterm || 'DAP';
      const hs_code = product.hs_code || null;

      // 30-day validity, same as seller-initiated RFQs
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);

      const { data: quoteRequest, error: insertError } = await req.supabase
        .from('quote_requests')
        .insert({
          requester_did: userDid,
          product_id: req.body.product_id,
          origin_country,
          destination_country: req.body.destination_country,
          weight_kg,
          dimensions_cm,
          incoterm,
          hs_code,
          insurance_required: false,
          status: 'open',
          expires_at: expiresAt.toISOString(),
          target_provider_id: req.body.target_provider_id || null,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      res.status(201).json({
        success: true,
        data: quoteRequest,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/logistics/quote-requests/buyer/pending
 * Returns all open quote_requests created by the authenticated buyer,
 * joined with any quotes that have already been submitted against them.
 * Used by checkout to show the buyer incoming quotes to accept.
 * L15c — S34
 */
router.get(
  '/quote-requests/buyer/pending',
  requireAuth,
  async (req, res, next) => {
    try {
      const userDid = getUserDid(req);

      // Step 1: fetch open quote requests for this buyer
      const { data: requests, error: requestsError } = await req.supabase
        .from('quote_requests')
        .select(`
          *,
          product:products(id, basic, logistics)
        `)
        .eq('requester_did', userDid)
        .eq('status', 'open')
        .order('created_at', { ascending: false });

      if (requestsError) throw requestsError;
      if (!requests || requests.length === 0) {
        return res.json({ success: true, data: [] });
      }

      // Step 2: fetch pending quotes for those product IDs separately
      // (avoids ambiguous FK in a single nested select)
      const productIds = requests
        .map(r => r.product_id)
        .filter(Boolean) as string[];

      const { data: quotes, error: quotesError } = await req.supabase
        .from('shipping_quotes')
        .select(`
          id, provider_id, product_id, method, price_fiat, currency,
          estimated_days, insurance_included, status, valid_until, created_at,
          provider:logistics_providers(id, business_name, average_rating)
        `)
        .in('product_id', productIds)
        .eq('status', 'pending');

      if (quotesError) throw quotesError;

      const quotesByProductId: Record<string, any[]> = {};
      for (const q of quotes || []) {
        if (!q.product_id) continue;
        if (!quotesByProductId[q.product_id]) quotesByProductId[q.product_id] = [];
        quotesByProductId[q.product_id].push(q);
      }

      const result = requests.map(r => ({
        ...r,
        quotes: r.product_id ? (quotesByProductId[r.product_id] || []) : [],
      }));

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
);

// ============================================================================
// ✅ NEW: FAVORITES ROUTES
// ============================================================================

/**
 * ✅ NEW: POST /api/v1/logistics/providers/:id/favorite
 * @desc    Favorite a provider
 * @access  Private (authenticated users)
 */
router.post(
  '/providers/:id/favorite',
  requireAuth,
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const userDid = getUserDid(req);

      // Verify provider exists
      const providerService = new ProviderService(req.supabase);
      await providerService.getProvider(id);

      // Insert or update favorite
      const { error } = await req.supabase
        .from('provider_favorites')
        .upsert({
          user_did: userDid,
          provider_id: id
        }, {
          onConflict: 'user_did,provider_id'
        });

      if (error) throw error;

      res.json({
        success: true,
        message: 'Provider favorited successfully'
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * ✅ NEW: DELETE /api/v1/logistics/providers/:id/favorite
 * @desc    Unfavorite a provider
 * @access  Private (authenticated users)
 */
router.delete(
  '/providers/:id/favorite',
  requireAuth,
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const userDid = getUserDid(req);

      const { error } = await req.supabase
        .from('provider_favorites')
        .delete()
        .eq('user_did', userDid)
        .eq('provider_id', id);

      if (error) throw error;

      res.json({
        success: true,
        message: 'Provider unfavorited successfully'
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * ✅ NEW: GET /api/v1/logistics/favorites
 * @desc    Get user's favorite providers
 * @access  Private (authenticated users)
 */
router.get(
  '/favorites',
  requireAuth,
  async (req, res, next) => {
    try {
      const userDid = getUserDid(req);

      const { data, error } = await req.supabase
        .from('provider_favorites')
        .select(`
          *,
          provider:logistics_providers(*)
        `)
        .eq('user_did', userDid)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Extract just the provider objects
      const providers = (data || []).map(fav => fav.provider).filter(Boolean);

      res.json({
        success: true,
        data: providers
      });
    } catch (error) {
      next(error);
    }
  }
);

// ============================================================================
// SHIPMENT ROUTES
// ============================================================================

/**
 * @route   POST /api/v1/logistics/shipments
 * @desc    Create shipment after quote accepted
 * @access  Private (provider only)
 */
router.post(
  '/shipments',
  requireAuth,
  validateBody(createShipmentSchema),
  async (req, res, next) => {
    try {
      const shipmentService = new ShipmentService(req.supabase);
      
      const shipmentData = {
        ...req.body,
        estimated_delivery: new Date(req.body.estimated_delivery)
      };

      const shipment = await shipmentService.createShipment(shipmentData);

      res.status(201).json({
        success: true,
        data: shipment
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   GET /api/v1/logistics/shipments/:id
 * @desc    Get shipment by ID
 * @access  Private (buyer, vendor, or provider)
 */
router.get(
  '/shipments/:id',
  requireAuth,
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const shipmentService = new ShipmentService(req.supabase);

      const shipment = await shipmentService.getShipment(id);

      res.json({
        success: true,
        data: shipment
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   GET /api/v1/logistics/track/:trackingNumber
 * @desc    Track shipment by tracking number (public)
 * @access  Public
 */
router.get(
  '/track/:trackingNumber',
  async (req, res, next) => {
    try {
      const { trackingNumber } = req.params;
      const shipmentService = new ShipmentService(req.supabase);

      const trackingInfo = await shipmentService.getTrackingInfo(trackingNumber);

      res.json({
        success: true,
        data: trackingInfo
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   PUT /api/v1/logistics/shipments/:id/status
 * @desc    Update shipment status
 * @access  Private (provider only)
 */
router.put(
  '/shipments/:id/status',
  requireAuth,
  validateBody(updateShipmentSchema),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const shipmentService = new ShipmentService(req.supabase);

      const updateData: UpdateShipmentStatusInput = {
        shipment_id: id,
        ...req.body
      };

      const shipment = await shipmentService.updateStatus(updateData);

      res.json({
        success: true,
        message: 'Shipment status updated',
        data: shipment
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   GET /api/v1/logistics/shipments/:id/history
 * @desc    Get shipment tracking history
 * @access  Public (anyone can track with shipment ID)
 */
router.get(
  '/shipments/:id/history',
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const shipmentService = new ShipmentService(req.supabase);

      const events = await shipmentService.getTrackingEvents(id);

      res.json({
        success: true,
        data: events
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   POST /api/v1/logistics/shipments/:id/cancel
 * @desc    Cancel a shipment
 * @access  Private (buyer, vendor, or provider)
 */
router.post(
  '/shipments/:id/cancel',
  requireAuth,
  validateBody(z.object({
    reason: z.string().optional()
  })),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const shipmentService = new ShipmentService(req.supabase);

      const shipment = await shipmentService.cancelShipment(id, reason);

      res.json({
        success: true,
        message: 'Shipment cancelled',
        data: shipment
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   GET /api/v1/logistics/shipments/order/:orderId
 * @desc    Get shipment for an order
 * @access  Private (buyer or vendor)
 */
router.get(
  '/shipments/order/:orderId',
  requireAuth,
  async (req, res, next) => {
    try {
      const { orderId } = req.params;
      const shipmentService = new ShipmentService(req.supabase);

      const shipment = await shipmentService.getByOrderId(orderId);

      res.json({
        success: true,
        data: shipment
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;