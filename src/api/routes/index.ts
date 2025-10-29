/**
 * API Routes Index
 * 
 * Aggregates and exports all route modules
 */

import { Router } from 'express';
import identityRoutes from './identity.routes';
import catalogRoutes from './catalog.routes';

const router = Router();

/**
 * Mount route modules
 */
router.use('/identity', identityRoutes);
router.use('/catalog', catalogRoutes);

// Future routes (Phase 4+)
// router.use('/orders', orderRoutes);
// router.use('/logistics', logisticsRoutes);
// router.use('/trust', trustRoutes);
// router.use('/governance', governanceRoutes);

export default router;