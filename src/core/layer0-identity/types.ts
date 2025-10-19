/**
 * Layer 0: Identity & Reputation
 * Core type definitions for the Rangkai Protocol
 */

// ============================================================================
// IDENTITY TYPES
// ============================================================================

/**
 * Identity verification types supported by the protocol
 */
export type IdentityType = 'kyc' | 'nostr' | 'anonymous';

/**
 * Identity verification status
 */
export type VerificationStatus = 'pending' | 'verified' | 'rejected' | 'suspended' | 'banned' | 'inactive';

/**
 * Business type classification
 */
export type BusinessType = 'manufacturer' | 'artisan' | 'trader' | 'buyer';

/**
 * KYC data structure (stored at client level, not in protocol core)
 */
export interface KYCData {
  businessName: string;
  registrationNumber: string;
  country: string;
  ownerName: string;
  businessAddress: string;
  phoneNumber: string;
  email: string;
  
  // Optional fields for flexibility
  website?: string;
  socialMedia?: {
    platform: string;
    url: string;
  }[];
  taxId?: string;
  
  // Document references (IPFS hash or encrypted URLs)
  documents: {
    businessRegistration: string;
    identityProof: string;
    addressProof: string;
  };
}

/**
 * Nostr-based identity data
 */
export interface NostrData {
  pubkey: string; // Nostr public key
  displayName?: string;
  country?: string;
  
  // Reputation seed or historical transaction hash to prevent Sybil attacks
  reputationSeed?: string;
  transactionHistoryHash?: string;
}

/**
 * Anonymous identity metadata
 */
export interface AnonymousData {
  // Daily transaction limits
  dailyLimit?: number;
  
  // Escrow premium (higher percentage held longer)
  escrowPremium?: number;
  
  // Minimum account age before high-value transactions
  minimumAccountAge?: number; // days
}

/**
 * Contact information (optional, client-controlled)
 */
export interface ContactInfo {
  email?: string;
  phone?: string;
  telegram?: string;
  encrypted: boolean; // Whether contact info is encrypted
}

/**
 * Public profile (visible to all)
 */
export interface PublicProfile {
  displayName: string;
  country?: string;
  businessType: BusinessType;
  verified: boolean;
  avatarUrl?: string;
  bio?: string;
}

/**
 * Core identity interface
 */
export interface Identity {
  did: string; // Format: did:rangkai:{uuid}
  type: IdentityType;
  clientId: string; // Which marketplace registered this identity
  verificationStatus: VerificationStatus;
  createdAt: Date;
  updatedAt: Date;
  
  // Public profile (visible to all)
  publicProfile: PublicProfile;
  
  // Contact info (optional, client-controlled, not exposed globally)
  contactInfo?: ContactInfo;
  
  // Type-specific metadata
  metadata: {
    kyc?: Partial<KYCData>; // Only store refs, not full docs
    nostr?: NostrData;
    anonymous?: AnonymousData;
  };
}

/**
 * Initial trust score based on identity type
 */
export const DEFAULT_TRUST_SCORES: Record<IdentityType, number> = {
  kyc: 75,      // 50-100 range depending on verification depth
  nostr: 35,    // 20-50 range
  anonymous: 20 // 10-30 range
};

// ============================================================================
// REPUTATION TYPES
// ============================================================================

/**
 * Reputation event types
 */
export type ReputationEventType = 'rating' | 'dispute' | 'milestone' | 'verification';

/**
 * Dispute severity levels
 */
export type DisputeSeverity = 'minor' | 'major';

/**
 * Reputation metrics
 */
export interface ReputationMetrics {
  transactionsCompleted: number;
  totalTransactionValue: number; // In USD equivalent
  averageRating: number; // 0-5
  totalRatings: number;
  onTimeDeliveryRate: number; // 0-1
  responseTimeAvg: number; // hours
  disputesTotal: number;
  disputesWon: number;
  disputesLost: number;
  minorDisputes: number;
  majorDisputes: number;
  
  // Verification multiplier (stored for transparency)
  verificationMultiplier: number;
  
  // Client-specific reputation modifiers (optional)
  clientModifiers?: Record<string, number>;
}

/**
 * Individual reputation event
 */
export interface ReputationEvent {
  eventId: string;
  transactionId: string;
  type: ReputationEventType;
  timestamp: Date;
  
  // Rating details (if type === 'rating')
  rating?: number; // 1-5
  deliveredOnTime?: boolean;
  buyerDid?: string;
  comment?: string;
  
  // Dispute details (if type === 'dispute')
  disputeSeverity?: DisputeSeverity;
  disputeResolution?: 'vendor_won' | 'buyer_won' | 'partial';
  
  // Logistics details (optional)
  logisticsProviderDid?: string;
  
  // Protocol version for this event
  protocolVersion: string; // e.g., "1.0.0"
  schemaVersion: number;   // e.g., 1
}

/**
 * Reputation score calculation result
 */
