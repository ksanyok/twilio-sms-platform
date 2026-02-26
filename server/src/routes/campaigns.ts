import { Router } from 'express';
import { CampaignController } from '../controllers/campaignController';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();

const asyncHandler = (fn: Function) => (req: any, res: any, next: any) =>
  Promise.resolve(fn(req, res, next)).catch(next);

router.use(authenticate);

router.get('/', asyncHandler(CampaignController.list));
router.get('/:id', asyncHandler(CampaignController.get));
router.get('/:id/analytics', asyncHandler(CampaignController.getAnalytics));
router.post('/', requireRole('ADMIN', 'MANAGER'), asyncHandler(CampaignController.create));
router.put('/:id', requireRole('ADMIN', 'MANAGER'), asyncHandler(CampaignController.update));
router.post('/:id/start', requireRole('ADMIN', 'MANAGER'), asyncHandler(CampaignController.start));
router.post('/:id/pause', requireRole('ADMIN', 'MANAGER'), asyncHandler(CampaignController.pause));
router.post('/:id/cancel', requireRole('ADMIN', 'MANAGER'), asyncHandler(CampaignController.cancel));

export default router;
