/**
 * API Routes Index
 * 
 * Aggregates and exports all route modules
 */

import { Router } from 'express';
import identityRoutes from './identity.routes';

const router = Router();

/**
 * Mount route modules
 */
router.use('/identity', identityRoutes);

// Future routes (Phase 3+)
// router.use('/catalog', catalogRoutes);
// router.use('/orders', orderRoutes);
// router.use('/logistics', logisticsRoutes);
// router.use('/trust', trustRoutes);
// router.use('/governance', governanceRoutes);

export default router;