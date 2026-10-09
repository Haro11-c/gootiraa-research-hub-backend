import { Router } from 'express';
import { authController } from '../controllers/authController';
import { authenticateToken, requireAuth } from '../middleware/auth';
import { authLimiter } from '../middleware/rateLimiter';

const router = Router();

router.post('/register', authLimiter, authController.register);
router.post('/login', authLimiter, authController.login);
router.post('/seed', authController.seed);
router.get('/me', authenticateToken, requireAuth, authController.me);
router.put('/profile', authenticateToken, requireAuth, authController.updateProfile);
router.post('/request-verification', authenticateToken, requireAuth, authController.requestVerification);
router.get('/researcher/:id', authController.getResearcherProfile);

export default router;
