import { Router } from 'express';
import { aiController } from '../controllers/aiController';
import { aiLimiter } from '../middleware/rateLimiter';

const router = Router();

router.post('/summarize', aiLimiter, aiController.summarize);
router.post('/ask', aiLimiter, aiController.ask);
router.post('/compare', aiLimiter, aiController.compare);
router.post('/explain', aiLimiter, aiController.explain);

export default router;
