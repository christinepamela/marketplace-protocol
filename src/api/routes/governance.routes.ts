/**
 * Governance Routes (Layer 6)
 * REST endpoints for proposal management and voting
 */

import { Router } from 'express';
import { z } from 'zod';
import { ProposalService } from '../../core/layer6-governance/proposal.service';
import { ExecutionService } from '../../core/layer6-governance/execution.service';
import { MultisigService } from '../../core/layer6-governance/multisig.service';
import { authenticate } from '../middleware/auth.middleware';
import { validateBody } from '../middleware/validation.middleware';
import { ApiError, ErrorCode } from '../core/errors';
import { getUserDid } from '../core/utils';
import type {
  GovernanceAction,
  ProposalStatus,
} from '../../core/layer6-governance/types';

const router = Router();
const requireAuth = authenticate();

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const createProposalSchema = z.object({
  action: z.enum([
    'update_protocol_fee',
    'update_client_fee',
    'treasury_withdrawal',
    'emergency_pause',
    'emergency_unpause',
    'add_signer',
    'remove_signer',
    'update_escrow_duration',
    'update_dispute_window',
    'schema_migration',
  ]),
  params: z.record(z.any()),
  rationale: z.string().min(10).max(1000),
  voting_duration_hours: z.number().positive().optional(),
});

const submitVoteSchema = z.object({
  approved: z.boolean(),
  signature: z.string().optional(),
  comment: z.string().max(500).optional(),
});

// ============================================================================
// ROUTES
// ============================================================================

/**
 * @route   POST /api/v1/proposals
 * @desc    Create a new governance proposal
 * @access  Private (active signers only)
 */
router.post(
  '/',
  requireAuth,
  validateBody(createProposalSchema),
  async (req, res, next) => {
    try {
      const proposerDid = getUserDid(req);
      const proposalService = new ProposalService(req.supabase);

      // Verify proposer is an active signer
      const multisigService = new MultisigService(req.supabase);
      const isActiveSigner = await multisigService.isActiveSigner(proposerDid);

      if (!isActiveSigner) {
        throw new ApiError(
          ErrorCode.FORBIDDEN,
          'Only active signers can create proposals'
        );
      }

      const proposal = await proposalService.createProposal({
        action: req.body.action as GovernanceAction,
        params: req.body.params,
        rationale: req.body.rationale,
        proposed_by: proposerDid,
        voting_duration_hours: req.body.voting_duration_hours,
      });

      res.status(201).json({
        success: true,
        data: {
          proposalId: proposal.id,
          proposalNumber: proposal.proposal_number,
          action: proposal.action,
          status: proposal.status,
          votingEndsAt: proposal.voting_ends_at,
          requiredApprovals: proposal.required_approvals,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   GET /api/v1/proposals
 * @desc    Get all proposals with optional status filter
 * @access  Public (no auth required for transparency)
 */
router.get(
  '/',
  async (req, res, next) => {
    try {
      const proposalService = new ProposalService(req.supabase);
      const status = req.query.status as ProposalStatus | undefined;

      const proposals = await proposalService.getAllProposals(status);

      res.json({
        success: true,
        data: proposals,
        count: proposals.length,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   GET /api/v1/proposals/:id
 * @desc    Get proposal details with voting summary
 * @access  Public (no auth required for transparency)
 */
router.get(
  '/:id',
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const proposalService = new ProposalService(req.supabase);

      const summary = await proposalService.getProposalSummary(id);

      res.json({
        success: true,
        data: summary,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   POST /api/v1/proposals/:id/vote
 * @desc    Submit a vote (approval or rejection) on a proposal
 * @access  Private (active signers only)
 */
router.post(
  '/:id/vote',
  requireAuth,
  validateBody(submitVoteSchema),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const voterDid = getUserDid(req);
      const proposalService = new ProposalService(req.supabase);

      // Verify voter is an active signer
      const multisigService = new MultisigService(req.supabase);
      const isActiveSigner = await multisigService.isActiveSigner(voterDid);

      if (!isActiveSigner) {
        throw new ApiError(
          ErrorCode.FORBIDDEN,
          'Only active signers can vote on proposals'
        );
      }

      const approval = await proposalService.submitApproval({
        proposal_id: id,
        signer_id: voterDid,
        approved: req.body.approved,
        signature: req.body.signature,
        comment: req.body.comment,
      });

      // Get updated proposal status
      const updatedProposal = await proposalService.getProposal(id);

      res.json({
        success: true,
        message: req.body.approved ? 'Vote submitted: APPROVED' : 'Vote submitted: REJECTED',
        data: {
          voteId: approval.id,
          approved: approval.approved,
          proposalStatus: updatedProposal.status,
          currentApprovals: updatedProposal.current_approvals,
          requiredApprovals: updatedProposal.required_approvals,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   POST /api/v1/proposals/:id/execute
 * @desc    Execute an approved proposal
 * @access  Private (active signers only)
 */
router.post(
  '/:id/execute',
  requireAuth,
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const executorDid = getUserDid(req);
      const executionService = new ExecutionService(req.supabase);

      // Verify executor is an active signer
      const multisigService = new MultisigService(req.supabase);
      const isActiveSigner = await multisigService.isActiveSigner(executorDid);

      if (!isActiveSigner) {
        throw new ApiError(
          ErrorCode.FORBIDDEN,
          'Only active signers can execute proposals'
        );
      }

      const execution = await executionService.executeProposal(id, executorDid);

      res.json({
        success: true,
        message: 'Proposal executed successfully',
        data: {
          executionId: execution.id,
          action: execution.action,
          status: execution.status,
          result: execution.result,
          executedAt: execution.executed_at,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;