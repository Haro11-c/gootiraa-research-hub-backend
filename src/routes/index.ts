import { Router } from 'express';
import authRoutes from './authRoutes';
import publicationRoutes from './publicationRoutes';
import editorialRoutes from './editorialRoutes';
import aiRoutes from './aiRoutes';
import communityRoutes from './communityRoutes';
import adminRoutes from './adminRoutes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/publications', publicationRoutes);
router.use('/editorial', editorialRoutes);
router.use('/ai', aiRoutes);
router.use('/community', communityRoutes);
router.use('/admin', adminRoutes);

// Health check endpoint
router.get('/health', (_req, res) => {
  res.json({
    status: 'HEALTHY',
    service: 'Gootiraa Research Hub API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

export default router;
