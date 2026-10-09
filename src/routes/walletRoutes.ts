import { Router } from 'express';
import { walletController } from '../controllers/walletController';
import { authenticateToken, requireAuth, requireRole } from '../middleware/auth';

const router = Router();

router.get('/me', authenticateToken, requireAuth, walletController.getWallet);
router.post('/tip', authenticateToken, walletController.sendTip);
router.post('/withdraw', authenticateToken, requireAuth, walletController.requestWithdrawal);
router.get('/bounties', walletController.getBounties);
router.post('/bounties', authenticateToken, requireAuth, requireRole(['ADMIN', 'SUPER_ADMIN']), walletController.createBounty);

export default router;
