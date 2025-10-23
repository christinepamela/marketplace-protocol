// Layer 6: Governance - Multisig Service
// Path: src/core/layer6-governance/multisig.service.ts

import { SupabaseClient } from '@supabase/supabase-js';
import {
  GovernanceSigner,
  AddSignerInput,
  SignerRole,
} from './types';

export class MultisigService {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Initialize the multisig council with 3 core team members
   * Should only be run once during protocol setup
   */
  async initializeCouncil(signers: AddSignerInput[]): Promise<GovernanceSigner[]> {
    if (signers.length !== 3) {
      throw new Error('Multisig council must have exactly 3 signers');
    }

    // Check if council already exists
    const { data: existing } = await this.supabase
      .from('governance_signers')
      .select('*')
      .eq('active', true);

    if (existing && existing.length > 0) {
      throw new Error('Multisig council already initialized');
    }

    // Insert all signers
    const { data, error } = await this.supabase
      .from('governance_signers')
      .insert(signers)
      .select();

    if (error) {
      throw new Error(`Failed to initialize council: ${error.message}`);
    }

    return data;
  }

  /**
   * Get all active signers
   */
  async getActiveSigners(): Promise<GovernanceSigner[]> {
    const { data, error } = await this.supabase
      .from('governance_signers')
      .select('*')
      .eq('active', true)
      .order('added_at', { ascending: true });

    if (error) {
      throw new Error(`Failed to get signers: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get signer by ID
   */
  async getSigner(signerId: string): Promise<GovernanceSigner> {
    const { data, error } = await this.supabase
      .from('governance_signers')
      .select('*')
      .eq('signer_id', signerId)
      .single();

    if (error) {
      throw new Error(`Signer not found: ${error.message}`);
    }

    return data;
  }

  /**
   * Check if a signer exists and is active
   */
  async isActiveSigner(signerId: string): Promise<boolean> {
    const { data } = await this.supabase
      .from('governance_signers')
      .select('active')
      .eq('signer_id', signerId)
      .single();

    return data?.active === true;
  }

  /**
   * Add a new signer (requires governance proposal)
   * This should be called by the execution service after proposal approval
   */
  async addSigner(input: AddSignerInput): Promise<GovernanceSigner> {
    // Check if signer already exists
    const { data: existing } = await this.supabase
      .from('governance_signers')
      .select('*')
      .eq('signer_id', input.signer_id)
      .single();

    if (existing) {
      throw new Error('Signer already exists');
    }

    // Add signer
    const { data, error } = await this.supabase
      .from('governance_signers')
      .insert({
        signer_id: input.signer_id,
        identity_did: input.identity_did,
        public_key: input.public_key,
        role: input.role,
        active: true,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to add signer: ${error.message}`);
    }

    return data;
  }

  /**
   * Remove a signer (requires governance proposal)
   * Marks as inactive rather than deleting for audit trail
   */
  async removeSigner(signerId: string, reason: string): Promise<void> {
    // Verify signer exists
    const signer = await this.getSigner(signerId);

    if (!signer.active) {
      throw new Error('Signer is already inactive');
    }

    // Check that we're not removing the last active signers
    const activeSigners = await this.getActiveSigners();
    if (activeSigners.length <= 2) {
      throw new Error('Cannot remove signer: must maintain at least 2 active signers');
    }

    // Mark as inactive
    const { error } = await this.supabase
      .from('governance_signers')
      .update({
        active: false,
        removed_at: new Date().toISOString(),
      })
      .eq('signer_id', signerId);

    if (error) {
      throw new Error(`Failed to remove signer: ${error.message}`);
    }
  }

  /**
   * Get total number of active signers
   */
  async getSignerCount(): Promise<number> {
    const { count, error } = await this.supabase
      .from('governance_signers')
      .select('*', { count: 'exact', head: true })
      .eq('active', true);

    if (error) {
      throw new Error(`Failed to count signers: ${error.message}`);
    }

    return count || 0;
  }

  /**
   * Calculate required quorum (2-of-3 for 3 signers)
   * In future: could make this dynamic based on total signers
   */
  async getRequiredQuorum(): Promise<number> {
    const signerCount = await this.getSignerCount();
    
    // For 3 signers: 2 required
    // For 5 signers: 3 required (majority)
    // For 7 signers: 4 required (majority)
    return Math.ceil(signerCount / 2);
  }

  /**
   * Verify that a signer has authority to propose/approve
   */
  async verifySigner(signerId: string): Promise<boolean> {
    try {
      const signer = await this.getSigner(signerId);
      return signer.active === true;
    } catch {
      return false;
    }
  }

  /**
   * Get all signers (including inactive) for audit purposes
   */
  async getAllSigners(): Promise<GovernanceSigner[]> {
    const { data, error } = await this.supabase
      .from('governance_signers')
      .select('*')
      .order('added_at', { ascending: true });

    if (error) {
      throw new Error(`Failed to get all signers: ${error.message}`);
    }

    return data || [];
  }
}