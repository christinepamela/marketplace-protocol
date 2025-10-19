/**
 * Identity Service
 * Handles identity registration, verification, and management
 */

import { v4 as uuidv4 } from 'uuid';
import type {
  Identity,
  IdentityType,
  VerificationStatus,
  RegisterIdentityRequest,
  RegisterIdentityResponse,
  VerifyIdentityRequest,
  KYCData,
  NostrData,
  AnonymousData
} from './types';

// Import the value separately (not as a type)
import { DEFAULT_TRUST_SCORES } from './types';

export class IdentityService {
  private dbClient: any; // Will be replaced with actual Supabase client
  
  constructor(dbClient: any) {
    this.dbClient = dbClient;
  }

  /**
   * Register a new identity
   */
  async registerIdentity(
    request: RegisterIdentityRequest
  ): Promise<RegisterIdentityResponse> {
    // Generate DID
    const did = this.generateDID();
    
    // Determine initial verification status
    const initialStatus = this.getInitialVerificationStatus(request.type);
    
    // Get initial trust score based on identity type
    const initialTrustScore = DEFAULT_TRUST_SCORES[request.type];
    
    // Build identity object
    const identity: Identity = {
      did,
      type: request.type,
      clientId: request.clientId,
      verificationStatus: initialStatus,
      createdAt: new Date(),
      updatedAt: new Date(),
      publicProfile: {
        ...request.publicProfile,
        verified: false
      },
      metadata: this.buildMetadata(request)
    };
    
    // Store in database
    await this.storeIdentity(identity);
    
    // Initialize reputation record
    await this.initializeReputation(did, initialTrustScore);
    
    return {
      did,
      status: initialStatus,
      initialTrustScore,
      createdAt: identity.createdAt
    };
  }

  /**
   * Verify an identity (KYC approval/rejection)
   */
  async verifyIdentity(request: VerifyIdentityRequest): Promise<void> {
    const { did, verificationStatus, verifiedBy, notes } = request;
    
    // Fetch existing identity
    const identity = await this.getIdentityByDID(did);
    if (!identity) {
      throw new Error(`Identity not found: ${did}`);
    }
    
    // Update verification status
    identity.verificationStatus = verificationStatus;
    identity.publicProfile.verified = verificationStatus === 'verified';
    identity.updatedAt = new Date();
    
    // Store verification record
    await this.storeVerificationRecord({
      did,
      status: verificationStatus,
      verifiedBy,
      notes,
      timestamp: new Date()
    });
    
    // Update identity in database
    await this.updateIdentity(identity);
    
    // If verified, boost initial trust score
    if (verificationStatus === 'verified') {
      await this.boostInitialTrustScore(did, identity.type);
    }
  }

  /**
   * Get identity by DID
   */
  async getIdentityByDID(did: string): Promise<Identity | null> {
    const { data, error } = await this.dbClient
      .from('identities')
      .select('*')
      .eq('did', did)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw error;
    }
    
