// Layer 4: Trust & Compliance - Main Exports
// Path: src/core/layer4-trust/index.ts

export * from './types';

// Re-export services explicitly
import { DisputeService } from './dispute.service';
import { RatingService } from './rating.service';
import { ComplianceService } from './compliance.service';

export { DisputeService, RatingService, ComplianceService };