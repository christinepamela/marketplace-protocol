// Layer 4: Trust & Compliance - Type Definitions
// Path: src/core/layer4-trust/types.ts

// ============================================================================
// DISPUTE TYPES
// ============================================================================

export type DisputeType = 
  | 'quality'
  | 'non_receipt'
  | 'logistics'
  | 'change_of_mind'
  | 'other';

export type DisputeStatus =
  | 'open'
  | 'awaiting_vendor'
  | 'awaiting_evidence'
  | 'under_review'
  | 'arbitration'
  | 'resolved'
  | 'closed';

export type DisputeResolution =
  | 'full_refund'
  | 'partial_refund'
  | 'no_refund'
  | 'vendor_wins';

export interface Dispute {
  id: string;
  dispute_number: string;
  order_id: string;
  buyer_did: string;
  vendor_did: string;
  dispute_type: DisputeType;
  description: string;
  evidence?: DisputeEvidence;
  vendor_response?: VendorResponse;
  status: DisputeStatus;
  resolution?: DisputeResolution;
  resolution_reason?: string;
  requires_arbitration: boolean;
  arbitrator_id?: string;
  arbitrator_decision?: Record<string, any>;
  opened_at: Date;
  vendor_response_due_at?: Date;
  resolved_at?: Date;
}

export interface DisputeEvidence {
  photo_urls?: string[];
  video_urls?: string[];
  tracking_number?: string;
  tracking_events?: any[];
  message_thread_id?: string;
  description_details?: string;
}

export interface VendorResponse {
  response_text: string;
  counter_evidence?: DisputeEvidence;
  proposed_resolution?: DisputeResolution;
  submitted_at: Date;
}

export interface CreateDisputeInput {
  order_id: string;
  buyer_did: string;
  dispute_type: DisputeType;
  description: string;
  evidence?: DisputeEvidence;
}

export interface SubmitVendorResponseInput {
  dispute_id: string;
  vendor_did: string;
  response_text: string;
  counter_evidence?: DisputeEvidence;
  proposed_resolution?: DisputeResolution;
}

// ============================================================================
// DISPUTE EVENT TYPES
// ============================================================================

export type DisputeEventType =
  | 'opened'
  | 'vendor_responded'
  | 'evidence_added'
  | 'escalated'
  | 'arbitrator_assigned'
  | 'decision_made'
  | 'resolved'
  | 'closed';

export interface DisputeEvent {
  id: string;
  dispute_id: string;
  event_type: DisputeEventType;
  actor_did: string;
  description?: string;
  metadata?: Record<string, any>;
  occurred_at: Date;
}

// ============================================================================
// RATING TYPES
// ============================================================================

export interface Rating {
  id: string;
  order_id: string;
  buyer_did: string;
  vendor_did: string;
  
  // Buyer rates vendor
  buyer_rating?: number; // 1-5
  buyer_comment?: string;
  buyer_categories?: RatingCategories;
  buyer_submitted_at?: Date;
  
  // Vendor rates buyer
  vendor_rating?: number; // 1-5
  vendor_comment?: string;
  vendor_categories?: RatingCategories;
  vendor_submitted_at?: Date;
  
  // Visibility
  revealed_at?: Date;
  
  // Metadata
  transaction_value_sats?: number;
  created_at: Date;
}

export interface RatingCategories {
  quality?: number; // 1-5
  delivery?: number; // 1-5
  communication?: number; // 1-5
  payment?: number; // 1-5 (for vendors rating buyers)
}

export interface SubmitRatingInput {
  order_id: string;
  rater_did: string;
  rater_type: 'buyer' | 'vendor';
  rating: number; // 1-5
  comment?: string;
  categories?: RatingCategories;
}

export interface RatingStats {
  total_ratings: number;
  average_rating: number;
  rating_distribution: {
    [key: number]: number; // { 1: 5, 2: 10, 3: 20, 4: 30, 5: 35 }
  };
  recent_ratings: Rating[];
}

// ============================================================================
// SANCTIONS TYPES
// ============================================================================

export type SanctionListSource = 'OFAC' | 'UN' | 'EU' | 'LOCAL';

export interface SanctionedEntity {
  id: string;
  entity_name: string;
  entity_type?: string;
  aliases?: string[];
  passport_numbers?: string[];
  national_ids?: string[];
  addresses?: string[];
  birth_date?: Date;
  list_source: SanctionListSource;
  program?: string;
  added_date: Date;
  active: boolean;
  removed_date?: Date;
  notes?: string;
  last_updated: Date;
}

