import { Router } from 'express';
import { AuthController } from '../controllers/authController';
import { authenticate, requireRole } from '../middleware/auth';
import rateLimit from 'express-rate-limit';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

// Rate limit login attempts: 10 per 15 minutes per IP
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many login attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test',
});

// Public
router.post('/login', loginLimiter, asyncHandler(AuthController.login));
router.post('/refresh', asyncHandler(AuthController.refresh));

// Protected
router.get('/me', authenticate, asyncHandler(AuthController.getMe));
router.get('/users', authenticate, requireRole('ADMIN', 'MANAGER'), asyncHandler(AuthController.getUsers));
router.post('/register', authenticate, requireRole('ADMIN'), asyncHandler(AuthController.register));
router.put('/users/:id', authenticate, requireRole('ADMIN'), asyncHandler(AuthController.updateUser));

export default router;
