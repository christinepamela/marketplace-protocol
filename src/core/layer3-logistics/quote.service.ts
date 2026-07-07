// Layer 3: Logistics Coordination - Quote Service
// Path: src/services/quote.service.ts

import { SupabaseClient } from '@supabase/supabase-js';
import {
  ShippingQuote,
  QuoteRequest,
  SubmitQuoteInput,
  QuoteWithProvider,
} from './types';

export class QuoteService {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Request quotes from providers
   * Validates that order is in correct state (payment_confirmed)
   * Returns the order ID which providers can use to submit quotes
   */
  async requestQuotes(request: QuoteRequest): Promise<string> {
    // Verify order exists and is in correct state
    const { data: order, error: orderError } = await this.supabase
      .from('orders')
      .select('*')
      .eq('id', request.order_id)
      .single();

    if (orderError || !order) {
      throw new Error('Order not found');
    }

    if (order.status !== 'paid') {
      throw new Error('Order must be paid before requesting quotes');
    }

    // Validate request data
    if (request.weight_kg <= 0) {
      throw new Error('Weight must be greater than 0');
    }

    if (request.dimensions_cm.length <= 0 || 
        request.dimensions_cm.width <= 0 || 
        request.dimensions_cm.height <= 0) {
      throw new Error('All dimensions must be greater than 0');
    }

    // In a real implementation, you might store the quote request
    // in a separate table and notify providers via webhook/event
    // For now, we just return the order ID for providers to respond to
    return request.order_id;
  }

