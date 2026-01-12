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
  order_id: z.string().uuid(),
  provider_id: z.string().uuid(),
  method: z.enum(['standard', 'express', 'freight']),
  price_sats: z.number().positive().optional(),
  price_fiat: z.number().positive().optional(),
  currency: z.string().optional(),
  estimated_days: z.number().positive(),
  insurance_included: z.boolean(),
  valid_hours: z.number().positive()
});

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
 * @route   POST /api/v1/logistics/quotes/:id/accept
 * @desc    Accept a quote
 * @access  Private (buyer or vendor)
 */
router.post(
  '/quotes/:id/accept',
  requireAuth,
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const quoteService = new QuoteService(req.supabase);

      // TODO: Add ownership check
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
router.get(
  '/opportunities',
  requireAuth,
  async (req, res, next) => {
    try {
      const { service_region, min_weight_kg, max_weight_kg } = req.query;

      // Step 1: Get orders with accepted quotes to exclude them
      const { data: ordersWithAcceptedQuotes } = await req.supabase
        .from('shipping_quotes')
        .select('order_id')
        .eq('status', 'accepted');

      const acceptedOrderIds = (ordersWithAcceptedQuotes || []).map(q => q.order_id);

      // Step 2: Find confirmed orders
      let ordersQuery = req.supabase
        .from('orders')
        .select('*')
        .eq('status', 'confirmed');

      // Exclude orders with accepted quotes
      if (acceptedOrderIds.length > 0) {
        ordersQuery = ordersQuery.not('id', 'in', `(${acceptedOrderIds.join(',')})`);
      }

      const { data: orders, error: ordersError } = await ordersQuery
        .order('created_at', { ascending: false })
        .limit(50);

      if (ordersError) {
        console.error('Orders query error:', ordersError);
        throw ordersError;
      }

      if (!orders || orders.length === 0) {
        return res.json({ success: true, data: [] });
      }

      // Step 3: Get all unique product IDs from all orders
      const productIds = new Set<string>();
      orders.forEach(order => {
        const items = order.items as any[];
        if (Array.isArray(items)) {
          items.forEach(item => {
            if (item.productId) {
              productIds.add(item.productId);
            }
          });
        }
      });

      // Step 4: Fetch all products at once
      const { data: products } = await req.supabase
        .from('products')
        .select('id, logistics')
        .in('id', Array.from(productIds));

      // Create a map for quick product lookup
      const productsMap = new Map();
      (products || []).forEach(product => {
        productsMap.set(product.id, product);
      });

      // Step 5: Transform orders into opportunities
      const opportunities = orders.map(order => {
        const items = order.items as any[];
        
        // Calculate total weight from items
        let totalWeight = 0;
        let dimensions = {
          length_cm: 0,
          width_cm: 0,
          height_cm: 0
        };

        if (Array.isArray(items)) {
          items.forEach(item => {
            const product = productsMap.get(item.productId);
            if (product && product.logistics) {
              const logistics = product.logistics;
              
              // Extract weight (structure: { weight: { value: 2, unit: "kg" } })
              if (logistics.weight) {
                let weight = logistics.weight.value || 0;
                // Convert to kg if needed
                if (logistics.weight.unit === 'g') {
                  weight = weight / 1000;
                } else if (logistics.weight.unit === 'lb') {
                  weight = weight * 0.453592;
                }
                totalWeight += weight * (item.quantity || 1);
              }

              // Use dimensions from first product (structure: { dimensions: { length: 30, width: 30, height: 15, unit: "cm" } })
              if (dimensions.length_cm === 0 && logistics.dimensions) {
                const dims = logistics.dimensions;
                dimensions = {
                  length_cm: dims.length || 0,
                  width_cm: dims.width || 0,
                  height_cm: dims.height || 0
                };
              }
            }
          });
        }

        // Get destination country
        const shippingAddress = order.shipping_address as any;
        const destinationCountry = shippingAddress?.country || 
                                  shippingAddress?.countryCode || 
                                  'Unknown';

        // Get declared value
        const total = order.total as any;
        const declaredValue = total?.amount || 0;
        const currency = total?.currency || 'USD';

        return {
          id: order.id,
          order_id: order.id,
          destination_country: destinationCountry,
          weight_kg: totalWeight,
          dimensions: dimensions,
          declared_value: declaredValue,
          currency: currency,
          insurance_required: shippingAddress?.insurance_required || false,
          vendor_rating: null, // Would need vendor lookup
          vendor_sales: null,
          quotes_count: 0, // Could count pending quotes if needed
          created_at: order.created_at
        };
      });

      // Step 6: Apply filters
      let filtered = opportunities;

      if (service_region) {
        filtered = filtered.filter(o => 
          o.destination_country.toUpperCase() === service_region.toUpperCase()
        );
      }

      if (min_weight_kg) {
        const minWeight = parseFloat(min_weight_kg as string);
        filtered = filtered.filter(o => o.weight_kg >= minWeight);
      }

      if (max_weight_kg) {
        const maxWeight = parseFloat(max_weight_kg as string);
        filtered = filtered.filter(o => o.weight_kg <= maxWeight);
      }

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