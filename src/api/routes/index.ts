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

const router = Router();

// ============================================================================
// ROUTE REGISTRATION
// ============================================================================

// Layer 0: Identity & Reputation (unchanged)
router.use('/identity', identityRoutes);

// Layer 1: Discovery & Catalog (unchanged)
router.use('/catalog', catalogRoutes);

// Layer 2: Transactions & Settlement (unchanged)
router.use('/orders', orderRoutes);

// Layer 3: Logistics Coordination (unchanged)
router.use('/logistics', logisticsRoutes);

// Layer 4: Trust & Compliance (NEW - Phase 6)
router.use('/disputes', disputeRoutes);
router.use('/ratings', ratingRoutes);

// Health check endpoint (NEW - helpful for monitoring)
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