/**
 * Order Routes (Layer 2)
 * REST endpoints for order management and escrow
 */

import { Router } from 'express';
import { z } from 'zod';
import { OrderService } from '../../core/layer2-transaction/order.service';
import { EscrowService } from '../../core/layer2-transaction/escrow.service';
import { authenticate } from '../middleware/auth.middleware';
import { validateBody } from '../middleware/validation.middleware';
import { ApiError, ErrorCode } from '../core/errors';
import type {
  CreateOrderRequest,
  OrderStatus,
  PaymentMethod,
  OrderType
} from '../../core/layer2-transaction/types';

const router = Router();
const requireAuth = authenticate();

// Helper to get user DID from JWT (handles both 'did' and 'sub' fields)
function getUserDid(req: any): string {
  return req.user?.did || req.user?.sub;
}

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const createOrderSchema = z.object({
  vendorDid: z.string().startsWith('did:'),
  clientId: z.string(),
  type: z.enum(['sample', 'wholesale', 'custom']),
  items: z.array(z.object({
    productId: z.string(),
    productName: z.string(),
    quantity: z.number().positive(),
    pricePerUnit: z.object({
      amount: z.number(),
      currency: z.string()
    }),
    totalPrice: z.object({
      amount: z.number(),
      currency: z.string()
    }),
    variantId: z.string().optional(),
    variantName: z.string().optional(),
    customization: z.record(z.any()).optional(),
    notes: z.string().optional()
  })).min(1),
  shippingAddress: z.object({
    name: z.string(),
    addressLine1: z.string(),
    addressLine2: z.string().optional(),
    city: z.string(),
    state: z.string().optional(),
    postalCode: z.string(),
    country: z.string(),
    phone: z.string()
  }),
  paymentMethod: z.enum(['lightning', 'bitcoin_onchain', 'stripe', 'paypal', 'bank_transfer', 'other']),
  buyerNotes: z.string().optional()
});

const markShippedSchema = z.object({
  trackingNumber: z.string().optional(),
  logisticsProviderId: z.string().optional()
});

const payOrderSchema = z.object({
  paymentProof: z.object({
    lightningInvoice: z.string().optional(),
    lightningPreimage: z.string().optional(),
    txid: z.string().optional(),
    blockHeight: z.number().optional(),
    stripePaymentIntentId: z.string().optional(),
    stripeChargeId: z.string().optional(),
    paypalTransactionId: z.string().optional(),
    receiptUrl: z.string().optional(),
    timestamp: z.string().datetime()
  }).optional()
});

const cancelOrderSchema = z.object({
  reason: z.string()
});

// ============================================================================
// ROUTES
// ============================================================================

/**
 * @route   POST /api/v1/orders
 * @desc    Create new order
 * @access  Private (authenticated buyer)
 */
