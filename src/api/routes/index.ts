/**
 * API Routes Aggregator
 * Combines all route modules
 */

import { Router } from 'express';
import identityRoutes from './identity.routes';
import catalogRoutes from './catalog.routes';
import orderRoutes from './order.routes';
import logisticsRoutes from './logistics.routes';

const router = Router();

// Mount route modules
router.use('/identity', identityRoutes);
router.use('/catalog', catalogRoutes);
router.use('/orders', orderRoutes);
router.use('/logistics', logisticsRoutes);

export default router;