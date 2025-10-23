// Layer 6: Governance - Execution Service
// Path: src/core/layer6-governance/execution.service.ts

import { SupabaseClient } from '@supabase/supabase-js';
import {
  GovernanceActionExecution,
  GovernanceProposal,
  UpdateProtocolFeeParams,
  TreasuryWithdrawalParams,
  AddSignerParams,
  RemoveSignerParams,
  UpdateEscrowDurationParams,
  UpdateDisputeWindowParams,
} from './types';
import { ProposalService } from './proposal.service';
import { MultisigService } from './multisig.service';

export class ExecutionService {
  private proposalService: ProposalService;
  private multisigService: MultisigService;

  constructor(private supabase: SupabaseClient) {
    this.proposalService = new ProposalService(supabase);
    this.multisigService = new MultisigService(supabase);
  }

  /**
   * Execute an approved proposal
   * Checks quorum, executes action, logs result
   */
  async executeProposal(
    proposalId: string,
    executedBy: string
  ): Promise<GovernanceActionExecution> {
    // Get proposal
    const proposal = await this.proposalService.getProposal(proposalId);

    // Verify proposal is approved
    if (proposal.status !== 'approved') {
      throw new Error(`Proposal must be approved before execution. Current status: ${proposal.status}`);
    }

    // Verify quorum
    if (proposal.current_approvals < proposal.required_approvals) {
      throw new Error(`Insufficient approvals: ${proposal.current_approvals}/${proposal.required_approvals}`);
    }

    // Create execution record
    const { data: execution, error: execError } = await this.supabase
      .from('governance_actions')
      .insert({
        proposal_id: proposalId,
        action: proposal.action,
        params: proposal.params,
        executed_by: executedBy,
        status: 'pending',
      })
      .select()
      .single();

    if (execError) {
      throw new Error(`Failed to create execution record: ${execError.message}`);
    }

    try {
      // Execute the action based on type
      const result = await this.executeAction(proposal);

      // Mark execution as successful
      await this.supabase
        .from('governance_actions')
        .update({
          status: 'success',
          result,
        })
        .eq('id', execution.id);

      // Mark proposal as executed
      await this.proposalService.updateStatus(proposalId, 'executed');

      return {
        ...execution,
        status: 'success',
        result,
      };
    } catch (error: any) {
      // Mark execution as failed
      await this.supabase
        .from('governance_actions')
        .update({
          status: 'failed',
          error: error.message,
        })
        .eq('id', execution.id);

      throw new Error(`Execution failed: ${error.message}`);
    }
  }

  /**
   * Private: Route execution to appropriate handler
   */
  private async executeAction(proposal: GovernanceProposal): Promise<any> {
    switch (proposal.action) {
      case 'update_protocol_fee':
        return await this.executeUpdateProtocolFee(proposal.params as UpdateProtocolFeeParams);

      case 'update_client_fee':
        return await this.executeUpdateClientFee(proposal.params);

      case 'treasury_withdrawal':
        return await this.executeTreasuryWithdrawal(proposal.id, proposal.params as TreasuryWithdrawalParams);

      case 'emergency_pause':
        return await this.executeEmergencyPause();

      case 'emergency_unpause':
        return await this.executeEmergencyUnpause();

      case 'add_signer':
        return await this.executeAddSigner(proposal.params as AddSignerParams);

      case 'remove_signer':
        return await this.executeRemoveSigner(proposal.params as RemoveSignerParams);

      case 'update_escrow_duration':
        return await this.executeUpdateEscrowDuration(proposal.params as UpdateEscrowDurationParams);

      case 'update_dispute_window':
        return await this.executeUpdateDisputeWindow(proposal.params as UpdateDisputeWindowParams);

      case 'schema_migration':
        return await this.executeSchemaMigration(proposal.params);

      default:
        throw new Error(`Unknown action: ${proposal.action}`);
    }
  }

  /**
   * Execute: Update protocol fee
   */
  private async executeUpdateProtocolFee(params: UpdateProtocolFeeParams): Promise<any> {
    if (params.new_fee_percent < 0 || params.new_fee_percent > 10) {
      throw new Error('Protocol fee must be between 0% and 10%');
    }

    const { data: current } = await this.supabase
      .from('protocol_parameters')
      .select('*')
      .eq('parameter_name', 'protocol_fee_percentage')
      .single();

    const { error } = await this.supabase
      .from('protocol_parameters')
      .update({
        parameter_value: params.new_fee_percent,
        previous_value: current?.parameter_value,
        last_updated_at: new Date().toISOString(),
      })
      .eq('parameter_name', 'protocol_fee_percentage');

    if (error) throw error;

    return {
      old_fee: current?.parameter_value,
      new_fee: params.new_fee_percent,
    };
  }

  /**
   * Execute: Update client fee
   */
  private async executeUpdateClientFee(params: any): Promise<any> {
    if (params.new_fee_percent < 0 || params.new_fee_percent > 5) {
      throw new Error('Client fee must be between 0% and 5%');
    }

    const { data: current } = await this.supabase
      .from('protocol_parameters')
      .select('*')
      .eq('parameter_name', 'default_client_fee_percentage')
      .single();

    const { error } = await this.supabase
      .from('protocol_parameters')
      .update({
        parameter_value: params.new_fee_percent,
        previous_value: current?.parameter_value,
        last_updated_at: new Date().toISOString(),
      })
      .eq('parameter_name', 'default_client_fee_percentage');

    if (error) throw error;

    return {
      old_fee: current?.parameter_value,
      new_fee: params.new_fee_percent,
    };
  }

