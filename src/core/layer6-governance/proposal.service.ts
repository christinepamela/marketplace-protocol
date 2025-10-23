// Layer 6: Governance - Proposal Service
// Path: src/core/layer6-governance/proposal.service.ts

import { SupabaseClient } from '@supabase/supabase-js';
import {
  GovernanceProposal,
  CreateProposalInput,
  GovernanceApproval,
  SubmitApprovalInput,
  ProposalSummary,
  ProposalStatus,
} from './types';
import { MultisigService } from './multisig.service';

export class ProposalService {
  private multisigService: MultisigService;

  constructor(private supabase: SupabaseClient) {
    this.multisigService = new MultisigService(supabase);
  }

  /**
   * Create a new governance proposal
   * Only active signers can create proposals
   */
  async createProposal(input: CreateProposalInput): Promise<GovernanceProposal> {
    // Verify proposer is an active signer
    const isActiveSigner = await this.multisigService.isActiveSigner(input.proposed_by);
    if (!isActiveSigner) {
      throw new Error('Only active signers can create proposals');
    }

    // Generate proposal number
    const proposalNumber = await this.generateProposalNumber();

    // Calculate voting period (default 72 hours)
    const votingDuration = input.voting_duration_hours || 72;
    const votingStartsAt = new Date();
    const votingEndsAt = new Date(votingStartsAt.getTime() + votingDuration * 60 * 60 * 1000);

    // Get required quorum
    const requiredApprovals = await this.multisigService.getRequiredQuorum();

    // Create proposal
    const { data, error } = await this.supabase
      .from('governance_proposals')
      .insert({
        proposal_number: proposalNumber,
        action: input.action,
        params: input.params,
        rationale: input.rationale,
        proposed_by: input.proposed_by,
        status: 'active',
        required_approvals: requiredApprovals,
        current_approvals: 0,
        voting_starts_at: votingStartsAt.toISOString(),
        voting_ends_at: votingEndsAt.toISOString(),
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create proposal: ${error.message}`);
    }

    return data;
  }

  /**
   * Get proposal by ID
   */
  async getProposal(proposalId: string): Promise<GovernanceProposal> {
    const { data, error } = await this.supabase
      .from('governance_proposals')
      .select('*')
      .eq('id', proposalId)
      .single();

    if (error) {
      throw new Error(`Proposal not found: ${error.message}`);
    }

    return data;
  }

  /**
   * Get proposal by number (e.g., 'GOV-001')
   */
  async getProposalByNumber(proposalNumber: string): Promise<GovernanceProposal> {
    const { data, error } = await this.supabase
      .from('governance_proposals')
      .select('*')
      .eq('proposal_number', proposalNumber)
      .single();

    if (error) {
      throw new Error(`Proposal not found: ${error.message}`);
    }

    return data;
  }

  /**
   * Submit an approval (or rejection) for a proposal
   */
  async submitApproval(input: SubmitApprovalInput): Promise<GovernanceApproval> {
    // Verify signer is active
    const isActiveSigner = await this.multisigService.isActiveSigner(input.signer_id);
    if (!isActiveSigner) {
      throw new Error('Only active signers can vote on proposals');
    }

    // Get proposal
    const proposal = await this.getProposal(input.proposal_id);

    // Check proposal is active
    if (proposal.status !== 'active') {
      throw new Error(`Cannot vote on proposal with status: ${proposal.status}`);
    }

    // Check voting window
    const now = new Date();
    if (proposal.voting_ends_at && new Date(proposal.voting_ends_at) < now) {
      throw new Error('Voting period has ended');
    }

    // Check if signer already voted
    const { data: existingVote } = await this.supabase
      .from('governance_approvals')
      .select('*')
      .eq('proposal_id', input.proposal_id)
      .eq('signer_id', input.signer_id)
      .single();

    if (existingVote) {
      throw new Error('Signer has already voted on this proposal');
    }

    // Submit approval
    const { data: approval, error } = await this.supabase
      .from('governance_approvals')
      .insert({
        proposal_id: input.proposal_id,
        signer_id: input.signer_id,
        approved: input.approved,
        signature: input.signature,
        comment: input.comment,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to submit approval: ${error.message}`);
    }

    // Update proposal approval count if approved
    if (input.approved) {
      await this.updateApprovalCount(input.proposal_id);
    }

    // Check if quorum reached
    await this.checkQuorum(input.proposal_id);

    return approval;
  }

