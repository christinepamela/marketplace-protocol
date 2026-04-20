/**
 * BTCPay Webhook Route
 * Path: src/api/routes/btcpay.routes.ts
 *
 * Receives payment confirmation events from BTCPay Server.
 * Register in BTCPay: Store → Webhooks → https://yourdomain.com/webhooks/btcpay
 */

import { Router, Request, Response } from 'express';
import { getBTCPayAdapter } from '../../infrastructure/payment/btcpay.adapter';
import { OrderService } from '../../core/layer2-transaction/order.service';
import { EscrowService } from '../../core/layer2-transaction/escrow.service';

const router = Router();

router.post('/', async (req: Request, res: Response) => {
  const signature = req.headers['btcpay-sig'] as string;

  if (!signature) {
    console.warn('[BTCPayWebhook] Missing BTCPay-Sig header');
    return res.status(400).json({ error: 'Missing signature' });
  }

  let event;
  try {
    const adapter = getBTCPayAdapter();
    event = adapter.verifyWebhook(req.body as Buffer, signature);
  } catch (err: any) {
    console.error('[BTCPayWebhook] Signature verification failed:', err.message);
    return res.status(400).json({ error: 'Invalid signature' });
  }

  console.log(`[BTCPayWebhook] Event: ${event.type} invoice=${event.invoiceId}`);

  try {
    switch (event.type) {

      case 'InvoiceSettled': {
        // Payment received and confirmed — mark order as paid
        const orderId = event.metadata?.order_id;
        if (!orderId) {
          console.warn('[BTCPayWebhook] InvoiceSettled — no order_id in metadata');
          break;
        }

        const orderService = new OrderService(req.supabase);
        const escrowService = new EscrowService(req.supabase);

        const order = await orderService.getOrderById(orderId);
        if (!order) {
          console.warn(`[BTCPayWebhook] Order not found: ${orderId}`);
          break;
        }

        if (order.status !== 'payment_pending') {
          console.log(`[BTCPayWebhook] Order ${orderId} already ${order.status} — skipping`);
          break;
        }

        await orderService.markAsPaid(orderId, `btcpay_${event.invoiceId}`);
        await escrowService.createEscrow(orderId, order.total);

        console.log(`[BTCPayWebhook] Order ${orderId} paid via BTCPay (${event.invoiceId})`);
        break;
      }

      case 'InvoiceExpired':
      case 'InvoiceInvalid': {
        const orderId = event.metadata?.order_id;
        if (orderId) {
          console.warn(`[BTCPayWebhook] Invoice ${event.type} for order ${orderId}`);
          await req.supabase
            .from('orders')
            .update({
              internal_notes: `BTCPay invoice ${event.type.toLowerCase()}: ${event.invoiceId}`,
              updated_at: new Date().toISOString(),
            })
            .eq('id', orderId);
        }
        break;
      }

      default:
        console.log(`[BTCPayWebhook] Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (err: any) {
    console.error('[BTCPayWebhook] Handler error:', err.message);
    res.json({ received: true, error: err.message });
  }
});

export default router;