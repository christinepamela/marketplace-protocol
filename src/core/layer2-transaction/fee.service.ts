/**
 * Fee Service
 * Handles fee calculation and distribution
 */

import { v4 as uuidv4 } from 'uuid';
import type { FeeDistribution, Order } from './types';
import type { Price } from '../layer1-catalog/types';

export class FeeService {
  private dbClient: any;
  
  constructor(dbClient: any) {
    this.dbClient = dbClient;
  }

  /**
   * Distribute fees after order completion
   */
  async distributeFees(order: Order): Promise<FeeDistribution> {
    if (order.status !== 'completed') {
      throw new Error('Can only distribute fees for completed orders');
    }
    
    const distribution: FeeDistribution = {
      orderId: order.id,
      totalAmount: order.total,
      protocolAmount: order.fees.protocolFee,
      clientAmount: order.fees.clientFee,
      vendorAmount: this.calculateVendorAmount(order),
      distributed: false
    };
    
    // Execute transfers (mock for now)
    await this.transferToVendor(order.vendorDid, distribution.vendorAmount);
    await this.transferToProtocol(distribution.protocolAmount);
    
    if (distribution.clientAmount.amount > 0) {
      await this.transferToClient(order.clientId, distribution.clientAmount);
    }
    
    distribution.distributed = true;
    distribution.distributedAt = new Date();
    
    // Store distribution record
    await this.storeFeeDistribution(distribution);
    
    return distribution;
  }

  /**
   * Get fee distribution for order
   */
  async getFeeDistribution(orderId: string): Promise<FeeDistribution | null> {
    const { data, error } = await this.dbClient
      .from('fee_distributions')
      .select('*')
      .eq('order_id', orderId)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    
    return this.mapDatabaseToDistribution(data);
  }

  /**
   * Get total protocol revenue
   */
  async getProtocolRevenue(currency: string = 'USD'): Promise<number> {
    const { data, error } = await this.dbClient
      .from('fee_distributions')
      .select('protocol_amount')
      .eq('protocol_amount->>currency', currency)
      .eq('distributed', true);
    
    if (error) throw error;
    
    let total = 0;
    data?.forEach((d: any) => {
      total += parseFloat(d.protocol_amount.amount);
    });
    
    return total;
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  /**
   * Calculate vendor amount (total - fees)
   */
  private calculateVendorAmount(order: Order): Price {
    const vendorAmount = 
      order.total.amount - order.fees.totalFees.amount;
    
    return {
      amount: vendorAmount,
      currency: order.total.currency
    };
  }

  /**
   * Transfer to vendor (mock)
   */
  private async transferToVendor(vendorDid: string, amount: Price): Promise<void> {
    // Mock transfer
    // In production, this would trigger actual payment via Lightning/bank/etc
    console.log(`Transfer to vendor ${vendorDid}: ${amount.amount} ${amount.currency}`);
  }

  /**
   * Transfer to protocol treasury (mock)
   */
  private async transferToProtocol(amount: Price): Promise<void> {
    // Mock transfer
    console.log(`Transfer to protocol: ${amount.amount} ${amount.currency}`);
  }

  /**
   * Transfer to client marketplace (mock)
   */
  private async transferToClient(clientId: string, amount: Price): Promise<void> {
    // Mock transfer
    console.log(`Transfer to client ${clientId}: ${amount.amount} ${amount.currency}`);
  }

  /**
   * Store fee distribution
   */
  private async storeFeeDistribution(distribution: FeeDistribution): Promise<void> {
    const { error } = await this.dbClient
      .from('fee_distributions')
      .insert({
        id: uuidv4(),
        order_id: distribution.orderId,
        total_amount: distribution.totalAmount,
        protocol_amount: distribution.protocolAmount,
        client_amount: distribution.clientAmount,
        vendor_amount: distribution.vendorAmount,
        distributed: distribution.distributed,
        distributed_at: distribution.distributedAt
      });
    
    if (error) throw error;
  }

  /**
   * Map database to FeeDistribution
   */
  private mapDatabaseToDistribution(data: any): FeeDistribution {
    return {
      orderId: data.order_id,
      totalAmount: data.total_amount,
      protocolAmount: data.protocol_amount,
      clientAmount: data.client_amount,
      vendorAmount: data.vendor_amount,
      distributed: data.distributed,
      distributedAt: data.distributed_at ? new Date(data.distributed_at) : undefined,
      vendorPaymentId: data.vendor_payment_id,
      protocolPaymentId: data.protocol_payment_id,
      clientPaymentId: data.client_payment_id
    };
  }
}