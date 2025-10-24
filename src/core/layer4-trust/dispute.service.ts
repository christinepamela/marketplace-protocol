// Layer 4: Trust & Compliance - Dispute Service
// Path: src/core/layer4-trust/dispute.service.ts

import { SupabaseClient } from '@supabase/supabase-js';
import {
  Dispute,
  CreateDisputeInput,
  SubmitVendorResponseInput,
  DisputeEvent,
  DisputeStatus,
  DisputeResolution,
  AutoResolutionResult,
  DisputeStats,
} from './types';

export class DisputeService {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Open a new dispute
   * Only buyer can open within 72h of delivery
   */
  async openDispute(input: CreateDisputeInput): Promise<Dispute> {
    // Verify order exists and is delivered
    const { data: order, error: orderError } = await this.supabase
      .from('orders')
      .select('*')
      .eq('id', input.order_id)
      .single();

    if (orderError || !order) {
      throw new Error('Order not found');
    }

    if (order.status !== 'delivered') {
      throw new Error('Can only dispute delivered orders');
    }

    // Check 72-hour window
    const deliveredAt = new Date(order.delivered_at);
    const now = new Date();
    const hoursSinceDelivery = (now.getTime() - deliveredAt.getTime()) / (1000 * 60 * 60);

    if (hoursSinceDelivery > 72) {
      throw new Error('Dispute window expired (72 hours after delivery)');
    }

    // Check if dispute already exists
    const { data: existing } = await this.supabase
      .from('disputes')
      .select('*')
      .eq('order_id', input.order_id)
      .single();

    if (existing) {
      throw new Error('Dispute already exists for this order');
    }

    // Generate dispute number
    const disputeNumber = await this.generateDisputeNumber();

    // Calculate vendor response deadline (48 hours)
    const vendorResponseDue = new Date();
    vendorResponseDue.setHours(vendorResponseDue.getHours() + 48);

    // Create dispute
    const { data: dispute, error } = await this.supabase
      .from('disputes')
      .insert({
        dispute_number: disputeNumber,
        order_id: input.order_id,
        buyer_did: input.buyer_did,
        vendor_did: order.vendor_did,
        dispute_type: input.dispute_type,
        description: input.description,
        evidence: input.evidence || {},
        status: 'awaiting_vendor',
        vendor_response_due_at: vendorResponseDue.toISOString(),
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create dispute: ${error.message}`);
    }

    // Pause escrow release
    await this.pauseEscrow(input.order_id);

    // Log event
    await this.logEvent(dispute.id, 'opened', input.buyer_did, 'Dispute opened by buyer');

    return dispute;
  }

  /**
   * Vendor submits response to dispute
   */
  async submitVendorResponse(input: SubmitVendorResponseInput): Promise<Dispute> {
    const dispute = await this.getDispute(input.dispute_id);

    // Verify vendor
    if (dispute.vendor_did !== input.vendor_did) {
      throw new Error('Only the vendor can submit response');
    }

    // Verify status
    if (dispute.status !== 'awaiting_vendor') {
      throw new Error(`Cannot submit response in status: ${dispute.status}`);
    }

    // Update dispute with vendor response
    const vendorResponse = {
      response_text: input.response_text,
      counter_evidence: input.counter_evidence,
      proposed_resolution: input.proposed_resolution,
      submitted_at: new Date().toISOString(),
    };

    const { data: updated, error } = await this.supabase
      .from('disputes')
      .update({
        vendor_response: vendorResponse,
        status: 'under_review',
      })
      .eq('id', input.dispute_id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to submit response: ${error.message}`);
    }

    // Log event
    await this.logEvent(input.dispute_id, 'vendor_responded', input.vendor_did, 'Vendor submitted response');

    // Attempt auto-resolution
    await this.attemptAutoResolution(input.dispute_id);

    return updated;
  }

  /**
   * Attempt automated resolution based on evidence
   */
  async attemptAutoResolution(disputeId: string): Promise<void> {
    const dispute = await this.getDispute(disputeId);

    const result = await this.evaluateForAutoResolution(dispute);

    if (result.can_auto_resolve) {
      await this.resolveDispute(
        disputeId,
        result.resolution!,
        result.reasoning,
        'system'
      );
    } else {
      // Escalate to arbitration
      await this.escalateToArbitration(disputeId, result.reasoning);
    }
  }

