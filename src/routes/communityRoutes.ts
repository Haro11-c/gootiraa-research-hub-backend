import { Router } from 'express';
import { communityController } from '../controllers/communityController';
import { authenticateToken, requireAuth } from '../middleware/auth';

const router = Router();

router.get('/questions', communityController.getQuestions);
router.post('/questions', authenticateToken, requireAuth, communityController.askQuestion);
router.post('/questions/:id/answers', authenticateToken, requireAuth, communityController.answerQuestion);
router.post('/follow/:researcherId', authenticateToken, requireAuth, communityController.toggleFollow);
router.post('/collaborations', authenticateToken, requireAuth, communityController.sendCollaborationRequest);

export default router;
