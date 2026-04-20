/**
 * Stripe Webhook Route
 * Path: src/api/routes/stripe.routes.ts
 *
 * Handles inbound webhook events from Stripe.
 * Stripe calls this URL when payments succeed, fail, or are refunded.
 *
 * IMPORTANT: This route must receive the RAW body (not JSON-parsed).
 * The express.json() middleware must NOT run before this route.
 * See server registration below — we mount this BEFORE the body parser.
 */

import { Router, Request, Response } from 'express';
import { getStripeAdapter } from '../../infrastructure/payment/stripe.adapter';
import { OrderService } from '../../core/layer2-transaction/order.service';
import { EscrowService } from '../../core/layer2-transaction/escrow.service';

const router = Router();

/**
 * POST /webhooks/stripe
 *
 * Stripe sends events here. We verify the signature then act on the event type.
 * Register this URL in your Stripe Dashboard:
 *   Developers → Webhooks → Add endpoint → https://yourdomain.com/webhooks/stripe
 *   Events to listen for:
 *     - payment_intent.succeeded
 *     - payment_intent.payment_failed
 *     - charge.refunded
 */
router.post(
  '/',
  // Raw body middleware — must come BEFORE express.json() for this route
  // This is handled by mounting this route before the body parser in server registration
  async (req: Request, res: Response) => {
    const signature = req.headers['stripe-signature'] as string;

    if (!signature) {
      console.warn('[StripeWebhook] Missing Stripe-Signature header');
      return res.status(400).json({ error: 'Missing signature' });
    }

    let event;
    try {
      const stripe = getStripeAdapter();
      // req.body is a Buffer here because this route uses express.raw()
      event = stripe.verifyWebhook(req.body as Buffer, signature);
    } catch (err: any) {
      console.error('[StripeWebhook] Signature verification failed:', err.message);
      return res.status(400).json({ error: 'Invalid signature' });
    }

    console.log(`[StripeWebhook] Received event: ${event.type} id=${event.id}`);

    try {
      switch (event.type) {

        case 'payment_intent.succeeded': {
          const intent = event.data.object as any;
          const orderId = intent.metadata?.order_id;

          if (!orderId) {
            console.warn('[StripeWebhook] payment_intent.succeeded — no order_id in metadata');
            break;
          }

          const orderService = new OrderService(req.supabase);
          const escrowService = new EscrowService(req.supabase);

          // Check order isn't already paid (idempotency)
          const order = await orderService.getOrderById(orderId);
          if (!order) {
            console.warn(`[StripeWebhook] Order not found: ${orderId}`);
            break;
          }

          if (order.status !== 'payment_pending') {
            console.log(`[StripeWebhook] Order ${orderId} already in status: ${order.status} — skipping`);
            break;
          }

          // Mark order as paid
          await orderService.markAsPaid(orderId, intent.id);

          // Create escrow
          await escrowService.createEscrow(orderId, order.total);

          console.log(`[StripeWebhook] Order ${orderId} marked as paid via Stripe (${intent.id})`);
          break;
        }

        case 'payment_intent.payment_failed': {
          const intent = event.data.object as any;
          const orderId = intent.metadata?.order_id;

          if (!orderId) break;

          console.warn(
            `[StripeWebhook] Payment failed for order ${orderId}: ` +
            `${intent.last_payment_error?.message}`
          );

          // Optional: update order with failure note via internal_notes
          await req.supabase
            .from('orders')
            .update({
              internal_notes: `Stripe payment failed: ${intent.last_payment_error?.message}`,
              updated_at: new Date().toISOString(),
            })
            .eq('id', orderId);

          break;
        }

        case 'charge.refunded': {
          const charge = event.data.object as any;
          const orderId = charge.metadata?.order_id || charge.payment_intent_metadata?.order_id;

          if (!orderId) {
            console.warn('[StripeWebhook] charge.refunded — no order_id in metadata');
            break;
          }

          const escrowService = new EscrowService(req.supabase);
          const escrow = await escrowService.getEscrowByOrderId(orderId);

          if (escrow && escrow.status === 'held') {
            await escrowService.refundEscrow(orderId, 'Stripe charge refunded');
            console.log(`[StripeWebhook] Escrow refunded for order ${orderId}`);
          }

          break;
        }

        default:
          // Unhandled event type — log and return 200 (Stripe will retry if we 4xx)
          console.log(`[StripeWebhook] Unhandled event type: ${event.type}`);
      }

      // Always return 200 quickly — Stripe retries on non-2xx
      res.json({ received: true });

    } catch (err: any) {
      console.error('[StripeWebhook] Handler error:', err.message);
      // Return 200 anyway to prevent Stripe from retrying — we log the error internally
      res.json({ received: true, error: err.message });
    }
  }
);

export default router;