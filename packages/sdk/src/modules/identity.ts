/**
 * Identity Module (Layer 0)
 * Manage identities, reputation, and proofs
 */

import type { HttpClient } from '../client';
import type {
  Identity,
  IdentityType,
  PublicProfile,
  KYCData,
  NostrData,
  AnonymousData,
  Reputation,
  ReputationProof,
} from '../types';

// ============================================================================
// REQUEST/RESPONSE TYPES
// ============================================================================

export interface RegisterIdentityRequest {
  type: IdentityType;
  clientId: string;
  publicProfile: Omit<PublicProfile, 'verified'>;
  kycData?: KYCData;
  nostrData?: NostrData;
  anonymousData?: AnonymousData;
}

export interface RegisterIdentityResponse {
  did: string;
  token: string;              // ✅ RENAMED: Access token
  refreshToken: string | null; // ✅ NEW: Refresh token (null for anonymous)
  expiresIn: string;           // ✅ NEW: Token expiry duration (e.g., "1h", "24h")
  status: string;
  initialTrustScore: number;
  createdAt: string;
  identity: Identity;          // ✅ NEW: Full identity object
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface RefreshTokenResponse {
  token: string;      // New access token
  expiresIn: string;  // Expiry duration
}

export interface GenerateProofRequest {
  vendorDid: string;
  validityDays?: number;
}

// ============================================================================
// IDENTITY MODULE
// ============================================================================

export class IdentityModule {
  constructor(private readonly http: HttpClient) {}

  /**
   * Register a new identity
   * Public endpoint - no authentication required
   * 
   * @param request - Identity registration details
   * @returns Registered identity with DID and tokens
   * 
   * @example
   * const result = await sdk.identity.register({
   *   type: 'kyc',
   *   clientId: 'my-marketplace',
   *   publicProfile: {
   *     displayName: 'Acme Corp',
   *     country: 'US',
   *     businessType: 'manufacturer'
   *   },
   *   kycData: { ... }
   * });
   * 
   * // Store both tokens
   * localStorage.setItem('token', result.token);
   * if (result.refreshToken) {
   *   localStorage.setItem('refreshToken', result.refreshToken);
   * }
   */
  async register(request: RegisterIdentityRequest): Promise<RegisterIdentityResponse> {
    return this.http.post('/identity/register', request);
  }

  /**
   * Refresh access token using refresh token
   * Public endpoint - requires valid refresh token
   * ✅ NEW METHOD
   * 
   * @param refreshToken - Valid refresh token
   * @returns New access token
   * 
   * @example
   * const { token } = await sdk.identity.refresh({
   *   refreshToken: localStorage.getItem('refreshToken')
   * });
   * 
   * // Update stored token
   * localStorage.setItem('token', token);
   * sdk.setToken(token);
   */
  async refresh(request: RefreshTokenRequest): Promise<RefreshTokenResponse> {
    return this.http.post('/identity/refresh', request);
  }

  /**
   * Get identity by DID
   * Returns public info for all, more details if authenticated and viewing own profile
   * 
   * @param did - Decentralized identifier
   * @returns Identity details
   * 
   * @example
   * const identity = await sdk.identity.getByDid('did:rangkai:...');
   */
  async getByDid(did: string): Promise<Identity> {
    return this.http.get(`/identity/${did}`);
  }

  /**
   * Get reputation score for a vendor
   * Public endpoint
   * 
   * @param did - Vendor's DID
   * @returns Reputation metrics and score
   * 
   * @example
   * const reputation = await sdk.identity.getReputation('did:rangkai:...');
   * console.log(`Score: ${reputation.score}/500`);
   */
  async getReputation(did: string): Promise<Reputation> {
    return this.http.get(`/identity/${did}/reputation`);
  }

  /**
   * Verify identity (KYC)
   * Requires authentication and verification permissions
   * 
   * @param did - Identity to verify
   * @returns Verification status
   * 
   * @example
   * await sdk.identity.verify('did:rangkai:...');
   */
  async verify(did: string): Promise<{ message: string; did: string; status: string }> {
    return this.http.post(`/identity/${did}/verify`);
  }

  /**
   * Generate signed reputation proof
   * Requires authentication - can only generate for own identity
   * 
   * @param request - Proof generation request
   * @returns Cryptographically signed reputation proof
   * 
   * @example
   * const proof = await sdk.identity.generateProof({
   *   vendorDid: 'did:rangkai:...',
   *   validityDays: 30
   * });
   * 
   * // Share this proof with potential buyers
   * console.log(proof.signature);
   */
  async generateProof(request: GenerateProofRequest): Promise<ReputationProof> {
    return this.http.post(`/identity/${request.vendorDid}/proof`, {
      validityDays: request.validityDays,
    });
  }
}