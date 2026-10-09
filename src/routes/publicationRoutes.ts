import { Router } from 'express';
import { publicationController } from '../controllers/publicationController';
import { authenticateToken, requireAuth } from '../middleware/auth';
import { uploadMiddleware } from '../middleware/upload';

const router = Router();

router.get('/', publicationController.search);
router.get('/:id', publicationController.getById);
router.post('/', authenticateToken, requireAuth, uploadMiddleware.single('file'), publicationController.create);
router.get('/:id/export/:format', publicationController.exportCitation);
router.post('/:id/bookmark', authenticateToken, requireAuth, publicationController.toggleBookmark);
router.get('/files/:fileId/download', authenticateToken, publicationController.downloadFile);

export default router;
