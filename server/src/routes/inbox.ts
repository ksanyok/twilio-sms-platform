import { Router } from 'express';
import { InboxController } from '../controllers/inboxController';
import { authenticate } from '../middleware/auth';

const router = Router();

const asyncHandler = (fn: Function) => (req: any, res: any, next: any) =>
  Promise.resolve(fn(req, res, next)).catch(next);

router.use(authenticate);

router.get('/', asyncHandler(InboxController.listConversations));
router.get('/:id', asyncHandler(InboxController.getConversation));
router.post('/:id/reply', asyncHandler(InboxController.sendReply));
router.put('/:id/assign', asyncHandler(InboxController.assignRep));

export default router;
