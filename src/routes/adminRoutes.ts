import { Router } from 'express';
import { adminController } from '../controllers/adminController';
import { authenticateToken, requireAuth, requireRole } from '../middleware/auth';

const router = Router();

// Protect all admin routes with authentication and role check
router.use(authenticateToken, requireAuth, requireRole(['ADMIN', 'MODERATOR']));

router.get('/stats', adminController.getStats);
router.get('/submissions', adminController.getPendingSubmissions);
router.post('/submissions/:id/review', adminController.reviewSubmission);
router.get('/audit-logs', adminController.getAuditLogs);
router.get('/reports', adminController.getReports);

export default router;
