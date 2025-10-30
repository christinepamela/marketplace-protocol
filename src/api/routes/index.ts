/**
 * API Routes Aggregator
 * Combines all route modules
 */

import { Router } from 'express';
import identityRoutes from './identity.routes';
import catalogRoutes from './catalog.routes';
import orderRoutes from './order.routes';

const router = Router();

// Mount route modules
router.use('/identity', identityRoutes);
router.use('/catalog', catalogRoutes);
router.use('/orders', orderRoutes);


// Future routes (Phase 4+)
// router.use('/logistics', logisticsRoutes);
// router.use('/trust', trustRoutes);
// router.use('/governance', governanceRoutes);

export default router;