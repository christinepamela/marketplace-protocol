// Layer 5: Developer SDK - Rating Routes (Layer 4 API)
// Path: src/api/routes/rating.routes.ts

import { Router } from 'express';
import { z } from 'zod';
import { RatingService } from '../../core/layer4-trust/rating.service';
import { authenticate } from '../middleware/auth.middleware';
import { validateBody } from '../middleware/validation.middleware';
import { ApiError, ErrorCode } from '../core/errors';
import { getUserDid } from '../core/utils';

const router = Router();

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const ratingCategoriesSchema = z.object({
  quality: z.number().min(1).max(5).optional(),
  delivery: z.number().min(1).max(5).optional(),
  communication: z.number().min(1).max(5).optional(),
  payment: z.number().min(1).max(5).optional(),
});

const submitRatingSchema = z.object({
  order_id: z.string().uuid(),
  rating: z.number().min(1).max(5),
  comment: z.string().max(1000).optional(),
  categories: ratingCategoriesSchema.optional(),
});

// ============================================================================
// ROUTES
// ============================================================================

/**
 * POST /api/ratings
 * Submit a rating for a completed order
 * 
 * @auth Required (JWT)
 * @body {order_id, rating, comment?, categories?}
 * @returns {rating} Rating object
 */
router.post(
  '/',
  authenticate(),
  validateBody(submitRatingSchema),
  async (req, res, next) => {
    try {
      const raterDid = getUserDid(req);
      const { order_id, rating, comment, categories } = req.body;

      // Determine rater type (buyer or vendor)
      const { data: order } = await req.supabase
        .from('orders')
        .select('buyer_did, vendor_did, status')
        .eq('id', order_id)
        .single();

      if (!order) {
        throw new ApiError(
          ErrorCode.ORDER_NOT_FOUND,
          `Order ${order_id} not found`
        );
      }

      // Verify user is a participant
      let raterType: 'buyer' | 'vendor';
      if (order.buyer_did === raterDid) {
        raterType = 'buyer';
      } else if (order.vendor_did === raterDid) {
        raterType = 'vendor';
      } else {
        throw new ApiError(
          ErrorCode.FORBIDDEN,
          'Only order participants can submit ratings'
        );
      }

      const ratingService = new RatingService(req.supabase);
      const ratingRecord = await ratingService.submitRating({
        order_id,
        rater_did: raterDid,
        rater_type: raterType,
        rating,
        comment,
        categories,
      });

      res.status(201).json({
        success: true,
        data: ratingRecord,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/ratings/order/:orderId
 * Get rating for a specific order
 * 
 * @auth Required (JWT)
 * @param {orderId} Order ID
 * @returns {rating} Rating object (only revealed ratings)
 */
router.get(
  '/order/:orderId',
  authenticate(),
  async (req, res, next) => {
    try {
      const userDid = getUserDid(req);
      const { orderId } = req.params;

      // Verify user is a participant
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
          'Only order participants can view ratings'
        );
      }

      const ratingService = new RatingService(req.supabase);
      const rating = await ratingService.getRatingByOrder(orderId);

      // If not revealed yet, hide the other party's rating
      let sanitizedRating = rating;
      if (rating && !rating.revealed_at) {
        if (order.buyer_did === userDid) {
          // Buyer can only see their own rating
          sanitizedRating = {
            ...rating,
            vendor_rating: undefined,
            vendor_comment: undefined,
            vendor_categories: undefined,
            vendor_submitted_at: undefined,
          };
        } else {
          // Vendor can only see their own rating
          sanitizedRating = {
            ...rating,
            buyer_rating: undefined,
            buyer_comment: undefined,
            buyer_categories: undefined,
            buyer_submitted_at: undefined,
          };
        }
      }

      res.json({
        success: true,
        data: sanitizedRating,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/ratings/user/:did
 * Get rating statistics for a user
 * 
 * @auth Optional (public data)
 * @param {did} User DID
 * @query {role} 'buyer' or 'vendor'
 * @returns {stats} Rating statistics
 */
router.get(
  '/user/:did',
  async (req, res, next) => {
    try {
      const { did } = req.params;
      const { role } = req.query;

      if (!role || (role !== 'buyer' && role !== 'vendor')) {
        throw new ApiError(
          ErrorCode.INVALID_INPUT,
          'Query parameter "role" must be "buyer" or "vendor"'
        );
      }

      const ratingService = new RatingService(req.supabase);
      const stats = await ratingService.getRatingStats(did, role as 'buyer' | 'vendor');

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/ratings/user/:did/list
 * Get list of ratings for a user
 * 
 * @auth Optional (public data)
 * @param {did} User DID
 * @query {role} 'buyer' or 'vendor'
 * @returns {ratings[]} Array of revealed ratings
 */
router.get(
  '/user/:did/list',
  async (req, res, next) => {
    try {
      const { did } = req.params;
      const { role } = req.query;

      if (!role || (role !== 'buyer' && role !== 'vendor')) {
        throw new ApiError(
          ErrorCode.INVALID_INPUT,
          'Query parameter "role" must be "buyer" or "vendor"'
        );
      }

      const ratingService = new RatingService(req.supabase);
      const ratings = await ratingService.getRatingsForUser(did, role as 'buyer' | 'vendor');

      res.json({
        success: true,
        data: ratings,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;