// Layer 4: Trust & Compliance - Rating Service
// Path: src/core/layer4-trust/rating.service.ts

import { SupabaseClient } from '@supabase/supabase-js';
import {
  Rating,
  SubmitRatingInput,
  RatingStats,
} from './types';

export class RatingService {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Submit a rating after order completion
   * Can only rate after escrow release or refund
   */
  async submitRating(input: SubmitRatingInput): Promise<Rating> {
    // Verify order exists and is completed/refunded
    const { data: order, error: orderError } = await this.supabase
      .from('orders')
      .select('*')
      .eq('id', input.order_id)
      .single();

    if (orderError || !order) {
      throw new Error('Order not found');
    }

    if (order.status !== 'completed' && order.status !== 'refunded') {
      throw new Error('Can only rate completed or refunded orders');
    }

    // Verify rater is participant
    if (input.rater_type === 'buyer' && order.buyer_did !== input.rater_did) {
      throw new Error('Only the buyer can submit buyer rating');
    }

    if (input.rater_type === 'vendor' && order.vendor_did !== input.rater_did) {
      throw new Error('Only the vendor can submit vendor rating');
    }

    // Validate rating value
    if (input.rating < 1 || input.rating > 5) {
      throw new Error('Rating must be between 1 and 5');
    }

    // Get or create rating record
    let { data: rating } = await this.supabase
      .from('ratings')
      .select('*')
      .eq('order_id', input.order_id)
      .single();

    const now = new Date().toISOString();

    if (!rating) {
      // Create new rating record
      const { data: newRating, error: createError } = await this.supabase
        .from('ratings')
        .insert({
          order_id: input.order_id,
          buyer_did: order.buyer_did,
          vendor_did: order.vendor_did,
          transaction_value_sats: order.total?.amount ? Math.round(order.total.amount) : 0,
        })
        .select()
        .single();

      if (createError) {
        throw new Error(`Failed to create rating: ${createError.message}`);
      }

      rating = newRating;
    }

    // Check if already rated
    if (input.rater_type === 'buyer' && rating.buyer_rating) {
      throw new Error('Buyer has already rated this order');
    }

    if (input.rater_type === 'vendor' && rating.vendor_rating) {
      throw new Error('Vendor has already rated this order');
    }

    // Update with new rating
    const updateData: any = {};

    if (input.rater_type === 'buyer') {
      updateData.buyer_rating = input.rating;
      updateData.buyer_comment = input.comment;
      updateData.buyer_categories = input.categories;
      updateData.buyer_submitted_at = now;
    } else {
      updateData.vendor_rating = input.rating;
      updateData.vendor_comment = input.comment;
      updateData.vendor_categories = input.categories;
      updateData.vendor_submitted_at = now;
    }

    // Check if both have rated or 7 days passed
    const shouldReveal = this.shouldRevealRatings(rating, input.rater_type);
    if (shouldReveal && !rating.revealed_at) {
      updateData.revealed_at = now;
    }

    const { data: updated, error: updateError } = await this.supabase
      .from('ratings')
      .update(updateData)
      .eq('id', rating.id)
      .select()
      .single();

    if (updateError) {
      throw new Error(`Failed to update rating: ${updateError.message}`);
    }

    // Update reputation score in Layer 0
    await this.updateReputationFromRating(input.rater_type === 'buyer' ? order.vendor_did : order.buyer_did, input.rating);

    return updated;
  }