    return this.mapDatabaseToIdentity(data);
  }

  /**
   * Update identity profile
   */
  async updateProfile(
    did: string,
    updates: Partial<Identity['publicProfile']>
  ): Promise<void> {
    const identity = await this.getIdentityByDID(did);
    if (!identity) {
      throw new Error(`Identity not found: ${did}`);
    }
    
    identity.publicProfile = {
      ...identity.publicProfile,
      ...updates
    };
    identity.updatedAt = new Date();
    
    await this.updateIdentity(identity);
  }

  /**
   * Suspend or ban an identity
   */
  async setIdentityStatus(
    did: string,
    status: VerificationStatus,
    reason?: string
  ): Promise<void> {
    const identity = await this.getIdentityByDID(did);
    if (!identity) {
      throw new Error(`Identity not found: ${did}`);
    }
    
    identity.verificationStatus = status;
    identity.updatedAt = new Date();
    
    await this.updateIdentity(identity);
    
    // Log status change
    await this.logStatusChange(did, status, reason);
  }

  /**
   * Check if identity can transact
   */
  async canTransact(did: string): Promise<boolean> {
    const identity = await this.getIdentityByDID(did);
    if (!identity) return false;
    
    const allowedStatuses: VerificationStatus[] = ['pending', 'verified'];
    return allowedStatuses.includes(identity.verificationStatus);
  }

  /**
   * Get identities by client
   */
  async getIdentitiesByClient(
    clientId: string,
    filters?: {
      type?: IdentityType;
      status?: VerificationStatus;
      limit?: number;
      offset?: number;
    }
  ): Promise<Identity[]> {
    let query = this.dbClient
      .from('identities')
      .select('*')
      .eq('client_id', clientId);
    
    if (filters?.type) {
      query = query.eq('type', filters.type);
    }
    
    if (filters?.status) {
      query = query.eq('verification_status', filters.status);
    }
    
    if (filters?.limit) {
      query = query.limit(filters.limit);
    }
    
    if (filters?.offset) {
      query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1);
    }
    
    const { data, error } = await query;
    if (error) throw error;
    
    return data.map(this.mapDatabaseToIdentity);
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  /**
   * Generate a unique DID
   */
  private generateDID(): string {
    return `did:rangkai:${uuidv4()}`;
  }

  /**
   * Determine initial verification status based on identity type
   */
  private getInitialVerificationStatus(type: IdentityType): VerificationStatus {
    switch (type) {
      case 'kyc':
        return 'pending'; // Requires manual verification
      case 'nostr':
        return 'verified'; // Nostr keys are self-verified
      case 'anonymous':
        return 'verified'; // No verification needed
      default:
        return 'pending';
    }
  }

  /**
   * Build metadata object based on identity type
   */
  private buildMetadata(request: RegisterIdentityRequest) {
    const metadata: Identity['metadata'] = {};
    
    if (request.type === 'kyc' && request.kycData) {
      // Store only references, not full documents
      metadata.kyc = {
        businessName: request.kycData.businessName,
        registrationNumber: request.kycData.registrationNumber,
        country: request.kycData.country,
        email: request.kycData.email,
        phoneNumber: request.kycData.phoneNumber,
        website: request.kycData.website,
        taxId: request.kycData.taxId,
        documents: request.kycData.documents // IPFS hashes or encrypted URLs
      };
    }
    
    if (request.type === 'nostr' && request.nostrData) {
      metadata.nostr = request.nostrData;
    }
    
    if (request.type === 'anonymous' && request.anonymousData) {
      metadata.anonymous = request.anonymousData;
    }
    
    return metadata;
  }

  /**
   * Store identity in database
   */
  private async storeIdentity(identity: Identity): Promise<void> {
    const { error } = await this.dbClient
      .from('identities')
      .insert({
        did: identity.did,
        type: identity.type,
        client_id: identity.clientId,
        verification_status: identity.verificationStatus,
        public_profile: identity.publicProfile,
        contact_info: identity.contactInfo,
        metadata: identity.metadata,
        created_at: identity.createdAt,
        updated_at: identity.updatedAt
      });
    
    if (error) throw error;
  }

  /**
   * Update identity in database
   */
  private async updateIdentity(identity: Identity): Promise<void> {
    const { error } = await this.dbClient
      .from('identities')
      .update({
        verification_status: identity.verificationStatus,
        public_profile: identity.publicProfile,
        contact_info: identity.contactInfo,
        metadata: identity.metadata,
        updated_at: identity.updatedAt
      })
      .eq('did', identity.did);
    
    if (error) throw error;
  }

  /**
   * Initialize reputation record for new identity
   */
  private async initializeReputation(did: string, initialScore: number): Promise<void> {
    const { error } = await this.dbClient
      .from('reputations')
      .insert({
        vendor_did: did,
        score: initialScore,
        metrics: {
          transactionsCompleted: 0,
          totalTransactionValue: 0,
          averageRating: 0,
          totalRatings: 0,
          onTimeDeliveryRate: 0,
          responseTimeAvg: 0,
          disputesTotal: 0,
          disputesWon: 0,
          disputesLost: 0,
          minorDisputes: 0,
          majorDisputes: 0,
          verificationMultiplier: 1.0
        },
        history: [],
        last_updated: new Date()
      });
    
    if (error) throw error;
  }

  /**
   * Boost trust score upon verification
   */
  private async boostInitialTrustScore(did: string, type: IdentityType): Promise<void> {
    // KYC verified identities get a boost to their initial score
    if (type === 'kyc') {
      const boostAmount = 25; // Boost from 75 to 100
      
      await this.dbClient.rpc('boost_reputation_score', {
        p_vendor_did: did,
        p_boost_amount: boostAmount
      });
    }
  }

  /**
   * Store verification record for audit trail
   */
  private async storeVerificationRecord(record: {
    did: string;
    status: VerificationStatus;
    verifiedBy: string;
    notes?: string;
    timestamp: Date;
  }): Promise<void> {
    const { error } = await this.dbClient
      .from('verification_records')
      .insert({
        did: record.did,
        status: record.status,
        verified_by: record.verifiedBy,
        notes: record.notes,
        timestamp: record.timestamp
      });
    
    if (error) throw error;
  }

  /**
   * Log status change for audit trail
   */
  private async logStatusChange(
    did: string,
    status: VerificationStatus,
    reason?: string
  ): Promise<void> {
    const { error } = await this.dbClient
      .from('identity_status_log')
      .insert({
        did,
        status,
        reason,
        timestamp: new Date()
      });
    
    if (error) throw error;
  }

  /**
   * Map database record to Identity object
   */
  private mapDatabaseToIdentity(data: any): Identity {
    return {
      did: data.did,
      type: data.type,
      clientId: data.client_id,
      verificationStatus: data.verification_status,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
      publicProfile: data.public_profile,
      contactInfo: data.contact_info,
      metadata: data.metadata
    };
  }
}