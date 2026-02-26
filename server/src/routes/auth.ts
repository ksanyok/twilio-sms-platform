import { Router } from 'express';
import { AuthController } from '../controllers/authController';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();

const asyncHandler = (fn: Function) => (req: any, res: any, next: any) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// Public
router.post('/login', asyncHandler(AuthController.login));

// Protected
router.get('/me', authenticate, asyncHandler(AuthController.getMe));
router.get('/users', authenticate, requireRole('ADMIN', 'MANAGER'), asyncHandler(AuthController.getUsers));
router.post('/register', authenticate, requireRole('ADMIN'), asyncHandler(AuthController.register));
router.put('/users/:id', authenticate, requireRole('ADMIN'), asyncHandler(AuthController.updateUser));

export default router;