  /**
   * Get rating for an order
   */
  async getRatingByOrder(orderId: string): Promise<Rating | null> {
    const { data, error } = await this.supabase
      .from('ratings')
      .select('*')
      .eq('order_id', orderId)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed to get rating: ${error.message}`);
    }

    return data || null;
  }

  /**
   * Get all ratings for a user (as buyer or vendor)
   */
  async getRatingsForUser(
    userDid: string,
    role: 'buyer' | 'vendor'
  ): Promise<Rating[]> {
    const column = role === 'buyer' ? 'buyer_did' : 'vendor_did';

    const { data, error } = await this.supabase
      .from('ratings')
      .select('*')
      .eq(column, userDid)
      .not('revealed_at', 'is', null) // Only show revealed ratings
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to get ratings: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get rating statistics for a user
   */
  async getRatingStats(
    userDid: string,
    role: 'buyer' | 'vendor'
  ): Promise<RatingStats> {
    const ratings = await this.getRatingsForUser(userDid, role);

    // Extract relevant rating values
    const ratingValues = ratings
      .map(r => role === 'vendor' ? r.buyer_rating : r.vendor_rating)
      .filter(r => r !== null && r !== undefined) as number[];

    const total = ratingValues.length;
    const sum = ratingValues.reduce((acc, val) => acc + val, 0);
    const average = total > 0 ? sum / total : 0;

    // Calculate distribution
    const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    ratingValues.forEach(rating => {
      distribution[rating] = (distribution[rating] || 0) + 1;
    });

    // Get recent ratings
    const recent = ratings.slice(0, 10);

    return {
      total_ratings: total,
      average_rating: Number(average.toFixed(2)),
      rating_distribution: distribution,
      recent_ratings: recent,
    };
  }

  /**
   * Auto-reveal ratings after 7 days if only one party rated
   */
  async autoRevealExpiredRatings(): Promise<number> {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Find ratings where one party submitted but not revealed
    const { data, error } = await this.supabase
      .from('ratings')
      .update({ revealed_at: new Date().toISOString() })
      .is('revealed_at', null)
      .or(`buyer_submitted_at.lt.${sevenDaysAgo.toISOString()},vendor_submitted_at.lt.${sevenDaysAgo.toISOString()}`)
      .select();

    if (error) {
      throw new Error(`Failed to auto-reveal ratings: ${error.message}`);
    }

    return data?.length || 0;
  }

  /**
   * Private: Check if ratings should be revealed
   */
  private shouldRevealRatings(
    rating: Rating,
    justSubmittedBy: 'buyer' | 'vendor'
  ): boolean {
    // Both have rated
    if (justSubmittedBy === 'buyer' && rating.vendor_rating) {
      return true;
    }

    if (justSubmittedBy === 'vendor' && rating.buyer_rating) {
      return true;
    }

    // Check if 7 days passed since first rating
    const firstSubmission = rating.buyer_submitted_at || rating.vendor_submitted_at;
    if (firstSubmission) {
      const daysSince = (Date.now() - new Date(firstSubmission).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSince >= 7) {
        return true;
      }
    }

    return false;
  }

  /**
   * Private: Update reputation score based on rating
   */
  private async updateReputationFromRating(
    userDid: string,
    rating: number
  ): Promise<void> {
    // Get current reputation
    const { data: reputation } = await this.supabase
      .from('reputations')
      .select('*')
      .eq('did', userDid)
      .single();

    if (!reputation) {
      return; // User doesn't have reputation record yet
    }

    // Calculate impact on reputation score
    // Low ratings (< 3.0) reduce score more significantly
    let scoreChange = 0;
    if (rating >= 4) {
      scoreChange = 1; // Small positive impact
    } else if (rating === 3) {
      scoreChange = 0; // Neutral
    } else {
      scoreChange = -2; // Negative impact
    }

    const newScore = Math.max(0, Math.min(100, reputation.score + scoreChange));

    await this.supabase
      .from('reputations')
      .update({
        score: newScore,
        metrics: {
          ...reputation.metrics,
          average_rating: await this.calculateAverageRating(userDid),
        },
      })
      .eq('did', userDid);
  }

  /**
   * Private: Calculate average rating for user
   */
  private async calculateAverageRating(userDid: string): Promise<number> {
    // Get as vendor
    const vendorRatings = await this.getRatingsForUser(userDid, 'vendor');
    const vendorValues = vendorRatings
      .map(r => r.buyer_rating)
      .filter(r => r !== null && r !== undefined) as number[];

    // Get as buyer
    const buyerRatings = await this.getRatingsForUser(userDid, 'buyer');
    const buyerValues = buyerRatings
      .map(r => r.vendor_rating)
      .filter(r => r !== null && r !== undefined) as number[];

    const allRatings = [...vendorValues, ...buyerValues];
    const sum = allRatings.reduce((acc, val) => acc + val, 0);
    const average = allRatings.length > 0 ? sum / allRatings.length : 0;

    return Number(average.toFixed(2));
  }
}