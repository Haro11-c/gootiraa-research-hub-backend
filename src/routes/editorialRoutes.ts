import { Router } from 'express';
import { editorialController } from '../controllers/editorialController';
import { authenticateToken, requireAuth, requireRole } from '../middleware/auth';

const router = Router();

router.get('/articles', editorialController.getArticles);
router.get('/articles/:slug', editorialController.getArticleBySlug);
router.get('/categories', editorialController.getCategories);
router.post('/articles', authenticateToken, requireAuth, requireRole(['EDITOR', 'ADMIN']), editorialController.createArticle);
router.post('/articles/:id/corrections', authenticateToken, requireAuth, requireRole(['EDITOR', 'ADMIN']), editorialController.addCorrection);

export default router;
