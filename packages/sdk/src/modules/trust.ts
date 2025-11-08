/**
 * Trust Module (Layer 4)
 * Disputes, ratings, and compliance
 */

import type { HttpClient } from '../client';
import type {
  Dispute,
  DisputeType,
  DisputeEvidence,
  DisputeResolution,
  Rating,
  RatingCategories,
  RatingStats,
} from '../types';

// ============================================================================
// REQUEST/RESPONSE TYPES
// ============================================================================

export interface CreateDisputeRequest {
  order_id: string;
  dispute_type: DisputeType;
  description: string;
  evidence?: DisputeEvidence;
}

export interface SubmitVendorResponseRequest {
  response_text: string;
  counter_evidence?: DisputeEvidence;
  proposed_resolution?: DisputeResolution;
}

export interface SubmitRatingRequest {
  order_id: string;
  rating: number;
  comment?: string;
  categories?: RatingCategories;
}

// ============================================================================
// TRUST MODULE
// ============================================================================

export class TrustModule {
  constructor(private readonly http: HttpClient) {}

  // =========================================================================
  // DISPUTES
  // =========================================================================

  /**
   * Open a dispute
   * Requires authentication (buyer)
   * 
   * @param request - Dispute details
   * @returns Dispute ID and number
   * 
   * @example
   * const dispute = await sdk.trust.openDispute({
   *   order_id: 'order-uuid',
   *   dispute_type: 'quality',
   *   description: 'Product does not match description',
   *   evidence: {
   *     photo_urls: ['https://...'],
   *     description_details: '...'
   *   }
   * });
   */
  async openDispute(request: CreateDisputeRequest): Promise<{
    disputeId: string;
    disputeNumber: string;
    status: string;
  }> {
    return this.http.post('/disputes', request);
  }

  /**
   * Get dispute by ID
   * Requires authentication (buyer, vendor, or arbitrator)
   * 
   * @param disputeId - Dispute UUID
   * @returns Dispute details
   */
  async getDispute(disputeId: string): Promise<Dispute> {
    return this.http.get(`/disputes/${disputeId}`);
  }

  /**
   * Get disputes by order
   * Requires authentication (buyer or vendor)
   * 
   * @param orderId - Order UUID
   * @returns List of disputes
   */
  async getDisputesByOrder(orderId: string): Promise<Dispute[]> {
    return this.http.get(`/disputes/order/${orderId}`);
  }

  /**
   * Submit vendor response to dispute
   * Requires authentication (vendor)
   * 
   * @param disputeId - Dispute UUID
   * @param response - Vendor's response
   * @returns Response confirmation
   * 
   * @example
   * await sdk.trust.submitVendorResponse('dispute-uuid', {
   *   response_text: 'We shipped the correct product',
   *   counter_evidence: {
   *     photo_urls: ['https://...'],
   *     tracking_number: '1Z999AA10123456784'
   *   },
   *   proposed_resolution: 'no_refund'
   * });
   */
  async submitVendorResponse(
    disputeId: string,
    response: SubmitVendorResponseRequest
  ): Promise<{ message: string }> {
    return this.http.post(`/disputes/${disputeId}/vendor-response`, response);
  }

  /**
   * Resolve dispute
   * Requires authentication (arbitrator or system)
   * 
   * @param disputeId - Dispute UUID
   * @param resolution - Resolution decision
   * @param reason - Reason for resolution
   * @returns Resolution confirmation
   * 
   * @example
   * await sdk.trust.resolveDispute('dispute-uuid', 'partial_refund', 'Both parties at fault');
   */
  async resolveDispute(
    disputeId: string,
    resolution: DisputeResolution,
    reason: string
  ): Promise<{ message: string; resolution: DisputeResolution }> {
    return this.http.post(`/disputes/${disputeId}/resolve`, {
      resolution,
      reason,
    });
  }

  // =========================================================================
  // RATINGS
  // =========================================================================

  /**
   * Submit rating for an order
   * Requires authentication (buyer or vendor)
   * 
   * @param request - Rating details
   * @returns Rating ID
   * 
   * @example
   * // Buyer rates vendor
   * const rating = await sdk.trust.submitRating({
   *   order_id: 'order-uuid',
   *   rating: 5,
   *   comment: 'Excellent quality and fast shipping!',
   *   categories: {
   *     quality: 5,
   *     delivery: 5,
   *     communication: 5
   *   }
   * });
   */
  async submitRating(request: SubmitRatingRequest): Promise<{
    ratingId: string;
    message: string;
  }> {
    return this.http.post('/ratings', request);
  }

  /**
   * Get rating by order ID
   * Public endpoint (after ratings are revealed)
   * 
   * @param orderId - Order UUID
   * @returns Rating details
   */
  async getRatingByOrder(orderId: string): Promise<Rating> {
    return this.http.get(`/ratings/order/${orderId}`);
  }

  /**
   * Get ratings for a vendor
   * Public endpoint
   * 
   * @param vendorDid - Vendor's DID
   * @param options - Pagination options
   * @returns List of ratings
   * 
   * @example
   * const ratings = await sdk.trust.getRatingsForVendor('did:rangkai:...', {
   *   limit: 20,
   *   offset: 0
   * });
   */
  async getRatingsForVendor(
    vendorDid: string,
    options?: { limit?: number; offset?: number }
  ): Promise<Rating[]> {
    return this.http.get(`/ratings/vendor/${vendorDid}`, options);
  }

  /**
   * Get rating statistics for a vendor
   * Public endpoint
   * 
   * @param vendorDid - Vendor's DID
   * @returns Rating stats and distribution
   * 
   * @example
   * const stats = await sdk.trust.getVendorRatingStats('did:rangkai:...');
   * console.log(`Average: ${stats.average_rating}/5 (${stats.total_ratings} ratings)`);
   */
  async getVendorRatingStats(vendorDid: string): Promise<RatingStats> {
    return this.http.get(`/ratings/vendor/${vendorDid}/stats`);
  }

  /**
   * Reveal rating
   * Requires authentication (system auto-reveal after 7 days)
   * 
   * @param ratingId - Rating UUID
   * @returns Reveal confirmation
   */
  async revealRating(ratingId: string): Promise<{ message: string }> {
    return this.http.post(`/ratings/${ratingId}/reveal`);
  }
}