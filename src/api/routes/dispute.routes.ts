// Layer 5: Developer SDK - Dispute Routes (Layer 4 API)
// Path: src/api/routes/dispute.routes.ts

console.log('=== DISPUTE ROUTES LOADING ===');

import { Router } from 'express';
import { z } from 'zod';
import { DisputeService } from '../../core/layer4-trust/dispute.service';
import { authenticate } from '../middleware/auth.middleware';
import { validateBody } from '../middleware/validation.middleware';
import { ApiError, ErrorCode } from '../core/errors';
import { getUserDid } from '../core/utils';

const router = Router();

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const disputeEvidenceSchema = z.object({
  photo_urls: z.array(z.string().url()).optional(),
  video_urls: z.array(z.string().url()).optional(),
  tracking_number: z.string().optional(),
  tracking_events: z.array(z.any()).optional(),
  message_thread_id: z.string().optional(),
  description_details: z.string().optional(),
});

const createDisputeSchema = z.object({
  order_id: z.string().uuid(),
  dispute_type: z.enum(['quality', 'non_receipt', 'logistics', 'change_of_mind', 'other']),
  description: z.string().min(10).max(5000),
  evidence: disputeEvidenceSchema.optional(),
});

const vendorResponseSchema = z.object({
  response_text: z.string().min(10).max(5000),
  counter_evidence: disputeEvidenceSchema.optional(),
  proposed_resolution: z.enum(['full_refund', 'partial_refund', 'no_refund', 'vendor_wins']).optional(),
});

// ============================================================================
// ROUTES
// ============================================================================

/**
 * POST /api/disputes
 * File a new dispute (buyer only, within 72h of delivery)
 * 
 * @auth Required (JWT)
 * @body {order_id, dispute_type, description, evidence?}
 * @returns {dispute} Dispute object
 */
router.post(
  '/',
  authenticate(),
  validateBody(createDisputeSchema),
  async (req, res, next) => {
    try {
      const buyerDid = getUserDid(req);
      const { order_id, dispute_type, description, evidence } = req.body;

      const disputeService = new DisputeService(req.supabase);

      // Verify user is the buyer
      const { data: order } = await req.supabase
        .from('orders')
        .select('buyer_did, vendor_did, status, delivered_at')
        .eq('id', order_id)
        .single();

      if (!order) {
        throw new ApiError(
          ErrorCode.ORDER_NOT_FOUND,
          `Order ${order_id} not found`
        );
      }

      if (order.buyer_did !== buyerDid) {
        throw new ApiError(
          ErrorCode.FORBIDDEN,
          'Only the buyer can file a dispute'
        );
      }

      // Create dispute
      const dispute = await disputeService.openDispute({
        order_id,
        buyer_did: buyerDid,
        dispute_type,
        description,
        evidence,
      });

      res.status(201).json({
        success: true,
        data: dispute,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/disputes/:id
 * Get dispute details
 * 
 * @auth Required (JWT)
 * @param {id} Dispute ID
 * @returns {dispute} Dispute object with events
 */

router.get(
  '/stats',
  authenticate(),
  async (req, res, next) => {
    try {
      const disputeService = new DisputeService(req.supabase);
      const stats = await disputeService.getDisputeStats();

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  '/:id',
  authenticate(),
  async (req, res, next) => {
    try {
      const userDid = getUserDid(req);
      const { id } = req.params;

      const disputeService = new DisputeService(req.supabase);
      const dispute = await disputeService.getDispute(id);

      // Verify user is a participant (buyer or vendor)
      if (dispute.buyer_did !== userDid && dispute.vendor_did !== userDid) {
        throw new ApiError(
          ErrorCode.FORBIDDEN,
          'You do not have permission to view this dispute'
        );
      }

      // Get dispute events
      const events = await disputeService.getDisputeEvents(id);

      res.json({
        success: true,
        data: {
          ...dispute,
          events,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/disputes/:id/vendor-response
 * Vendor submits response to dispute
 * 
 * @auth Required (JWT)
 * @param {id} Dispute ID
 * @body {response_text, counter_evidence?, proposed_resolution?}
 * @returns {dispute} Updated dispute object
 */
router.post(
  '/:id/vendor-response',
  authenticate(),
  validateBody(vendorResponseSchema),
  async (req, res, next) => {
    try {
      const vendorDid = getUserDid(req);
      const { id } = req.params;
      const { response_text, counter_evidence, proposed_resolution } = req.body;

      const disputeService = new DisputeService(req.supabase);
      
      // submitVendorResponse will verify vendor permission internally
      const dispute = await disputeService.submitVendorResponse({
        dispute_id: id,
        vendor_did: vendorDid,
        response_text,
        counter_evidence,
        proposed_resolution,
      });

      res.json({
        success: true,
        data: dispute,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/disputes/order/:orderId
 * Get all disputes for an order
 * 
 * @auth Required (JWT)
 * @param {orderId} Order ID
 * @returns {disputes[]} Array of disputes
 */
router.get(
  '/order/:orderId',
  authenticate(),
  async (req, res, next) => {
    try {
      const userDid = getUserDid(req);
      const { orderId } = req.params;

      // Verify user is participant in the order
      const { data: order } = await req.supabase
        .from('orders')
        .select('buyer_did, vendor_did')
        .eq('id', orderId)
        .single();

      if (!order) {
        throw new ApiError(
          ErrorCode.ORDER_NOT_FOUND,
          `Order ${orderId} not found`
        );
      }

      if (order.buyer_did !== userDid && order.vendor_did !== userDid) {
        throw new ApiError(
          ErrorCode.FORBIDDEN,
          'You do not have permission to view disputes for this order'
        );
      }

      const disputeService = new DisputeService(req.supabase);
      const disputes = await disputeService.getDisputesByOrder(orderId);

      res.json({
        success: true,
        data: disputes,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/disputes/stats
 * Get dispute statistics (admin/analytics)
 * 
 * @auth Required (JWT)
 * @returns {stats} Dispute statistics
 */


export default router;

console.log('✅ dispute.routes.ts loaded successfully');