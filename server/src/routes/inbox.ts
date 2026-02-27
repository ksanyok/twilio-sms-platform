import { Router } from 'express';
import { InboxController } from '../controllers/inboxController';
import { authenticate } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.use(authenticate);

router.get('/', asyncHandler(InboxController.listConversations));
router.get('/:id', asyncHandler(InboxController.getConversation));
router.post('/:id/reply', asyncHandler(InboxController.sendReply));
router.put('/:id/assign', asyncHandler(InboxController.assignRep));

export default router;