  /**
   * Get all approvals for a proposal
   */
  async getApprovals(proposalId: string): Promise<GovernanceApproval[]> {
    const { data, error } = await this.supabase
      .from('governance_approvals')
      .select('*')
      .eq('proposal_id', proposalId)
      .order('approved_at', { ascending: true });

    if (error) {
      throw new Error(`Failed to get approvals: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get proposal summary with approval details
   */
  async getProposalSummary(proposalId: string): Promise<ProposalSummary> {
    const proposal = await this.getProposal(proposalId);
    const approvals = await this.getApprovals(proposalId);
    const activeSigners = await this.multisigService.getActiveSigners();

    const approvers = approvals.filter(a => a.approved).map(a => a.signer_id);
    const rejectors = approvals.filter(a => !a.approved).map(a => a.signer_id);
    const votedSigners = approvals.map(a => a.signer_id);
    const pendingSigners = activeSigners
      .map(s => s.signer_id)
      .filter(id => !votedSigners.includes(id));

    const canExecute = 
      proposal.status === 'approved' && 
      proposal.current_approvals >= proposal.required_approvals;

    let timeRemaining: number | undefined;
    if (proposal.voting_ends_at) {
      const now = new Date();
      const endsAt = new Date(proposal.voting_ends_at);
      if (endsAt > now) {
        timeRemaining = Math.ceil((endsAt.getTime() - now.getTime()) / (1000 * 60 * 60));
      }
    }

    return {
      proposal,
      approvals,
      approvers,
      rejectors,
      pending_signers: pendingSigners,
      can_execute: canExecute,
      time_remaining: timeRemaining,
    };
  }

  /**
   * Get all proposals with optional status filter
   */
  async getAllProposals(status?: ProposalStatus): Promise<GovernanceProposal[]> {
    let query = this.supabase
      .from('governance_proposals')
      .select('*');

    if (status) {
      query = query.eq('status', status);
    }

    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to get proposals: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Update proposal status
   */
  async updateStatus(proposalId: string, newStatus: ProposalStatus): Promise<void> {
    const updates: any = {
      status: newStatus,
      updated_at: new Date().toISOString(),
    };

    if (newStatus === 'executed') {
      updates.executed_at = new Date().toISOString();
    }

    const { error } = await this.supabase
      .from('governance_proposals')
      .update(updates)
      .eq('id', proposalId);

    if (error) {
      throw new Error(`Failed to update proposal status: ${error.message}`);
    }
  }

  /**
   * Expire proposals that have passed their voting window
   */
  async expireOldProposals(): Promise<number> {
    const now = new Date().toISOString();

    const { data, error } = await this.supabase
      .from('governance_proposals')
      .update({ status: 'expired' })
      .eq('status', 'active')
      .lt('voting_ends_at', now)
      .select();

    if (error) {
      throw new Error(`Failed to expire proposals: ${error.message}`);
    }

    return data?.length || 0;
  }

  /**
   * Private: Generate next proposal number
   */
  private async generateProposalNumber(): Promise<string> {
    const { count } = await this.supabase
      .from('governance_proposals')
      .select('*', { count: 'exact', head: true });

    const nextNumber = (count || 0) + 1;
    return `GOV-${String(nextNumber).padStart(3, '0')}`;
  }

  /**
   * Private: Update approval count on proposal
   */
  private async updateApprovalCount(proposalId: string): Promise<void> {
    const { count } = await this.supabase
      .from('governance_approvals')
      .select('*', { count: 'exact', head: true })
      .eq('proposal_id', proposalId)
      .eq('approved', true);

    await this.supabase
      .from('governance_proposals')
      .update({
        current_approvals: count || 0,
        updated_at: new Date().toISOString(),
      })
      .eq('id', proposalId);
  }

  /**
   * Private: Check if quorum reached and update status
   */
  private async checkQuorum(proposalId: string): Promise<void> {
    const proposal = await this.getProposal(proposalId);

    if (proposal.current_approvals >= proposal.required_approvals) {
      await this.updateStatus(proposalId, 'approved');
    }
  }
}