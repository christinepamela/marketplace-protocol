// Layer 6: Governance & Multisig - Main Exports
// Path: src/core/layer6-governance/index.ts

export * from './types';

// Re-export services explicitly
import { MultisigService } from './multisig.service';
import { ProposalService } from './proposal.service';
import { ExecutionService } from './execution.service';

export { MultisigService, ProposalService, ExecutionService };