export interface ReputationScore {
  score: number; // 0-500
  breakdown: {
    baseScore: number;
    transactionBonus: number;
    ratingBonus: number;
    disputePenalty: number;
    verificationMultiplier: number;
  };
}

/**
 * Complete reputation data
 */
export interface Reputation {
  vendorDid: string;
  score: number; // 0-500
  metrics: ReputationMetrics;
  history: ReputationEvent[];
  lastUpdated: Date;
  
  // Merkle root of recent events (for efficient verification)
  recentEventsHash?: string;
}

/**
 * Signed reputation proof (for portability across clients)
 */
export interface ReputationProof {
  vendorDid: string;
  score: number;
  transactionsCompleted: number;
  averageRating: number;
  generatedAt: Date;
  validUntil: Date; // Proofs expire after 30 days
  
  // Version control
  proofVersion: number; // e.g., 1
  protocolVersion: string; // e.g., "1.0.0"
  
  // Merkle root for optional full history verification
  eventsHash?: string;
  
  // Cryptographic signature (signed by protocol)
  signature: string;
}

// ============================================================================
// REPUTATION CALCULATION
// ============================================================================

/**
 * Reputation calculation parameters
 */
export interface ReputationCalculationParams {
  baseScore: number;
  transactionMultiplier: number;
  transactionCap: number;
  ratingMultiplier: number;
  minorDisputePenalty: number;
  majorDisputePenalty: number;
  verificationMultipliers: Record<IdentityType, number>;
  maxScore: number;
}

/**
 * Default reputation calculation parameters
 */
export const DEFAULT_REPUTATION_PARAMS: ReputationCalculationParams = {
  baseScore: 50,
  transactionMultiplier: 2,
  transactionCap: 200,
  ratingMultiplier: 20,
  minorDisputePenalty: 25,
  majorDisputePenalty: 50,
  verificationMultipliers: {
    kyc: 1.2,
    nostr: 1.0,
    anonymous: 0.8
  },
  maxScore: 500
};

/**
 * Calculate reputation score
 * 
 * Formula:
 * Score = (Base + TransactionBonus + RatingBonus - DisputePenalty) × VerificationMultiplier
 * 
 * Where:
 * - Base = 50 (everyone starts here)
 * - TransactionBonus = min(completed_transactions × 2, 200)
 * - RatingBonus = average_rating × 20 (max 100 for 5-star)
 * - DisputePenalty = (minor_disputes × 25 + major_disputes × 50)
 * - VerificationMultiplier:
 *   - KYC: 1.2
 *   - Nostr: 1.0
 *   - Anonymous: 0.8
 * - MaxScore: 500
 */
export function calculateReputationScore(
  metrics: ReputationMetrics,
  identityType: IdentityType,
  params: ReputationCalculationParams = DEFAULT_REPUTATION_PARAMS
): ReputationScore {
  const { baseScore, transactionMultiplier, transactionCap, ratingMultiplier, 
          minorDisputePenalty, majorDisputePenalty, verificationMultipliers, maxScore } = params;
  
  // Calculate components
  const transactionBonus = Math.min(
    metrics.transactionsCompleted * transactionMultiplier,
    transactionCap
  );
  
  const ratingBonus = metrics.averageRating * ratingMultiplier;
  
  const disputePenalty = 
    (metrics.minorDisputes * minorDisputePenalty) +
    (metrics.majorDisputes * majorDisputePenalty);
  
  const verificationMultiplier = verificationMultipliers[identityType];
  
  // Calculate final score
  const rawScore = (baseScore + transactionBonus + ratingBonus - disputePenalty) * verificationMultiplier;
  const finalScore = Math.max(0, Math.min(rawScore, maxScore)); // Clamp to [0, maxScore]
  
  return {
    score: Math.round(finalScore),
    breakdown: {
      baseScore,
      transactionBonus,
      ratingBonus,
      disputePenalty,
      verificationMultiplier
    }
  };
}

// ============================================================================
// API REQUEST/RESPONSE TYPES
// ============================================================================

/**
 * Identity registration request
 */
export interface RegisterIdentityRequest {
  type: IdentityType;
  clientId: string;
  publicProfile: Omit<PublicProfile, 'verified'>;
  
  // Type-specific data
  kycData?: KYCData;
  nostrData?: NostrData;
  anonymousData?: AnonymousData;
}

/**
 * Identity registration response
 */
export interface RegisterIdentityResponse {
  did: string;
  status: VerificationStatus;
  initialTrustScore: number;
  createdAt: Date;
}

/**
 * Identity verification request
 */
export interface VerifyIdentityRequest {
  did: string;
  verificationStatus: 'verified' | 'rejected';
  verifiedBy: string; // Operator or client ID
  notes?: string;
}

/**
 * Reputation update request
 */
export interface UpdateReputationRequest {
  transactionId: string;
  rating: number; // 1-5
  deliveryOnTime: boolean;
  buyerDid: string;
  comment?: string;
  logisticsProviderDid?: string;
}

/**
 * Reputation proof generation request
 */
export interface GenerateProofRequest {
  vendorDid: string;
  validityDays?: number; // Default: 30
}

