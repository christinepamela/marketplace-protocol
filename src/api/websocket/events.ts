/**
 * WebSocket Event Definitions and Helpers
 * Path: src/api/websocket/events.ts
 */

import { getWebSocketManager } from './server';
import type { 
  OrderStatus, 
  Order 
} from '../../core/layer2-transaction/types';
import type { 
  DisputeStatus,
  Dispute 
} from '../../core/layer4-trust/types';
import type { 
  ShipmentStatus 
} from '../../core/layer3-logistics/types';
import type {
  ProposalStatus,
  GovernanceProposal
} from '../../core/layer6-governance/types';

// ============================================================================
// EVENT TYPES
// ============================================================================

export type ProtocolEvent =
  // Order events
  | 'order.created'
  | 'order.paid'
  | 'order.confirmed'
  | 'order.shipped'
  | 'order.delivered'
  | 'order.completed'
  | 'order.cancelled'
  | 'order.status_changed'
  
  // Shipment events
  | 'shipment.created'
  | 'shipment.tracking_updated'
  | 'shipment.location_changed'
  | 'shipment.delivered'
  
  // Dispute events
  | 'dispute.filed'
  | 'dispute.vendor_responded'
  | 'dispute.resolved'
  | 'dispute.status_changed'
  
  // Rating events
  | 'rating.submitted'
  | 'rating.revealed'
  
  // Proposal/Governance events
  | 'proposal.created'
  | 'proposal.voted'
  | 'proposal.approved'
  | 'proposal.executed'
  | 'proposal.status_changed';

// ============================================================================
// EVENT PAYLOADS
// ============================================================================

export interface OrderEventPayload {
  orderId: string;
  orderNumber: string;
  status: OrderStatus;
  buyerDid: string;
  vendorDid: string;
  total?: {
    amount: number;
    currency: string;
  };
  timestamp: string;
}

export interface ShipmentEventPayload {
  shipmentId: string;
  orderId: string;
  trackingNumber?: string;
  status: ShipmentStatus;
  currentLocation?: string;
  estimatedDelivery?: string;
  providerId?: string;
  timestamp: string;
}

export interface DisputeEventPayload {
  disputeId: string;
  disputeNumber: string;
  orderId: string;
  buyerDid: string;
  vendorDid: string;
  status: DisputeStatus;
  disputeType: string;
  timestamp: string;
}

export interface RatingEventPayload {
  ratingId: string;
  orderId: string;
  buyerDid: string;
  vendorDid: string;
  revealed: boolean;
  timestamp: string;
}

export interface ProposalEventPayload {
  proposalId: string;
  proposalNumber: string;
  action: string;
  status: ProposalStatus;
  currentApprovals: number;
  requiredApprovals: number;
  proposedBy: string;
  timestamp: string;
}

// ============================================================================
// EVENT EMITTERS
// ============================================================================

/**
 * Emit order event
 */
/**
 * Emit order event
 */
export function emitOrderEvent(
  event: ProtocolEvent,
  order: Partial<Order> & { id: string; orderNumber: string; buyerDid: string; vendorDid: string }
): void {
  console.log('[WS-EMIT] Starting emitOrderEvent:', event);
  console.log('[WS-EMIT] Order data:', { 
    id: order.id, 
    buyerDid: order.buyerDid, 
    vendorDid: order.vendorDid 
  });
  
  try {
    console.log('[WS-EMIT] Getting WebSocket manager...');
    const wsManager = getWebSocketManager();
    console.log('[WS-EMIT] WebSocket manager obtained');

    const payload: OrderEventPayload = {
      orderId: order.id,
      orderNumber: order.orderNumber,
      status: order.status!,
      buyerDid: order.buyerDid,
      vendorDid: order.vendorDid,
      total: order.total,
      timestamp: new Date().toISOString(),
    };

    console.log('[WS-EMIT] Payload created:', payload);

    // Broadcast to multiple channels
    const channels = [
      `order:${order.id}`,           // Order-specific channel
      `user:${order.buyerDid}`,      // Buyer's personal channel
      `user:${order.vendorDid}`,     // Vendor's personal channel
    ];

    console.log('[WS-EMIT] Broadcasting to channels:', channels);
    wsManager.broadcastToChannels(channels, event, payload);
    console.log('[WS-EMIT] Broadcast complete');
  } catch (error) {
    // WebSocket not initialized or error - fail silently
    console.error(`[WS-EMIT] Failed to emit ${event}:`, error);
    console.error('[WS-EMIT] Error stack:', (error as Error).stack);
  }
}

/**
 * Emit shipment event
 */