router.post(
  '/',
  requireAuth,
  validateBody(createOrderSchema),
  async (req, res, next) => {
    try {
      const buyerDid = getUserDid(req);
      const orderService = new OrderService(req.supabase);

      const createRequest: CreateOrderRequest = {
        buyerDid,
        ...req.body
      };

      const response = await orderService.createOrder(createRequest);

      res.status(201).json({
        success: true,
        data: response
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   GET /api/v1/orders/:id
 * @desc    Get order by ID
 * @access  Private (buyer or vendor only)
 */
router.get(
  '/:id',
  requireAuth,
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const userDid = (req.user as any)?.did || req.user!.sub;
      const orderService = new OrderService(req.supabase);

      const order = await orderService.getOrderById(id);

      if (!order) {
        throw new ApiError(ErrorCode.ORDER_NOT_FOUND, 'Order not found');
      }

      // Check access: only buyer or vendor can view
      if (order.buyerDid !== userDid && order.vendorDid !== userDid) {
        throw new ApiError(
          ErrorCode.FORBIDDEN,
          'You do not have permission to view this order',
        );
      }

      res.json({
        success: true,
        data: order
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   GET /api/v1/orders/buyer/:did
 * @desc    Get orders by buyer
 * @access  Private (buyer only)
 */
router.get(
  '/buyer/:did',
  requireAuth,
  async (req, res, next) => {
    try {
      const { did } = req.params;
      const userDid = req.user!.did;

      // Users can only view their own orders
      if (did !== userDid) {
        throw new ApiError(
          ErrorCode.FORBIDDEN,
          'You can only view your own orders',
        );
      }

      const orderService = new OrderService(req.supabase);

      const status = req.query.status as OrderStatus | undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;

      const orders = await orderService.getOrdersByBuyer(did, {
        status,
        limit,
        offset
      });

      res.json({
        success: true,
        data: orders,
        pagination: {
          limit,
          offset,
          count: orders.length
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   GET /api/v1/orders/vendor/:did
 * @desc    Get orders by vendor
 * @access  Private (vendor only)
 */
router.get(
  '/vendor/:did',
  requireAuth,
  async (req, res, next) => {
    try {
      const { did } = req.params;
      const userDid = req.user!.did;

      // Users can only view their own orders
      if (did !== userDid) {
        throw new ApiError(
          ErrorCode.FORBIDDEN,
          'You can only view your own orders',
        );
      }

      const orderService = new OrderService(req.supabase);

      const status = req.query.status as OrderStatus | undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;

      const orders = await orderService.getOrdersByVendor(did, {
        status,
        limit,
        offset
      });

      res.json({
        success: true,
        data: orders,
        pagination: {
          limit,
          offset,
          count: orders.length
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   POST /api/v1/orders/:id/pay
 * @desc    Mark order as paid and create escrow
 * @access  Private (buyer only)
 */
router.post(
  '/:id/pay',
  requireAuth,
  validateBody(payOrderSchema),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const userDid = req.user!.did;
      const orderService = new OrderService(req.supabase);
      const escrowService = new EscrowService(req.supabase);

      const order = await orderService.getOrderById(id);

      if (!order) {
        throw new ApiError(ErrorCode.ORDER_NOT_FOUND, 'Order not found');
      }

      // Only buyer can pay
      if (order.buyerDid !== userDid) {
        throw new ApiError(
          ErrorCode.FORBIDDEN,
          'Only the buyer can pay for this order',
        );
      }

      // Check order status
      if (order.status !== 'payment_pending') {
        throw new ApiError(
          ErrorCode.INVALID_ORDER_STATUS,
          `Cannot pay order in status: ${order.status}`,
        );
      }

      // Mark as paid
      await orderService.markAsPaid(id, 'payment_' + Date.now());

      // Create escrow
      const escrow = await escrowService.createEscrow(
        id,
        order.total
      );

      res.json({
        success: true,
        message: 'Payment confirmed, funds held in escrow',
        data: {
          orderId: id,
          escrowId: escrow.id,
          status: 'paid'
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   POST /api/v1/orders/:id/confirm
 * @desc    Vendor confirms order
 * @access  Private (vendor only)
 */
router.post(
  '/:id/confirm',
  requireAuth,
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const userDid = req.user!.did;
      const orderService = new OrderService(req.supabase);

      const order = await orderService.getOrderById(id);

      if (!order) {
        throw new ApiError(ErrorCode.ORDER_NOT_FOUND, 'Order not found');
      }

      // Only vendor can confirm
      if (order.vendorDid !== userDid) {
        throw new ApiError(
          ErrorCode.FORBIDDEN,
          'Only the vendor can confirm this order',
        );
      }

      await orderService.confirmOrder(id, userDid);

      res.json({
        success: true,
        message: 'Order confirmed by vendor'
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   POST /api/v1/orders/:id/ship
 * @desc    Mark order as shipped
 * @access  Private (vendor only)
 */
router.post(
  '/:id/ship',
  requireAuth,
  validateBody(markShippedSchema),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const userDid = req.user!.did;
      const { trackingNumber, logisticsProviderId } = req.body;
      
      const orderService = new OrderService(req.supabase);

      const order = await orderService.getOrderById(id);

      if (!order) {
        throw new ApiError(ErrorCode.ORDER_NOT_FOUND, 'Order not found');
      }

      // Only vendor can ship
      if (order.vendorDid !== userDid) {
        throw new ApiError(
          ErrorCode.FORBIDDEN,
          'Only the vendor can ship this order',
        );
      }

      await orderService.markAsShipped(id, trackingNumber, logisticsProviderId);

      res.json({
        success: true,
        message: 'Order marked as shipped',
        data: {
          trackingNumber,
          logisticsProviderId
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   POST /api/v1/orders/:id/deliver
 * @desc    Mark order as delivered
 * @access  Private (buyer or logistics provider)
 */
router.post(
  '/:id/deliver',
  requireAuth,
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const userDid = req.user!.did;
      const orderService = new OrderService(req.supabase);

      const order = await orderService.getOrderById(id);

      if (!order) {
        throw new ApiError(ErrorCode.ORDER_NOT_FOUND, 'Order not found');
      }

      // Buyer or logistics provider can mark as delivered
      const canDeliver = 
        order.buyerDid === userDid || 
        (order.logisticsProviderId && order.logisticsProviderId === userDid);

      if (!canDeliver) {
        throw new ApiError(
          ErrorCode.FORBIDDEN,
          'Only the buyer or logistics provider can mark order as delivered',
        );
      }

      await orderService.markAsDelivered(id);

      res.json({
        success: true,
        message: 'Order marked as delivered'
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   POST /api/v1/orders/:id/complete
 * @desc    Complete order and release escrow
 * @access  Private (buyer or auto-release)
 */
router.post(
  '/:id/complete',
  requireAuth,
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const userDid = req.user!.did;
      const orderService = new OrderService(req.supabase);
      const escrowService = new EscrowService(req.supabase);

      const order = await orderService.getOrderById(id);

      if (!order) {
        throw new ApiError(ErrorCode.ORDER_NOT_FOUND, 'Order not found');
      }

      // Only buyer can complete (or system for auto-release)
      if (order.buyerDid !== userDid && userDid !== 'system') {
        throw new ApiError(
          ErrorCode.FORBIDDEN,
          'Only the buyer can complete this order',
        );
      }

      // Complete order
      await orderService.completeOrder(id);

      // Release escrow
      const escrow = await escrowService.getEscrowByOrderId(id);
      if (escrow) {
        await escrowService.releaseEscrow(id, 'Order completed by buyer');
      }

      res.json({
        success: true,
        message: 'Order completed, funds released to vendor'
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   POST /api/v1/orders/:id/cancel
 * @desc    Cancel order
 * @access  Private (buyer or vendor)
 */
router.post(
  '/:id/cancel',
  requireAuth,
  validateBody(cancelOrderSchema),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const userDid = req.user!.did;
      const { reason } = req.body;
      
      const orderService = new OrderService(req.supabase);
      const escrowService = new EscrowService(req.supabase);

      const order = await orderService.getOrderById(id);

      if (!order) {
        throw new ApiError(ErrorCode.ORDER_NOT_FOUND, 'Order not found');
      }

      // Buyer or vendor can cancel
      const canCancel = order.buyerDid === userDid || order.vendorDid === userDid;

      if (!canCancel) {
        throw new ApiError(
          ErrorCode.FORBIDDEN,
          'Only buyer or vendor can cancel this order',
        );
      }

      // Cancel order
      await orderService.cancelOrder(id, userDid, reason);

      // Refund escrow if exists
      const escrow = await escrowService.getEscrowByOrderId(id);
      if (escrow && escrow.status === 'held') {
        await escrowService.refundEscrow(id, reason);
      }

      res.json({
        success: true,
        message: 'Order cancelled',
        data: {
          cancelledBy: userDid,
          reason
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   GET /api/v1/orders/:id/history
 * @desc    Get order status history
 * @access  Private (buyer or vendor)
 */
router.get(
  '/:id/history',
  requireAuth,
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const userDid = req.user!.did;
      const orderService = new OrderService(req.supabase);

      const order = await orderService.getOrderById(id);

      if (!order) {
        throw new ApiError(ErrorCode.ORDER_NOT_FOUND, 'Order not found');
      }

      // Check access
      if (order.buyerDid !== userDid && order.vendorDid !== userDid) {
        throw new ApiError(
          ErrorCode.FORBIDDEN,
          'You do not have permission to view this order history',
        );
      }

      const history = await orderService.getOrderHistory(id);

      res.json({
        success: true,
        data: history
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;