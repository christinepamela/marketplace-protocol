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