  /**
   * Provider submits a quote for an order
   * Quote expires after specified hours
   */
  async submitQuote(input: SubmitQuoteInput): Promise<ShippingQuote> {
    const isProductQuote = !!input.product_id;
    const isOrderQuote = !!input.order_id;

    // Validate pricing (must have either sats or fiat)
    if (!input.price_sats && !input.price_fiat) {
      throw new Error('Must provide either price_sats or price_fiat');
    }

    // Verify provider exists
    const { data: provider, error: providerError } = await this.supabase
      .from('logistics_providers')
      .select('*')
      .eq('id', input.provider_id)
      .single();

    if (providerError || !provider) {
      throw new Error('Provider not found');
    }

    if (isOrderQuote) {
      // Order-level quote: verify order exists and is confirmed
      const { data: order, error: orderError } = await this.supabase
        .from('orders')
        .select('*')
        .eq('id', input.order_id)
        .single();

      if (orderError || !order) {
        throw new Error('Order not found');
      }

      if (order.status !== 'confirmed') {
        throw new Error('Can only quote for confirmed orders');
      }

      // Check if provider already has a pending quote for this order
      const { data: existingQuote } = await this.supabase
        .from('shipping_quotes')
        .select('id')
        .eq('order_id', input.order_id)
        .eq('provider_id', input.provider_id)
        .eq('status', 'pending')
        .maybeSingle();

      if (existingQuote) {
        throw new Error('Provider already has a pending quote for this order');
      }
    }

    if (isProductQuote) {
      // Product-level quote: verify product exists
      const { data: product, error: productError } = await this.supabase
        .from('products')
        .select('id')
        .eq('id', input.product_id)
        .single();

      if (productError || !product) {
        throw new Error('Product not found');
      }

      // Check if provider already has a pending quote for this product
      const { data: existingQuote } = await this.supabase
        .from('shipping_quotes')
        .select('id')
        .eq('product_id', input.product_id)
        .eq('provider_id', input.provider_id)
        .eq('status', 'pending')
        .maybeSingle();

      if (existingQuote) {
        throw new Error('Provider already has a pending quote for this product');
      }
    }

    // Product quotes are valid 30 days by default; order quotes use valid_hours
    const validUntil = new Date();
    if (isProductQuote) {
      validUntil.setDate(validUntil.getDate() + 30);
    } else {
      validUntil.setHours(validUntil.getHours() + (input.valid_hours || 24));
    }

    // Create quote
    const { data: quote, error } = await this.supabase
      .from('shipping_quotes')
      .insert({
        order_id: input.order_id || null,
        product_id: input.product_id || null,
        quote_type: isProductQuote ? 'product' : 'order',
        provider_id: input.provider_id,
        method: input.method,
        price_sats: input.price_sats || null,
        price_fiat: input.price_fiat || null,
        currency: input.currency || 'USD',
        estimated_days: input.estimated_days,
        insurance_included: input.insurance_included,
        valid_until: validUntil.toISOString(),
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to submit quote: ${error.message}`);
    }

    return quote;
  }

  /**
   * Get all active quotes for an order
   * Only returns pending quotes that haven't expired
   */
  async getQuotesForOrder(orderId: string): Promise<ShippingQuote[]> {
    const now = new Date().toISOString();

    const { data, error } = await this.supabase
      .from('shipping_quotes')
      .select('*')
      .eq('order_id', orderId)
      .eq('status', 'pending')
      .gte('valid_until', now)
      .order('price_sats', { ascending: true, nullsFirst: false })
      .order('price_fiat', { ascending: true, nullsFirst: false });

    if (error) {
      throw new Error(`Failed to get quotes: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get quotes with provider details
   * Useful for displaying to buyers/vendors
   */
  async getQuotesWithProviders(orderId: string): Promise<QuoteWithProvider[]> {
    const now = new Date().toISOString();

    const { data, error } = await this.supabase
      .from('shipping_quotes')
      .select(`
        *,
        provider:logistics_providers(*)
      `)
      .eq('order_id', orderId)
      .eq('status', 'pending')
      .gte('valid_until', now)
      .order('price_sats', { ascending: true, nullsFirst: false });

    if (error) {
      throw new Error(`Failed to get quotes with providers: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get quotes with provider details, scoped to a product (L13 — S32)
   * Seller-facing: shows pending quotes to review/accept, plus the
   * accepted one if already chosen. Unlike getQuotesWithProviders(orderId),
   * this doesn't filter out expired pending quotes — the seller should see
   * everything submitted, even stale offers, so they can decide.
   */
  async getQuotesWithProvidersForProduct(productId: string): Promise<QuoteWithProvider[]> {
    const { data, error } = await this.supabase
      .from('shipping_quotes')
      .select(`
        *,
        provider:logistics_providers(*)
      `)
      .eq('product_id', productId)
      .in('status', ['pending', 'accepted'])
      .order('price_fiat', { ascending: true, nullsFirst: false });

    if (error) {
      throw new Error(`Failed to get quotes with providers: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Accept a quote
   * Automatically rejects all other quotes for the same order
   */
  async acceptQuote(quoteId: string): Promise<ShippingQuote> {
    // Get the quote
    const { data: quote, error: getError } = await this.supabase
      .from('shipping_quotes')
      .select('*')
      .eq('id', quoteId)
      .single();

    if (getError || !quote) {
      throw new Error('Quote not found');
    }

    // Verify quote is still pending
    if (quote.status !== 'pending') {
      throw new Error(`Cannot accept quote with status: ${quote.status}`);
    }

    // Verify quote hasn't expired
    if (new Date(quote.valid_until) < new Date()) {
      throw new Error('Quote has expired');
    }

    // Check if this order or product already has an accepted quote
    let existingAcceptedQuery = this.supabase
      .from('shipping_quotes')
      .select('id')
      .eq('status', 'accepted');

    if (quote.order_id) {
      existingAcceptedQuery = existingAcceptedQuery.eq('order_id', quote.order_id);
    } else if (quote.product_id) {
      existingAcceptedQuery = existingAcceptedQuery.eq('product_id', quote.product_id);
    }

    const { data: existingAccepted } = await existingAcceptedQuery.maybeSingle();

    if (existingAccepted) {
      throw new Error('This order or product already has an accepted quote');
    }

    // Accept this quote
    const { data: acceptedQuote, error: updateError } = await this.supabase
      .from('shipping_quotes')
      .update({ status: 'accepted' })
      .eq('id', quoteId)
      .select()
      .single();

    if (updateError) {
      throw new Error(`Failed to accept quote: ${updateError.message}`);
    }

    // Reject all other pending quotes for the same order or product
    // Use the correct discriminator so product quotes don't cross-contaminate
    if (quote.order_id) {
      await this.supabase
        .from('shipping_quotes')
        .update({ status: 'rejected' })
        .eq('order_id', quote.order_id)
        .eq('status', 'pending')
        .neq('id', quoteId);
    } else if (quote.product_id) {
      // For product quotes: seller accepted one provider — reject others on this product
      await this.supabase
        .from('shipping_quotes')
        .update({ status: 'rejected' })
        .eq('product_id', quote.product_id)
        .eq('status', 'pending')
        .neq('id', quoteId);
    }

    return acceptedQuote;
  }

  /**
   * Reject a quote
   * Can be called by buyer/vendor if they don't like the offer
   */
  async rejectQuote(quoteId: string, reason?: string): Promise<void> {
    const { error } = await this.supabase
      .from('shipping_quotes')
      .update({ status: 'rejected' })
      .eq('id', quoteId)
      .eq('status', 'pending');

    if (error) {
      throw new Error(`Failed to reject quote: ${error.message}`);
    }

    // In a real system, you might store the rejection reason
    // and notify the provider
  }

  /**
   * Expire old quotes (meant to be run as a cron job)
   * Marks pending quotes past their valid_until as expired
   */
  async expireOldQuotes(): Promise<number> {
    const now = new Date().toISOString();

    const { data, error } = await this.supabase
      .from('shipping_quotes')
      .update({ status: 'expired' })
      .eq('status', 'pending')
      .lt('valid_until', now)
      .select();

    if (error) {
      throw new Error(`Failed to expire quotes: ${error.message}`);
    }

    return data?.length || 0;
  }

  /**
   * Get quote by ID
   */
  async getQuote(quoteId: string): Promise<ShippingQuote> {
    const { data, error } = await this.supabase
      .from('shipping_quotes')
      .select('*')
      .eq('id', quoteId)
      .single();

    if (error) {
      throw new Error(`Quote not found: ${error.message}`);
    }

    return data;
  }

  /**
   * Get all quotes for a provider
   * Useful for provider dashboard
   */
  async getProviderQuotes(
    providerId: string,
    status?: 'pending' | 'accepted' | 'rejected' | 'expired'
  ): Promise<ShippingQuote[]> {
    let query = this.supabase
      .from('shipping_quotes')
      .select('*')
      .eq('provider_id', providerId);

    if (status) {
      query = query.eq('status', status);
    }

    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to get provider quotes: ${error.message}`);
    }

    return data || [];
  }
}