export function emitShipmentEvent(
  event: ProtocolEvent,
  shipment: {
    id: string;
    order_id: string;
    tracking_number?: string;
    status: ShipmentStatus;
    current_location?: string;
    estimated_delivery?: Date;
    provider_id?: string;
  },
  buyerDid: string,
  vendorDid: string
): void {
  try {
    const wsManager = getWebSocketManager();

    const payload: ShipmentEventPayload = {
      shipmentId: shipment.id,
      orderId: shipment.order_id,
      trackingNumber: shipment.tracking_number,
      status: shipment.status,
      currentLocation: shipment.current_location,
      estimatedDelivery: shipment.estimated_delivery?.toISOString(),
      providerId: shipment.provider_id,
      timestamp: new Date().toISOString(),
    };

    const channels = [
      `order:${shipment.order_id}`,
      `shipment:${shipment.id}`,
      `user:${buyerDid}`,
      `user:${vendorDid}`,
    ];

    wsManager.broadcastToChannels(channels, event, payload);
  } catch (error) {
    console.error(`[WS] Failed to emit ${event}:`, error);
  }
}

/**
 * Emit dispute event
 */
export function emitDisputeEvent(
  event: ProtocolEvent,
  dispute: Partial<Dispute> & {
    id: string;
    dispute_number: string;
    order_id: string;
    buyer_did: string;
    vendor_did: string;
    dispute_type: string;
  }
): void {
  try {
    const wsManager = getWebSocketManager();

    const payload: DisputeEventPayload = {
      disputeId: dispute.id,
      disputeNumber: dispute.dispute_number,
      orderId: dispute.order_id,
      buyerDid: dispute.buyer_did,
      vendorDid: dispute.vendor_did,
      status: dispute.status!,
      disputeType: dispute.dispute_type,
      timestamp: new Date().toISOString(),
    };

    const channels = [
      `order:${dispute.order_id}`,
      `dispute:${dispute.id}`,
      `user:${dispute.buyer_did}`,
      `user:${dispute.vendor_did}`,
    ];

    wsManager.broadcastToChannels(channels, event, payload);
  } catch (error) {
    console.error(`[WS] Failed to emit ${event}:`, error);
  }
}

/**
 * Emit rating event
 */
export function emitRatingEvent(
  event: ProtocolEvent,
  rating: {
    id: string;
    order_id: string;
    buyer_did: string;
    vendor_did: string;
    revealed_at?: Date;
  }
): void {
  try {
    const wsManager = getWebSocketManager();

    const payload: RatingEventPayload = {
      ratingId: rating.id,
      orderId: rating.order_id,
      buyerDid: rating.buyer_did,
      vendorDid: rating.vendor_did,
      revealed: !!rating.revealed_at,
      timestamp: new Date().toISOString(),
    };

    const channels = [
      `order:${rating.order_id}`,
      `user:${rating.buyer_did}`,
      `user:${rating.vendor_did}`,
    ];

    wsManager.broadcastToChannels(channels, event, payload);
  } catch (error) {
    console.error(`[WS] Failed to emit ${event}:`, error);
  }
}

/**
 * Emit proposal/governance event
 */
export function emitProposalEvent(
  event: ProtocolEvent,
  proposal: Partial<GovernanceProposal> & {
    id: string;
    proposal_number: string;
    action: string;
    proposed_by: string;
  }
): void {
  try {
    const wsManager = getWebSocketManager();

    const payload: ProposalEventPayload = {
      proposalId: proposal.id,
      proposalNumber: proposal.proposal_number,
      action: proposal.action,
      status: proposal.status!,
      currentApprovals: proposal.current_approvals || 0,
      requiredApprovals: proposal.required_approvals || 0,
      proposedBy: proposal.proposed_by,
      timestamp: new Date().toISOString(),
    };

    // Governance events broadcast to global and proposer
    const channels = [
      'global',                       // All users interested in governance
      `proposal:${proposal.id}`,      // Proposal-specific
      `user:${proposal.proposed_by}`, // Proposer
    ];

    wsManager.broadcastToChannels(channels, event, payload);
  } catch (error) {
    console.error(`[WS] Failed to emit ${event}:`, error);
  }
}

// ============================================================================
// HELPER: Get relevant channels for an entity
// ============================================================================

export function getOrderChannels(orderId: string, buyerDid: string, vendorDid: string): string[] {
  return [
    `order:${orderId}`,
    `user:${buyerDid}`,
    `user:${vendorDid}`,
  ];
}

export function getDisputeChannels(disputeId: string, orderId: string, buyerDid: string, vendorDid: string): string[] {
  return [
    `dispute:${disputeId}`,
    `order:${orderId}`,
    `user:${buyerDid}`,
    `user:${vendorDid}`,
  ];
}

export function getProposalChannels(proposalId: string, proposedBy: string): string[] {
  return [
    'global',
    `proposal:${proposalId}`,
    `user:${proposedBy}`,
  ];
}