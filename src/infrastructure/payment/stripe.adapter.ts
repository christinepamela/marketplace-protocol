/**
 * Stripe Payment Adapter
 * Path: src/infrastructure/payment/stripe.adapter.ts
 *
 * Handles:
 *   - PaymentIntent creation (buyer checkout)
 *   - Payment confirmation (webhook or polling)
 *   - Vendor payout via Stripe Connect or manual transfer
 *   - Refunds (dispute resolution)
 *   - Webhook signature verification
 */

import Stripe from 'stripe';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface CreatePaymentIntentParams {
  orderId: string;
  amount: number;       // in smallest currency unit (cents for USD)
  currency: string;     // ISO 4217 e.g. 'usd'
  customerEmail?: string;
  metadata?: Record<string, string>;
}

export interface PaymentIntentResult {
  clientSecret: string;    // returned to frontend to complete payment
  paymentIntentId: string;
  amount: number;
  currency: string;
  status: string;
}

export interface ConfirmPaymentResult {
  success: boolean;
  paymentIntentId: string;
  chargeId?: string;
  amount: number;
  currency: string;
  status: string;
}

export interface RefundResult {
  refundId: string;
  amount: number;
  currency: string;
  status: string;
}

export interface PayoutResult {
  success: boolean;
  transferId?: string;
  payoutId?: string;
  amount: number;
  currency: string;
  method: 'transfer' | 'payout';
}

// ─── Adapter ─────────────────────────────────────────────────────────────────

export class StripeAdapter {
  private stripe: Stripe;
  private webhookSecret: string;

  constructor() {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      throw new Error('STRIPE_SECRET_KEY is not set in environment variables');
    }

    this.stripe = new Stripe(secretKey, {
      apiVersion: '2025-04-30.basil',
      typescript: true,
    });

