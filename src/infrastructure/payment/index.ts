/**
 * Payment Infrastructure — Barrel Export
 * Path: src/infrastructure/payment/index.ts
 */

export { StripeAdapter, getStripeAdapter } from './stripe.adapter';
export type {
  CreatePaymentIntentParams,
  PaymentIntentResult,
  ConfirmPaymentResult,
  RefundResult,
  PayoutResult,
} from './stripe.adapter';

export { BTCPayAdapter, getBTCPayAdapter } from './btcpay.adapter';
export type { BTCPayInvoice, BTCPayWebhookEvent } from './btcpay.adapter';