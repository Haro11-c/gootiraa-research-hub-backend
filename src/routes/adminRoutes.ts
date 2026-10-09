import { Router } from 'express';
import { adminController } from '../controllers/adminController';
import { authenticateToken, requireAuth, requireRole } from '../middleware/auth';

const router = Router();

// Base middleware: all admin routes require authentication and at least MODERATOR, ADMIN, or SUPER_ADMIN
router.use(authenticateToken, requireAuth, requireRole(['MODERATOR', 'ADMIN', 'SUPER_ADMIN']));

// Overview stats
router.get('/stats', adminController.getStats);

// Super Admin exclusive controls
router.get('/super/users', adminController.getUsers);
router.post('/super/users/role', adminController.updateUserRole);
router.post('/super/users/verify', adminController.updateUserVerification);
router.get('/super/payouts', adminController.getPayoutRequests);
router.post('/super/payouts/:id/review', adminController.reviewPayoutRequest);
router.get('/super/fraud-alerts', adminController.getFraudAlerts);

// Moderator queue
router.get('/submissions', adminController.getPendingSubmissions);
router.post('/submissions/:id/review', adminController.reviewSubmission);
router.get('/audit-logs', adminController.getAuditLogs);
router.get('/reports', adminController.getReports);

export default router;
