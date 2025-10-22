/// Layer 3: Logistics Coordination - Shipment Service
// Path: src/services/shipment.service.ts

import { SupabaseClient } from '@supabase/supabase-js';
import { createHash } from 'crypto';
import {
  Shipment,
  ShipmentStatus,
  TrackingEvent,
  CreateShipmentInput,
  UpdateShipmentStatusInput,
  ShipmentTrackingInfo,
} from './types';

export class ShipmentService {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Create a new shipment after quote is accepted
   * Links the shipment to the accepted quote and provider
   */
  async createShipment(input: CreateShipmentInput): Promise<Shipment> {
    // Get and verify the quote
    const { data: quote, error: quoteError } = await this.supabase
      .from('shipping_quotes')
      .select('*')
      .eq('id', input.quote_id)
      .single();

    if (quoteError || !quote) {
      throw new Error('Quote not found');
    }

    if (quote.status !== 'accepted') {
      throw new Error('Quote must be accepted before creating shipment');
    }

    // Verify order matches
    if (quote.order_id !== input.order_id) {
      throw new Error('Quote does not belong to this order');
    }

    // Check if shipment already exists for this order
    const { data: existingShipment } = await this.supabase
      .from('shipments')
      .select('*')
      .eq('order_id', input.order_id)
      .single();

    if (existingShipment) {
      throw new Error('Shipment already exists for this order');
    }

    // Create shipment
    const { data: shipment, error } = await this.supabase
      .from('shipments')
      .insert({
        order_id: input.order_id,
        quote_id: input.quote_id,
        provider_id: quote.provider_id,
        tracking_number: input.tracking_number,
        status: 'pending_pickup',
        estimated_delivery: input.estimated_delivery.toISOString(),
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create shipment: ${error.message}`);
    }

    // Create initial tracking event
    await this.addTrackingEvent(
      shipment.id,
      'pending_pickup',
      'Shipment created, awaiting pickup'
    );

    return shipment;
  }

  /**
   * Update shipment status
   * Automatically creates tracking event and handles special states
   */
  async updateStatus(input: UpdateShipmentStatusInput): Promise<Shipment> {
    // Get current shipment
    const { data: currentShipment, error: getError } = await this.supabase
      .from('shipments')
      .select('*')
      .eq('id', input.shipment_id)
      .single();

    if (getError || !currentShipment) {
      throw new Error('Shipment not found');
    }

    // Validate status transition (optional: add state machine logic)
    if (currentShipment.status === 'delivered') {
      throw new Error('Cannot update status of delivered shipment');
    }

    if (currentShipment.status === 'cancelled') {
      throw new Error('Cannot update status of cancelled shipment');
    }

    // Update shipment
    const { data: shipment, error } = await this.supabase
      .from('shipments')
      .update({
        status: input.status,
        current_location: input.location,
        updated_at: new Date().toISOString(),
      })
      .eq('id', input.shipment_id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update shipment: ${error.message}`);
    }

    // Add tracking event
    await this.addTrackingEvent(
      shipment.id,
      input.status,
      input.notes,
      input.location
    );

    // Handle special status changes
    if (input.status === 'delivered') {
      await this.handleDelivery(shipment);
    }

    return shipment;
  }

