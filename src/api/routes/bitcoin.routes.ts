/**
 * Bitcoin Payment Routes (Backend Protocol)
 * Routes for Bitcoin payment address generation and monitoring
 */

import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { BitcoinService } from '../../core/layer2-transaction/bitcoin.service';
import { ApiError, ErrorCode } from '../core/errors';
import type { Price } from '../../core/layer1-catalog/types';

const router = Router();
const requireAuth = authenticate();

// Helper to get user DID from JWT
function getUserDid(req: any): string {
  return req.user?.did || req.user?.sub;
}

/**
 * @route   POST /api/v1/bitcoin/generate-address
 * @desc    Generate Bitcoin escrow address for order payment
 * @access  Private (buyer only)
 */
router.post(
  '/generate-address',
  requireAuth,
  async (req, res, next) => {
    try {
      const { orderId, amount } = req.body;
      const userDid = getUserDid(req);

      // Validate input
      if (!orderId || !amount || !amount.amount || !amount.currency) {
        throw new ApiError(
          ErrorCode.VALIDATION_ERROR,
          'Missing required fields: orderId, amount'
        );
      }

      // Verify order exists and user is the buyer
      const { data: order } = await req.supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();

      if (!order) {
        throw new ApiError(ErrorCode.ORDER_NOT_FOUND, 'Order not found');
      }

      if (order.buyer_did !== userDid) {
        throw new ApiError(
          ErrorCode.FORBIDDEN,
          'Only the buyer can generate payment address for this order'
        );
      }

      // Check if address already generated
      const { data: existing } = await req.supabase
        .from('bitcoin_payment_addresses')
        .select('*')
        .eq('order_id', orderId)
        .single();

      if (existing && !existing.confirmed) {
        // Return existing address if not yet paid
        return res.json({
          success: true,
          address: existing.address,
          expectedAmount: existing.expected_amount,
          usdAmount: existing.usd_amount,
          expiresAt: existing.expires_at,
          derivationPath: existing.derivation_path
        });
      }

      // Initialize Bitcoin service
      const bitcoinService = new BitcoinService(
        req.supabase,
        process.env.BITCOIN_MNEMONIC,
        process.env.BITCOIN_NETWORK === 'testnet'
      );

      // Generate payment address
      const paymentAddress = await bitcoinService.generateEscrowAddress(
        orderId,
        amount as Price
      );

      res.json({
        success: true,
        address: paymentAddress.address,
        expectedAmount: paymentAddress.expectedAmount,
        usdAmount: paymentAddress.usdAmount,
        expiresAt: paymentAddress.expiresAt,
        derivationPath: paymentAddress.derivationPath
      });

    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   GET /api/v1/bitcoin/payment-status/:orderId
 * @desc    Check Bitcoin payment status for order
 * @access  Private (buyer or vendor)
 */
router.get(
  '/payment-status/:orderId',
  requireAuth,
  async (req, res, next) => {
    try {
      const { orderId } = req.params;
      const userDid = getUserDid(req);

      // Verify order exists and user has access
      const { data: order } = await req.supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();

      if (!order) {
        throw new ApiError(ErrorCode.ORDER_NOT_FOUND, 'Order not found');
      }

      const canAccess = order.buyer_did === userDid || order.vendor_did === userDid;
      if (!canAccess) {
        throw new ApiError(
          ErrorCode.FORBIDDEN,
          'You do not have permission to view this payment status'
        );
      }

      // Initialize Bitcoin service
      const bitcoinService = new BitcoinService(
        req.supabase,
        process.env.BITCOIN_MNEMONIC,
        process.env.BITCOIN_NETWORK === 'testnet'
      );

      // Check payment status
      const status = await bitcoinService.monitorOrderPayment(orderId);

      if (!status) {
        return res.json({
          success: true,
          address: null,
          confirmed: false,
          confirmations: 0,
          amountReceived: 0
        });
      }

      // If payment confirmed and order not yet marked as paid, update it
      if (status.confirmed && order.status === 'payment_pending') {
        await req.supabase
          .from('orders')
          .update({
            status: 'paid',
            payment_status: 'completed',
            paid_at: new Date().toISOString()
          })
          .eq('id', orderId);

        // Create escrow record
        await req.supabase
          .from('escrows')
          .insert({
            id: crypto.randomUUID(),
            order_id: orderId,
            amount: { amount: order.total_amount, currency: order.total_currency },
            status: 'held',
            rules: { holdDuration: 7, autoReleaseIfNoDispute: true },
            held_at: new Date().toISOString(),
            release_scheduled_at: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString()
          });
      }

      res.json({
        success: true,
        address: status.address,
        confirmed: status.confirmed,
        confirmations: status.confirmations,
        amountReceived: status.amountReceived,
        txid: status.txid,
        blockHeight: status.blockHeight
      });

    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   POST /api/v1/bitcoin/vendor-payout
 * @desc    Create vendor payout after delivery
 * @access  System (called internally after delivery confirmation)
 */
router.post(
  '/vendor-payout',
  requireAuth,
  async (req, res, next) => {
    try {
      const { orderId, vendorDid, payoutMethod, destination } = req.body;

      // Validate input
      if (!orderId || !vendorDid || !payoutMethod || !destination) {
        throw new ApiError(
          ErrorCode.VALIDATION_ERROR,
          'Missing required fields: orderId, vendorDid, payoutMethod, destination'
        );
      }

      // Verify order is delivered
      const { data: order } = await req.supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();

      if (!order) {
        throw new ApiError(ErrorCode.ORDER_NOT_FOUND, 'Order not found');
      }

      if (order.status !== 'delivered' && order.status !== 'completed') {
        throw new ApiError(
          ErrorCode.INVALID_ORDER_STATUS,
          'Order must be delivered before vendor payout'
        );
      }

      // Initialize Bitcoin service
      const bitcoinService = new BitcoinService(
        req.supabase,
        process.env.BITCOIN_MNEMONIC,
        process.env.BITCOIN_NETWORK === 'testnet'
      );

      // Create payout
      const payout = await bitcoinService.createVendorPayout(
        orderId,
        vendorDid,
        payoutMethod,
        destination
      );

      // Execute payout if BTC
      if (payoutMethod === 'btc') {
        const txid = await bitcoinService.executeVendorPayoutBTC(
          orderId,
          destination
        );

        res.json({
          success: true,
          payout: {
            ...payout,
            txid,
            status: 'completed'
          }
        });
      } else {
        // Fiat payout - would integrate with banking API
        res.json({
          success: true,
          payout: {
            ...payout,
            status: 'pending'
          },
          message: 'Fiat payout created. Processing through banking partner.'
        });
      }

    } catch (error) {
      next(error);
    }
  }
);

export default router;
