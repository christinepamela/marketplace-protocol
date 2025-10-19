/**
 * Proof Service
 * Handles reputation proof generation, signing, and verification
 */

import type {
  ReputationProof,
  Reputation,
  GenerateProofRequest
} from './types';

export class ProofService {
  private dbClient: any; // Will be replaced with actual Supabase client
  private signingKey: CryptoKey | null = null;
  private verifyingKey: CryptoKey | null = null;
  
  constructor(dbClient: any) {
    this.dbClient = dbClient;
  }

  /**
   * Initialize signing keys
   */
  async initialize(signingKeyPem: string, verifyingKeyPem: string): Promise<void> {
    // Import signing key (private key)
    this.signingKey = await this.importPrivateKey(signingKeyPem);
    
    // Import verifying key (public key)
    this.verifyingKey = await this.importPublicKey(verifyingKeyPem);
  }

  /**
   * Generate a signed reputation proof
   */
  async generateProof(request: GenerateProofRequest): Promise<ReputationProof> {
    const { vendorDid, validityDays = 30 } = request;
    
    // Get current reputation
    const reputation = await this.getReputation(vendorDid);
    if (!reputation) {
      throw new Error(`Reputation not found for vendor: ${vendorDid}`);
    }
    
    // Build proof object
    const now = new Date();
    const validUntil = new Date(now.getTime() + validityDays * 24 * 60 * 60 * 1000);
    
    const proof: Omit<ReputationProof, 'signature'> = {
      vendorDid,
      score: reputation.score,
      transactionsCompleted: reputation.metrics.transactionsCompleted,
      averageRating: reputation.metrics.averageRating,
      generatedAt: now,
      validUntil,
      proofVersion: 1,
      protocolVersion: '1.0.0',
      eventsHash: reputation.recentEventsHash
    };
    
    // Sign the proof
    const signature = await this.signProof(proof);
    
    const signedProof: ReputationProof = {
      ...proof,
      signature
    };
    
    // Store proof in database for audit trail
    await this.storeProof(signedProof);
    
    return signedProof;
  }

  /**
   * Verify a reputation proof
   */
  async verifyProof(proof: ReputationProof): Promise<boolean> {
    try {
      // Check if proof has expired
      if (new Date() > proof.validUntil) {
        return false;
      }
      
      // Verify signature
      const isValidSignature = await this.verifySignature(proof);
      if (!isValidSignature) {
        return false;
      }
      
      // Optionally verify against current reputation
      // (to detect if proof is outdated but not expired)
      const currentReputation = await this.getReputation(proof.vendorDid);
      if (currentReputation) {
        // Allow some tolerance (e.g., proof can be slightly outdated)
        const scoreDifference = Math.abs(currentReputation.score - proof.score);
        if (scoreDifference > 50) {
          // Score has changed significantly - proof may be stale
          return false;
        }
      }
      
      return true;
    } catch (error) {
      console.error('Proof verification failed:', error);
      return false;
    }
  }

  /**
   * Get all proofs for a vendor
   */
  async getProofsForVendor(
    vendorDid: string,
    includeExpired: boolean = false
  ): Promise<ReputationProof[]> {
    let query = this.dbClient
      .from('reputation_proofs')
      .select('*')
      .eq('vendor_did', vendorDid)
      .order('generated_at', { ascending: false });
    
    if (!includeExpired) {
      query = query.gte('valid_until', new Date().toISOString());
    }
    
    const { data, error } = await query;
    if (error) throw error;
    
    return data.map(this.mapDatabaseToProof);
  }

  /**
   * Revoke a proof (mark as invalid)
   */
  async revokeProof(vendorDid: string, proofSignature: string): Promise<void> {
    const { error } = await this.dbClient
      .from('reputation_proofs')
      .update({ revoked: true, revoked_at: new Date() })
      .eq('vendor_did', vendorDid)
      .eq('signature', proofSignature);
    
    if (error) throw error;
  }

  /**
   * Batch generate proofs for multiple vendors
   */
  async batchGenerateProofs(
    vendorDids: string[],
    validityDays: number = 30
  ): Promise<Map<string, ReputationProof>> {
    const proofs = new Map<string, ReputationProof>();
    
    for (const vendorDid of vendorDids) {
      try {
        const proof = await this.generateProof({ vendorDid, validityDays });
        proofs.set(vendorDid, proof);
      } catch (error) {
        console.error(`Failed to generate proof for ${vendorDid}:`, error);
        // Continue with other vendors
      }
    }
    
    return proofs;
  }

  // ============================================================================
  // PRIVATE METHODS - CRYPTOGRAPHY
  // ============================================================================

  /**
   * Sign a proof object
   */
  private async signProof(proof: Omit<ReputationProof, 'signature'>): Promise<string> {
    if (!this.signingKey) {
      throw new Error('Signing key not initialized');
    }
    
    // Create canonical JSON string (deterministic ordering)
    const proofString = this.createCanonicalJSON(proof);
    
    // Convert to bytes
    const encoder = new TextEncoder();
    const data = encoder.encode(proofString);
    
    // Sign with ECDSA
    const signature = await crypto.subtle.sign(
      {
        name: 'ECDSA',
        hash: { name: 'SHA-256' }
      },
      this.signingKey,
      data
    );
    
    // Convert to base64
    return this.arrayBufferToBase64(signature);
  }

