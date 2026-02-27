import { Router } from 'express';
import { NumberController } from '../controllers/numberController';
import { authenticate, requireRole } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.use(authenticate);
router.use(requireRole('ADMIN', 'MANAGER'));

router.get('/', asyncHandler(NumberController.list));
router.post('/assign', asyncHandler(NumberController.assignToRep));
router.post('/:id/cool', asyncHandler(NumberController.coolDown));
router.post('/:id/activate', asyncHandler(NumberController.activate));
router.get('/assignments', asyncHandler(NumberController.getAssignments));
router.get('/pools', asyncHandler(NumberController.getPools));
router.post('/pools', asyncHandler(NumberController.createPool));

export default router;