  /**
   * Execute: Treasury withdrawal
   */
  private async executeTreasuryWithdrawal(proposalId: string, params: TreasuryWithdrawalParams): Promise<any> {
    // Create treasury movement record
    const { data, error } = await this.supabase
      .from('treasury_movements')
      .insert({
        proposal_id: proposalId,
        movement_type: 'withdrawal',
        amount: params.amount,
        currency: params.currency,
        recipient: params.recipient,
        purpose: params.purpose,
        status: 'approved',
      })
      .select()
      .single();

    if (error) throw error;

    // Note: Actual Bitcoin transaction would be handled separately
    // This just records the approval for execution

    return {
      movement_id: data.id,
      amount: params.amount,
      currency: params.currency,
      recipient: params.recipient,
      note: 'Treasury movement approved. Execute Bitcoin transaction manually.',
    };
  }

  /**
   * Execute: Emergency pause
   */
  private async executeEmergencyPause(): Promise<any> {
    const { error } = await this.supabase
      .from('protocol_parameters')
      .update({
        parameter_value: true,
        last_updated_at: new Date().toISOString(),
      })
      .eq('parameter_name', 'emergency_pause_enabled');

    if (error) throw error;

    return { paused: true, message: 'Protocol paused via emergency circuit breaker' };
  }

  /**
   * Execute: Emergency unpause
   */
  private async executeEmergencyUnpause(): Promise<any> {
    const { error } = await this.supabase
      .from('protocol_parameters')
      .update({
        parameter_value: false,
        last_updated_at: new Date().toISOString(),
      })
      .eq('parameter_name', 'emergency_pause_enabled');

    if (error) throw error;

    return { paused: false, message: 'Protocol unpaused' };
  }

  /**
   * Execute: Add signer
   */
  private async executeAddSigner(params: AddSignerParams): Promise<any> {
    const signer = await this.multisigService.addSigner(params);
    return {
      signer_id: signer.signer_id,
      role: signer.role,
      message: 'Signer added to multisig council',
    };
  }

  /**
   * Execute: Remove signer
   */
  private async executeRemoveSigner(params: RemoveSignerParams): Promise<any> {
    await this.multisigService.removeSigner(params.signer_id, params.reason);
    return {
      signer_id: params.signer_id,
      reason: params.reason,
      message: 'Signer removed from multisig council',
    };
  }

  /**
   * Execute: Update escrow duration
   */
  private async executeUpdateEscrowDuration(params: UpdateEscrowDurationParams): Promise<any> {
    if (params.new_duration_days < 1 || params.new_duration_days > 30) {
      throw new Error('Escrow duration must be between 1 and 30 days');
    }

    const { data: current } = await this.supabase
      .from('protocol_parameters')
      .select('*')
      .eq('parameter_name', 'escrow_hold_duration_days')
      .single();

    const { error } = await this.supabase
      .from('protocol_parameters')
      .update({
        parameter_value: params.new_duration_days,
        previous_value: current?.parameter_value,
        last_updated_at: new Date().toISOString(),
      })
      .eq('parameter_name', 'escrow_hold_duration_days');

    if (error) throw error;

    return {
      old_duration: current?.parameter_value,
      new_duration: params.new_duration_days,
    };
  }

  /**
   * Execute: Update dispute window
   */
  private async executeUpdateDisputeWindow(params: UpdateDisputeWindowParams): Promise<any> {
    if (params.new_window_days < 1 || params.new_window_days > 30) {
      throw new Error('Dispute window must be between 1 and 30 days');
    }

    const { data: current } = await this.supabase
      .from('protocol_parameters')
      .select('*')
      .eq('parameter_name', 'dispute_window_days')
      .single();

    const { error } = await this.supabase
      .from('protocol_parameters')
      .update({
        parameter_value: params.new_window_days,
        previous_value: current?.parameter_value,
        last_updated_at: new Date().toISOString(),
      })
      .eq('parameter_name', 'dispute_window_days');

    if (error) throw error;

    return {
      old_window: current?.parameter_value,
      new_window: params.new_window_days,
    };
  }

  /**
   * Execute: Schema migration
   */
  private async executeSchemaMigration(params: any): Promise<any> {
    // This is a placeholder - actual migration would be run manually
    // This just records approval
    return {
      migration_file: params.migration_file,
      description: params.description,
      breaking_change: params.breaking_change,
      message: 'Schema migration approved. Execute migration script manually.',
    };
  }

  /**
   * Get execution history for a proposal
   */
  async getExecutionHistory(proposalId: string): Promise<GovernanceActionExecution[]> {
    const { data, error } = await this.supabase
      .from('governance_actions')
      .select('*')
      .eq('proposal_id', proposalId)
      .order('executed_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to get execution history: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get current protocol parameter value
   */
  async getParameter(parameterName: string): Promise<any> {
    const { data, error } = await this.supabase
      .from('protocol_parameters')
      .select('*')
      .eq('parameter_name', parameterName)
      .single();

    if (error) {
      throw new Error(`Parameter not found: ${error.message}`);
    }

    return data.parameter_value;
  }

  /**
   * Get all protocol parameters
   */
  async getAllParameters(): Promise<Record<string, any>> {
    const { data, error } = await this.supabase
      .from('protocol_parameters')
      .select('*');

    if (error) {
      throw new Error(`Failed to get parameters: ${error.message}`);
    }

    const params: Record<string, any> = {};
    data?.forEach(p => {
      params[p.parameter_name] = p.parameter_value;
    });

    return params;
  }

  /**
   * Check if protocol is paused
   */
  async isProtocolPaused(): Promise<boolean> {
    const value = await this.getParameter('emergency_pause_enabled');
    return value === true || value === 'true';
  }
}