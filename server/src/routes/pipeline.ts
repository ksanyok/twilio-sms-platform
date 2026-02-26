import { Router } from 'express';
import { PipelineController } from '../controllers/pipelineController';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();

const asyncHandler = (fn: Function) => (req: any, res: any, next: any) =>
  Promise.resolve(fn(req, res, next)).catch(next);

router.use(authenticate);

router.get('/stages', asyncHandler(PipelineController.getStages));
router.post('/stages', requireRole('ADMIN', 'MANAGER'), asyncHandler(PipelineController.createStage));
router.put('/stages/reorder', requireRole('ADMIN', 'MANAGER'), asyncHandler(PipelineController.reorderStages));
router.put('/stages/:id', requireRole('ADMIN', 'MANAGER'), asyncHandler(PipelineController.updateStage));
router.delete('/stages/:id', requireRole('ADMIN'), asyncHandler(PipelineController.deleteStage));
router.put('/cards/:cardId/move', asyncHandler(PipelineController.moveCard));

export default router;
