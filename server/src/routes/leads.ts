import { Router } from 'express';
import multer from 'multer';
import { LeadController } from '../controllers/leadController';
import { authenticate, requireRole } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB

router.use(authenticate);

router.get('/', asyncHandler(LeadController.list));
router.get('/:id', asyncHandler(LeadController.get));
router.post('/', asyncHandler(LeadController.create));
router.put('/:id', asyncHandler(LeadController.update));
router.delete('/:id', requireRole('ADMIN', 'MANAGER'), asyncHandler(LeadController.delete));
router.post('/import', requireRole('ADMIN', 'MANAGER'), upload.single('file'), asyncHandler(LeadController.importCSV));
router.post('/bulk', requireRole('ADMIN', 'MANAGER'), asyncHandler(LeadController.bulkAction));
router.post('/:id/tags', asyncHandler(LeadController.addTag));
router.delete('/:id/tags/:tagId', asyncHandler(LeadController.removeTag));

export default router;