    this.webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';
  }

  // ─── Buyer: Create Payment Intent ─────────────────────────────────────────

  /**
   * Create a PaymentIntent for an order.
   * Returns clientSecret to the frontend — Stripe Elements completes the payment.
   *
   * Amount must be in the smallest currency unit:
   *   USD $10.50 → amount: 1050
   *   MYR RM 50  → amount: 5000
   *   JPY ¥1000  → amount: 1000 (JPY has no subunit)
   */
  async createPaymentIntent(params: CreatePaymentIntentParams): Promise<PaymentIntentResult> {
    const intent = await this.stripe.paymentIntents.create({
      amount: params.amount,
      currency: params.currency.toLowerCase(),
      metadata: {
        order_id: params.orderId,
        platform: 'rangkai',
        ...params.metadata,
      },
      ...(params.customerEmail && {
        receipt_email: params.customerEmail,
      }),
      // Automatically confirm when payment method is submitted
      automatic_payment_methods: { enabled: true },
    });

    return {
      clientSecret: intent.client_secret!,
      paymentIntentId: intent.id,
      amount: intent.amount,
      currency: intent.currency,
      status: intent.status,
    };
  }

  // ─── Confirm Payment (for server-side verification) ───────────────────────

  /**
   * Retrieve and verify a PaymentIntent status.
   * Call this after receiving a webhook or after frontend reports payment complete.
   */
  async confirmPayment(paymentIntentId: string): Promise<ConfirmPaymentResult> {
    const intent = await this.stripe.paymentIntents.retrieve(paymentIntentId, {
      expand: ['latest_charge'],
    });

    const charge = intent.latest_charge as Stripe.Charge | null;

    return {
      success: intent.status === 'succeeded',
      paymentIntentId: intent.id,
      chargeId: charge?.id,
      amount: intent.amount,
      currency: intent.currency,
      status: intent.status,
    };
  }

  // ─── Vendor: Payout ───────────────────────────────────────────────────────

  /**
   * Pay a vendor after order completion.
   *
   * Two modes depending on your Stripe setup:
   *   1. Stripe Connect (recommended for marketplace): transfer to connected account
   *   2. Manual payout: create a payout to your Stripe balance (requires funds in balance)
   *
   * For now we implement the manual transfer approach — Connect requires
   * vendors to onboard to Stripe separately, which is a Phase 2 requirement.
   *
   * Amount is in smallest currency unit (cents).
   * platformFeePercent defaults to 0.5% (matches bitcoin.service.ts).
   */
  async createVendorPayout(
    orderId: string,
    vendorDid: string,
    grossAmountCents: number,
    currency: string,
    platformFeePercent: number = 0.5
  ): Promise<PayoutResult> {
    const feeAmount = Math.round(grossAmountCents * (platformFeePercent / 100));
    const netAmount = grossAmountCents - feeAmount;

    // Record the payout intention as a Stripe Transfer metadata object.
    // In production with Stripe Connect, this would be:
    //   this.stripe.transfers.create({ amount: netAmount, currency, destination: vendorStripeAccountId })
    //
    // For now, we record it as a manual payout note and flag for processing.
    // This creates an audit trail in Stripe's dashboard.

    // Create a Stripe PaymentIntent in "manual" capture mode won't work here —
    // instead we create a minimal transfer record via Stripe's Transfer API.
    // This requires your Stripe account to have a positive balance.

    try {
      // Attempt Stripe Transfer (works if you have Stripe Connect set up)
      const transfer = await this.stripe.transfers.create({
        amount: netAmount,
        currency: currency.toLowerCase(),
        destination: vendorDid, // In production: vendor's Stripe Connect account ID
        metadata: {
          order_id: orderId,
          vendor_did: vendorDid,
          gross_amount: grossAmountCents.toString(),
          platform_fee: feeAmount.toString(),
          platform: 'rangkai',
        },
      });

      return {
        success: true,
        transferId: transfer.id,
        amount: netAmount,
        currency: currency.toLowerCase(),
        method: 'transfer',
      };
    } catch (err: any) {
      // If Connect isn't set up, fall through to manual payout tracking
      if (err.code === 'account_invalid' || err.type === 'StripeInvalidRequestError') {
        console.warn(
          `[StripeAdapter] Connect transfer failed for vendor ${vendorDid} — ` +
          `flagging for manual payout. Error: ${err.message}`
        );

        // Return a pending result — operator will need to process manually
        return {
          success: false,
          amount: netAmount,
          currency: currency.toLowerCase(),
          method: 'payout',
        };
      }
      throw err;
    }
  }

  // ─── Refund ───────────────────────────────────────────────────────────────

  /**
   * Refund a payment (used by dispute resolution).
   * Pass chargeId from the original payment, or paymentIntentId.
   * Amount in smallest currency unit. Omit amount for full refund.
   */
  async createRefund(
    paymentIntentId: string,
    amountCents?: number,
    reason: Stripe.RefundCreateParams.Reason = 'fraudulent'
  ): Promise<RefundResult> {
    const refundParams: Stripe.RefundCreateParams = {
      payment_intent: paymentIntentId,
      reason,
      metadata: { platform: 'rangkai' },
    };

    if (amountCents !== undefined) {
      refundParams.amount = amountCents;
    }

    const refund = await this.stripe.refunds.create(refundParams);

    return {
      refundId: refund.id,
      amount: refund.amount,
      currency: refund.currency,
      status: refund.status ?? 'unknown',
    };
  }

  // ─── Webhook ──────────────────────────────────────────────────────────────

  /**
   * Verify and parse an inbound Stripe webhook.
   * Pass the raw request body (Buffer) and the Stripe-Signature header.
   *
   * Returns the parsed event or throws if signature is invalid.
   */
  verifyWebhook(rawBody: Buffer, signature: string): Stripe.Event {
    if (!this.webhookSecret) {
      throw new Error('STRIPE_WEBHOOK_SECRET is not configured');
    }

    return this.stripe.webhooks.constructEvent(rawBody, signature, this.webhookSecret);
  }

  /**
   * Get a PaymentIntent by ID (for polling-based confirmation).
   */
  async getPaymentIntent(paymentIntentId: string): Promise<Stripe.PaymentIntent> {
    return this.stripe.paymentIntents.retrieve(paymentIntentId);
  }
}

// ─── Singleton ────────────────────────────────────────────────────────────────

let stripeAdapter: StripeAdapter | null = null;

export function getStripeAdapter(): StripeAdapter {
  if (!stripeAdapter) {
    stripeAdapter = new StripeAdapter();
  }
  return stripeAdapter;
}