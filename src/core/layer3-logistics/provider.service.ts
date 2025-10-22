// Layer 3: Logistics Coordination - Provider Service
// Path: src/services/provider.service.ts

import { SupabaseClient } from '@supabase/supabase-js';
import {
  LogisticsProvider,
  CreateProviderInput,
  ProviderSearchFilters,
} from './types';

export class ProviderService {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Register a new logistics provider
   * Requirements:
   * - Identity must exist
   * - Identity must be KYC-verified (businesses only)
   * - Service regions must be valid ISO codes
   */
  async registerProvider(input: CreateProviderInput): Promise<LogisticsProvider> {
    // Step 1: Verify identity exists and is KYC-verified
    const { data: identity, error: identityError } = await this.supabase
      .from('identities')
      .select('*')
      .eq('did', input.identity_did)
      .single();

    if (identityError || !identity) {
      throw new Error('Identity not found');
    }

    if (identity.type !== 'kyc') {
      throw new Error('Logistics providers must use KYC identity');
    }

    // Step 2: Validate service regions (basic check)
    if (input.service_regions.length === 0) {
      throw new Error('At least one service region is required');
    }

    // Step 3: Validate shipping methods
    if (input.shipping_methods.length === 0) {
      throw new Error('At least one shipping method is required');
    }

    // Step 4: Create provider
    const { data: provider, error } = await this.supabase
      .from('logistics_providers')
      .insert({
        business_name: input.business_name,
        identity_did: input.identity_did,
        service_regions: input.service_regions,
        shipping_methods: input.shipping_methods,
        insurance_available: input.insurance_available,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to register provider: ${error.message}`);
    }

    return provider;
  }

  /**
   * Get provider by ID
   */
  async getProvider(providerId: string): Promise<LogisticsProvider> {
    const { data, error } = await this.supabase
      .from('logistics_providers')
      .select('*')
      .eq('id', providerId)
      .single();

    if (error) {
      throw new Error(`Provider not found: ${error.message}`);
    }

    return data;
  }

  /**
   * Search providers by filters
   * Supports: region, method, insurance requirement, minimum rating
   */
  async findProviders(filters: ProviderSearchFilters): Promise<LogisticsProvider[]> {
    let query = this.supabase
      .from('logistics_providers')
      .select('*');

    // Filter by service region
    if (filters.service_region) {
      query = query.contains('service_regions', [filters.service_region]);
    }

    // Filter by shipping method
    if (filters.shipping_method) {
      query = query.contains('shipping_methods', [filters.shipping_method]);
    }

    // Filter by insurance availability
    if (filters.insurance_required) {
      query = query.eq('insurance_available', true);
    }

    // Filter by minimum rating
    if (filters.min_rating !== undefined) {
      query = query.gte('average_rating', filters.min_rating);
    }

    // Sort by rating (best first), then by total deliveries
    query = query
      .order('average_rating', { ascending: false, nullsFirst: false })
      .order('total_deliveries', { ascending: false });

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to search providers: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Update provider rating after delivery
   * Uses rolling average formula: new_avg = (old_avg * old_count + new_rating) / (old_count + 1)
   */
  async updateProviderRating(providerId: string, newRating: number): Promise<void> {
    // Validate rating range
    if (newRating < 0 || newRating > 5) {
      throw new Error('Rating must be between 0 and 5');
    }

    // Get current provider data
    const provider = await this.getProvider(providerId);

    // Calculate new average
    const totalDeliveries = provider.total_deliveries + 1;
    const currentAverage = provider.average_rating || 0;
    const newAverage = ((currentAverage * provider.total_deliveries) + newRating) / totalDeliveries;

    // Update provider
    const { error } = await this.supabase
      .from('logistics_providers')
      .update({
        average_rating: newAverage,
        total_deliveries: totalDeliveries,
      })
      .eq('id', providerId);

    if (error) {
      throw new Error(`Failed to update provider rating: ${error.message}`);
    }
  }

  /**
   * Get provider statistics
   * Useful for displaying on provider profile pages
   */
  async getProviderStats(providerId: string): Promise<{
    provider: LogisticsProvider;
    active_shipments: number;
    completed_shipments: number;
    pending_quotes: number;
  }> {
    const provider = await this.getProvider(providerId);

    // Count active shipments
    const { count: activeShipments } = await this.supabase
      .from('shipments')
      .select('*', { count: 'exact', head: true })
      .eq('provider_id', providerId)
      .not('status', 'in', '(delivered,returned,lost,cancelled)');

    // Count completed shipments
    const { count: completedShipments } = await this.supabase
      .from('shipments')
      .select('*', { count: 'exact', head: true })
      .eq('provider_id', providerId)
      .eq('status', 'delivered');

    // Count pending quotes
    const { count: pendingQuotes } = await this.supabase
      .from('shipping_quotes')
      .select('*', { count: 'exact', head: true })
      .eq('provider_id', providerId)
      .eq('status', 'pending');

    return {
      provider,
      active_shipments: activeShipments || 0,
      completed_shipments: completedShipments || 0,
      pending_quotes: pendingQuotes || 0,
    };
  }

  /**
   * Update provider service regions or methods
   */
  async updateProviderCapabilities(
    providerId: string,
    updates: {
      service_regions?: string[];
      shipping_methods?: string[];
      insurance_available?: boolean;
    }
  ): Promise<LogisticsProvider> {
    const { data, error } = await this.supabase
      .from('logistics_providers')
      .update(updates)
      .eq('id', providerId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update provider: ${error.message}`);
    }

    return data;
  }
}