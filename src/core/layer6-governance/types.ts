// Layer 6: Governance & Multisig - Type Definitions
// Path: src/core/layer6-governance/types.ts

// ============================================================================
// SIGNER TYPES
// ============================================================================

export type SignerRole = 'founder' | 'technical' | 'treasury' | 'other';

export interface GovernanceSigner {
  id: string;
  signer_id: string; // 'founder', 'tech_lead', 'treasury_manager'
  identity_did?: string;
  public_key?: string;
  role: SignerRole;
  active: boolean;
  added_at: Date;
  removed_at?: Date;
}

export interface AddSignerInput {
  signer_id: string;
  identity_did?: string;
  public_key?: string;
  role: SignerRole;
}

// ============================================================================
// PROPOSAL TYPES
// ============================================================================

export type ProposalStatus = 
  | 'draft'
  | 'active'
  | 'approved'
  | 'executed'
  | 'rejected'
  | 'expired';

export type GovernanceAction =
  | 'update_protocol_fee'
  | 'update_client_fee'
  | 'treasury_withdrawal'
  | 'emergency_pause'
  | 'emergency_unpause'
  | 'add_signer'
  | 'remove_signer'
  | 'update_escrow_duration'
  | 'update_dispute_window'
  | 'schema_migration';

export interface GovernanceProposal {
  id: string;
  proposal_number: string; // 'GOV-001'
  action: GovernanceAction;
  params: Record<string, any>;
  rationale: string;
  proposed_by: string;
  status: ProposalStatus;
  required_approvals: number;
  current_approvals: number;
  voting_starts_at?: Date;
  voting_ends_at?: Date;
  executed_at?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface CreateProposalInput {
  action: GovernanceAction;
  params: Record<string, any>;
  rationale: string;
  proposed_by: string;
  voting_duration_hours?: number; // Default 72 hours
}

// ============================================================================
// APPROVAL TYPES
// ============================================================================

export interface GovernanceApproval {
  id: string;
  proposal_id: string;
  signer_id: string;
  approved: boolean; // true = approve, false = reject
  signature?: string;
  comment?: string;
  approved_at: Date;
}

export interface SubmitApprovalInput {
  proposal_id: string;
  signer_id: string;
  approved: boolean;
  signature?: string;
  comment?: string;
}

// ============================================================================
// ACTION EXECUTION TYPES
// ============================================================================

export type ActionStatus = 'pending' | 'success' | 'failed';

export interface GovernanceActionExecution {
  id: string;
  proposal_id: string;
  action: GovernanceAction;
  params: Record<string, any>;
  executed_by?: string;
  status: ActionStatus;
  result?: Record<string, any>;
  error?: string;
  executed_at: Date;
}

// ============================================================================
// PROTOCOL PARAMETERS
// ============================================================================

export interface ProtocolParameter {
  id: string;
  parameter_name: string;
  parameter_value: any;
  last_updated_by?: string;
  last_updated_at: Date;
  previous_value?: any;
  change_reason?: string;
}

export type ParameterName =
  | 'protocol_fee_percentage'
  | 'default_client_fee_percentage'
  | 'escrow_hold_duration_days'
  | 'dispute_window_days'
  | 'emergency_pause_enabled'
  | 'max_order_value_usd'
  | 'min_provider_rating';

// ============================================================================
// TREASURY TYPES
// ============================================================================

export type TreasuryMovementType = 'withdrawal' | 'deposit' | 'grant' | 'fee_collection';
export type TreasuryStatus = 'pending' | 'approved' | 'executed' | 'failed' | 'cancelled';

export interface TreasuryMovement {
  id: string;
  proposal_id?: string;
  movement_type: TreasuryMovementType;
  amount: number;
  currency: string;
  recipient?: string;
  purpose: string;
  status: TreasuryStatus;
  txid?: string;
  approved_at?: Date;
  executed_at?: Date;
  created_at: Date;
}

export interface CreateTreasuryWithdrawalInput {
  amount: number;
  currency: string;
  recipient: string;
  purpose: string;
}

// ============================================================================
// ACTION-SPECIFIC PARAMETER TYPES
// ============================================================================

export interface UpdateProtocolFeeParams {
  new_fee_percent: number; // e.g., 2.5
}

export interface UpdateClientFeeParams {
  new_fee_percent: number; // 0-5%
}

export interface TreasuryWithdrawalParams {
  amount: number;
  currency: string;
  recipient: string; // DID or wallet address
  purpose: string;
}

export interface AddSignerParams {
  signer_id: string;
  identity_did?: string;
  public_key?: string;
  role: SignerRole;
}

export interface RemoveSignerParams {
  signer_id: string;
  reason: string;
}

export interface UpdateEscrowDurationParams {
  new_duration_days: number;
}

export interface UpdateDisputeWindowParams {
  new_window_days: number;
}

export interface SchemaMigrationParams {
  migration_file: string;
  description: string;
  breaking_change: boolean;
}

// ============================================================================
// PROPOSAL SUMMARY (for dashboards)
// ============================================================================

export interface ProposalSummary {
  proposal: GovernanceProposal;
  approvals: GovernanceApproval[];
  approvers: string[]; // List of signer IDs who approved
  rejectors: string[]; // List of signer IDs who rejected
  pending_signers: string[]; // Signers who haven't voted yet
  can_execute: boolean; // Has quorum and ready to execute
  time_remaining?: number; // Hours until voting ends
}

// ============================================================================
// GOVERNANCE STATISTICS
// ============================================================================

export interface GovernanceStats {
  total_proposals: number;
  active_proposals: number;
  executed_proposals: number;
  rejected_proposals: number;
  total_signers: number;
  active_signers: number;
  treasury_balance?: number;
  treasury_currency?: string;
  last_parameter_change?: Date;
}