/**
 * Reputation Service
 * Handles reputation calculation, event tracking, and score updates
 */

import { v4 as uuidv4 } from 'uuid';
import type {
  Reputation,
  ReputationEvent,
  ReputationEventType,
  ReputationMetrics,
  ReputationScore,
  UpdateReputationRequest,
  DisputeSeverity,
  IdentityType,
  DEFAULT_REPUTATION_PARAMS,
  ReputationCalculationParams
} from './types';
import { calculateReputationScore } from './types';

export class ReputationService {
  private dbClient: any; // Will be replaced with actual Supabase client
  
  constructor(dbClient: any) {
    this.dbClient = dbClient;
  }

  /**
   * Get reputation for a vendor
   */
  async getReputation(vendorDid: string): Promise<Reputation | null> {
    const { data, error } = await this.dbClient
      .from('reputations')
      .select('*')
      .eq('vendor_did', vendorDid)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw error;
    }
    
    return this.mapDatabaseToReputation(data);
  }

  /**
   * Update reputation after a transaction
   */
  async updateAfterTransaction(
    request: UpdateReputationRequest
  ): Promise<void> {
    const { transactionId, rating, deliveryOnTime, buyerDid, comment, logisticsProviderDid } = request;
    
    // Get vendor DID from transaction
    const vendorDid = await this.getVendorDidFromTransaction(transactionId);
    
    // Get current reputation
    const reputation = await this.getReputation(vendorDid);
    if (!reputation) {
      throw new Error(`Reputation not found for vendor: ${vendorDid}`);
    }
    
    // Create reputation event
    const event: ReputationEvent = {
      eventId: uuidv4(),
      transactionId,
      type: 'rating',
      timestamp: new Date(),
      rating,
      deliveredOnTime: deliveryOnTime,
      buyerDid,
      comment,
      logisticsProviderDid,
      protocolVersion: '1.0.0',
      schemaVersion: 1
    };
    
    // Update metrics
    const updatedMetrics = this.updateMetricsWithRating(
      reputation.metrics,
      rating,
      deliveryOnTime
    );
    
    // Add event to history
    reputation.history.push(event);
    
    // Recalculate score
    const identityType = await this.getVendorIdentityType(vendorDid);
    const newScore = calculateReputationScore(updatedMetrics, identityType);
    
    // Update reputation
    reputation.metrics = updatedMetrics;
    reputation.score = newScore.score;
    reputation.lastUpdated = new Date();
    
    // Calculate events hash
    reputation.recentEventsHash = await this.calculateEventsHash(reputation.history);
    
    // Save to database
    await this.saveReputation(reputation);
    
    // Update logistics provider reputation if provided
    if (logisticsProviderDid) {
      await this.updateLogisticsReputation(logisticsProviderDid, deliveryOnTime);
    }
  }

  /**
   * Record a dispute event
   */
  async recordDispute(
    vendorDid: string,
    transactionId: string,
    severity: DisputeSeverity,
    resolution: 'vendor_won' | 'buyer_won' | 'partial'
  ): Promise<void> {
    const reputation = await this.getReputation(vendorDid);
    if (!reputation) {
      throw new Error(`Reputation not found for vendor: ${vendorDid}`);
    }
    
    // Create dispute event
    const event: ReputationEvent = {
      eventId: uuidv4(),
      transactionId,
      type: 'dispute',
      timestamp: new Date(),
      disputeSeverity: severity,
      disputeResolution: resolution,
      protocolVersion: '1.0.0',
      schemaVersion: 1
    };
    
    // Update metrics
    const updatedMetrics = this.updateMetricsWithDispute(
      reputation.metrics,
      severity,
      resolution
    );
    
    // Add event to history
    reputation.history.push(event);
    
    // Recalculate score
    const identityType = await this.getVendorIdentityType(vendorDid);
    const newScore = calculateReputationScore(updatedMetrics, identityType);
    
    // Update reputation
    reputation.metrics = updatedMetrics;
    reputation.score = newScore.score;
    reputation.lastUpdated = new Date();
    reputation.recentEventsHash = await this.calculateEventsHash(reputation.history);
    
    // Save to database
    await this.saveReputation(reputation);
  }

  /**
   * Record a verification milestone
   */
  async recordVerificationMilestone(
    vendorDid: string,
    milestoneType: string
  ): Promise<void> {
    const reputation = await this.getReputation(vendorDid);
    if (!reputation) {
      throw new Error(`Reputation not found for vendor: ${vendorDid}`);
    }
    
    // Create verification event
    const event: ReputationEvent = {
      eventId: uuidv4(),
      transactionId: `milestone-${Date.now()}`,
      type: 'verification',
      timestamp: new Date(),
      comment: milestoneType,
      protocolVersion: '1.0.0',
      schemaVersion: 1
    };
    
    // Add event to history
    reputation.history.push(event);
    reputation.lastUpdated = new Date();
    
    // Save to database
    await this.saveReputation(reputation);
  }

  /**
   * Get reputation history for a vendor
   */
  async getReputationHistory(
    vendorDid: string,
    filters?: {
      eventType?: ReputationEventType;
      startDate?: Date;
      endDate?: Date;
      limit?: number;
    }
  ): Promise<ReputationEvent[]> {
    const reputation = await this.getReputation(vendorDid);
    if (!reputation) return [];
    
    let events = reputation.history;
    
    // Apply filters
    if (filters?.eventType) {
      events = events.filter(e => e.type === filters.eventType);
    }
    
    if (filters?.startDate) {
      events = events.filter(e => e.timestamp >= filters.startDate!);
    }
    
    if (filters?.endDate) {
      events = events.filter(e => e.timestamp <= filters.endDate!);
    }
    
    // Sort by timestamp (newest first)
    events.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    
    // Apply limit
    if (filters?.limit) {
      events = events.slice(0, filters.limit);
    }
    
    return events;
  }

  /**
   * Get reputation breakdown for transparency
   */
  async getReputationBreakdown(vendorDid: string): Promise<ReputationScore> {
    const reputation = await this.getReputation(vendorDid);
    if (!reputation) {
      throw new Error(`Reputation not found for vendor: ${vendorDid}`);
    }
    
    const identityType = await this.getVendorIdentityType(vendorDid);
    return calculateReputationScore(reputation.metrics, identityType);
  }

  /**
   * Compare vendor reputations (for buyer decision-making)
   */
  async compareReputations(vendorDids: string[]): Promise<Map<string, ReputationScore>> {
    const comparisons = new Map<string, ReputationScore>();
    
    for (const vendorDid of vendorDids) {
      const breakdown = await this.getReputationBreakdown(vendorDid);
      comparisons.set(vendorDid, breakdown);
    }
    
    return comparisons;
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  /**
   * Update metrics with new rating
   */
  private updateMetricsWithRating(
    metrics: ReputationMetrics,
    rating: number,
    deliveredOnTime: boolean
  ): ReputationMetrics {
    const updatedMetrics = { ...metrics };
    
    // Update transaction count
    updatedMetrics.transactionsCompleted += 1;
    
    // Update rating
    const totalRatings = updatedMetrics.totalRatings + 1;
    const currentTotal = updatedMetrics.averageRating * updatedMetrics.totalRatings;
    updatedMetrics.averageRating = (currentTotal + rating) / totalRatings;
    updatedMetrics.totalRatings = totalRatings;
    
    // Update on-time delivery rate
    const totalDeliveries = updatedMetrics.transactionsCompleted;
    const onTimeDeliveries = Math.round(updatedMetrics.onTimeDeliveryRate * (totalDeliveries - 1));
    const newOnTimeDeliveries = onTimeDeliveries + (deliveredOnTime ? 1 : 0);
    updatedMetrics.onTimeDeliveryRate = newOnTimeDeliveries / totalDeliveries;
    
    return updatedMetrics;
  }

  /**
   * Update metrics with dispute
   */
  private updateMetricsWithDispute(
    metrics: ReputationMetrics,
    severity: DisputeSeverity,
    resolution: 'vendor_won' | 'buyer_won' | 'partial'
  ): ReputationMetrics {
    const updatedMetrics = { ...metrics };
    
    // Update dispute counts
    updatedMetrics.disputesTotal += 1;
    
    if (severity === 'minor') {
      updatedMetrics.minorDisputes += 1;
    } else {
      updatedMetrics.majorDisputes += 1;
    }
    
    // Update dispute resolution
    if (resolution === 'vendor_won') {
      updatedMetrics.disputesWon += 1;
    } else if (resolution === 'buyer_won') {
      updatedMetrics.disputesLost += 1;
    }
    // 'partial' doesn't count as won or lost
    
    return updatedMetrics;
  }

  /**
   * Update logistics provider reputation
   */
  private async updateLogisticsReputation(
    logisticsDid: string,
    deliveredOnTime: boolean
  ): Promise<void> {
    // Similar logic to vendor reputation
    // This would update the logistics provider's own reputation score
    // Implementation depends on Layer 3 (Logistics) structure
    
    // For now, just log the event
    await this.dbClient
      .from('logistics_performance')
      .insert({
        logistics_did: logisticsDid,
        delivered_on_time: deliveredOnTime,
        timestamp: new Date()
      });
  }

  /**
   * Get vendor DID from transaction
   */
  private async getVendorDidFromTransaction(transactionId: string): Promise<string> {
    const { data, error } = await this.dbClient
      .from('orders')
      .select('vendor_did')
      .eq('id', transactionId)
      .single();
    
    if (error) throw error;
    return data.vendor_did;
  }

  /**
   * Get vendor identity type
   */
  private async getVendorIdentityType(vendorDid: string): Promise<IdentityType> {
    const { data, error } = await this.dbClient
      .from('identities')
      .select('type')
      .eq('did', vendorDid)
      .single();
    
    if (error) throw error;
    return data.type;
  }

  /**
   * Calculate Merkle hash of events for verification
   */
  private async calculateEventsHash(events: ReputationEvent[]): Promise<string> {
    // Simple hash for MVP - should use proper Merkle tree in production
    const recentEvents = events.slice(-100); // Last 100 events
    const eventsString = JSON.stringify(recentEvents);
    
    // Use Web Crypto API for hashing
    const encoder = new TextEncoder();
    const data = encoder.encode(eventsString);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    return hashHex;
  }

  /**
   * Save reputation to database
   */
  private async saveReputation(reputation: Reputation): Promise<void> {
    const { error } = await this.dbClient
      .from('reputations')
      .update({
        score: reputation.score,
        metrics: reputation.metrics,
        history: reputation.history,
        recent_events_hash: reputation.recentEventsHash,
        last_updated: reputation.lastUpdated
      })
      .eq('vendor_did', reputation.vendorDid);
    
    if (error) throw error;
  }

  /**
   * Map database record to Reputation object
   */
  private mapDatabaseToReputation(data: any): Reputation {
    return {
      vendorDid: data.vendor_did,
      score: data.score,
      metrics: data.metrics,
      history: data.history.map((e: any) => ({
        ...e,
        timestamp: new Date(e.timestamp)
      })),
      lastUpdated: new Date(data.last_updated),
      recentEventsHash: data.recent_events_hash
    };
  }
}