export type SanctionCheckType = 'kyc_onboarding' | 'manual_review' | 'periodic';

export type SanctionAction = 'blocked' | 'flagged' | 'passed' | 'pending';

export interface SanctionCheck {
  id: string;
  identity_did: string;
  check_type: SanctionCheckType;
  match_found: boolean;
  matched_entity_id?: string;
  confidence_score?: number; // 0.00 to 1.00
  action: SanctionAction;
  reviewer_id?: string;
  checked_at: Date;
  reviewed_at?: Date;
}

export interface CheckSanctionsInput {
  identity_did: string;
  full_name: string;
  birth_date?: Date;
  national_id?: string;
  passport_number?: string;
  addresses?: string[];
  check_type: SanctionCheckType;
}

export interface SanctionCheckResult {
  match_found: boolean;
  matches: SanctionedEntity[];
  confidence_scores: number[];
  action: SanctionAction;
  check_id: string;
}

// ============================================================================
// TAX TYPES
// ============================================================================

export type TaxType = 'VAT' | 'GST' | 'sales_tax' | 'excise' | 'customs';

export interface TaxRate {
  id: string;
  country_code: string;
  region?: string;
  tax_type: TaxType;
  rate: number; // Percentage
  product_categories?: string[];
  threshold_amount?: number;
  effective_from: Date;
  effective_until?: Date;
  active: boolean;
  description?: string;
  source_url?: string;
  last_updated: Date;
  updated_by?: string;
}

export interface TaxCalculation {
  subtotal: number;
  tax_amount: number;
  total: number;
  applicable_rates: TaxRate[];
  breakdown: {
    tax_type: TaxType;
    rate: number;
    amount: number;
  }[];
}

export interface GetTaxRatesInput {
  country_code: string;
  region?: string;
  product_category?: string;
  transaction_amount?: number;
}

// ============================================================================
// ARBITRATOR TYPES
// ============================================================================

export interface Arbitrator {
  id: string;
  identity_did: string;
  arbitrator_id: string;
  public_key?: string;
  reputation_score?: number;
  total_cases_handled: number;
  successful_resolutions: number;
  active: boolean;
  languages?: string[];
  specializations?: string[];
  kyc_verified: boolean;
  verified_at?: Date;
  registered_at: Date;
  last_active_at?: Date;
}

export interface RegisterArbitratorInput {
  identity_did: string;
  arbitrator_id: string;
  public_key?: string;
  languages?: string[];
  specializations?: string[];
}

export interface ArbitratorAssignment {
  dispute_id: string;
  arbitrator_id: string;
  assigned_at: Date;
  deadline?: Date;
}

export interface ArbitratorDecision {
  dispute_id: string;
  arbitrator_id: string;
  resolution: DisputeResolution;
  reasoning: string;
  evidence_reviewed: string[];
  decided_at: Date;
}

// ============================================================================
// AUTOMATED RESOLUTION TYPES
// ============================================================================

export interface AutoResolutionResult {
  can_auto_resolve: boolean;
  resolution?: DisputeResolution;
  confidence: number; // 0.00 to 1.00
  reasoning: string;
  evidence_analyzed: string[];
}

export interface DisputeRules {
  // Non-receipt rules
  non_receipt_auto_refund_days: number; // Days without tracking = auto refund
  
  // Quality rules
  quality_photo_required: boolean;
  quality_video_weight: number; // How much video evidence matters
  
  // Logistics rules
  courier_fault_auto_refund: boolean;
  
  // General rules
  vendor_response_window_hours: number;
  auto_escalate_after_hours: number;
}

// ============================================================================
// STATISTICS TYPES
// ============================================================================

export interface DisputeStats {
  total_disputes: number;
  open_disputes: number;
  resolved_disputes: number;
  auto_resolved_count: number;
  arbitration_count: number;
  resolution_breakdown: {
    full_refund: number;
    partial_refund: number;
    no_refund: number;
    vendor_wins: number;
  };
  average_resolution_time_hours: number;
  top_dispute_reasons: {
    type: DisputeType;
    count: number;
  }[];
}

export interface ComplianceStats {
  total_sanctions_checks: number;
  matches_found: number;
  blocked_identities: number;
  flagged_for_review: number;
  last_list_update: Date;
}

// ============================================================================
// HELPER TYPES
// ============================================================================

export interface DisputeWithDetails extends Dispute {
  order: any; // Order object from Layer 2
  events: DisputeEvent[];
  arbitrator?: Arbitrator;
}

export interface RatingWithIdentities extends Rating {
  buyer_name?: string;
  vendor_name?: string;
}