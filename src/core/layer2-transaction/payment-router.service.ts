/**
 * Payment Service — unified fiat + Bitcoin payment handling
 * Path: src/core/layer2-transaction/payment.service.ts
 *
 * This is the single entry point for all payment operations.
 * Routes to Stripe (fiat) or BitcoinService (on-chain) based on method.
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { StripeAdapter, getStripeAdapter } from '../../infrastructure/payment/stripe.adapter';
import { BitcoinService } from './bitcoin.service';
import type { Order } from './types';

export type FiatCurrency = 'usd' | 'myr' | 'eur' | 'gbp' | 'sgd' | 'idr' | 'thb' | 'php' | 'vnd';

export interface InitiatePaymentResult {
  method: 'stripe' | 'bitcoin_onchain' | 'lightning';
  // Stripe
  clientSecret?: string;
  paymentIntentId?: string;
  // Bitcoin
  bitcoinAddress?: string;
  expectedSatoshis?: number;
  btcAmount?: string;
  expiresAt?: string;
}

export interface VendorPayoutResult {
  success: boolean;
  method: 'stripe' | 'bitcoin';
  reference?: string;   // transferId, txid, or payout ID
  amount: number;
  currency: string;
  pendingManual?: boolean;
}

export class PaymentService {
  private stripe: StripeAdapter;
  private bitcoin: BitcoinService;

  constructor(private supabase: SupabaseClient) {
    this.stripe = getStripeAdapter();
    this.bitcoin = new BitcoinService(
      supabase,
      process.env.BITCOIN_MNEMONIC,
      process.env.BITCOIN_NETWORK === 'testnet'
    );
  }

  // ─── Initiate Payment ─────────────────────────────────────────────────────

  /**
   * Start a payment for an order.
   * Returns the credentials the frontend needs to complete payment.
   */
  async initiatePayment(order: Order, customerEmail?: string): Promise<InitiatePaymentResult> {
    switch (order.paymentMethod) {

      case 'stripe': {
        // Convert order total to cents (Stripe always works in smallest unit)
        const amountCents = this.toCents(order.total.amount, order.total.currency);

        const result = await this.stripe.createPaymentIntent({
          orderId: order.id,
          amount: amountCents,
          currency: order.total.currency,
          customerEmail,
          metadata: {
            order_number: order.orderNumber,
            buyer_did: order.buyerDid,
            vendor_did: order.vendorDid,
          },
        });

        // Store payment intent ID on the order for webhook reconciliation
        await this.supabase
          .from('orders')
          .update({
            internal_notes: `stripe_payment_intent:${result.paymentIntentId}`,
            updated_at: new Date().toISOString(),
          })
          .eq('id', order.id);

        return {
          method: 'stripe',
          clientSecret: result.clientSecret,
          paymentIntentId: result.paymentIntentId,
        };
      }

      case 'bitcoin_onchain': {
        const address = await this.bitcoin.generateEscrowAddress(order.id, order.total);
        return {
          method: 'bitcoin_onchain',
          bitcoinAddress: address.address,
          expectedSatoshis: address.expectedAmount,
          btcAmount: (address.expectedAmount / 100_000_000).toFixed(8),
          expiresAt: address.expiresAt.toISOString(),
        };
      }

      case 'lightning': {
        // Lightning adapter not yet implemented — return informative error
        throw new Error(
          'Lightning Network payments are not yet available. ' +
          'Please choose Bitcoin (on-chain) or card payment.'
        );
      }

      default:
        throw new Error(`Unsupported payment method: ${order.paymentMethod}`);
    }
  }

  // ─── Vendor Payout ────────────────────────────────────────────────────────

  /**
   * Pay the vendor after an order is completed.
   * Called by the order completion flow or the scheduler.
   */
  async executeVendorPayout(
    order: Order,
    vendorPayoutMethod: 'stripe' | 'bitcoin',
    vendorDestination: string  // Stripe account ID or Bitcoin address
  ): Promise<VendorPayoutResult> {

    if (vendorPayoutMethod === 'stripe') {
      const amountCents = this.toCents(order.total.amount, order.total.currency);

      const result = await this.stripe.createVendorPayout(
        order.id,
        order.vendorDid,
        amountCents,
        order.total.currency,
        0.5 // 0.5% platform fee
      );

      // Record payout in database
      await this.supabase
        .from('vendor_payouts')
        .insert({
          order_id: order.id,
          vendor_did: order.vendorDid,
          method: 'stripe',
          amount: order.total.amount,
          currency: order.total.currency,
          status: result.success ? 'completed' : 'pending_manual',
          reference: result.transferId || null,
          created_at: new Date().toISOString(),
        })
        .select();

      return {
        success: result.success,
        method: 'stripe',
        reference: result.transferId,
        amount: result.amount,
        currency: result.currency,
        pendingManual: !result.success,
      };
    }

    if (vendorPayoutMethod === 'bitcoin') {
      const txid = await this.bitcoin.executeVendorPayoutBTC(order.id, vendorDestination);

      await this.supabase
        .from('vendor_payouts')
        .insert({
          order_id: order.id,
          vendor_did: order.vendorDid,
          method: 'bitcoin',
          amount: order.total.amount,
          currency: 'BTC',
          status: 'completed',
          reference: txid,
          created_at: new Date().toISOString(),
        });

      return {
        success: true,
        method: 'bitcoin',
        reference: txid,
        amount: order.total.amount,
        currency: 'BTC',
      };
    }

    throw new Error(`Unsupported vendor payout method: ${vendorPayoutMethod}`);
  }

  // ─── Refund ───────────────────────────────────────────────────────────────

  /**
   * Refund a fiat payment. Called by dispute resolution.
   * paymentIntentId is stored in orders.internal_notes as "stripe_payment_intent:pi_xxx"
   */
  async refundStripePayment(
    orderId: string,
    amountCents?: number
  ): Promise<{ refundId: string; amount: number }> {
    // Retrieve the payment intent ID from order notes
    const { data: order } = await this.supabase
      .from('orders')
      .select('internal_notes')
      .eq('id', orderId)
      .single();

    const match = order?.internal_notes?.match(/stripe_payment_intent:(pi_[^\s,]+)/);
    if (!match) {
      throw new Error(`No Stripe payment intent found for order ${orderId}`);
    }

    const paymentIntentId = match[1];
    const refund = await this.stripe.createRefund(
      paymentIntentId,
      amountCents,
      'requested_by_customer'
    );

    return { refundId: refund.refundId, amount: refund.amount };
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  /**
   * Convert a decimal amount to the smallest currency unit.
   * Most currencies: multiply by 100. JPY, KRW, etc: no conversion.
   */
  private toCents(amount: number, currency: string): number {
    const zeroCurrencies = ['jpy', 'krw', 'vnd', 'idr', 'clp', 'gnf', 'mga', 'pyg', 'rwf', 'ugx', 'xaf', 'xof'];
    if (zeroCurrencies.includes(currency.toLowerCase())) {
      return Math.round(amount);
    }
    return Math.round(amount * 100);
  }
}