  /**
   * Add proof of delivery (photo hash or signature)
   * Automatically marks shipment as delivered
   */
  async addProofOfDelivery(
    shipmentId: string,
    proofData: Buffer
  ): Promise<Shipment> {
    // Generate SHA-256 hash of proof data
    const hash = createHash('sha256').update(proofData).digest('hex');

    // Update shipment with proof and mark as delivered
    const { data: shipment, error } = await this.supabase
      .from('shipments')
      .update({
        proof_of_delivery_hash: hash,
        status: 'delivered',
        updated_at: new Date().toISOString(),
      })
      .eq('id', shipmentId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to add proof of delivery: ${error.message}`);
    }

    // Add tracking event
    await this.addTrackingEvent(
      shipmentId,
      'delivered',
      'Proof of delivery recorded'
    );

    // Trigger order completion
    await this.handleDelivery(shipment);

    return shipment;
  }

  /**
   * Get shipment by ID
   */
  async getShipment(shipmentId: string): Promise<Shipment> {
    const { data, error } = await this.supabase
      .from('shipments')
      .select('*')
      .eq('id', shipmentId)
      .single();

    if (error) {
      throw new Error(`Shipment not found: ${error.message}`);
    }

    return data;
  }

  /**
   * Get shipment by tracking number
   * Public method for buyers to track their packages
   */
  async getByTrackingNumber(trackingNumber: string): Promise<Shipment> {
    const { data, error } = await this.supabase
      .from('shipments')
      .select('*')
      .eq('tracking_number', trackingNumber)
      .single();

    if (error) {
      throw new Error(`Shipment not found: ${error.message}`);
    }

    return data;
  }

  /**
   * Get shipment by order ID
   */
  async getByOrderId(orderId: string): Promise<Shipment> {
    const { data, error } = await this.supabase
      .from('shipments')
      .select('*')
      .eq('order_id', orderId)
      .single();

    if (error) {
      throw new Error(`Shipment not found for order: ${error.message}`);
    }

    return data;
  }

  /**
   * Get all tracking events for a shipment
   * Returns chronological history of status changes
   */
  async getTrackingEvents(shipmentId: string): Promise<TrackingEvent[]> {
    const { data, error } = await this.supabase
      .from('tracking_events')
      .select('*')
      .eq('shipment_id', shipmentId)
      .order('timestamp', { ascending: true });

    if (error) {
      throw new Error(`Failed to get tracking events: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get complete tracking information
   * Includes shipment, events, and provider details
   */
  async getTrackingInfo(trackingNumber: string): Promise<ShipmentTrackingInfo> {
    const shipment = await this.getByTrackingNumber(trackingNumber);
    const events = await this.getTrackingEvents(shipment.id);

    const { data: provider, error: providerError } = await this.supabase
      .from('logistics_providers')
      .select('*')
      .eq('id', shipment.provider_id)
      .single();

    if (providerError || !provider) {
      throw new Error('Provider not found');
    }

    return {
      shipment,
      events,
      provider,
    };
  }

  /**
   * Get all shipments for a provider
   * Useful for provider dashboard
   */
  async getProviderShipments(
    providerId: string,
    status?: ShipmentStatus
  ): Promise<Shipment[]> {
    let query = this.supabase
      .from('shipments')
      .select('*')
      .eq('provider_id', providerId);

    if (status) {
      query = query.eq('status', status);
    }

    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to get provider shipments: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Cancel a shipment
   * Can only cancel if not yet delivered
   */
  async cancelShipment(shipmentId: string, reason?: string): Promise<Shipment> {
    const shipment = await this.getShipment(shipmentId);

    if (shipment.status === 'delivered') {
      throw new Error('Cannot cancel delivered shipment');
    }

    if (shipment.status === 'cancelled') {
      throw new Error('Shipment already cancelled');
    }

    const { data, error } = await this.supabase
      .from('shipments')
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString(),
      })
      .eq('id', shipmentId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to cancel shipment: ${error.message}`);
    }

    await this.addTrackingEvent(
      shipmentId,
      'cancelled',
      reason || 'Shipment cancelled'
    );

    return data;
  }

  /**
   * Private: Add a tracking event
   */
  private async addTrackingEvent(
    shipmentId: string,
    status: ShipmentStatus,
    notes?: string,
    location?: string
  ): Promise<void> {
    const { error } = await this.supabase
      .from('tracking_events')
      .insert({
        shipment_id: shipmentId,
        status,
        location,
        notes,
      });

    if (error) {
      console.error('Failed to create tracking event:', error);
      // Don't throw - tracking event failure shouldn't block shipment updates
    }
  }

  /**
   * Private: Handle delivery completion
   * Updates order status and triggers escrow release countdown
   */
  private async handleDelivery(shipment: Shipment): Promise<void> {
    // Update order status to 'delivered'
    const { error: orderError } = await this.supabase
      .from('orders')
      .update({ 
        status: 'delivered',
        delivered_at: new Date().toISOString(),
      })
      .eq('id', shipment.order_id);

    if (orderError) {
      console.error('Failed to update order status:', orderError);
      // Log error but don't throw - shipment delivery is recorded
    }

    // Note: Escrow auto-release happens in Layer 2
    // after 7 days from delivery timestamp
    // This just marks the delivery time for that countdown
  }

  /**
   * Verify proof of delivery hash
   * Allows verification that the stored hash matches provided proof
   */
  verifyProofOfDelivery(proofData: Buffer, storedHash: string): boolean {
    const computedHash = createHash('sha256').update(proofData).digest('hex');
    return computedHash === storedHash;
  }
}