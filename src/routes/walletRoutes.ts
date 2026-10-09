import { Router } from 'express';
import { walletController } from '../controllers/walletController';
import { authenticateToken, requireAuth } from '../middleware/auth';

const router = Router();

router.get('/me', authenticateToken, requireAuth, walletController.getWallet);
router.post('/tip', authenticateToken, walletController.sendTip);
router.post('/withdraw', authenticateToken, requireAuth, walletController.requestWithdrawal);
router.get('/bounties', walletController.getBounties);

export default router;
