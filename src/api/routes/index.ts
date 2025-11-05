// API Routes Index
// Path: src/api/routes/index.ts

import { Router } from 'express';

// Import all route modules
import identityRoutes from './identity.routes';
import catalogRoutes from './catalog.routes';
import orderRoutes from './order.routes';
import logisticsRoutes from './logistics.routes';
import disputeRoutes from './dispute.routes';
import ratingRoutes from './rating.routes';
import governanceRoutes from './governance.routes';

const router = Router();

// ============================================================================
// ROUTE REGISTRATION
// ============================================================================

// Layer 0: Identity & Reputation
router.use('/identity', identityRoutes);

// Layer 1: Discovery & Catalog
router.use('/catalog', catalogRoutes);

// Layer 2: Transactions & Settlement
router.use('/orders', orderRoutes);

// Layer 3: Logistics Coordination
router.use('/logistics', logisticsRoutes);

// Layer 4: Trust & Compliance
router.use('/disputes', disputeRoutes);
router.use('/ratings', ratingRoutes);

// Layer 6: Governance & Multisig (NEW - Phase 7)
router.use('/proposals', governanceRoutes);

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    success: true,
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    },
  });
});

export default router;