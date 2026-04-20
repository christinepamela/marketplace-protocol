/**
 * BTCPay Server Adapter
 * Path: src/infrastructure/payment/btcpay.adapter.ts
 *
 * BTCPay Server is a self-hosted Bitcoin payment processor.
 * It sends webhooks when payments are received — replacing the polling approach.
 *
 * Setup:
 *   1. Run BTCPay Server (Docker: btcpayserver/btcpayserver)
 *      OR use a hosted instance (voltage.cloud, nodl.it)
 *   2. Create a Store in BTCPay
 *   3. Generate an API key: Account → API keys → Generate key
 *      Required permissions: btcpay.store.cancreateinvoice, btcpay.store.canviewinvoices
 *   4. Set up a webhook: Store → Webhooks → Add webhook
 *      URL: https://yourdomain.com/webhooks/btcpay
 *      Events: InvoiceSettled, InvoiceExpired, InvoiceInvalid
 *   5. Add to .env:
 *      BTCPAY_URL=https://your-btcpay-instance.com
 *      BTCPAY_API_KEY=your-api-key
 *      BTCPAY_STORE_ID=your-store-id
 *      BTCPAY_WEBHOOK_SECRET=your-webhook-secret
 *
 * NOTE: For testnet, BTCPay Server uses the same setup — just configure
 * your node to use testnet (Bitcoin Core with -testnet flag or CLN on testnet).
 *
 * Until BTCPay is set up, the system falls back to Blockstream polling
 * (already implemented in bitcoin.service.ts). This adapter is additive.
 */

import crypto from 'crypto';
import axios from 'axios';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface BTCPayInvoice {
  id: string;
  storeId: string;
  amount: string;
  currency: string;
  status: 'New' | 'Processing' | 'Expired' | 'Invalid' | 'Settled';
  checkoutLink: string;
  paymentMethods?: BTCPayPaymentMethod[];
  metadata?: Record<string, string>;
  createdTime: number;
  expirationTime: number;
}

export interface BTCPayPaymentMethod {
  paymentMethod: string;  // e.g. 'BTC', 'BTC-LightningNetwork'
  destination: string;    // Bitcoin address or Lightning invoice
  rate: string;
  paymentMethodPaid: string;
  totalPaid: string;
  due: string;
  amount: string;
}

export interface BTCPayWebhookEvent {
  deliveryId: string;
  webhookId: string;
  originalDeliveryId: string;
  isRedelivery: boolean;
  type: 'InvoiceSettled' | 'InvoiceExpired' | 'InvoiceInvalid' | 'InvoiceProcessing' | 'InvoiceCreated';
  timestamp: number;
  storeId: string;
  invoiceId: string;
  metadata?: Record<string, any>;
}

// ─── Adapter ─────────────────────────────────────────────────────────────────

export class BTCPayAdapter {
  private baseUrl: string;
  private apiKey: string;
  private storeId: string;
  private webhookSecret: string;
  private isConfigured: boolean;

  constructor() {
    this.baseUrl = process.env.BTCPAY_URL || '';
    this.apiKey = process.env.BTCPAY_API_KEY || '';
    this.storeId = process.env.BTCPAY_STORE_ID || '';
    this.webhookSecret = process.env.BTCPAY_WEBHOOK_SECRET || '';

    this.isConfigured = !!(this.baseUrl && this.apiKey && this.storeId);

    if (!this.isConfigured) {
      console.warn(
        '[BTCPayAdapter] Not configured — BTCPAY_URL, BTCPAY_API_KEY, or BTCPAY_STORE_ID missing. ' +
        'Bitcoin payments will use Blockstream polling as fallback.'
      );
    }
  }

  get available(): boolean {
    return this.isConfigured;
  }

  // ─── Invoice Creation ─────────────────────────────────────────────────────

  /**
   * Create a BTCPay invoice for an order.
   * BTCPay generates the Bitcoin address and monitors it.
   * When paid, it fires a webhook to /webhooks/btcpay.
   */
  async createInvoice(params: {
    orderId: string;
    amount: number;
    currency: string;
    buyerEmail?: string;
    redirectUrl?: string;
  }): Promise<BTCPayInvoice> {
    this.assertConfigured();

    const response = await axios.post(
      `${this.baseUrl}/api/v1/stores/${this.storeId}/invoices`,
      {
        amount: params.amount.toString(),
        currency: params.currency.toUpperCase(),
        metadata: {
          order_id: params.orderId,
          platform: 'rangkai',
          ...(params.buyerEmail && { buyer_email: params.buyerEmail }),
        },
        checkout: {
          ...(params.redirectUrl && { redirectURL: params.redirectUrl }),
          expirationMinutes: 60,  // 1 hour — matches bitcoin.service.ts ADDRESS_EXPIRY_HOURS
        },
      },
      {
        headers: {
          Authorization: `token ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data;
  }

  // ─── Invoice Status ───────────────────────────────────────────────────────

  /**
   * Get the current status of a BTCPay invoice.
   * Use for polling-based confirmation if webhooks aren't available.
   */
  async getInvoice(invoiceId: string): Promise<BTCPayInvoice> {
    this.assertConfigured();

    const response = await axios.get(
      `${this.baseUrl}/api/v1/stores/${this.storeId}/invoices/${invoiceId}`,
      {
        headers: { Authorization: `token ${this.apiKey}` },
      }
    );

    return response.data;
  }

  /**
   * Get payment methods for an invoice (includes Bitcoin address).
   */
  async getInvoicePaymentMethods(invoiceId: string): Promise<BTCPayPaymentMethod[]> {
    this.assertConfigured();

    const response = await axios.get(
      `${this.baseUrl}/api/v1/stores/${this.storeId}/invoices/${invoiceId}/payment-methods`,
      {
        headers: { Authorization: `token ${this.apiKey}` },
      }
    );

    return response.data;
  }

  // ─── Webhook Verification ─────────────────────────────────────────────────

  /**
   * Verify a BTCPay webhook signature.
   * BTCPay signs webhooks with HMAC-SHA256 using the webhook secret.
   * The signature is in the BTCPay-Sig header.
   */
  verifyWebhook(rawBody: Buffer, signature: string): BTCPayWebhookEvent {
    if (!this.webhookSecret) {
      throw new Error('BTCPAY_WEBHOOK_SECRET is not configured');
    }

    // BTCPay signature format: "sha256=<hex>"
    const expectedSig = 'sha256=' + crypto
      .createHmac('sha256', this.webhookSecret)
      .update(rawBody)
      .digest('hex');

    if (!crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSig)
    )) {
      throw new Error('BTCPay webhook signature verification failed');
    }

    return JSON.parse(rawBody.toString()) as BTCPayWebhookEvent;
  }

  // ─── Private ──────────────────────────────────────────────────────────────

  private assertConfigured(): void {
    if (!this.isConfigured) {
      throw new Error(
        'BTCPayAdapter is not configured. Set BTCPAY_URL, BTCPAY_API_KEY, and BTCPAY_STORE_ID in .env'
      );
    }
  }
}

// ─── Singleton ────────────────────────────────────────────────────────────────

let btcpayAdapter: BTCPayAdapter | null = null;

export function getBTCPayAdapter(): BTCPayAdapter {
  if (!btcpayAdapter) {
    btcpayAdapter = new BTCPayAdapter();
  }
  return btcpayAdapter;
}