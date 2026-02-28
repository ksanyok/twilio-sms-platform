import { Router } from 'express';
import multer from 'multer';
import { LeadController } from '../controllers/leadController';
import { authenticate, requireRole } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB

router.use(authenticate);

router.get('/', asyncHandler(LeadController.list));
router.post('/', asyncHandler(LeadController.create));
router.post('/import', requireRole('ADMIN', 'MANAGER'), upload.single('file'), asyncHandler(LeadController.importCSV));
router.post('/preview', requireRole('ADMIN', 'MANAGER'), upload.single('file'), asyncHandler(LeadController.previewCSV));
router.post('/import-mapped', requireRole('ADMIN', 'MANAGER'), upload.single('file'), asyncHandler(LeadController.importMappedCSV));
router.post('/bulk', requireRole('ADMIN', 'MANAGER'), asyncHandler(LeadController.bulkAction));
router.get('/:id', asyncHandler(LeadController.get));
router.put('/:id', asyncHandler(LeadController.update));
router.delete('/:id', requireRole('ADMIN', 'MANAGER'), asyncHandler(LeadController.delete));
router.post('/:id/tags', asyncHandler(LeadController.addTag));
router.delete('/:id/tags/:tagId', asyncHandler(LeadController.removeTag));

export default router;