  /**
   * Verify a proof signature
   */
  private async verifySignature(proof: ReputationProof): Promise<boolean> {
    if (!this.verifyingKey) {
      throw new Error('Verifying key not initialized');
    }
    
    // Extract signature
    const signature = this.base64ToArrayBuffer(proof.signature);
    
    // Recreate proof without signature
    const proofWithoutSig: Omit<ReputationProof, 'signature'> = {
      vendorDid: proof.vendorDid,
      score: proof.score,
      transactionsCompleted: proof.transactionsCompleted,
      averageRating: proof.averageRating,
      generatedAt: proof.generatedAt,
      validUntil: proof.validUntil,
      proofVersion: proof.proofVersion,
      protocolVersion: proof.protocolVersion,
      eventsHash: proof.eventsHash
    };
    
    // Create canonical JSON
    const proofString = this.createCanonicalJSON(proofWithoutSig);
    
    // Convert to bytes
    const encoder = new TextEncoder();
    const data = encoder.encode(proofString);
    
    // Verify signature
    return await crypto.subtle.verify(
      {
        name: 'ECDSA',
        hash: { name: 'SHA-256' }
      },
      this.verifyingKey,
      signature,
      data
    );
  }

  /**
   * Import private key from PEM string
   */
  private async importPrivateKey(pemString: string): Promise<CryptoKey> {
    // Remove PEM headers and decode base64
    const pemContents = pemString
      .replace('-----BEGIN PRIVATE KEY-----', '')
      .replace('-----END PRIVATE KEY-----', '')
      .replace(/\s/g, '');
    
    const binaryDer = this.base64ToArrayBuffer(pemContents);
    
    return await crypto.subtle.importKey(
      'pkcs8',
      binaryDer,
      {
        name: 'ECDSA',
        namedCurve: 'P-256'
      },
      true,
      ['sign']
    );
  }

  /**
   * Import public key from PEM string
   */
  private async importPublicKey(pemString: string): Promise<CryptoKey> {
    // Remove PEM headers and decode base64
    const pemContents = pemString
      .replace('-----BEGIN PUBLIC KEY-----', '')
      .replace('-----END PUBLIC KEY-----', '')
      .replace(/\s/g, '');
    
    const binaryDer = this.base64ToArrayBuffer(pemContents);
    
    return await crypto.subtle.importKey(
      'spki',
      binaryDer,
      {
        name: 'ECDSA',
        namedCurve: 'P-256'
      },
      true,
      ['verify']
    );
  }

  /**
   * Create canonical JSON string (deterministic ordering)
   */
  private createCanonicalJSON(obj: any): string {
    // Sort keys alphabetically and stringify
    const sortedObj = Object.keys(obj)
      .sort()
      .reduce((result: any, key: string) => {
        result[key] = obj[key];
        return result;
      }, {});
    
    return JSON.stringify(sortedObj);
  }

  /**
   * Convert ArrayBuffer to base64 string
   */
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  /**
   * Convert base64 string to ArrayBuffer
   */
  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }

  // ============================================================================
  // PRIVATE METHODS - DATABASE
  // ============================================================================

  /**
   * Get reputation from database
   */
  private async getReputation(vendorDid: string): Promise<Reputation | null> {
    const { data, error } = await this.dbClient
      .from('reputations')
      .select('*')
      .eq('vendor_did', vendorDid)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    
    return {
      vendorDid: data.vendor_did,
      score: data.score,
      metrics: data.metrics,
      history: data.history,
      lastUpdated: new Date(data.last_updated),
      recentEventsHash: data.recent_events_hash
    };
  }

  /**
   * Store proof in database
   */
  private async storeProof(proof: ReputationProof): Promise<void> {
    const { error } = await this.dbClient
      .from('reputation_proofs')
      .insert({
        vendor_did: proof.vendorDid,
        score: proof.score,
        transactions_completed: proof.transactionsCompleted,
        average_rating: proof.averageRating,
        generated_at: proof.generatedAt,
        valid_until: proof.validUntil,
        proof_version: proof.proofVersion,
        protocol_version: proof.protocolVersion,
        events_hash: proof.eventsHash,
        signature: proof.signature,
        revoked: false
      });
    
    if (error) throw error;
  }

  /**
   * Map database record to ReputationProof
   */
  private mapDatabaseToProof(data: any): ReputationProof {
    return {
      vendorDid: data.vendor_did,
      score: data.score,
      transactionsCompleted: data.transactions_completed,
      averageRating: data.average_rating,
      generatedAt: new Date(data.generated_at),
      validUntil: new Date(data.valid_until),
      proofVersion: data.proof_version,
      protocolVersion: data.protocol_version,
      eventsHash: data.events_hash,
      signature: data.signature
    };
  }
}