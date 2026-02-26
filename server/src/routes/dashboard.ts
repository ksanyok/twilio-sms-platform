import { Router } from 'express';
import { DashboardController } from '../controllers/dashboardController';
import { authenticate } from '../middleware/auth';

const router = Router();

const asyncHandler = (fn: Function) => (req: any, res: any, next: any) =>
  Promise.resolve(fn(req, res, next)).catch(next);

router.use(authenticate);

router.get('/stats', asyncHandler(DashboardController.getStats));
router.get('/delivery-metrics', asyncHandler(DashboardController.getDeliveryMetrics));

export default router;
