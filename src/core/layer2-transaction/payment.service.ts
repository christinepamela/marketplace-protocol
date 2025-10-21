/**
 * Payment Service
 * Handles payment processing and routing (Lightning, Stripe, etc.)
 */

import { v4 as uuidv4 } from 'uuid';
import type {
  Payment,
  PaymentMethod,
  PaymentStatus,
  PaymentProof,
  PaymentInstructions,
  ProcessPaymentRequest
} from './types';
import type { Price } from '../layer1-catalog/types';

export class PaymentService {
  private dbClient: any;
  
  constructor(dbClient: any) {
    this.dbClient = dbClient;
  }

  /**
   * Initialize payment (generate instructions for buyer)
   */
  async initializePayment(
    orderId: string,
    amount: Price,
    method: PaymentMethod
  ): Promise<PaymentInstructions> {
    const payment: Payment = {
      id: uuidv4(),
      orderId,
      amount,
      method,
      status: 'pending',
      createdAt: new Date()
    };
    
    await this.storePayment(payment);
    
    // Generate payment instructions based on method
    const instructions = await this.generatePaymentInstructions(
      payment.id,
      amount,
      method
    );
    
    return instructions;
  }

  /**
   * Process payment (verify and mark as completed)
   */
  async processPayment(request: ProcessPaymentRequest): Promise<Payment> {
    const { orderId, paymentMethod, paymentProof } = request;
    
    // Get existing payment
    const payment = await this.getPaymentByOrderId(orderId);
    if (!payment) {
      throw new Error(`Payment not found for order: ${orderId}`);
    }
    
    // Verify payment proof based on method
    const isValid = await this.verifyPaymentProof(paymentMethod, paymentProof);
    
    if (!isValid) {
      payment.status = 'failed';
      await this.updatePaymentInDb(payment);
      throw new Error('Payment verification failed');
    }
    
    // Mark as completed
    payment.status = 'completed';
    payment.processedAt = new Date();
    payment.paymentProof = paymentProof as PaymentProof;
    
    await this.updatePaymentInDb(payment);
    
    return payment;
  }

  /**
   * Get payment by order ID
   */
  async getPaymentByOrderId(orderId: string): Promise<Payment | null> {
    const { data, error } = await this.dbClient
      .from('payments')
      .select('*')
      .eq('order_id', orderId)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    
    return this.mapDatabaseToPayment(data);
  }

  /**
   * Refund payment
   */
  async refundPayment(orderId: string, amount: Price): Promise<void> {
    const payment = await this.getPaymentByOrderId(orderId);
    if (!payment) {
      throw new Error(`Payment not found for order: ${orderId}`);
    }
    
    if (payment.status !== 'completed') {
      throw new Error(`Cannot refund payment with status: ${payment.status}`);
    }
    
    // Execute refund based on payment method
    await this.executeRefund(payment, amount);
    
    payment.status = amount.amount === payment.amount.amount 
      ? 'refunded' 
      : 'partially_refunded';
    
    await this.updatePaymentInDb(payment);
  }

  // ============================================================================
  // PAYMENT METHOD HANDLERS
  // ============================================================================

  /**
   * Generate payment instructions
   */
  private async generatePaymentInstructions(
    paymentId: string,
    amount: Price,
    method: PaymentMethod
  ): Promise<PaymentInstructions> {
    switch (method) {
      case 'lightning':
        return await this.generateLightningInvoice(paymentId, amount);
      
      case 'bitcoin_onchain':
        return await this.generateBitcoinAddress(paymentId, amount);
      
      case 'stripe':
        return await this.generateStripePaymentIntent(paymentId, amount);
      
      case 'bank_transfer':
        return this.getBankTransferDetails();
      
      default:
        throw new Error(`Unsupported payment method: ${method}`);
    }
  }

  /**
   * Generate Lightning invoice (mock for now, integrate LND/CLN later)
   */
  private async generateLightningInvoice(
    paymentId: string,
    amount: Price
  ): Promise<PaymentInstructions> {
    // Mock Lightning invoice generation
    // In production, this would call LND/Core Lightning API
    
    const satoshis = this.convertToSatoshis(amount);
    const mockInvoice = `lnbc${satoshis}n1p${paymentId.substring(0, 8)}...`;
    
    return {
      method: 'lightning',
      lightningInvoice: mockInvoice,
      lightningAmount: satoshis,
      expiresAt: new Date(Date.now() + 3600 * 1000) // 1 hour
    };
  }