  /**
   * Evaluate if dispute can be auto-resolved
   */
  private async evaluateForAutoResolution(dispute: Dispute): Promise<AutoResolutionResult> {
    const evidence = dispute.evidence || {};
    const vendorResponse = (dispute.vendor_response || {}) as any;

    // Rule 1: Non-receipt disputes
    if (dispute.dispute_type === 'non_receipt') {
      // If tracking shows delivered with proof
      if (evidence.tracking_events && evidence.tracking_events.length > 0) {
        const hasDeliveryProof = evidence.tracking_events.some(
          (e: any) => e.status === 'delivered'
        );

        if (hasDeliveryProof) {
          return {
            can_auto_resolve: true,
            resolution: 'vendor_wins',
            confidence: 0.95,
            reasoning: 'Tracking confirms delivery',
            evidence_analyzed: ['tracking_events'],
          };
        }
      }

      // If no tracking or overdue
      if (!evidence.tracking_number) {
        return {
          can_auto_resolve: true,
          resolution: 'full_refund',
          confidence: 0.90,
          reasoning: 'No tracking information provided',
          evidence_analyzed: ['tracking_absence'],
        };
      }
    }

    // Rule 2: Quality disputes with clear photo evidence
    if (dispute.dispute_type === 'quality') {
      const hasPhotos = evidence.photo_urls && evidence.photo_urls.length > 0;
      const hasVendorCounterEvidence = 
        vendorResponse.counter_evidence && 
        vendorResponse.counter_evidence.photo_urls &&
        vendorResponse.counter_evidence.photo_urls.length > 0;

      if (hasPhotos && !hasVendorCounterEvidence) {
        return {
          can_auto_resolve: true,
          resolution: 'full_refund',
          confidence: 0.85,
          reasoning: 'Buyer provided photo evidence, vendor did not counter',
          evidence_analyzed: ['buyer_photos', 'vendor_response_absence'],
        };
      }

      // If both have evidence, escalate
      if (hasPhotos && hasVendorCounterEvidence) {
        return {
          can_auto_resolve: false,
          confidence: 0.50,
          reasoning: 'Conflicting evidence from both parties',
          evidence_analyzed: ['buyer_photos', 'vendor_photos'],
        };
      }
    }

    // Rule 3: Logistics failure
    if (dispute.dispute_type === 'logistics') {
      return {
        can_auto_resolve: true,
        resolution: 'full_refund',
        confidence: 0.80,
        reasoning: 'Logistics issue - courier responsibility',
        evidence_analyzed: ['dispute_type'],
      };
    }

    // Rule 4: Change of mind
    if (dispute.dispute_type === 'change_of_mind') {
      return {
        can_auto_resolve: true,
        resolution: 'no_refund',
        confidence: 1.00,
        reasoning: 'Change of mind is non-refundable per policy',
        evidence_analyzed: ['dispute_type'],
      };
    }

    // Default: Cannot auto-resolve
    return {
      can_auto_resolve: false,
      confidence: 0.30,
      reasoning: 'Insufficient or conflicting evidence',
      evidence_analyzed: ['all_available'],
    };
  }

