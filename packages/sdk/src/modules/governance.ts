/**
 * Governance Module (Layer 6)
 * Protocol governance, proposals, and multisig voting
 */

import type { HttpClient } from '../client';
import type {
  GovernanceProposal,
  GovernanceAction,
  ProposalStatus,
  GovernanceApproval,
} from '../types';

// ============================================================================
// REQUEST/RESPONSE TYPES
// ============================================================================

export interface CreateProposalRequest {
  action: GovernanceAction;
  params: Record<string, any>;
  rationale: string;
  voting_duration_hours?: number;
}

export interface SubmitVoteRequest {
  approved: boolean;
  signature?: string;
  comment?: string;
}

export interface ProposalSummary {
  proposal: GovernanceProposal;
  approvals: GovernanceApproval[];
  approvers: string[];
  rejectors: string[];
  pending_signers: string[];
  can_execute: boolean;
  time_remaining?: number;
}

// ============================================================================
// GOVERNANCE MODULE
// ============================================================================

export class GovernanceModule {
  constructor(private readonly http: HttpClient) {}

  /**
   * Create governance proposal
   * Requires authentication (signer only)
   * 
   * @param request - Proposal details
   * @returns Proposal ID and number
   * 
   * @example
   * const proposal = await sdk.governance.createProposal({
   *   action: 'update_protocol_fee',
   *   params: { new_fee_percent: 2.5 },
   *   rationale: 'Adjusting fee to remain competitive',
   *   voting_duration_hours: 72
   * });
   */
  async createProposal(request: CreateProposalRequest): Promise<{
    proposalId: string;
    proposalNumber: string;
    status: ProposalStatus;
  }> {
    return this.http.post('/proposals', request);
  }

  /**
   * Get proposal by ID
   * Public endpoint (transparency)
   * 
   * @param proposalId - Proposal UUID
   * @returns Proposal details with voting summary
   * 
   * @example
   * const proposal = await sdk.governance.getProposal('uuid');
   * console.log(`Status: ${proposal.status}`);
   * console.log(`Votes: ${proposal.current_approvals}/${proposal.required_approvals}`);
   */
  async getProposal(proposalId: string): Promise<ProposalSummary> {
    return this.http.get(`/proposals/${proposalId}`);
  }

  /**
   * List all proposals
   * Public endpoint (transparency)
   * 
   * @param filters - Filter options
   * @returns List of proposals
   * 
   * @example
   * // Get active proposals
   * const proposals = await sdk.governance.listProposals({ status: 'active' });
   * 
   * // Get recent proposals
   * const recent = await sdk.governance.listProposals({ limit: 10 });
   */
  async listProposals(filters?: {
    status?: ProposalStatus;
    action?: GovernanceAction;
    limit?: number;
    offset?: number;
  }): Promise<GovernanceProposal[]> {
    return this.http.get('/proposals', filters);
  }

  /**
   * Submit vote on proposal
   * Requires authentication (signer only)
   * 
   * @param proposalId - Proposal UUID
   * @param vote - Vote details
   * @returns Vote confirmation
   * 
   * @example
   * // Approve proposal
   * await sdk.governance.vote('proposal-uuid', {
   *   approved: true,
   *   comment: 'I support this change'
   * });
   * 
   * // Reject proposal
   * await sdk.governance.vote('proposal-uuid', {
   *   approved: false,
   *   comment: 'Fee is too low'
   * });
   */
  async vote(proposalId: string, vote: SubmitVoteRequest): Promise<{
    message: string;
    currentApprovals: number;
    requiredApprovals: number;
    status: ProposalStatus;
  }> {
    return this.http.post(`/proposals/${proposalId}/vote`, vote);
  }

  /**
   * Execute approved proposal
   * Requires authentication (signer only)
   * Proposal must have reached quorum
   * 
   * @param proposalId - Proposal UUID
   * @returns Execution result
   * 
   * @example
   * const result = await sdk.governance.executeProposal('proposal-uuid');
   * console.log(result.message);
   */
  async executeProposal(proposalId: string): Promise<{
    message: string;
    executionId: string;
    result: Record<string, any>;
  }> {
    return this.http.post(`/proposals/${proposalId}/execute`);
  }

  /**
   * Get governance statistics
   * Public endpoint
   * 
   * @returns Governance stats
   * 
   * @example
   * const stats = await sdk.governance.getStats();
   * console.log(`Active proposals: ${stats.active_proposals}`);
   * console.log(`Total signers: ${stats.total_signers}`);
   */
  async getStats(): Promise<{
    total_proposals: number;
    active_proposals: number;
    executed_proposals: number;
    rejected_proposals: number;
    total_signers: number;
    active_signers: number;
  }> {
    return this.http.get('/proposals/stats');
  }
}