  /**
   * Generate Bitcoin address (mock)
   */
  private async generateBitcoinAddress(
    paymentId: string,
    amount: Price
  ): Promise<PaymentInstructions> {
    // Mock Bitcoin address generation
    // In production, this would use HD wallet derivation
    
    const mockAddress = `bc1q${paymentId.substring(0, 39)}`;
    
    return {
      method: 'bitcoin_onchain',
      lightningAmount: this.convertToSatoshis(amount),
      expiresAt: new Date(Date.now() + 24 * 3600 * 1000) // 24 hours
    };
  }

  /**
   * Generate Stripe payment intent (mock)
   */
  private async generateStripePaymentIntent(
    paymentId: string,
    amount: Price
  ): Promise<PaymentInstructions> {
    // Mock Stripe integration
    // In production, this would call Stripe API
    
    return {
      method: 'stripe',
      stripeClientSecret: `pi_mock_${paymentId}_secret`,
      stripePublishableKey: 'pk_test_mock',
      expiresAt: new Date(Date.now() + 3600 * 1000)
    };
  }

  /**
   * Get bank transfer details
   */
  private getBankTransferDetails(): PaymentInstructions {
    return {
      method: 'bank_transfer',
      bankDetails: {
        accountName: 'Rangkai Protocol',
        accountNumber: '1234567890',
        bankName: 'Example Bank',
        swiftCode: 'EXAMPLEMYKL'
      }
    };
  }

  /**
   * Verify payment proof
   */
  private async verifyPaymentProof(
    method: PaymentMethod,
    proof?: Partial<PaymentProof>
  ): Promise<boolean> {
    if (!proof) return false;
    
    switch (method) {
      case 'lightning':
        return this.verifyLightningPayment(proof.lightningPreimage);
      
      case 'bitcoin_onchain':
        return this.verifyBitcoinTransaction(proof.txid);
      
      case 'stripe':
        return this.verifyStripePayment(proof.stripePaymentIntentId);
      
      default:
        // For other methods, assume manual verification
        return true;
    }
  }

  /**
   * Verify Lightning payment (mock)
   */
  private async verifyLightningPayment(preimage?: string): Promise<boolean> {
    // Mock verification
    // In production, this would verify preimage against invoice hash
    return !!preimage && preimage.length > 0;
  }

  /**
   * Verify Bitcoin transaction (mock)
   */
  private async verifyBitcoinTransaction(txid?: string): Promise<boolean> {
    // Mock verification
    // In production, this would check blockchain for confirmation
    return !!txid && txid.length > 0;
  }

  /**
   * Verify Stripe payment (mock)
   */
  private async verifyStripePayment(paymentIntentId?: string): Promise<boolean> {
    // Mock verification
    // In production, this would call Stripe API to verify payment
    return !!paymentIntentId && paymentIntentId.length > 0;
  }

  /**
   * Execute refund
   */
  private async executeRefund(payment: Payment, amount: Price): Promise<void> {
    // Mock refund execution
    // In production, this would call appropriate payment provider API
    
    console.log(`Executing refund: ${amount.amount} ${amount.currency} via ${payment.method}`);
    
    // Store refund record
    await this.dbClient
      .from('refunds')
      .insert({
        payment_id: payment.id,
        amount: amount,
        status: 'completed',
        processed_at: new Date()
      });
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Convert fiat to satoshis (mock exchange rate)
   */
  private convertToSatoshis(price: Price): number {
    // Mock conversion: 1 USD = 2000 satoshis
    // In production, use real-time exchange rate
    const rate = 2000;
    return Math.round(price.amount * rate);
  }

  /**
   * Store payment in database
   */
  private async storePayment(payment: Payment): Promise<void> {
    const { error } = await this.dbClient
      .from('payments')
      .insert({
        id: payment.id,
        order_id: payment.orderId,
        amount: payment.amount,
        method: payment.method,
        status: payment.status,
        payment_proof: payment.paymentProof,
        metadata: payment.metadata,
        created_at: payment.createdAt
      });
    
    if (error) throw error;
  }

  /**
   * Update payment in database
   */
  private async updatePaymentInDb(payment: Payment): Promise<void> {
    const { error } = await this.dbClient
      .from('payments')
      .update({
        status: payment.status,
        payment_proof: payment.paymentProof,
        processed_at: payment.processedAt
      })
      .eq('id', payment.id);
    
    if (error) throw error;
  }

  /**
   * Map database record to Payment
   */
  private mapDatabaseToPayment(data: any): Payment {
    return {
      id: data.id,
      orderId: data.order_id,
      amount: data.amount,
      method: data.method,
      status: data.status,
      paymentProof: data.payment_proof,
      createdAt: new Date(data.created_at),
      processedAt: data.processed_at ? new Date(data.processed_at) : undefined,
      metadata: data.metadata
    };
  }
}