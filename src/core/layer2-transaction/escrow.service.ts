/**
 * Escrow Service
 * Handles fund holding, release, and refund logic
 */

import type {
  Escrow,
  EscrowStatus,
  EscrowRules
} from './types';

// Import constant separately
import { DEFAULT_ESCROW_RULES } from './types';
import type { Price } from '../layer1-catalog/types';
import { v4 as uuidv4 } from 'uuid';

export class EscrowService {
  private dbClient: any;
  
  constructor(dbClient: any) {
    this.dbClient = dbClient;
  }

  /**
   * Create escrow for order
   */
  async createEscrow(
    orderId: string,
    amount: Price,
    rules?: EscrowRules
  ): Promise<Escrow> {
    const escrowRules = rules || DEFAULT_ESCROW_RULES;
    
    const escrow: Escrow = {
      id: uuidv4(),
      orderId,
      amount,
      status: 'held',
      rules: escrowRules,
      heldAt: new Date(),
      releaseScheduledAt: this.calculateReleaseDate(escrowRules.holdDuration)
    };
    
    await this.storeEscrow(escrow);
    
    return escrow;
  }

  /**
   * Get escrow by order ID
   */
  async getEscrowByOrderId(orderId: string): Promise<Escrow | null> {
    const { data, error } = await this.dbClient
      .from('escrows')
      .select('*')
      .eq('order_id', orderId)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    
    return this.mapDatabaseToEscrow(data);
  }

  /**
   * Release escrow (pay vendor)
   */
  async releaseEscrow(orderId: string, reason?: string): Promise<void> {
    const escrow = await this.getEscrowByOrderId(orderId);
    if (!escrow) {
      throw new Error(`Escrow not found for order: ${orderId}`);
    }
    
    if (escrow.status !== 'held') {
      throw new Error(`Cannot release escrow with status: ${escrow.status}`);
    }
    
    escrow.status = 'released';
    escrow.releasedAt = new Date();
    
    await this.updateEscrowInDb(escrow);
    
    // Log escrow action
    await this.logEscrowAction({
      escrowId: escrow.id,
      action: 'released',
      reason: reason || 'Escrow released to vendor',
      timestamp: new Date()
    });
  }

  /**
   * Refund escrow (return to buyer)
   */
  async refundEscrow(orderId: string, reason: string): Promise<void> {
    const escrow = await this.getEscrowByOrderId(orderId);
    if (!escrow) {
      throw new Error(`Escrow not found for order: ${orderId}`);
    }
    
    if (escrow.status !== 'held') {
      throw new Error(`Cannot refund escrow with status: ${escrow.status}`);
    }
    
    escrow.status = 'refunded';
    escrow.refundedAt = new Date();
    
    await this.updateEscrowInDb(escrow);
    
    // Log escrow action
    await this.logEscrowAction({
      escrowId: escrow.id,
      action: 'refunded',
      reason,
      timestamp: new Date()
    });
  }

  /**
   * Mark escrow as disputed
   */
  async disputeEscrow(orderId: string, disputeId: string): Promise<void> {
    const escrow = await this.getEscrowByOrderId(orderId);
    if (!escrow) {
      throw new Error(`Escrow not found for order: ${orderId}`);
    }
    
    if (escrow.status !== 'held') {
      throw new Error(`Cannot dispute escrow with status: ${escrow.status}`);
    }
    
    escrow.status = 'disputed';
    escrow.disputeId = disputeId;
    
    await this.updateEscrowInDb(escrow);
    
    // Log escrow action
    await this.logEscrowAction({
      escrowId: escrow.id,
      action: 'disputed',
      reason: `Dispute raised: ${disputeId}`,
      timestamp: new Date()
    });
  }

  /**
   * Check for escrows ready for auto-release
   */
  async processAutoReleases(): Promise<void> {
    const { data, error } = await this.dbClient
      .from('escrows')
      .select('*')
      .eq('status', 'held')
      .lte('release_scheduled_at', new Date().toISOString());
    
    if (error) throw error;
    
    for (const escrowData of data) {
      const escrow = this.mapDatabaseToEscrow(escrowData);
      
      // Check if auto-release is enabled
      if (escrow.rules.autoReleaseIfNoDispute) {
        // Check if order is in a releasable state
        const { data: orderData } = await this.dbClient
          .from('orders')
          .select('status')
          .eq('id', escrow.orderId)
          .single();
        
        if (orderData && orderData.status === 'delivered') {
          await this.releaseEscrow(escrow.orderId, 'Auto-release after hold duration');
        }
      }
    }
  }

  /**
   * Get escrow balance (total held)
   */
  async getTotalEscrowBalance(currency: string = 'USD'): Promise<number> {
    const { data, error } = await this.dbClient
      .from('escrows')
      .select('amount')
      .eq('status', 'held')
      .eq('amount->>currency', currency);
    
    if (error) throw error;
    
    let total = 0;
    data?.forEach((e: any) => {
      total += parseFloat(e.amount.amount);
    });
    
    return total;
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  /**
   * Calculate release date
   */
  private calculateReleaseDate(holdDurationDays: number): Date {
    const releaseDate = new Date();
    releaseDate.setDate(releaseDate.getDate() + holdDurationDays);
    return releaseDate;
  }

  /**
   * Store escrow in database
   */
  private async storeEscrow(escrow: Escrow): Promise<void> {
    const { error } = await this.dbClient
      .from('escrows')
      .insert({
        id: escrow.id,
        order_id: escrow.orderId,
        amount: escrow.amount,
        status: escrow.status,
        rules: escrow.rules,
        held_at: escrow.heldAt,
        release_scheduled_at: escrow.releaseScheduledAt
      });
    
    if (error) throw error;
  }

  /**
   * Update escrow in database
   */
  private async updateEscrowInDb(escrow: Escrow): Promise<void> {
    const { error } = await this.dbClient
      .from('escrows')
      .update({
        status: escrow.status,
        released_at: escrow.releasedAt,
        refunded_at: escrow.refundedAt,
        dispute_id: escrow.disputeId
      })
      .eq('id', escrow.id);
    
    if (error) throw error;
  }

  /**
   * Log escrow action
   */
  private async logEscrowAction(action: {
    escrowId: string;
    action: string;
    reason: string;
    timestamp: Date;
  }): Promise<void> {
    const { error } = await this.dbClient
      .from('escrow_log')
      .insert({
        escrow_id: action.escrowId,
        action: action.action,
        reason: action.reason,
        timestamp: action.timestamp
      });
    
    if (error) throw error;
  }

  /**
   * Map database record to Escrow
   */
  private mapDatabaseToEscrow(data: any): Escrow {
    return {
      id: data.id,
      orderId: data.order_id,
      amount: data.amount,
      status: data.status,
      rules: data.rules,
      heldAt: new Date(data.held_at),
      releaseScheduledAt: data.release_scheduled_at ? new Date(data.release_scheduled_at) : undefined,
      releasedAt: data.released_at ? new Date(data.released_at) : undefined,
      refundedAt: data.refunded_at ? new Date(data.refunded_at) : undefined,
      disputeId: data.dispute_id
    };
  }
}