  /**
   * Resolve dispute
   */
  async resolveDispute(
    disputeId: string,
    resolution: DisputeResolution,
    reason: string,
    resolvedBy: string
  ): Promise<Dispute> {
    const { data: dispute, error } = await this.supabase
      .from('disputes')
      .update({
        status: 'resolved',
        resolution,
        resolution_reason: reason,
        resolved_at: new Date().toISOString(),
      })
      .eq('id', disputeId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to resolve dispute: ${error.message}`);
    }

    // Log event
    await this.logEvent(disputeId, 'resolved', resolvedBy, `Resolved: ${resolution}`);

    // Execute resolution (refund, release escrow, etc.)
    await this.executeResolution(dispute);

    return dispute;
  }

  /**
   * Escalate to arbitration
   */
  async escalateToArbitration(disputeId: string, reason: string): Promise<void> {
    await this.supabase
      .from('disputes')
      .update({
        status: 'arbitration',
        requires_arbitration: true,
      })
      .eq('id', disputeId);

    await this.logEvent(disputeId, 'escalated', 'system', reason);
  }

  /**
   * Get dispute by ID
   */
  async getDispute(disputeId: string): Promise<Dispute> {
    const { data, error } = await this.supabase
      .from('disputes')
      .select('*')
      .eq('id', disputeId)
      .single();

    if (error) {
      throw new Error(`Dispute not found: ${error.message}`);
    }

    return data;
  }

  /**
   * Get all disputes for an order
   */
  async getDisputesByOrder(orderId: string): Promise<Dispute[]> {
    const { data, error } = await this.supabase
      .from('disputes')
      .select('*')
      .eq('order_id', orderId)
      .order('opened_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to get disputes: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get dispute events
   */
  async getDisputeEvents(disputeId: string): Promise<DisputeEvent[]> {
    const { data, error } = await this.supabase
      .from('dispute_events')
      .select('*')
      .eq('dispute_id', disputeId)
      .order('occurred_at', { ascending: true });

    if (error) {
      throw new Error(`Failed to get events: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get dispute statistics
   */
  async getDisputeStats(): Promise<DisputeStats> {
    const { data: disputes } = await this.supabase
      .from('disputes')
      .select('*');

    const total = disputes?.length || 0;
    const open = disputes?.filter(d => d.status !== 'resolved' && d.status !== 'closed').length || 0;
    const resolved = disputes?.filter(d => d.status === 'resolved').length || 0;
    const autoResolved = disputes?.filter(
      d => d.status === 'resolved' && !d.requires_arbitration
    ).length || 0;
    const arbitrated = disputes?.filter(d => d.requires_arbitration).length || 0;

    const resolutionBreakdown = {
      full_refund: disputes?.filter(d => d.resolution === 'full_refund').length || 0,
      partial_refund: disputes?.filter(d => d.resolution === 'partial_refund').length || 0,
      no_refund: disputes?.filter(d => d.resolution === 'no_refund').length || 0,
      vendor_wins: disputes?.filter(d => d.resolution === 'vendor_wins').length || 0,
    };

    // Calculate average resolution time
    const resolvedDisputes = disputes?.filter(d => d.resolved_at) || [];
    const totalTime = resolvedDisputes.reduce((sum, d) => {
      const opened = new Date(d.opened_at).getTime();
      const resolved = new Date(d.resolved_at!).getTime();
      return sum + (resolved - opened);
    }, 0);
    const averageTime = resolvedDisputes.length > 0 ? 
      totalTime / resolvedDisputes.length / (1000 * 60 * 60) : 0;

    // Top dispute reasons
    const typeCounts: Record<string, number> = {};
    disputes?.forEach(d => {
      typeCounts[d.dispute_type] = (typeCounts[d.dispute_type] || 0) + 1;
    });
    const topReasons = Object.entries(typeCounts)
      .map(([type, count]) => ({ type: type as any, count }))
      .sort((a, b) => b.count - a.count);

    return {
      total_disputes: total,
      open_disputes: open,
      resolved_disputes: resolved,
      auto_resolved_count: autoResolved,
      arbitration_count: arbitrated,
      resolution_breakdown: resolutionBreakdown,
      average_resolution_time_hours: averageTime,
      top_dispute_reasons: topReasons,
    };
  }

  /**
   * Private: Generate dispute number
   */
  private async generateDisputeNumber(): Promise<string> {
    const { count } = await this.supabase
      .from('disputes')
      .select('*', { count: 'exact', head: true });

    const nextNumber = (count || 0) + 1;
    return `DIS-${String(nextNumber).padStart(3, '0')}`;
  }

  /**
   * Private: Log dispute event
   */
  private async logEvent(
    disputeId: string,
    eventType: string,
    actorDid: string,
    description?: string
  ): Promise<void> {
    await this.supabase
      .from('dispute_events')
      .insert({
        dispute_id: disputeId,
        event_type: eventType,
        actor_did: actorDid,
        description,
      });
  }

  /**
   * Private: Pause escrow release
   */
  private async pauseEscrow(orderId: string): Promise<void> {
    // Update order to indicate dispute
    await this.supabase
      .from('orders')
      .update({ status: 'disputed' })
      .eq('id', orderId);
  }

  /**
   * Private: Execute resolution (refund/release)
   */
  private async executeResolution(dispute: Dispute): Promise<void> {
    if (dispute.resolution === 'full_refund' || dispute.resolution === 'partial_refund') {
      // Trigger refund in escrow service (Layer 2)
      // This would call escrow.service.refund()
      console.log(`Executing ${dispute.resolution} for order ${dispute.order_id}`);
    } else if (dispute.resolution === 'vendor_wins' || dispute.resolution === 'no_refund') {
      // Release escrow to vendor
      console.log(`Releasing escrow to vendor for order ${dispute.order_id}`);
    }

    // Update order status
    const newStatus = dispute.resolution === 'full_refund' || dispute.resolution === 'partial_refund' 
      ? 'refunded' 
      : 'completed';

    await this.supabase
      .from('orders')
      .update({ status: newStatus })
      .eq('id', dispute.order_id);
  }
}